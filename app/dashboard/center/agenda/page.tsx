"use client";

import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { CenterCalendar } from "@/components/center/calendar/CenterCalendar";
import { DayEventsPanel } from "@/components/center/calendar/DayEventsPanel";
import { EventForm, EventFormValues } from "@/components/center/calendar/EventForm";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  getCenterPersonOptions,
  getHorseListItemsByCenter,
  CenterPersonOption,
  HorseListItem,
} from "@/lib/horses";
import {
  createEvent,
  deleteEvent,
  Event,
  getEventsByDateRange,
  updateEvent,
} from "@/lib/services";

const inputClassName =
  "h-11 w-full rounded-2xl border border-brand-border bg-white px-3 text-sm text-brand-text";

const dayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const combineDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getMonthGridRange = (visibleMonth: Date) => {
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstDay = first.getDay();
  const diff = firstDay === 0 ? -6 : 1 - firstDay;
  first.setDate(first.getDate() + diff);
  first.setHours(0, 0, 0, 0);

  const end = new Date(first);
  end.setDate(end.getDate() + 41);
  end.setHours(23, 59, 59, 999);
  return { start: first, end };
};

export default function CenterAgendaPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [events, setEvents] = useState<Event[]>([]);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [people, setPeople] = useState<CenterPersonOption[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMonthEvents = async (centerId: string, month: Date) => {
    const range = getMonthGridRange(month);
    const nextEvents = await getEventsByDateRange(centerId, range);
    setEvents(nextEvents);
  };

  useEffect(() => {
    if (!activeCenterId) {
      setEvents([]);
      setHorses([]);
      setPeople([]);
      setArenas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = listArenas(
      activeCenterId,
      (rows) => setArenas(rows),
      () => setError("No se pudieron cargar las pistas.")
    );

    Promise.all([
      loadMonthEvents(activeCenterId, visibleMonth),
      getHorseListItemsByCenter(activeCenterId),
      getCenterPersonOptions(activeCenterId),
    ])
      .then(([, nextHorses, nextPeople]) => {
        setHorses(nextHorses);
        setPeople(nextPeople);
      })
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudo cargar la agenda del centro.");
      })
      .finally(() => setLoading(false));

    return () => unsub();
  }, [activeCenterId, visibleMonth]);

  const horseMap = useMemo(
    () => new Map(horses.map((item) => [item.horse.id, item.horse.name])),
    [horses]
  );
  const peopleMap = useMemo(() => new Map(people.map((item) => [item.id, item.label])), [people]);
  const arenaMap = useMemo(() => new Map(arenas.map((item) => [item.id, item.name])), [arenas]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = dayKey(selectedDate);
    return events.filter((event) => event.date === key).sort((left, right) => left.startAt.toMillis() - right.startAt.toMillis());
  }, [events, selectedDate]);

  const resetComposer = () => {
    setEditingEvent(null);
    setIsComposerOpen(false);
    setError(null);
  };

  const handleCreateRequest = () => {
    setEditingEvent(null);
    setIsComposerOpen(true);
  };

  const handleEditRequest = (event: Event) => {
    setEditingEvent(event);
    setSelectedDate(new Date(`${event.date}T00:00:00`));
    setIsComposerOpen(true);
  };

  const handleSubmit = async (values: EventFormValues) => {
    if (!activeCenterId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        type: values.type,
        status: values.status,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        startAt: combineDateTime(values.date, values.startTime),
        endAt: combineDateTime(values.date, values.endTime),
        location: values.location,
        arenaId: values.arenaId || undefined,
        trainerId: values.trainerId || undefined,
        horseIds: values.horseIds,
        studentIds: values.studentIds,
        notes: values.notes,
      };

      if (editingEvent) {
        await updateEvent(activeCenterId, editingEvent.id, payload);
      } else {
        await createEvent(activeCenterId, payload);
      }

      await loadMonthEvents(activeCenterId, visibleMonth);
      setSelectedDate(new Date(`${values.date}T00:00:00`));
      resetComposer();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la actividad.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: Event) => {
    if (!activeCenterId) return;
    setError(null);
    try {
      await deleteEvent(activeCenterId, event.id);
      await loadMonthEvents(activeCenterId, visibleMonth);
      if (editingEvent?.id === event.id) {
        resetComposer();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la actividad.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando agenda...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#f6efe6_0%,#f5f1ea_35%,#edf1ef_100%)] text-brand-text">
      <CenterHeader
        title="Agenda"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
      />

      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && (
          <p className="rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {memberships.length > 1 && (
          <section className="max-w-xl rounded-[28px] border border-white/80 bg-white/75 p-4 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
            <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
              Cambiar centro activo
            </label>
            <select
              id="center-selector"
              value={activeCenterId ?? ""}
              onChange={(event) => setActiveCenterId(event.target.value)}
              className={inputClassName}
            >
              {memberships.map((membership) => (
                <option key={membership.centerId} value={membership.centerId}>
                  {membership.centerName} ({membership.role})
                </option>
              ))}
            </select>
          </section>
        )}

        {!activeCenterId ? (
          <section className="rounded-[28px] border border-white/80 bg-white/75 p-4 text-sm text-brand-secondary shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
            No tienes centro asignado.
          </section>
        ) : (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_430px]">
            <div className="space-y-5">
              <CenterCalendar
                events={events}
                visibleMonth={visibleMonth}
                selectedDate={selectedDate}
                onVisibleMonthChange={setVisibleMonth}
                onSelectedDateChange={(date) => {
                  setSelectedDate(date);
                  setEditingEvent(null);
                  setIsComposerOpen(false);
                }}
              />
              {loading && (
                <div className="rounded-[24px] border border-white/80 bg-white/75 p-4 text-sm text-brand-secondary shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
                  Cargando eventos del mes...
                </div>
              )}
            </div>

            <div className="xl:sticky xl:top-24 xl:self-start">
              <DayEventsPanel
                date={selectedDate}
                events={selectedDayEvents}
                arenaLabels={arenaMap}
                peopleLabels={peopleMap}
                horseLabels={horseMap}
                onAddEvent={handleCreateRequest}
                onEditEvent={handleEditRequest}
                onDeleteEvent={handleDelete}
              >
                {selectedDate && isComposerOpen && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-brand-text">
                          {editingEvent ? "Editar actividad" : "Nueva actividad"}
                        </h4>
                        <p className="text-sm text-brand-secondary">
                          El titulo aparecera dentro del cuadrado del dia correspondiente.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetComposer}
                        className="inline-flex h-10 items-center rounded-2xl border border-brand-border bg-brand-background/60 px-3 text-sm"
                      >
                        Cerrar
                      </button>
                    </div>

                    <EventForm
                      defaultValues={editingEvent ?? undefined}
                      initialDate={dayKey(selectedDate)}
                      submitting={saving}
                      trainerOptions={people}
                      studentOptions={people}
                      horseOptions={horses}
                      arenaOptions={arenas}
                      submitLabel={editingEvent ? "Guardar cambios" : "Crear actividad"}
                      onSubmit={handleSubmit}
                    />
                  </div>
                )}
              </DayEventsPanel>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

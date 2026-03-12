"use client";

import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { CenterCalendar, CalendarViewMode } from "@/components/center/calendar/CenterCalendar";
import { EventCard } from "@/components/center/calendar/EventCard";
import { EventForm, EventFormValues } from "@/components/center/calendar/EventForm";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getCenterPersonOptions, getHorseListItemsByCenter, CenterPersonOption, HorseListItem } from "@/lib/horses";
import {
  createEvent,
  deleteEvent,
  Event,
  getEventsByDateRange,
  updateEvent,
} from "@/lib/services";

const inputClassName =
  "h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";

const combineDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getRangeForView = (selectedDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "day") {
    return {
      start: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0),
      end: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59, 999),
    };
  }

  if (viewMode === "week") {
    const start = new Date(selectedDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filters, setFilters] = useState({
    trainerId: "",
    studentId: "",
    horseId: "",
    arenaId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async (centerId: string) => {
    const range = getRangeForView(selectedDate, viewMode);
    const nextEvents = await getEventsByDateRange(centerId, range, {
      trainerId: filters.trainerId || undefined,
      studentId: filters.studentId || undefined,
      horseId: filters.horseId || undefined,
      arenaId: filters.arenaId || undefined,
    });
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
      loadEvents(activeCenterId),
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
  }, [activeCenterId, selectedDate, viewMode, filters]);

  const horseMap = useMemo(
    () => new Map(horses.map((item) => [item.horse.id, item.horse.name])),
    [horses]
  );
  const peopleMap = useMemo(() => new Map(people.map((item) => [item.id, item.label])), [people]);
  const arenaMap = useMemo(() => new Map(arenas.map((item) => [item.id, item.name])), [arenas]);

  const resetEditor = () => {
    setEditingEvent(null);
    setError(null);
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
        startAt: combineDateTime(values.date, values.startTime),
        endAt: combineDateTime(values.date, values.endTime),
        arenaId: values.arenaId || undefined,
        trainerId: values.trainerId || undefined,
        horseIds: values.horseIds,
        studentIds: values.studentIds,
      };
      if (editingEvent) {
        await updateEvent(activeCenterId, editingEvent.id, payload);
      } else {
        await createEvent(activeCenterId, payload);
      }
      await loadEvents(activeCenterId);
      resetEditor();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el evento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event: Event) => {
    if (!activeCenterId) return;
    setError(null);
    try {
      await deleteEvent(activeCenterId, event.id);
      await loadEvents(activeCenterId);
      if (editingEvent?.id === event.id) {
        setEditingEvent(null);
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el evento.");
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
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Agenda"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {memberships.length > 1 && (
          <section className="max-w-xl rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
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
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
            No tienes centro asignado.
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-brand-text">Filtros</h2>
                <p className="text-sm text-brand-secondary">
                  Filtra por entrenador, alumno, caballo o pista.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <select
                  value={filters.trainerId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, trainerId: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="">Todos los entrenadores</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.studentId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, studentId: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="">Todos los alumnos</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.label}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.horseId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, horseId: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="">Todos los caballos</option>
                  {horses.map((item) => (
                    <option key={item.horse.id} value={item.horse.id}>
                      {item.horse.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filters.arenaId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, arenaId: event.target.value }))}
                  className={inputClassName}
                >
                  <option value="">Todas las pistas</option>
                  {arenas.map((arena) => (
                    <option key={arena.id} value={arena.id}>
                      {arena.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <CenterCalendar
              events={events}
              selectedDate={selectedDate}
              viewMode={viewMode}
              onSelectedDateChange={setSelectedDate}
              onViewModeChange={setViewMode}
            />

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Eventos del rango</h2>
                  <p className="text-sm text-brand-secondary">
                    {loading ? "Cargando eventos..." : `${events.length} eventos visibles en el calendario.`}
                  </p>
                </div>
                {loading ? (
                  <p className="text-sm text-brand-secondary">Cargando...</p>
                ) : events.length === 0 ? (
                  <p className="text-sm text-brand-secondary">No hay eventos para este rango.</p>
                ) : (
                  <div className="space-y-3">
                    {events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        arenaLabel={event.arenaId ? arenaMap.get(event.arenaId) : undefined}
                        trainerLabel={event.trainerId ? peopleMap.get(event.trainerId) : undefined}
                        horseLabels={event.horseIds.map((id) => horseMap.get(id) ?? id)}
                        studentLabels={event.studentIds.map((id) => peopleMap.get(id) ?? id)}
                        onEdit={setEditingEvent}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-brand-text">
                      {editingEvent ? "Editar evento" : "Nuevo evento"}
                    </h2>
                    <p className="text-sm text-brand-secondary">
                      La validacion evita solapes de entrenador, caballo y pista.
                    </p>
                  </div>
                  {editingEvent && (
                    <button
                      type="button"
                      onClick={resetEditor}
                      className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                <EventForm
                  defaultValues={editingEvent ?? undefined}
                  submitting={saving}
                  trainerOptions={people}
                  studentOptions={people}
                  horseOptions={horses}
                  arenaOptions={arenas}
                  submitLabel={editingEvent ? "Guardar cambios" : "Crear evento"}
                  onSubmit={handleSubmit}
                />
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

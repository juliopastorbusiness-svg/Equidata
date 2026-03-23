"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import {
  ArenaScheduleItem,
  ArenaScheduleView,
  ScheduleMode,
} from "@/components/dashboard/arenas/ArenaScheduleView";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import {
  ArenaBooking,
  Class,
  Training,
  getArenasByCenter,
  getArenaBookings,
  getClassesByCenter,
  getTrainings,
} from "@/lib/services";
import { Arena } from "@/lib/firestore/arenas";

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const dayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const hasOverlap = (left: ArenaBooking, right: ArenaBooking) =>
  left.startAt.toMillis() < right.endAt.toMillis() && right.startAt.toMillis() < left.endAt.toMillis();

export default function DashboardPistaDetailPage() {
  const params = useParams<{ arenaId: string }>();
  const arenaId = params.arenaId;
  const {
    loading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [arena, setArena] = useState<Arena | null>(null);
  const [bookings, setBookings] = useState<ArenaBooking[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [trainers, setTrainers] = useState<CenterPersonOption[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => formatDateKey(new Date()));
  const [mode, setMode] = useState<ScheduleMode>("week");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      return;
    }

    void Promise.all([
      getArenasByCenter(activeCenterId),
      getArenaBookings(activeCenterId, { arenaId }),
      getClassesByCenter(activeCenterId),
      getTrainings(activeCenterId),
      getCenterPersonOptions(activeCenterId),
    ])
      .then(([arenaRows, bookingRows, classRows, trainingRows, trainerRows]) => {
        setArena(arenaRows.find((item) => item.id === arenaId) ?? null);
        setBookings(bookingRows);
        setClasses(classRows);
        setTrainings(trainingRows);
        setTrainers(trainerRows);
      })
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudo cargar la pista.");
      });
  }, [activeCenterId, arenaId]);

  const selectedDateObject = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }, [selectedDate]);

  const classMap = useMemo(
    () => new Map(classes.map((classItem) => [classItem.id, classItem] as const)),
    [classes]
  );
  const trainingMap = useMemo(
    () => new Map(trainings.map((training) => [training.id, training] as const)),
    [trainings]
  );
  const trainerMap = useMemo(
    () => new Map(trainers.map((trainer) => [trainer.id, trainer.label] as const)),
    [trainers]
  );

  const scheduleItems = useMemo<ArenaScheduleItem[]>(() => {
    if (!arena) return [];

    const dates =
      mode === "day"
        ? [selectedDateObject]
        : Array.from({ length: 7 }, (_, index) => addDays(selectedDateObject, index));

    return [
      {
        arenaId: arena.id,
        arenaName: arena.name,
        arenaMeta: [arena.type, arena.surface].filter(Boolean).join(" · ") || undefined,
        days: dates.map((date) => {
          const { start, end } = dayRange(date);

          return {
            dateKey: formatDateKey(date),
            label: date.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            }),
            bookings: bookings
              .filter((booking) => booking.startAt.toDate() <= end && booking.endAt.toDate() >= start)
              .sort((left, right) => left.startAt.toMillis() - right.startAt.toMillis())
              .map((booking) => {
                const classItem = booking.sourceType === "class" ? classMap.get(booking.sourceId) : null;
                const trainingItem =
                  booking.sourceType === "training" ? trainingMap.get(booking.sourceId) : null;
                const trainerLabel = classItem?.trainerId
                  ? trainerMap.get(classItem.trainerId) ?? "Profesor no disponible"
                  : trainingItem?.trainerId
                    ? trainerMap.get(trainingItem.trainerId) ?? "Profesor no disponible"
                    : booking.sourceType === "maintenance"
                      ? "Bloque tecnico"
                      : "Sin entrenador";

                const hasConflict = bookings.some((candidate) => {
                  if (candidate.id === booking.id) return false;
                  if (candidate.status === "cancelled" || booking.status === "cancelled") return false;
                  return hasOverlap(candidate, booking);
                });

                return {
                  id: booking.id,
                  title:
                    classItem?.title ||
                    (trainingItem ? `Entrenamiento · ${trainingItem.type}` : booking.title),
                  trainerLabel,
                  startLabel: booking.startAt.toDate().toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  endLabel: booking.endAt.toDate().toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  sourceType: booking.sourceType,
                  status: booking.status,
                  hasConflict,
                  startAtMs: booking.startAt.toMillis(),
                  endAtMs: booking.endAt.toMillis(),
                };
              }),
          };
        }),
      },
    ];
  }, [arena, bookings, classMap, mode, selectedDateObject, trainerMap, trainingMap]);

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando pista...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={arena?.name ?? "Detalle de pista"}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/pistas"
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{guardError}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        {!arena ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            Pista no encontrada.
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
              <h1 className="text-2xl font-semibold">{arena.name}</h1>
              <p className="mt-2 text-sm text-brand-secondary">
                {[arena.type, arena.surface].filter(Boolean).join(" · ") || "Sin metadatos"}
              </p>
              {arena.notes ? <p className="mt-4 text-sm text-brand-secondary">{arena.notes}</p> : null}
            </section>

            <section className="rounded-3xl border border-brand-border bg-white/85 p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <label className="grid gap-2 text-sm font-medium text-brand-text">
                  Dia de referencia
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  />
                </label>

                <div className="inline-flex rounded-xl border border-brand-border bg-brand-background p-1">
                  <button
                    type="button"
                    onClick={() => setMode("day")}
                    className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
                      mode === "day" ? "bg-brand-primary text-white" : "text-brand-text"
                    }`}
                  >
                    Dia
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("week")}
                    className={`h-10 rounded-lg px-4 text-sm font-semibold transition ${
                      mode === "week" ? "bg-brand-primary text-white" : "text-brand-text"
                    }`}
                  >
                    Semana
                  </button>
                </div>
              </div>
            </section>

            <ArenaScheduleView
              items={scheduleItems}
              mode={mode}
              selectedDateLabel={selectedDateObject.toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            />
          </>
        )}
      </div>
    </main>
  );
}

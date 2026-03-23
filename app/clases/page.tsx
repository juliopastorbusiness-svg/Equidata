"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClassFilters } from "@/components/classes/ClassFilters";
import { ClassList } from "@/components/classes/ClassList";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import {
  getArenasByCenter,
  getCenterById,
  getPublishedClassesByCenter,
  getReservationsByRider,
} from "@/lib/services";
import { getUserCenterMemberships } from "@/lib/services/memberService";
import { Arena } from "@/lib/firestore/arenas";
import { Class, ClassReservation } from "@/lib/services/types";

type FiltersState = {
  date: string;
  discipline: string;
  level: string;
  trainerId: string;
};

const emptyFilters: FiltersState = {
  date: "",
  discipline: "",
  level: "",
  trainerId: "",
};

export default function RiderClassesPage() {
  const { user, profile, loading: authLoading, error: authError } = useAuthUser();
  const [classes, setClasses] = useState<Class[]>([]);
  const [reservations, setReservations] = useState<Map<string, ClassReservation>>(new Map());
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [trainers, setTrainers] = useState<CenterPersonOption[]>([]);
  const [centerName, setCenterName] = useState<string | null>(null);
  const [membershipsReady, setMembershipsReady] = useState(false);
  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [error, setError] = useState<string | null>(null);

  const activeCenterId = profile?.activeCenterId;

  useEffect(() => {
    if (authLoading || !user) return;

    void (async () => {
      setError(null);
      try {
        const memberships = await getUserCenterMemberships(user.uid);
        const activeMemberships = memberships.filter((item) => item.status === "active");

        if (!activeCenterId || !activeMemberships.some((item) => item.centerId === activeCenterId)) {
          setClasses([]);
          setReservations(new Map());
          setMembershipsReady(true);
          return;
        }

        const [classRows, reservationRows, arenaRows, trainerRows, center] = await Promise.all([
          getPublishedClassesByCenter(activeCenterId),
          getReservationsByRider(activeCenterId, user.uid),
          getArenasByCenter(activeCenterId),
          getCenterPersonOptions(activeCenterId),
          getCenterById(activeCenterId),
        ]);

        setClasses(classRows);
        setReservations(new Map(reservationRows.map((reservation) => [reservation.classId, reservation] as const)));
        setArenas(arenaRows);
        setTrainers(trainerRows);
        setCenterName(center?.name ?? null);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudieron cargar las clases del centro activo.");
      } finally {
        setMembershipsReady(true);
      }
    })();
  }, [activeCenterId, authLoading, user]);

  const filteredItems = useMemo(() => {
    return classes.filter((classItem) => {
      if (filters.date) {
        const classDate = classItem.date.toDate().toISOString().slice(0, 10);
        if (classDate !== filters.date) return false;
      }
      if (filters.discipline && classItem.discipline !== filters.discipline) return false;
      if (filters.level && classItem.level !== filters.level) return false;
      if (filters.trainerId && classItem.trainerId !== filters.trainerId) return false;
      return true;
    });
  }, [classes, filters]);

  const arenaLabels = useMemo(
    () => new Map(arenas.map((arena) => [arena.id, arena.name] as const)),
    [arenas]
  );
  const trainerLabels = useMemo(
    () => new Map(trainers.map((trainer) => [trainer.id, trainer.label] as const)),
    [trainers]
  );

  const handleReserved = (reservation: ClassReservation) => {
    setReservations((prev) => new Map(prev).set(reservation.classId, reservation));
    setClasses((prev) =>
      prev.map((classItem) =>
        classItem.id === reservation.classId
          ? {
              ...classItem,
              availableSpots: Math.max(classItem.availableSpots - 1, 0),
              status:
                classItem.availableSpots - 1 <= 0 && classItem.status !== "cancelled" && classItem.status !== "completed"
                  ? "full"
                  : classItem.status,
            }
          : classItem
      )
    );
  };

  if (authLoading || !membershipsReady) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando clases...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>No hay sesion activa.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="rounded-[2rem] border border-brand-border bg-white/85 p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">Reservas</p>
              <h1 className="mt-2 text-3xl font-semibold">Clases del centro activo</h1>
              <p className="mt-2 max-w-2xl text-sm text-brand-secondary">
                {centerName
                  ? `Explora las clases publicadas en ${centerName} y reserva en segundos.`
                  : "Selecciona o activa un centro para ver sus clases publicadas."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/centros"
                className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
              >
                Cambiar centro
              </Link>
              <Link
                href="/dashboard/rider"
                className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white"
              >
                Volver al dashboard
              </Link>
            </div>
          </div>
        </header>

        {authError ? <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{authError}</p> : null}
        {error ? <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p> : null}

        {!activeCenterId ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 text-sm text-brand-secondary shadow-sm">
            No tienes un centro activo configurado. Activalo desde <Link href="/centros" className="font-semibold text-brand-primary hover:underline">Centros</Link>.
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Clases visibles</p>
                <p className="mt-2 text-3xl font-semibold">{classes.length}</p>
              </article>
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Tus reservas activas</p>
                <p className="mt-2 text-3xl font-semibold">
                  {
                    Array.from(reservations.values()).filter(
                      (reservation) =>
                        reservation.status !== "cancelled" && reservation.status !== "CANCELLED"
                    ).length
                  }
                </p>
              </article>
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Plazas libres</p>
                <p className="mt-2 text-3xl font-semibold">
                  {classes.reduce((sum, classItem) => sum + classItem.availableSpots, 0)}
                </p>
              </article>
            </section>

            <ClassFilters
              value={filters}
              disciplines={Array.from(new Set(classes.map((item) => item.discipline))).sort((a, b) => a.localeCompare(b, "es"))}
              levels={Array.from(new Set(classes.map((item) => item.level)))}
              trainers={trainers}
              onChange={setFilters}
            />

            <ClassList
              centerId={activeCenterId}
              items={filteredItems}
              riderId={user.uid}
              trainerLabels={trainerLabels}
              arenaLabels={arenaLabels}
              reservations={reservations}
              onReserved={handleReserved}
            />
          </>
        )}
      </div>
    </main>
  );
}

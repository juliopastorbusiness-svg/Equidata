"use client";

import Image from "next/image";
import Link from "next/link";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { EmptyLinkedCenterState } from "@/components/dashboard/rider/EmptyLinkedCenterState";
import { RiderDashboardHeader } from "@/components/dashboard/rider/RiderDashboardHeader";
import { RiderQuickActions } from "@/components/dashboard/rider/RiderQuickActions";
import { RiderUpcomingClasses } from "@/components/dashboard/rider/RiderUpcomingClasses";
import { RiderUpcomingReservations } from "@/components/dashboard/rider/RiderUpcomingReservations";
import { db } from "@/lib/firebase";
import { Arena } from "@/lib/firestore/arenas";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import {
  Class,
  ClassReservation,
  getArenasByCenter,
  getCenterById,
  getPublishedClassesByCenter,
  getReservationsByRider,
  setActiveCenter,
} from "@/lib/services";
import { getUserCenterMemberships } from "@/lib/services/memberService";

type Horse = {
  id: string;
  name: string;
  age?: number;
  breed?: string;
  centerId?: string;
  photoUrl?: string;
  createdAt?: Timestamp;
};

const blockingReservation = (status: ClassReservation["status"]) =>
  status === "pending" ||
  status === "confirmed" ||
  status === "RESERVED" ||
  status === "CONFIRMED";

const reservationLabel = (status: ClassReservation["status"]) => {
  if (status === "pending" || status === "RESERVED") return "Pendiente";
  if (status === "confirmed" || status === "CONFIRMED") return "Confirmada";
  if (status === "completed" || status === "COMPLETED") return "Completada";
  if (status === "no_show" || status === "NO_SHOW") return "No show";
  return "Cancelada";
};

export default function RiderDashboardPage() {
  const { user, profile, loading: authLoading, error: authError } = useAuthUser();
  const [activeCenterId, setActiveCenterIdState] = useState<string | null>(null);
  const [activeCenterName, setActiveCenterName] = useState<string | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [reservations, setReservations] = useState<ClassReservation[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [trainers, setTrainers] = useState<CenterPersonOption[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const horsesQuery = query(collection(db, "horses"), where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(
      horsesQuery,
      (snapshot) => {
        setHorses(
          snapshot.docs.map((horseDoc) => ({
            id: horseDoc.id,
            ...(horseDoc.data() as Omit<Horse, "id">),
          }))
        );
      },
      (snapshotError) => {
        console.error(snapshotError);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const memberships = await getUserCenterMemberships(user.uid);
        const activeMemberships = memberships.filter((membership) => membership.status === "active");

        if (activeMemberships.length === 0) {
          setActiveCenterIdState(null);
          setActiveCenterName(null);
          setClasses([]);
          setReservations([]);
          setArenas([]);
          setTrainers([]);
          return;
        }

        const preferredCenterId =
          profile?.activeCenterId &&
          activeMemberships.some((membership) => membership.centerId === profile.activeCenterId)
            ? profile.activeCenterId
            : activeMemberships[0]?.centerId ?? null;

        if (!preferredCenterId) {
          setActiveCenterIdState(null);
          setActiveCenterName(null);
          return;
        }

        setActiveCenterIdState(preferredCenterId);

        if (profile?.activeCenterId !== preferredCenterId) {
          void setActiveCenter(user.uid, preferredCenterId).catch((syncError) => {
            console.error(syncError);
          });
        }

        const [center, classRows, reservationRows, arenaRows, trainerRows] = await Promise.all([
          getCenterById(preferredCenterId),
          getPublishedClassesByCenter(preferredCenterId),
          getReservationsByRider(preferredCenterId, user.uid),
          getArenasByCenter(preferredCenterId),
          getCenterPersonOptions(preferredCenterId),
        ]);

        setActiveCenterName(center?.name ?? null);
        setClasses(classRows);
        setReservations(reservationRows);
        setArenas(arenaRows);
        setTrainers(trainerRows);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudo cargar el dashboard rider.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, profile?.activeCenterId, user]);

  const arenaLabels = useMemo(
    () => new Map(arenas.map((arena) => [arena.id, arena.name] as const)),
    [arenas]
  );
  const trainerLabels = useMemo(
    () => new Map(trainers.map((trainer) => [trainer.id, trainer.label] as const)),
    [trainers]
  );
  const classMap = useMemo(
    () => new Map(classes.map((classItem) => [classItem.id, classItem] as const)),
    [classes]
  );

  const upcomingClasses = useMemo(() => {
    const now = Date.now();
    return classes
      .filter((classItem) => classItem.status === "published" && classItem.availableSpots > 0)
      .filter((classItem) => classItem.startAt.toMillis() >= now)
      .sort((left, right) => left.startAt.toMillis() - right.startAt.toMillis())
      .slice(0, 3)
      .map((classItem) => ({
        classItem,
        arenaLabel: classItem.arenaId ? arenaLabels.get(classItem.arenaId) ?? "Sin pista" : "Sin pista",
        trainerLabel: classItem.trainerId
          ? trainerLabels.get(classItem.trainerId) ?? "Sin profesor"
          : "Sin profesor",
      }));
  }, [arenaLabels, classes, trainerLabels]);

  const upcomingReservations = useMemo(() => {
    const now = Date.now();
    return reservations
      .filter((reservation) => blockingReservation(reservation.status))
      .map((reservation) => {
        const classItem = classMap.get(reservation.classId);
        return { reservation, classItem };
      })
      .filter((item): item is { reservation: ClassReservation; classItem: Class } => Boolean(item.classItem))
      .filter((item) => item.classItem.endAt.toMillis() >= now)
      .sort((left, right) => left.classItem.startAt.toMillis() - right.classItem.startAt.toMillis())
      .slice(0, 3)
      .map(({ reservation, classItem }) => ({
        reservation,
        classTitle: classItem.title,
        dateLabel: classItem.date.toDate().toLocaleDateString("es-ES"),
        timeLabel: `${classItem.startTime} - ${classItem.endTime}`,
        arenaLabel: classItem.arenaId ? arenaLabels.get(classItem.arenaId) ?? "Sin pista" : "Sin pista",
        trainerLabel: classItem.trainerId
          ? trainerLabels.get(classItem.trainerId) ?? "Sin profesor"
          : "Sin profesor",
        statusLabel: reservationLabel(reservation.status),
      }));
  }, [arenaLabels, classMap, reservations, trainerLabels]);

  const horsesInActiveCenter = useMemo(() => {
    if (!activeCenterId) return [];
    return horses.filter((horse) => horse.centerId === activeCenterId);
  }, [activeCenterId, horses]);

  const riderName =
    profile?.fullName?.trim() ||
    profile?.displayName?.trim() ||
    profile?.name?.trim() ||
    user?.email ||
    "rider";

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando dashboard rider...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>No hay sesión activa.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
        <RiderDashboardHeader
          riderName={riderName}
          centerName={activeCenterName}
          reservationsCount={upcomingReservations.length}
          classesCount={upcomingClasses.length}
        />

        {authError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{authError}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        {!activeCenterId ? (
          <EmptyLinkedCenterState />
        ) : (
          <>
            <RiderQuickActions hasActiveCenter />

            <section className="grid gap-5 xl:grid-cols-2">
              <RiderUpcomingClasses items={upcomingClasses} />
              <RiderUpcomingReservations items={upcomingReservations} />
            </section>

            <section className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">Tus caballos en el centro activo</h2>
                  <p className="mt-1 text-sm text-brand-secondary">
                    Contexto rápido del centro activo sin perder la navegación legacy.
                  </p>
                </div>
                <Link href="/dashboard/horses" className="text-sm font-semibold text-brand-primary hover:underline">
                  Ver caballos
                </Link>
              </div>

              {horsesInActiveCenter.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-brand-border bg-brand-background/60 px-5 py-8 text-center text-sm text-brand-secondary">
                  No tienes caballos registrados en este centro.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {horsesInActiveCenter.map((horse) => (
                    <Link
                      key={horse.id}
                      href={`/dashboard/horses/${horse.id}`}
                      className="rounded-[1.5rem] border border-brand-border bg-brand-background/55 p-4 transition hover:border-brand-primary hover:bg-white"
                    >
                      {horse.photoUrl ? (
                        <Image
                          src={horse.photoUrl}
                          alt={horse.name}
                          width={640}
                          height={320}
                          className="h-40 w-full rounded-xl object-cover"
                        />
                      ) : null}
                      <p className="mt-3 text-lg font-semibold text-brand-text">{horse.name}</p>
                      <p className="mt-1 text-sm text-brand-secondary">
                        {horse.age ? `Edad: ${horse.age}` : "Edad no informada"}
                      </p>
                      {horse.breed ? (
                        <p className="mt-1 text-sm text-brand-secondary">Raza: {horse.breed}</p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClassDetailHeader } from "@/components/classes/ClassDetailHeader";
import { ReserveClassButton } from "@/components/classes/ReserveClassButton";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import {
  getArenasByCenter,
  getCenterById,
  getClassById,
  getReservationsByRider,
} from "@/lib/services";
import { getUserCenterMemberships } from "@/lib/services/memberService";
import { Arena } from "@/lib/firestore/arenas";
import { Class, ClassReservation } from "@/lib/services/types";

export default function RiderClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = params.classId;
  const { user, profile, loading: authLoading, error: authError } = useAuthUser();

  const [classItem, setClassItem] = useState<Class | null>(null);
  const [centerId, setCenterId] = useState<string | null>(null);
  const [centerName, setCenterName] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ClassReservation | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [trainers, setTrainers] = useState<CenterPersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !classId) return;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const memberships = await getUserCenterMemberships(user.uid);
        const activeMemberships = memberships.filter((item) => item.status === "active");
        const preferredCenters = [
          profile?.activeCenterId,
          ...activeMemberships.map((membership) => membership.centerId),
        ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

        let resolvedCenterId: string | null = null;
        let resolvedClass: Class | null = null;

        for (const candidateCenterId of preferredCenters) {
          const candidateClass = await getClassById(candidateCenterId, classId);
          if (candidateClass && (candidateClass.status === "published" || candidateClass.status === "full")) {
            resolvedCenterId = candidateCenterId;
            resolvedClass = candidateClass;
            break;
          }
        }

        if (!resolvedCenterId || !resolvedClass) {
          setClassItem(null);
          setCenterId(null);
          return;
        }

        const [reservationRows, arenaRows, trainerRows, center] = await Promise.all([
          getReservationsByRider(resolvedCenterId, user.uid),
          getArenasByCenter(resolvedCenterId),
          getCenterPersonOptions(resolvedCenterId),
          getCenterById(resolvedCenterId),
        ]);

        setClassItem(resolvedClass);
        setCenterId(resolvedCenterId);
        setCenterName(center?.name ?? null);
        setReservation(
          reservationRows.find((item) => item.classId === resolvedClass.id) ?? null
        );
        setArenas(arenaRows);
        setTrainers(trainerRows);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudo cargar el detalle de la clase.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, classId, profile?.activeCenterId, user]);

  const arenaMap = useMemo(() => new Map(arenas.map((arena) => [arena.id, arena.name] as const)), [arenas]);
  const trainerMap = useMemo(
    () => new Map(trainers.map((trainer) => [trainer.id, trainer.label] as const)),
    [trainers]
  );

  const handleReserved = (nextReservation: ClassReservation) => {
    setReservation(nextReservation);
    setClassItem((current) =>
      current
        ? {
            ...current,
            availableSpots: Math.max(current.availableSpots - 1, 0),
            status:
              current.availableSpots - 1 <= 0 && current.status !== "cancelled" && current.status !== "completed"
                ? "full"
                : current.status,
          }
        : current
    );
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando clase...</p>
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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/clases" className="text-sm font-medium text-brand-primary hover:underline">
              Volver a clases
            </Link>
            <p className="mt-2 text-sm text-brand-secondary">{centerName ?? "Centro activo"}</p>
          </div>
        </header>

        {authError ? <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{authError}</p> : null}
        {error ? <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p> : null}

        {!classItem || !centerId ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 text-sm text-brand-secondary shadow-sm">
            No tienes acceso a esta clase o ya no esta publicada.
          </section>
        ) : (
          <>
            <ClassDetailHeader
              classItem={classItem}
              arenaLabel={classItem.arenaId ? arenaMap.get(classItem.arenaId) : undefined}
              trainerLabel={classItem.trainerId ? trainerMap.get(classItem.trainerId) : undefined}
            />

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-3xl border border-brand-border bg-white/85 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-brand-text">Resumen rapido</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-brand-secondary">Centro</p>
                    <p className="mt-1 font-semibold text-brand-text">{centerName ?? centerId}</p>
                  </div>
                  <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-brand-secondary">Precio</p>
                    <p className="mt-1 font-semibold text-brand-text">
                      {typeof classItem.price === "number" ? `${classItem.price.toFixed(2)} EUR` : "A consultar"}
                    </p>
                  </div>
                </div>
              </article>

              <article className="rounded-3xl border border-brand-border bg-white/85 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-brand-text">Reserva tu plaza</h2>
                <p className="mt-2 text-sm text-brand-secondary">
                  Confirma tu asistencia y bloquea tu hueco en esta sesion.
                </p>
                <div className="mt-5">
                  <ReserveClassButton
                    centerId={centerId}
                    classItem={classItem}
                    riderId={user.uid}
                    reservation={reservation}
                    onReserved={handleReserved}
                  />
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

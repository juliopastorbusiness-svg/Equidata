"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import {
  Class,
  ClassReservation,
  getArenasByCenter,
  getCenterById,
  getClassesByCenter,
  getReservationsByRider,
} from "@/lib/services";
import { getUserCenterMemberships } from "@/lib/services/memberService";
import { Arena } from "@/lib/firestore/arenas";
import { RiderReservationItem } from "@/components/reservations/ReservationCard";
import { RiderReservationList } from "@/components/reservations/RiderReservationList";

type CenterReservationData = {
  centerId: string;
  centerName: string;
  reservations: ClassReservation[];
  classMap: Map<string, Class>;
  arenaMap: Map<string, string>;
  trainerMap: Map<string, string>;
};

const isCancelledStatus = (status: ClassReservation["status"]) =>
  status === "cancelled" || status === "CANCELLED";

const isPastStatus = (status: ClassReservation["status"]) =>
  status === "completed" ||
  status === "COMPLETED" ||
  status === "no_show" ||
  status === "NO_SHOW";

const getStatusMeta = (status: ClassReservation["status"]) => {
  switch (status) {
    case "pending":
    case "RESERVED":
      return { label: "Pendiente", tone: "warning" as const };
    case "confirmed":
    case "CONFIRMED":
      return { label: "Confirmada", tone: "success" as const };
    case "completed":
    case "COMPLETED":
      return { label: "Completada", tone: "muted" as const };
    case "no_show":
    case "NO_SHOW":
      return { label: "No show", tone: "muted" as const };
    case "cancelled":
    case "CANCELLED":
      return { label: "Cancelada", tone: "muted" as const };
    default:
      return { label: status, tone: "muted" as const };
  }
};

type InternalReservationItem = RiderReservationItem & {
  startsAtMs: number;
  endsAtMs: number;
};

const sortByDateAsc = (left: InternalReservationItem, right: InternalReservationItem) =>
  left.startsAtMs - right.startsAtMs;

const sortByDateDesc = (left: InternalReservationItem, right: InternalReservationItem) =>
  right.startsAtMs - left.startsAtMs;

export default function RiderReservationsPage() {
  const { user, loading: authLoading, error: authError } = useAuthUser();
  const [items, setItems] = useState<InternalReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const centerData = await Promise.all(
          activeMemberships.map(async (membership): Promise<CenterReservationData> => {
            const centerId = membership.centerId;
            const [reservations, classes, arenas, trainers, center] = await Promise.all([
              getReservationsByRider(centerId, user.uid),
              getClassesByCenter(centerId),
              getArenasByCenter(centerId),
              getCenterPersonOptions(centerId),
              getCenterById(centerId),
            ]);

            return {
              centerId,
              centerName: center?.name ?? "Centro",
              reservations,
              classMap: new Map(classes.map((classItem) => [classItem.id, classItem] as const)),
              arenaMap: new Map(arenas.map((arena: Arena) => [arena.id, arena.name] as const)),
              trainerMap: new Map(
                trainers.map((trainer: CenterPersonOption) => [trainer.id, trainer.label] as const)
              ),
            };
          })
        );

        const nextItems = centerData.flatMap((centerItem) =>
          centerItem.reservations.map((reservation) => {
            const classItem = centerItem.classMap.get(reservation.classId);
            const startsAt = classItem?.startAt.toDate() ?? reservation.reservedAt?.toDate() ?? new Date(0);
            const endsAt = classItem?.endAt.toDate() ?? startsAt;
            const statusMeta = getStatusMeta(reservation.status);

            return {
              id: reservation.id,
              centerId: centerItem.centerId,
              centerName: centerItem.centerName,
              classId: reservation.classId,
              classTitle: classItem?.title ?? "Clase no disponible",
              discipline: classItem?.discipline ?? "Sin disciplina",
              level: classItem?.level ?? "Sin nivel",
              dateLabel: startsAt.toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }),
              timeLabel: classItem ? `${classItem.startTime} - ${classItem.endTime}` : "Horario no disponible",
              arenaLabel: classItem?.arenaId ? centerItem.arenaMap.get(classItem.arenaId) ?? "Pista no disponible" : "Sin pista",
              trainerLabel: classItem?.trainerId
                ? centerItem.trainerMap.get(classItem.trainerId) ?? "Profesor no disponible"
                : "Sin profesor",
              status: reservation.status,
              statusLabel: statusMeta.label,
              statusTone: statusMeta.tone,
              startsAtMs: startsAt.getTime(),
              endsAtMs: endsAt.getTime(),
            };
          })
        );

        setItems(nextItems);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudieron cargar tus reservas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user]);

  const sections = useMemo(() => {
    const now = Date.now();

    const upcoming = items
      .filter((item) => !isCancelledStatus(item.status) && !isPastStatus(item.status) && item.endsAtMs >= now)
      .sort(sortByDateAsc);

    const past = items
      .filter((item) => !isCancelledStatus(item.status) && (isPastStatus(item.status) || item.endsAtMs < now))
      .sort(sortByDateDesc);

    const cancelled = items.filter((item) => isCancelledStatus(item.status)).sort(sortByDateDesc);

    return { upcoming, past, cancelled };
  }, [items]);

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando reservas...</p>
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
              <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">Rider area</p>
              <h1 className="mt-2 text-3xl font-semibold">Mis reservas</h1>
              <p className="mt-2 max-w-2xl text-sm text-brand-secondary">
                Consulta tus proximas clases, revisa el historial y controla cualquier cancelacion desde un solo lugar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/clases"
                className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
              >
                Ver clases
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

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-brand-secondary">Proximas</p>
            <p className="mt-2 text-3xl font-semibold">{sections.upcoming.length}</p>
          </article>
          <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-brand-secondary">Pasadas</p>
            <p className="mt-2 text-3xl font-semibold">{sections.past.length}</p>
          </article>
          <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-brand-secondary">Canceladas</p>
            <p className="mt-2 text-3xl font-semibold">{sections.cancelled.length}</p>
          </article>
        </section>

        <RiderReservationList
          title="Proximas reservas"
          description="Tus clases confirmadas o pendientes que todavia no han terminado."
          items={sections.upcoming}
          emptyTitle="No tienes reservas proximas"
          emptyDescription="Cuando reserves una clase publicada, aparecera aqui con todos sus detalles."
        />

        <RiderReservationList
          title="Reservas pasadas"
          description="Sesiones ya realizadas, completadas o marcadas como no show."
          items={sections.past}
          emptyTitle="Todavia no hay historial"
          emptyDescription="Aqui veras el rastro de tus clases anteriores en todos tus centros activos."
        />

        <RiderReservationList
          title="Reservas canceladas"
          description="Reservas anuladas por ti o por el centro."
          items={sections.cancelled}
          emptyTitle="No hay cancelaciones"
          emptyDescription="Las reservas canceladas se agruparan aqui para que mantengas trazabilidad."
        />
      </div>
    </main>
  );
}

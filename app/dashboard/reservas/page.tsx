"use client";

import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import {
  DashboardReservationRow,
  ReservationTable,
} from "@/components/dashboard/reservations/ReservationTable";
import { db } from "@/lib/firebase";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  Class,
  ClassReservation,
  FirestoreUserProfileDoc,
  getClassesByCenter,
  getReservationsByCenter,
  getReservationsByClass,
} from "@/lib/services";

type FiltersState = {
  classId: string;
  date: string;
};

const emptyFilters: FiltersState = {
  classId: "",
  date: "",
};

const formatDateTime = (value?: Date | null) => {
  if (!value) return "Sin fecha";
  return value.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatClassWindow = (classItem?: Class) => {
  if (!classItem) return "Clase no disponible";
  return `${classItem.startAt.toDate().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${classItem.startTime} - ${classItem.endTime}`;
};

const toDateKey = (value?: Date | null) => {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const loadUserNames = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const entries = await Promise.all(
    uniqueIds.map(async (userId) => {
      const snapshot = await getDoc(doc(db, "users", userId));
      if (!snapshot.exists()) return [userId, userId] as const;
      const data = snapshot.data() as FirestoreUserProfileDoc;
      return [
        userId,
        data.fullName?.trim() ||
          data.displayName?.trim() ||
          data.name?.trim() ||
          data.email?.trim() ||
          userId,
      ] as const;
    })
  );

  return new Map(entries);
};

const mapRows = (
  reservations: ClassReservation[],
  classMap: Map<string, Class>,
  riderMap: Map<string, string>
): DashboardReservationRow[] =>
  reservations.map((reservation) => {
    const classItem = classMap.get(reservation.classId);
    const reservedAt = reservation.reservedAt?.toDate() ?? reservation.reservationDate?.toDate() ?? null;

    return {
      id: reservation.id,
      classId: reservation.classId,
      classTitle: classItem?.title ?? "Clase no disponible",
      riderName: riderMap.get(reservation.riderId) ?? reservation.riderId,
      status: reservation.status,
      reservedAtLabel: formatDateTime(reservedAt),
      reservedAtDateKey: toDateKey(reservedAt),
      reservedAtMs: reservedAt?.getTime() ?? 0,
      classDateLabel: formatClassWindow(classItem),
      centerHref: `/dashboard/clases/${reservation.classId}`,
    };
  });

export default function DashboardReservationsPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [filters, setFilters] = useState<FiltersState>(emptyFilters);
  const [classes, setClasses] = useState<Class[]>([]);
  const [rows, setRows] = useState<DashboardReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      setClasses([]);
      setRows([]);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const classRows = await getClassesByCenter(activeCenterId);
        setClasses(classRows);
        const classMap = new Map(classRows.map((classItem) => [classItem.id, classItem] as const));

        const reservations =
          filters.classId
            ? await getReservationsByClass(activeCenterId, filters.classId)
            : await getReservationsByCenter(activeCenterId);

        const riderMap = await loadUserNames(reservations.map((reservation) => reservation.riderId));
        setRows(mapRows(reservations, classMap, riderMap));
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudieron cargar las reservas del centro.");
      } finally {
        setLoading(false);
      }
    })();
  }, [activeCenterId, filters.classId]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => (filters.date ? row.reservedAtDateKey === filters.date : true))
      .sort((left, right) => right.reservedAtMs - left.reservedAtMs);
  }, [filters.date, rows]);

  const totals = useMemo(() => {
    return {
      total: rows.length,
      confirmed: rows.filter(
        (row) => row.status === "confirmed" || row.status === "CONFIRMED"
      ).length,
      cancelled: rows.filter(
        (row) => row.status === "cancelled" || row.status === "CANCELLED"
      ).length,
    };
  }, [rows]);

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando reservas...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Reservas"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{guardError}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        {!activeCenterId ? (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
            No tienes centro activo.
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Reservas totales</p>
                <p className="mt-2 text-3xl font-semibold">{totals.total}</p>
              </article>
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Confirmadas</p>
                <p className="mt-2 text-3xl font-semibold">{totals.confirmed}</p>
              </article>
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Canceladas</p>
                <p className="mt-2 text-3xl font-semibold">{totals.cancelled}</p>
              </article>
            </section>

            <section className="rounded-3xl border border-brand-border bg-white/85 p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-brand-text">
                  Clase
                  <select
                    value={filters.classId}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, classId: event.target.value }))
                    }
                    className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <option value="">Todas las clases</option>
                    {classes.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-brand-text">
                  Fecha de reserva
                  <input
                    type="date"
                    value={filters.date}
                    onChange={(event) =>
                      setFilters((current) => ({ ...current, date: event.target.value }))
                    }
                    className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  />
                </label>
              </div>
            </section>

            {loading ? (
              <section className="rounded-3xl border border-brand-border bg-white/80 p-6 text-sm text-brand-secondary shadow-sm">
                Cargando...
              </section>
            ) : (
              <ReservationTable items={filteredRows} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

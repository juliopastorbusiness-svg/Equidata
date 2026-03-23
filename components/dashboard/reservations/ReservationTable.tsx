"use client";

import Link from "next/link";
import { ReservationStatusBadge } from "@/components/dashboard/reservations/ReservationStatusBadge";
import { ClassReservation } from "@/lib/services";

export type DashboardReservationRow = {
  id: string;
  classId: string;
  classTitle: string;
  riderName: string;
  status: ClassReservation["status"];
  reservedAtLabel: string;
  reservedAtDateKey: string;
  reservedAtMs: number;
  classDateLabel: string;
  centerHref: string;
};

type ReservationTableProps = {
  items: DashboardReservationRow[];
};

export function ReservationTable({ items }: ReservationTableProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-brand-border bg-white/80 p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-brand-text">No hay reservas para este filtro</p>
        <p className="mt-2 text-sm text-brand-secondary">
          Ajusta la clase o la fecha para ver otras reservas del centro.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-brand-border bg-white/85 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-border">
          <thead className="bg-brand-background/70">
            <tr className="text-left text-xs uppercase tracking-[0.18em] text-brand-secondary">
              <th className="px-5 py-4 font-semibold">Clase</th>
              <th className="px-5 py-4 font-semibold">Rider</th>
              <th className="px-5 py-4 font-semibold">Estado</th>
              <th className="px-5 py-4 font-semibold">Fecha reserva</th>
              <th className="px-5 py-4 font-semibold">Fecha clase</th>
              <th className="px-5 py-4 font-semibold">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/80">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-5 py-4">
                  <div>
                    <p className="font-semibold text-brand-text">{item.classTitle}</p>
                    <p className="mt-1 text-sm text-brand-secondary">ID {item.classId}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-brand-text">{item.riderName}</p>
                </td>
                <td className="px-5 py-4">
                  <ReservationStatusBadge status={item.status} />
                </td>
                <td className="px-5 py-4 text-sm text-brand-secondary">{item.reservedAtLabel}</td>
                <td className="px-5 py-4 text-sm text-brand-secondary">{item.classDateLabel}</td>
                <td className="px-5 py-4">
                  <Link
                    href={item.centerHref}
                    className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-brand-background"
                  >
                    Ver clase
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

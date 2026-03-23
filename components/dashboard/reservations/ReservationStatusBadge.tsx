"use client";

import { ClassReservation } from "@/lib/services";

type ReservationStatusBadgeProps = {
  status: ClassReservation["status"];
};

const badgeMeta: Record<
  ClassReservation["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  confirmed: {
    label: "Confirmada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Cancelada",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  completed: {
    label: "Completada",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  no_show: {
    label: "No show",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
  RESERVED: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  CONFIRMED: {
    label: "Confirmada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  CANCELLED: {
    label: "Cancelada",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  COMPLETED: {
    label: "Completada",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  NO_SHOW: {
    label: "No show",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  const meta = badgeMeta[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

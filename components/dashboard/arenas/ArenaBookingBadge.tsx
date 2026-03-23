"use client";

import { ArenaBooking } from "@/lib/services";

type ArenaBookingBadgeProps = {
  sourceType: ArenaBooking["sourceType"];
  status: ArenaBooking["status"];
  hasConflict?: boolean;
};

const sourceTypeMeta: Record<ArenaBooking["sourceType"], { label: string; className: string }> = {
  class: {
    label: "Clase",
    className: "border-sky-200 bg-sky-50 text-sky-700",
  },
  training: {
    label: "Training",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  },
  maintenance: {
    label: "Mantenimiento",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  internal_block: {
    label: "Bloque interno",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  },
};

const statusMeta: Record<ArenaBooking["status"], { label: string; className: string }> = {
  active: {
    label: "Activo",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    label: "Cancelado",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
  completed: {
    label: "Completado",
    className: "border-brand-border bg-white text-brand-secondary",
  },
};

export function ArenaBookingBadge({
  sourceType,
  status,
  hasConflict = false,
}: ArenaBookingBadgeProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${sourceTypeMeta[sourceType].className}`}
      >
        {sourceTypeMeta[sourceType].label}
      </span>
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusMeta[status].className}`}
      >
        {statusMeta[status].label}
      </span>
      {hasConflict ? (
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
          Conflicto
        </span>
      ) : null}
    </div>
  );
}

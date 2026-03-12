"use client";

import Link from "next/link";
import { Paddock } from "@/lib/services";
import { PaddockOccupancyBadge } from "@/components/center/paddocks/PaddockOccupancyBadge";

type PaddockCardProps = {
  paddock: Paddock;
  occupied: number;
  horseNames: string[];
};

const statusLabels: Record<Paddock["status"], string> = {
  AVAILABLE: "Disponible",
  OCCUPIED: "Ocupado",
  MAINTENANCE: "Mantenimiento",
  UNAVAILABLE: "No disponible",
};

const statusClassName: Record<Paddock["status"], string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  OCCUPIED: "bg-amber-100 text-amber-800",
  MAINTENANCE: "bg-slate-200 text-slate-700",
  UNAVAILABLE: "bg-red-100 text-red-800",
};

const typeLabels: Record<Paddock["type"], string> = {
  INDIVIDUAL: "Individual",
  SHARED: "Compartido",
  REST: "Descanso",
  REHABILITATION: "Rehabilitación",
};

export function PaddockCard({ paddock, occupied, horseNames }: PaddockCardProps) {
  return (
    <Link
      href={`/dashboard/center/paddocks/${paddock.id}`}
      className="block rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-brand-text">{paddock.name}</h3>
          <p className="text-sm text-brand-secondary">
            {paddock.code || "Sin código"} · {typeLabels[paddock.type]}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[paddock.status]}`}
        >
          {statusLabels[paddock.status]}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Ocupación</p>
          <div className="mt-1">
            <PaddockOccupancyBadge occupied={occupied} maxCapacity={paddock.maxCapacity} />
          </div>
        </div>
        <div className="text-right text-sm text-brand-secondary">
          <p>{paddock.location || "Ubicación sin indicar"}</p>
          <p>{paddock.surface || "Superficie sin indicar"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-brand-background/60 p-3">
        <p className="text-xs uppercase tracking-wide text-brand-secondary">Caballos</p>
        {horseNames.length === 0 ? (
          <p className="mt-2 text-sm text-brand-secondary">Sin caballos activos.</p>
        ) : (
          <p className="mt-2 text-sm text-brand-text">{horseNames.slice(0, 4).join(", ")}</p>
        )}
      </div>
    </Link>
  );
}


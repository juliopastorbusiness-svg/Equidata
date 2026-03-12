"use client";

import Link from "next/link";
import { AlertBadge } from "@/components/stables/AlertBadge";
import { HorseListItem } from "@/lib/horses";

type HorseCardProps = {
  item: HorseListItem;
  href: string;
};

const statusClassName: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  RESTING: "bg-sky-100 text-sky-800",
  RECOVERING: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-slate-200 text-slate-700",
  ARCHIVED: "bg-stone-200 text-stone-700",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Activo",
  RESTING: "Descanso",
  RECOVERING: "Recuperacion",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
};

const formatAge = (age?: number) => {
  if (typeof age !== "number") return "Sin dato";
  return `${age} ${age === 1 ? "ano" : "anos"}`;
};

const formatArrival = (millis?: number) => {
  if (!millis) return "Sin fecha";
  return new Date(millis).toLocaleDateString("es-ES");
};

export function HorseCard({ item, href }: HorseCardProps) {
  const status = item.horse.status;

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-brand-border bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-brand-text">
            {item.horse.name}
          </h3>
          <p className="text-sm text-brand-secondary">
            {item.horse.breed || "Raza sin indicar"} - {formatAge(item.horse.age)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[status] ?? "bg-slate-100 text-slate-700"}`}
        >
          {statusLabel[status] ?? status}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-brand-secondary">Box</dt>
          <dd className="font-medium text-brand-text">
            {item.assignedBox || "Sin asignar"}
          </dd>
        </div>
        <div>
          <dt className="text-brand-secondary">Propietario</dt>
          <dd className="truncate font-medium text-brand-text">{item.ownerLabel}</dd>
        </div>
        <div>
          <dt className="text-brand-secondary">Llegada</dt>
          <dd className="font-medium text-brand-text">
            {formatArrival(item.arrivalAt?.toMillis())}
          </dd>
        </div>
        <div>
          <dt className="text-brand-secondary">Alertas</dt>
          <dd className="font-medium text-brand-text">
            {item.activeAlerts.length === 0
              ? "Sin alertas"
              : `${item.activeAlerts.length} activa${item.activeAlerts.length === 1 ? "" : "s"}`}
          </dd>
        </div>
      </dl>

      {item.activeAlerts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {item.activeAlerts.slice(0, 3).map((alert) => (
            <AlertBadge key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </Link>
  );
}

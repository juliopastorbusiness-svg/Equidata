"use client";

import { ProCenterRequestState, ProCenterSearchResult } from "@/components/dashboard/pro/types";

type ProfessionalCenterSearchCardProps = {
  center: ProCenterSearchResult;
  state: ProCenterRequestState;
  onRequest: (center: ProCenterSearchResult) => void;
};

const stateLabel: Record<ProCenterRequestState, string> = {
  none: "Solicitar acceso",
  pending: "Solicitud enviada",
  accepted: "Acceso concedido",
  rejected: "Solicitar de nuevo",
  cancelled: "Solicitar acceso",
  member: "Ya perteneces",
};

const stateBadge: Record<ProCenterRequestState, string> = {
  none: "border-slate-300 bg-slate-100 text-slate-700",
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  accepted: "border-emerald-300 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-300 bg-rose-50 text-rose-700",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700",
  member: "border-emerald-300 bg-emerald-50 text-emerald-700",
};

export function ProfessionalCenterSearchCard({
  center,
  state,
  onRequest,
}: ProfessionalCenterSearchCardProps) {
  const logoUrl = center.logoUrl || center.profileImageUrl || "";
  const disabled = state === "pending" || state === "accepted" || state === "member";

  return (
    <article className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-white">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={center.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-semibold text-brand-primary">
              {center.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="truncate text-lg font-semibold text-brand-text">{center.name}</h3>
            <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${stateBadge[state]}`}>
              {state === "pending" ? "Pendiente" : state === "accepted" || state === "member" ? "Activo" : state === "rejected" ? "Rechazada" : "Nuevo"}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-secondary">
            {[center.city, center.province].filter(Boolean).join(", ") || "Ubicacion sin completar"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-brand-border bg-white/70 p-3">
          <p className="text-brand-secondary">Caballos</p>
          <p className="font-semibold text-brand-text">{center.horseCount ?? 0}</p>
        </div>
        <div className="rounded-xl border border-brand-border bg-white/70 p-3">
          <p className="text-brand-secondary">Profesionales</p>
          <p className="font-semibold text-brand-text">{center.professionalCount ?? 0}</p>
        </div>
      </div>

      {state === "pending" ? (
        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
          Solicitud enviada correctamente. Pendiente de revision.
        </p>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequest(center)}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {stateLabel[state]}
      </button>
    </article>
  );
}

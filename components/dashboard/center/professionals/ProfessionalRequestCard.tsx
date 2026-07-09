"use client";

import {
  ProfessionalProfileSummary,
  ProfessionalRequest,
} from "@/lib/services/professionalRequestService";

type ProfessionalRequestCardProps = {
  request: ProfessionalRequest;
  profile?: ProfessionalProfileSummary | null;
  variant: "pending" | "active" | "history";
  busy?: boolean;
  onViewProfile: (request: ProfessionalRequest) => void;
  onAccept?: (request: ProfessionalRequest) => void;
  onReject?: (request: ProfessionalRequest) => void;
  onManagePermissions?: (request: ProfessionalRequest) => void;
  onRemoveAccess?: (request: ProfessionalRequest) => void;
};

const statusLabel: Record<ProfessionalRequest["status"], string> = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

const statusClassName: Record<ProfessionalRequest["status"], string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  accepted: "border-emerald-300 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-300 bg-rose-50 text-rose-700",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700",
};

const dateLabel = (request: ProfessionalRequest) => {
  const timestamp = request.acceptedAt ?? request.createdAt;
  return timestamp ? timestamp.toDate().toLocaleDateString("es-ES") : "-";
};

export function ProfessionalRequestCard({
  request,
  profile,
  variant,
  busy = false,
  onViewProfile,
  onAccept,
  onReject,
  onManagePermissions,
  onRemoveAccess,
}: ProfessionalRequestCardProps) {
  const photoUrl = profile?.photoUrl || request.professionalPhoto || "";
  const name = profile?.name || request.professionalName;
  const profession = profile?.profession || request.profession;

  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-brand-background">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-semibold text-brand-primary">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-brand-text">{name}</h3>
              <p className="text-sm text-brand-secondary">{profession}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[request.status]}`}>
              {statusLabel[request.status]}
            </span>
          </div>
          {profile?.speciality ? (
            <p className="mt-2 text-sm text-brand-secondary">Especialidad: {profile.speciality}</p>
          ) : null}
          {profile?.province ? (
            <p className="mt-1 text-sm text-brand-secondary">Provincia: {profile.province}</p>
          ) : null}
          <p className="mt-1 text-sm text-brand-secondary">
            {variant === "active" ? "Fecha incorporacion" : "Fecha solicitud"}: {dateLabel(request)}
          </p>
        </div>
      </div>

      {variant !== "active" ? (
        <p className="mt-4 whitespace-pre-wrap rounded-2xl border border-brand-border bg-brand-background/50 p-3 text-sm text-brand-secondary">
          {request.message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => onViewProfile(request)}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-brand-background"
        >
          Ver perfil
        </button>
        {variant === "pending" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onAccept?.(request)}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
            >
              Aceptar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject?.(request)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Rechazar
            </button>
          </>
        ) : null}
        {variant === "active" ? (
          <>
            <button
              type="button"
              onClick={() => onManagePermissions?.(request)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-brand-background"
            >
              Gestionar permisos
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemoveAccess?.(request)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
            >
              Eliminar acceso
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

"use client";

import { ProfessionalRequest } from "@/lib/services/professionalRequestService";

type ProfessionalRequestsListProps = {
  requests: ProfessionalRequest[];
  cancellingRequestId?: string | null;
  onCancel: (requestId: string) => void;
  onEnterCenter: (centerId: string) => void;
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

const dateLabel = (request: ProfessionalRequest) =>
  request.createdAt ? request.createdAt.toDate().toLocaleDateString("es-ES") : "-";

export function ProfessionalRequestsList({
  requests,
  cancellingRequestId = null,
  onCancel,
  onEnterCenter,
}: ProfessionalRequestsListProps) {
  const statusCounts = {
    pending: requests.filter((request) => request.status === "pending").length,
    accepted: requests.filter((request) => request.status === "accepted").length,
    rejected: requests.filter((request) => request.status === "rejected").length,
    cancelled: requests.filter((request) => request.status === "cancelled").length,
  };

  return (
    <section id="pro-requests" className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-brand-text">Mis solicitudes</h2>
        <p className="mt-1 text-sm text-brand-secondary">
          Revisa el estado de tus solicitudes de colaboracion con centros hipicos.
        </p>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        {(["pending", "accepted", "rejected", "cancelled"] as const).map((status) => (
          <div key={status} className={`rounded-2xl border p-3 text-sm ${statusClassName[status]}`}>
            <p className="font-semibold">{statusLabel[status]}</p>
            <p className="mt-1 text-xl font-bold">{statusCounts[status]}</p>
          </div>
        ))}
      </div>

      {requests.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <article key={request.id} className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-brand-text">{request.centerName}</h3>
                  <p className="mt-1 text-sm text-brand-secondary">Fecha: {dateLabel(request)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[request.status]}`}>
                  {statusLabel[request.status]}
                </span>
              </div>

              <p className="mt-4 line-clamp-5 text-sm text-brand-secondary">{request.message}</p>

              {request.status === "pending" ? (
                <button
                  type="button"
                  disabled={cancellingRequestId === request.id}
                  onClick={() => onCancel(request.id)}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {cancellingRequestId === request.id ? "Cancelando..." : "Cancelar solicitud"}
                </button>
              ) : null}

              {request.status === "accepted" ? (
                <button
                  type="button"
                  onClick={() => onEnterCenter(request.centerId)}
                  className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                >
                  Entrar al centro
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
          Todavia no has enviado solicitudes.
        </p>
      )}
    </section>
  );
}

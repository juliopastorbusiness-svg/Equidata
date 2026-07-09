"use client";

import { FormEvent, useState } from "react";
import { ProfessionalRequest } from "@/lib/services/professionalRequestService";

type RejectProfessionalRequestModalProps = {
  request: ProfessionalRequest | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function RejectProfessionalRequestModal({
  request,
  submitting = false,
  onClose,
  onConfirm,
}: RejectProfessionalRequestModalProps) {
  const [reason, setReason] = useState("");

  if (!request) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onConfirm(reason);
    setReason("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">Rechazar solicitud</h2>
            <p className="mt-1 text-sm text-brand-secondary">{request.professionalName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border text-brand-text transition hover:border-brand-primary"
            aria-label="Cerrar modal"
          >
            x
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-brand-secondary">
            Motivo
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={5}
              className="mt-1 w-full rounded-2xl border border-brand-border bg-brand-background px-3 py-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Puedes indicar el motivo del rechazo."
            />
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-brand-background"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-red-700 px-5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
            >
              {submitting ? "Rechazando..." : "Confirmar rechazo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

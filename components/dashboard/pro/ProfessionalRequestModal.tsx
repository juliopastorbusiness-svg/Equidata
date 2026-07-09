"use client";

import { FormEvent, useState } from "react";
import { ProCenterSearchResult } from "@/components/dashboard/pro/types";

type ProfessionalRequestModalProps = {
  center: ProCenterSearchResult | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
};

export function ProfessionalRequestModal({
  center,
  submitting = false,
  onClose,
  onSubmit,
}: ProfessionalRequestModalProps) {
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!center) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!message.trim()) {
      setError("El mensaje es obligatorio.");
      return;
    }

    if (!accepted) {
      setError("Debes aceptar compartir tu perfil profesional.");
      return;
    }

    await onSubmit(message);
    setMessage("");
    setAccepted(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">Solicitar colaboracion</h2>
            <p className="mt-1 text-sm text-brand-secondary">{center.name}</p>
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
            Mensaje
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={1000}
              rows={6}
              className="mt-1 w-full rounded-2xl border border-brand-border bg-brand-background px-3 py-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              placeholder="Presentate brevemente y explica por que deseas colaborar con este centro."
            />
          </label>
          <p className="text-right text-xs text-brand-secondary">{message.length}/1000</p>

          <label className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-background/70 p-4 text-sm text-brand-text">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-brand-border"
            />
            <span>He leido y acepto compartir mi perfil profesional con este centro.</span>
          </label>

          {error ? (
            <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

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
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Enviar solicitud"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

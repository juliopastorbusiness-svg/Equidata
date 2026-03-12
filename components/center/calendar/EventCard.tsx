"use client";

import { Event } from "@/lib/services";

type EventCardProps = {
  event: Event;
  arenaLabel?: string;
  trainerLabel?: string;
  horseLabels: string[];
  studentLabels: string[];
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => Promise<void>;
};

const typeLabels: Record<Event["type"], string> = {
  CLASS: "Clase",
  TRAINING: "Entrenamiento",
  COMPETITION: "Competicion",
  VET_REVIEW: "Revision veterinaria",
  FARRIER: "Herrador",
  GENERAL: "Evento general",
  INTERNAL_TASK: "Tarea interna",
};

const statusClasses: Record<Event["status"], string> = {
  SCHEDULED: "border-blue-200 bg-blue-50 text-blue-700",
  CONFIRMED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
  COMPLETED: "border-slate-200 bg-slate-100 text-slate-700",
};

const formatDateTime = (date: Date) =>
  date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function EventCard({
  event,
  arenaLabel,
  trainerLabel,
  horseLabels,
  studentLabels,
  onEdit,
  onDelete,
}: EventCardProps) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-brand-text">{event.title}</h3>
            <span className="rounded-full border border-brand-border px-2 py-1 text-xs text-brand-secondary">
              {typeLabels[event.type]}
            </span>
            <span
              className={`rounded-full border px-2 py-1 text-xs font-medium ${statusClasses[event.status]}`}
            >
              {event.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-secondary">
            {formatDateTime(event.startAt.toDate())} - {formatDateTime(event.endAt.toDate())}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-medium text-brand-text"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => void onDelete(event)}
            className="inline-flex h-10 items-center rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>

      {event.description && (
        <p className="mt-3 text-sm leading-6 text-brand-secondary">{event.description}</p>
      )}

      <div className="mt-3 grid gap-2 text-sm text-brand-secondary md:grid-cols-2">
        <p>Pista: {arenaLabel ?? "Sin pista"}</p>
        <p>Entrenador: {trainerLabel ?? "Sin asignar"}</p>
        <p>Caballos: {horseLabels.length > 0 ? horseLabels.join(", ") : "Sin caballos"}</p>
        <p>Alumnos: {studentLabels.length > 0 ? studentLabels.join(", ") : "Sin alumnos"}</p>
      </div>
    </article>
  );
}

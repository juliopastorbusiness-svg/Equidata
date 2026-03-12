"use client";

import { Event } from "@/lib/services";
import {
  eventStatusLabels,
  eventTypeLabels,
  eventTypeDotClass,
  eventTypeRowClass,
} from "@/components/center/calendar/calendarTheme";

type EventCardProps = {
  event: Event;
  arenaLabel?: string;
  trainerLabel?: string;
  horseLabels: string[];
  studentLabels: string[];
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => Promise<void>;
};

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
    <article className="rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-[0_18px_45px_-35px_rgba(15,23,42,0.4)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${eventTypeDotClass[event.type]}`} />
            <h3 className="truncate text-base font-semibold text-brand-text">{event.title}</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${eventTypeRowClass[event.type]}`}>
              {eventTypeLabels[event.type]}
            </span>
          </div>
          <p className="mt-2 text-sm text-brand-secondary">
            {event.startTime} - {event.endTime} · {eventStatusLabels[event.status]}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="inline-flex h-10 items-center rounded-2xl border border-brand-border bg-brand-background/60 px-3 text-sm font-medium text-brand-text transition hover:bg-white"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => void onDelete(event)}
            className="inline-flex h-10 items-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-sm font-medium text-rose-700"
          >
            Eliminar
          </button>
        </div>
      </div>

      {(event.description || event.notes) && (
        <div className="mt-4 space-y-2 text-sm leading-6 text-brand-secondary">
          {event.description && <p>{event.description}</p>}
          {event.notes && <p>{event.notes}</p>}
        </div>
      )}

      <div className="mt-4 grid gap-2 text-sm text-brand-secondary md:grid-cols-2">
        <p>Ubicacion: {event.location ?? arenaLabel ?? "Sin ubicacion"}</p>
        <p>Entrenador: {trainerLabel ?? "Sin asignar"}</p>
        <p>Caballos: {horseLabels.length > 0 ? horseLabels.join(", ") : "Sin caballos"}</p>
        <p>Alumnos: {studentLabels.length > 0 ? studentLabels.join(", ") : "Sin alumnos"}</p>
      </div>
    </article>
  );
}

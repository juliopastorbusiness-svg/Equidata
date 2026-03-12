"use client";

import { ReactNode } from "react";
import { Event } from "@/lib/services";
import { EventCard } from "@/components/center/calendar/EventCard";

type DayEventsPanelProps = {
  date: Date | null;
  events: Event[];
  arenaLabels: Map<string, string>;
  peopleLabels: Map<string, string>;
  horseLabels: Map<string, string>;
  onAddEvent: () => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (event: Event) => Promise<void>;
  children?: ReactNode;
};

export function DayEventsPanel({
  date,
  events,
  arenaLabels,
  peopleLabels,
  horseLabels,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  children,
}: DayEventsPanelProps) {
  if (!date) {
    return (
      <aside className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
        <h3 className="text-lg font-semibold text-brand-text">Panel del dia</h3>
        <p className="mt-3 text-sm leading-6 text-brand-secondary">
          Selecciona un dia del calendario para ver el detalle y anadir actividades.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-brand-secondary">Dia seleccionado</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-brand-text">
            {date.toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
        </div>
        <button
          type="button"
          onClick={onAddEvent}
          className="inline-flex h-11 items-center rounded-2xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
        >
          Anadir actividad
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-border bg-brand-background/45 p-4 text-sm text-brand-secondary">
            No hay actividades para este dia.
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              arenaLabel={event.arenaId ? arenaLabels.get(event.arenaId) : undefined}
              trainerLabel={event.trainerId ? peopleLabels.get(event.trainerId) : undefined}
              horseLabels={event.horseIds.map((id) => horseLabels.get(id) ?? id)}
              studentLabels={event.studentIds.map((id) => peopleLabels.get(id) ?? id)}
              onEdit={onEditEvent}
              onDelete={onDeleteEvent}
            />
          ))
        )}
      </div>

      {children && <div className="mt-5 border-t border-brand-border/80 pt-5">{children}</div>}
    </aside>
  );
}

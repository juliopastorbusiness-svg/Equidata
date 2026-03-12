"use client";

import { Class } from "@/lib/services";

type ClassCardProps = {
  item: Class;
  trainerLabel?: string;
  arenaLabel?: string;
  horseLabels: string[];
  studentLabels: string[];
  onEdit: (item: Class) => void;
  onDelete: (item: Class) => Promise<void>;
};

export function ClassCard({
  item,
  trainerLabel,
  arenaLabel,
  horseLabels,
  studentLabels,
  onEdit,
  onDelete,
}: ClassCardProps) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-text">{item.title}</h3>
          <p className="text-sm text-brand-secondary">
            {item.date.toDate().toLocaleDateString("es-ES")} · {item.startTime} - {item.endTime}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-medium text-brand-text"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => void onDelete(item)}
            className="inline-flex h-10 items-center rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-brand-secondary md:grid-cols-2">
        <p>Entrenador: {trainerLabel ?? "Sin asignar"}</p>
        <p>Pista: {arenaLabel ?? "Sin pista"}</p>
        <p>Nivel: {item.requiredLevel}</p>
        <p>Capacidad: {item.capacity}</p>
        <p>Caballos: {horseLabels.length > 0 ? horseLabels.join(", ") : "Sin caballos"}</p>
        <p>Alumnos: {studentLabels.length > 0 ? studentLabels.join(", ") : "Sin alumnos"}</p>
      </div>
      {item.description && <p className="mt-3 text-sm text-brand-secondary">{item.description}</p>}
    </article>
  );
}

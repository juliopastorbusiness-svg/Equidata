"use client";

import { Training } from "@/lib/services";

type TrainingCardProps = {
  item: Training;
  trainerLabel?: string;
  horseLabel?: string;
  arenaLabel?: string;
  onEdit: (item: Training) => void;
  onDelete: (item: Training) => Promise<void>;
};

export function TrainingCard({
  item,
  trainerLabel,
  horseLabel,
  arenaLabel,
  onEdit,
  onDelete,
}: TrainingCardProps) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-text">{item.type}</h3>
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
        <p>Caballo: {horseLabel ?? item.horseId}</p>
        <p>Entrenador: {trainerLabel ?? item.trainerId}</p>
        <p>Intensidad: {item.intensity}</p>
        <p>Pista: {arenaLabel ?? "Sin pista"}</p>
      </div>
      {item.objective && <p className="mt-3 text-sm text-brand-secondary">{item.objective}</p>}
    </article>
  );
}

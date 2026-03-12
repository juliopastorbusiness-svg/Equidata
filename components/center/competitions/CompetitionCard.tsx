"use client";

import { Competition } from "@/lib/services";

type CompetitionCardProps = {
  item: Competition;
  horseLabels: string[];
  riderLabels: string[];
  arenaLabel?: string;
  onEdit: (item: Competition) => void;
  onDelete: (item: Competition) => Promise<void>;
};

export function CompetitionCard({
  item,
  horseLabels,
  riderLabels,
  arenaLabel,
  onEdit,
  onDelete,
}: CompetitionCardProps) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-text">{item.name}</h3>
          <p className="text-sm text-brand-secondary">
            {item.startDate.toDate().toLocaleDateString("es-ES")}
            {item.endDate ? ` - ${item.endDate.toDate().toLocaleDateString("es-ES")}` : ""}
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
        <p>Disciplina: {item.discipline ?? "Sin disciplina"}</p>
        <p>Ubicacion: {item.location ?? "Sin ubicacion"}</p>
        <p>Pista: {arenaLabel ?? "Sin pista"}</p>
        <p>Estado: {item.status}</p>
        <p>Caballos: {horseLabels.length > 0 ? horseLabels.join(", ") : "Sin caballos"}</p>
        <p>Jinetes: {riderLabels.length > 0 ? riderLabels.join(", ") : "Sin jinetes"}</p>
      </div>
    </article>
  );
}

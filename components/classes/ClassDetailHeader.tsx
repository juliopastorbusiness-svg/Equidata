"use client";

import { ClassSpotsBadge } from "@/components/dashboard/classes/ClassSpotsBadge";
import { Class } from "@/lib/services/types";

type ClassDetailHeaderProps = {
  classItem: Class;
  arenaLabel?: string;
  trainerLabel?: string;
};

export function ClassDetailHeader({
  classItem,
  arenaLabel,
  trainerLabel,
}: ClassDetailHeaderProps) {
  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/85 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">{classItem.discipline}</p>
          <h1 className="mt-3 text-3xl font-semibold text-brand-text">{classItem.title}</h1>
          <p className="mt-2 text-sm text-brand-secondary">
            {classItem.date.toDate().toLocaleDateString("es-ES")} · {classItem.startTime} - {classItem.endTime}
          </p>
        </div>
        <ClassSpotsBadge item={classItem} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Nivel</p>
          <p className="mt-1 font-semibold text-brand-text">{classItem.level}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Pista</p>
          <p className="mt-1 font-semibold text-brand-text">{arenaLabel ?? "Sin pista"}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Entrenador</p>
          <p className="mt-1 font-semibold text-brand-text">{trainerLabel ?? "Sin profesor"}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-4">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Modo</p>
          <p className="mt-1 font-semibold text-brand-text">{classItem.bookingMode}</p>
        </div>
      </div>

      {classItem.notes ? (
        <p className="mt-6 max-w-3xl text-sm leading-6 text-brand-secondary">{classItem.notes}</p>
      ) : null}
    </section>
  );
}

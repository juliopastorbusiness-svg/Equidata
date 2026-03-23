"use client";

import Link from "next/link";
import { Class } from "@/lib/services/types";

type RiderUpcomingClassesProps = {
  items: Array<{
    classItem: Class;
    arenaLabel: string;
    trainerLabel: string;
  }>;
};

export function RiderUpcomingClasses({ items }: RiderUpcomingClassesProps) {
  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Próximas clases disponibles</h2>
          <p className="mt-1 text-sm text-brand-secondary">
            Las primeras sesiones publicadas con plazas libres en tu centro activo.
          </p>
        </div>
        <Link href="/clases" className="text-sm font-semibold text-brand-primary hover:underline">
          Ver todas
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-brand-border bg-brand-background/60 px-5 py-8 text-center text-sm text-brand-secondary">
          No hay clases disponibles por ahora.
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map(({ classItem, arenaLabel, trainerLabel }) => (
            <Link
              key={classItem.id}
              href={`/clases/${classItem.id}`}
              className="rounded-[1.5rem] border border-brand-border bg-brand-background/55 p-4 transition hover:border-brand-primary hover:bg-white"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">{classItem.discipline}</p>
                  <p className="mt-2 text-lg font-semibold text-brand-text">{classItem.title}</p>
                  <p className="mt-2 text-sm text-brand-secondary">
                    {classItem.date.toDate().toLocaleDateString("es-ES")} · {classItem.startTime} - {classItem.endTime}
                  </p>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {classItem.availableSpots} plazas
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-brand-border bg-white/70 p-3 text-sm text-brand-secondary">
                  <p className="text-xs uppercase tracking-wide">Pista</p>
                  <p className="mt-1 font-medium text-brand-text">{arenaLabel}</p>
                </div>
                <div className="rounded-xl border border-brand-border bg-white/70 p-3 text-sm text-brand-secondary">
                  <p className="text-xs uppercase tracking-wide">Profesor</p>
                  <p className="mt-1 font-medium text-brand-text">{trainerLabel}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

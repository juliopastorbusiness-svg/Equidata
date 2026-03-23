"use client";

import Link from "next/link";
import { ClassSpotsBadge } from "@/components/dashboard/classes/ClassSpotsBadge";
import { ReserveClassButton } from "@/components/classes/ReserveClassButton";
import { Class, ClassReservation } from "@/lib/services/types";

type ClassCardProps = {
  centerId: string;
  classItem: Class;
  riderId: string;
  trainerLabel?: string;
  arenaLabel?: string;
  reservation: ClassReservation | null;
  onReserved: (reservation: ClassReservation) => void;
};

export function ClassCard({
  centerId,
  classItem,
  riderId,
  trainerLabel,
  arenaLabel,
  reservation,
  onReserved,
}: ClassCardProps) {
  return (
    <article className="rounded-3xl border border-brand-border bg-white/85 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">
            {classItem.discipline}
          </p>
          <Link href={`/clases/${classItem.id}`} className="mt-2 block text-xl font-semibold text-brand-text hover:underline">
            {classItem.title}
          </Link>
          <p className="mt-2 text-sm text-brand-secondary">
            {classItem.date.toDate().toLocaleDateString("es-ES")} · {classItem.startTime} - {classItem.endTime}
          </p>
        </div>
        <ClassSpotsBadge item={classItem} />
      </div>

      <div className="mt-5 grid gap-3 text-sm text-brand-secondary sm:grid-cols-3">
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-3">
          <p className="text-xs uppercase tracking-wide">Nivel</p>
          <p className="mt-1 font-medium text-brand-text">{classItem.level}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-3">
          <p className="text-xs uppercase tracking-wide">Pista</p>
          <p className="mt-1 font-medium text-brand-text">{arenaLabel ?? "Sin pista"}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-3">
          <p className="text-xs uppercase tracking-wide">Profesor</p>
          <p className="mt-1 font-medium text-brand-text">{trainerLabel ?? "Sin profesor"}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/clases/${classItem.id}`}
          className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
        >
          Ver detalle
        </Link>
        <ReserveClassButton
          centerId={centerId}
          classItem={classItem}
          riderId={riderId}
          reservation={reservation}
          onReserved={onReserved}
        />
      </div>
    </article>
  );
}

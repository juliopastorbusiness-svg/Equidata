"use client";

import Link from "next/link";
import { ClassReservation } from "@/lib/services";

export type RiderReservationItem = {
  id: string;
  centerId: string;
  centerName: string;
  classId: string;
  classTitle: string;
  discipline: string;
  level: string;
  dateLabel: string;
  timeLabel: string;
  arenaLabel: string;
  trainerLabel: string;
  status: ClassReservation["status"];
  statusLabel: string;
  statusTone: "success" | "warning" | "muted";
};

type ReservationCardProps = {
  item: RiderReservationItem;
};

const toneClasses: Record<RiderReservationItem["statusTone"], string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  muted: "border-slate-200 bg-slate-100 text-slate-600",
};

export function ReservationCard({ item }: ReservationCardProps) {
  return (
    <article className="rounded-[2rem] border border-brand-border bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">{item.centerName}</p>
          <Link href={`/clases/${item.classId}`} className="mt-2 block text-xl font-semibold text-brand-text hover:underline">
            {item.classTitle}
          </Link>
          <p className="mt-2 text-sm text-brand-secondary">
            {item.dateLabel} · {item.timeLabel}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses[item.statusTone]}`}>
          {item.statusLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Disciplina</p>
          <p className="mt-1 text-sm font-medium text-brand-text">{item.discipline}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Nivel</p>
          <p className="mt-1 text-sm font-medium capitalize text-brand-text">{item.level}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Pista</p>
          <p className="mt-1 text-sm font-medium text-brand-text">{item.arenaLabel}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-background/70 p-3">
          <p className="text-xs uppercase tracking-wide text-brand-secondary">Profesor</p>
          <p className="mt-1 text-sm font-medium text-brand-text">{item.trainerLabel}</p>
        </div>
      </div>
    </article>
  );
}

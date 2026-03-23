"use client";

import Link from "next/link";
import { ClassReservation } from "@/lib/services/types";

type RiderUpcomingReservationItem = {
  reservation: ClassReservation;
  classTitle: string;
  dateLabel: string;
  timeLabel: string;
  arenaLabel: string;
  trainerLabel: string;
  statusLabel: string;
};

type RiderUpcomingReservationsProps = {
  items: RiderUpcomingReservationItem[];
};

export function RiderUpcomingReservations({ items }: RiderUpcomingReservationsProps) {
  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Próximas reservas</h2>
          <p className="mt-1 text-sm text-brand-secondary">
            Tus siguientes sesiones reservadas dentro del centro activo.
          </p>
        </div>
        <Link href="/mis-reservas" className="text-sm font-semibold text-brand-primary hover:underline">
          Ver mis reservas
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-brand-border bg-brand-background/60 px-5 py-8 text-center text-sm text-brand-secondary">
          Aún no tienes reservas próximas.
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <Link
              key={item.reservation.id}
              href={`/clases/${item.reservation.classId}`}
              className="rounded-[1.5rem] border border-brand-border bg-brand-background/55 p-4 transition hover:border-brand-primary hover:bg-white"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-brand-text">{item.classTitle}</p>
                  <p className="mt-2 text-sm text-brand-secondary">
                    {item.dateLabel} · {item.timeLabel}
                  </p>
                </div>
                <div className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                  {item.statusLabel}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-brand-border bg-white/70 p-3 text-sm text-brand-secondary">
                  <p className="text-xs uppercase tracking-wide">Pista</p>
                  <p className="mt-1 font-medium text-brand-text">{item.arenaLabel}</p>
                </div>
                <div className="rounded-xl border border-brand-border bg-white/70 p-3 text-sm text-brand-secondary">
                  <p className="text-xs uppercase tracking-wide">Profesor</p>
                  <p className="mt-1 font-medium text-brand-text">{item.trainerLabel}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

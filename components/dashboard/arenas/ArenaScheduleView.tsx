"use client";

import { ArenaTimeline, ArenaTimelineBooking } from "@/components/dashboard/arenas/ArenaTimeline";

export type ScheduleMode = "day" | "week";

export type ArenaScheduleItem = {
  arenaId: string;
  arenaName: string;
  arenaMeta?: string;
  days: Array<{
    dateKey: string;
    label: string;
    bookings: ArenaTimelineBooking[];
  }>;
};

type ArenaScheduleViewProps = {
  items: ArenaScheduleItem[];
  mode: ScheduleMode;
  selectedDateLabel: string;
};

export function ArenaScheduleView({
  items,
  mode,
  selectedDateLabel,
}: ArenaScheduleViewProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-brand-border bg-white/80 p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-brand-text">No hay pistas disponibles</p>
        <p className="mt-2 text-sm text-brand-secondary">
          Cuando el centro tenga pistas registradas apareceran aqui con su ocupacion real.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      {items.map((item) => (
        <section key={item.arenaId} className="rounded-[2rem] border border-brand-border bg-white/75 p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-brand-text">{item.arenaName}</h2>
              <p className="mt-1 text-sm text-brand-secondary">
                {item.arenaMeta ?? "Ocupacion real basada en arenaBookings"} ·{" "}
                {mode === "day" ? selectedDateLabel : `Semana de ${selectedDateLabel}`}
              </p>
            </div>
          </div>

          <div className={`grid gap-4 ${mode === "week" ? "xl:grid-cols-2" : ""}`}>
            {item.days.map((day) => (
              <ArenaTimeline
                key={`${item.arenaId}-${day.dateKey}`}
                title={mode === "day" ? "Agenda del dia" : day.label}
                subtitle={mode === "day" ? day.label : undefined}
                bookings={day.bookings}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

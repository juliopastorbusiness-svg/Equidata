"use client";

import { ArenaBookingBadge } from "@/components/dashboard/arenas/ArenaBookingBadge";

export type ArenaTimelineBooking = {
  id: string;
  title: string;
  trainerLabel: string;
  startLabel: string;
  endLabel: string;
  sourceType: "class" | "training" | "maintenance" | "internal_block";
  status: "active" | "cancelled" | "completed";
  hasConflict: boolean;
  startAtMs: number;
  endAtMs: number;
};

type ArenaTimelineProps = {
  title: string;
  subtitle?: string;
  bookings: ArenaTimelineBooking[];
  dayStartHour?: number;
  dayEndHour?: number;
};

const HOUR_ROW_HEIGHT = 56;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function ArenaTimeline({
  title,
  subtitle,
  bookings,
  dayStartHour = 6,
  dayEndHour = 23,
}: ArenaTimelineProps) {
  const totalMinutes = (dayEndHour - dayStartHour) * 60;
  const totalHeight = (dayEndHour - dayStartHour) * HOUR_ROW_HEIGHT;
  const hours = Array.from({ length: dayEndHour - dayStartHour + 1 }, (_, index) => dayStartHour + index);

  return (
    <section className="rounded-[1.75rem] border border-brand-border bg-white/90 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-brand-text">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-brand-secondary">{subtitle}</p> : null}
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">
          {bookings.length} bloques
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-[72px_minmax(0,1fr)] gap-4">
          <div className="relative" style={{ height: totalHeight }}>
            {hours.slice(0, -1).map((hour, index) => (
              <div
                key={hour}
                className="absolute left-0 right-0 text-xs text-brand-secondary"
                style={{ top: index * HOUR_ROW_HEIGHT - 8 }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div
            className="relative rounded-[1.5rem] border border-brand-border bg-brand-background/60"
            style={{ height: totalHeight }}
          >
            {hours.slice(0, -1).map((hour, index) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-dashed border-brand-border/70"
                style={{ top: index * HOUR_ROW_HEIGHT }}
              />
            ))}

            {bookings.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-brand-secondary">
                No hay ocupaciones registradas en este tramo.
              </div>
            ) : (
              bookings.map((booking) => {
                const startDate = new Date(booking.startAtMs);
                const endDate = new Date(booking.endAtMs);
                const startMinutes = (startDate.getHours() - dayStartHour) * 60 + startDate.getMinutes();
                const endMinutes = (endDate.getHours() - dayStartHour) * 60 + endDate.getMinutes();
                const top = (clamp(startMinutes, 0, totalMinutes) / totalMinutes) * totalHeight;
                const bottom = (clamp(endMinutes, 0, totalMinutes) / totalMinutes) * totalHeight;
                const height = Math.max(bottom - top, 64);

                return (
                  <div
                    key={booking.id}
                    className={`absolute left-3 right-3 overflow-hidden rounded-[1.35rem] border p-3 shadow-sm ${
                      booking.hasConflict
                        ? "border-rose-300 bg-rose-50/95"
                        : booking.status === "cancelled"
                          ? "border-slate-200 bg-slate-100/95"
                          : "border-brand-border bg-white/95"
                    }`}
                    style={{ top, height }}
                  >
                    <div className="flex h-full flex-col justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-brand-text">{booking.title}</p>
                          <p className="text-xs font-medium text-brand-secondary">
                            {booking.startLabel} - {booking.endLabel}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-brand-secondary">{booking.trainerLabel}</p>
                      </div>
                      <ArenaBookingBadge
                        sourceType={booking.sourceType}
                        status={booking.status}
                        hasConflict={booking.hasConflict}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

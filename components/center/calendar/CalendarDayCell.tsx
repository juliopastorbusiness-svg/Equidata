"use client";

import { Event } from "@/lib/services";
import { eventTypeDotClass } from "@/components/center/calendar/calendarTheme";

type CalendarDayCellProps = {
  date: Date;
  events: Event[];
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onClick: () => void;
};

export function CalendarDayCell({
  date,
  events,
  isCurrentMonth,
  isToday,
  isSelected,
  onClick,
}: CalendarDayCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-h-[138px] rounded-[24px] border p-3 text-left transition ${isSelected ? "border-brand-primary bg-white shadow-[0_18px_40px_-28px_rgba(19,78,74,0.45)]" : "border-white/80 bg-white/70 hover:border-brand-primary/40 hover:bg-white"} ${!isCurrentMonth ? "opacity-45" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full text-sm font-semibold ${isToday ? "bg-brand-primary text-white" : isSelected ? "bg-brand-primary/10 text-brand-primary" : "text-brand-text"}`}
        >
          {date.getDate()}
        </span>
        {events.length > 0 && (
          <span className="text-[11px] font-medium text-brand-secondary">
            {events.length} act.
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        {events.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-2 rounded-xl bg-brand-background/70 px-2.5 py-1.5"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${eventTypeDotClass[event.type]}`} />
            <span className="truncate text-xs font-medium text-brand-text">{event.title}</span>
          </div>
        ))}
        {events.length > 3 && (
          <p className="px-1 text-xs font-medium text-brand-secondary">
            +{events.length - 3} mas
          </p>
        )}
      </div>
    </button>
  );
}

"use client";

import { Event } from "@/lib/services";
import { AgendaMonthHeader } from "@/components/center/calendar/AgendaMonthHeader";
import { CalendarDayCell } from "@/components/center/calendar/CalendarDayCell";

type CenterCalendarProps = {
  events: Event[];
  visibleMonth: Date;
  selectedDate: Date | null;
  onVisibleMonthChange: (value: Date) => void;
  onSelectedDateChange: (value: Date) => void;
};

const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const dayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfMonthGrid = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const day = first.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  first.setDate(first.getDate() + diff);
  first.setHours(0, 0, 0, 0);
  return first;
};

const buildMonthGrid = (date: Date) =>
  Array.from({ length: 42 }, (_, index) => {
    const next = startOfMonthGrid(date);
    next.setDate(next.getDate() + index);
    return next;
  });

const isSameDate = (left: Date | null, right: Date) =>
  Boolean(left) &&
  left!.getFullYear() === right.getFullYear() &&
  left!.getMonth() === right.getMonth() &&
  left!.getDate() === right.getDate();

export function CenterCalendar({
  events,
  visibleMonth,
  selectedDate,
  onVisibleMonthChange,
  onSelectedDateChange,
}: CenterCalendarProps) {
  const gridDays = buildMonthGrid(visibleMonth);
  const eventsByDay = new Map<string, Event[]>();

  events.forEach((event) => {
    const key = event.date || dayKey(event.startAt.toDate());
    const bucket = eventsByDay.get(key) ?? [];
    bucket.push(event);
    eventsByDay.set(
      key,
      bucket.sort((left, right) => left.startAt.toMillis() - right.startAt.toMillis())
    );
  });

  const monthHasEvents = events.length > 0;
  const today = new Date();

  return (
    <section className="space-y-4">
      <AgendaMonthHeader
        visibleMonth={visibleMonth}
        onPrevMonth={() =>
          onVisibleMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))
        }
        onNextMonth={() =>
          onVisibleMonthChange(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))
        }
        onToday={() => {
          const next = new Date();
          onVisibleMonthChange(new Date(next.getFullYear(), next.getMonth(), 1));
          onSelectedDateChange(next);
        }}
      />

      <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,248,250,0.82))] p-4 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="mb-3 grid grid-cols-7 gap-2 px-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {gridDays.map((day) => (
            <CalendarDayCell
              key={day.toISOString()}
              date={day}
              events={eventsByDay.get(dayKey(day)) ?? []}
              isCurrentMonth={day.getMonth() === visibleMonth.getMonth()}
              isToday={isSameDate(today, day)}
              isSelected={isSameDate(selectedDate, day)}
              onClick={() => onSelectedDateChange(day)}
            />
          ))}
        </div>

        {!monthHasEvents && (
          <div className="mt-4 rounded-2xl border border-dashed border-brand-border bg-white/60 p-5 text-center text-sm text-brand-secondary">
            Este mes no tiene actividades todavia. Selecciona un dia para crear la primera.
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { Event } from "@/lib/services";

export type CalendarViewMode = "day" | "week" | "month";

type CenterCalendarProps = {
  events: Event[];
  selectedDate: Date;
  viewMode: CalendarViewMode;
  onSelectedDateChange: (value: Date) => void;
  onViewModeChange: (value: CalendarViewMode) => void;
};

const buttonClassName =
  "inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-medium text-brand-text";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const startOfWeek = (date: Date) => {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
};

const endOfWeek = (date: Date) => {
  const copy = startOfWeek(date);
  copy.setDate(copy.getDate() + 6);
  return copy;
};

const startOfMonthGrid = (date: Date) =>
  startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));

const buildWeekDays = (date: Date) =>
  Array.from({ length: 7 }, (_, index) => {
    const next = startOfWeek(date);
    next.setDate(next.getDate() + index);
    return next;
  });

const buildMonthDays = (date: Date) =>
  Array.from({ length: 42 }, (_, index) => {
    const next = startOfMonthGrid(date);
    next.setDate(next.getDate() + index);
    return next;
  });

const groupEventsByDay = (events: Event[]) => {
  const map = new Map<string, Event[]>();
  events.forEach((event) => {
    const key = dayKey(event.startAt.toDate());
    const bucket = map.get(key) ?? [];
    bucket.push(event);
    map.set(key, bucket.sort((left, right) => left.startAt.seconds - right.startAt.seconds));
  });
  return map;
};

const shiftDate = (date: Date, mode: CalendarViewMode, direction: -1 | 1) => {
  const next = new Date(date);
  if (mode === "day") next.setDate(next.getDate() + direction);
  if (mode === "week") next.setDate(next.getDate() + direction * 7);
  if (mode === "month") next.setMonth(next.getMonth() + direction);
  return next;
};

export function CenterCalendar({
  events,
  selectedDate,
  viewMode,
  onSelectedDateChange,
  onViewModeChange,
}: CenterCalendarProps) {
  const eventMap = groupEventsByDay(events);
  const weekDays = buildWeekDays(selectedDate);
  const monthDays = buildMonthDays(selectedDate);
  const title =
    viewMode === "day"
      ? selectedDate.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : viewMode === "week"
        ? `${startOfWeek(selectedDate).toLocaleDateString("es-ES")} - ${endOfWeek(selectedDate).toLocaleDateString("es-ES")}`
        : selectedDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Calendario</h2>
          <p className="text-sm text-brand-secondary">{title}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClassName}
            onClick={() => onSelectedDateChange(shiftDate(selectedDate, viewMode, -1))}
          >
            Anterior
          </button>
          <button
            type="button"
            className={buttonClassName}
            onClick={() => onSelectedDateChange(new Date())}
          >
            Hoy
          </button>
          <button
            type="button"
            className={buttonClassName}
            onClick={() => onSelectedDateChange(shiftDate(selectedDate, viewMode, 1))}
          >
            Siguiente
          </button>
          {(["day", "week", "month"] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`${buttonClassName} ${viewMode === mode ? "border-brand-primary bg-brand-primary text-white" : ""}`}
            >
              {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "day" && (
        <div className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
          {(eventMap.get(dayKey(selectedDate)) ?? []).length === 0 ? (
            <p className="text-sm text-brand-secondary">No hay eventos en esta fecha.</p>
          ) : (
            <div className="space-y-3">
              {(eventMap.get(dayKey(selectedDate)) ?? []).map((event) => (
                <div key={event.id} className="rounded-xl border border-brand-border bg-white px-3 py-2">
                  <p className="text-sm font-semibold text-brand-text">{event.title}</p>
                  <p className="text-xs text-brand-secondary">
                    {event.startAt.toDate().toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {event.endAt.toDate().toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {viewMode === "week" && (
        <div className="mt-4 grid gap-3 md:grid-cols-7">
          {weekDays.map((day) => {
            const dayEvents = eventMap.get(dayKey(day)) ?? [];
            return (
              <div key={day.toISOString()} className="rounded-2xl border border-brand-border bg-brand-background/50 p-3">
                <button type="button" onClick={() => onSelectedDateChange(day)} className="text-left">
                  <p className="text-sm font-semibold capitalize text-brand-text">
                    {day.toLocaleDateString("es-ES", { weekday: "short" })}
                  </p>
                  <p className="text-xs text-brand-secondary">
                    {day.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                  </p>
                </button>
                <div className="mt-3 space-y-2">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-brand-secondary">Sin eventos</p>
                  ) : (
                    dayEvents.map((event) => (
                      <div key={event.id} className="rounded-xl border border-brand-border bg-white px-2 py-2">
                        <p className="truncate text-xs font-semibold text-brand-text">{event.title}</p>
                        <p className="text-[11px] text-brand-secondary">
                          {event.startAt.toDate().toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "month" && (
        <div className="mt-4 grid grid-cols-7 gap-2">
          {monthDays.map((day) => {
            const dayEvents = eventMap.get(dayKey(day)) ?? [];
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectedDateChange(day)}
                className={`min-h-28 rounded-2xl border p-3 text-left ${isCurrentMonth ? "border-brand-border bg-white/70" : "border-brand-border/60 bg-brand-background/30 text-brand-secondary"}`}
              >
                <p className="text-sm font-semibold">{day.getDate()}</p>
                <div className="mt-2 space-y-1">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="truncate rounded-lg bg-brand-background px-2 py-1 text-xs text-brand-text">
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-brand-secondary">+{dayEvents.length - 3} mas</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

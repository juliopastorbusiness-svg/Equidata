"use client";

type AgendaMonthHeaderProps = {
  visibleMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
};

const formatMonthLabel = (date: Date) => {
  const value = date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export function AgendaMonthHeader({
  visibleMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
}: AgendaMonthHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-brand-secondary">
          Agenda del centro
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-text">
          {formatMonthLabel(visibleMonth)}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Mes anterior"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border bg-brand-background/70 text-brand-text transition hover:bg-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onToday}
          className="inline-flex h-11 items-center rounded-2xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Mes siguiente"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-border bg-brand-background/70 text-brand-text transition hover:bg-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

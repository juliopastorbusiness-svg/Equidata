"use client";

type ClassFiltersValue = {
  date: string;
  discipline: string;
  level: string;
  trainerId: string;
};

type ClassFiltersProps = {
  value: ClassFiltersValue;
  disciplines: string[];
  levels: string[];
  trainers: Array<{ id: string; label: string }>;
  onChange: (value: ClassFiltersValue) => void;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";

export function ClassFilters({
  value,
  disciplines,
  levels,
  trainers,
  onChange,
}: ClassFiltersProps) {
  return (
    <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Filtros</h2>
          <p className="text-sm text-brand-secondary">Ajusta fecha, disciplina, nivel o profesor.</p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ date: "", discipline: "", level: "", trainerId: "" })}
          className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm text-brand-text"
        >
          Limpiar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fecha</label>
          <input
            type="date"
            value={value.date}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Disciplina</label>
          <select
            value={value.discipline}
            onChange={(event) => onChange({ ...value, discipline: event.target.value })}
            className={inputClassName}
          >
            <option value="">Todas</option>
            {disciplines.map((discipline) => (
              <option key={discipline} value={discipline}>
                {discipline}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Nivel</label>
          <select
            value={value.level}
            onChange={(event) => onChange({ ...value, level: event.target.value })}
            className={inputClassName}
          >
            <option value="">Todos</option>
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Profesor</label>
          <select
            value={value.trainerId}
            onChange={(event) => onChange({ ...value, trainerId: event.target.value })}
            className={inputClassName}
          >
            <option value="">Todos</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

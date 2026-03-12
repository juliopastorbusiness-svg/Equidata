"use client";

export type HorseFiltersValue = {
  search: string;
  box: string;
  owner: string;
  status: string;
  breed: string;
  sort: "NAME" | "AGE" | "ARRIVAL";
};

type FilterOption = {
  value: string;
  label: string;
};

type HorseFiltersProps = {
  value: HorseFiltersValue;
  boxOptions: FilterOption[];
  ownerOptions: FilterOption[];
  statusOptions: FilterOption[];
  breedOptions: FilterOption[];
  resultsCount: number;
  onChange: (next: HorseFiltersValue) => void;
  onReset: () => void;
};

const inputClassName =
  "h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

export function HorseFilters({
  value,
  boxOptions,
  ownerOptions,
  statusOptions,
  breedOptions,
  resultsCount,
  onChange,
  onReset,
}: HorseFiltersProps) {
  return (
    <section className="rounded-2xl border border-brand-border bg-white/75 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-brand-text">Buscar y filtrar</h2>
          <p className="text-sm text-brand-secondary">
            {resultsCount} caballo{resultsCount === 1 ? "" : "s"} en pantalla
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:text-brand-primary"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-6">
        <input
          type="search"
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
          placeholder="Buscar por nombre"
          className={`lg:col-span-2 ${inputClassName}`}
        />

        <select
          value={value.box}
          onChange={(event) => onChange({ ...value, box: event.target.value })}
          className={inputClassName}
        >
          {boxOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={value.owner}
          onChange={(event) => onChange({ ...value, owner: event.target.value })}
          className={inputClassName}
        >
          {ownerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={value.status}
          onChange={(event) => onChange({ ...value, status: event.target.value })}
          className={inputClassName}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={value.breed}
          onChange={(event) => onChange({ ...value, breed: event.target.value })}
          className={inputClassName}
        >
          {breedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={value.sort}
          onChange={(event) =>
            onChange({ ...value, sort: event.target.value as HorseFiltersValue["sort"] })
          }
          className={inputClassName}
        >
          <option value="NAME">Ordenar por nombre</option>
          <option value="AGE">Ordenar por edad</option>
          <option value="ARRIVAL">Ordenar por fecha de llegada</option>
        </select>
      </div>
    </section>
  );
}

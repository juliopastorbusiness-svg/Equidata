"use client";

type IdOption = {
  id: string;
  label: string;
};

type IdMultiSelectProps = {
  label: string;
  value: string[];
  options: IdOption[];
  emptyLabel?: string;
  onChange: (value: string[]) => void;
};

export function IdMultiSelect({
  label,
  value,
  options,
  emptyLabel = "Sin opciones",
  onChange,
}: IdMultiSelectProps) {
  return (
    <div>
      <label className="text-sm font-medium text-brand-secondary">{label}</label>
      <select
        multiple
        value={value}
        onChange={(event) =>
          onChange(Array.from(event.target.selectedOptions, (option) => option.value))
        }
        className="mt-1 min-h-28 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text"
      >
        {options.length === 0 ? (
          <option value="" disabled>
            {emptyLabel}
          </option>
        ) : (
          options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))
        )}
      </select>
      <p className="mt-1 text-xs text-brand-secondary">
        Manten Ctrl o Cmd para seleccionar varios elementos.
      </p>
    </div>
  );
}

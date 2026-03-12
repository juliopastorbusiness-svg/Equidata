"use client";

import { FormEvent, useState } from "react";
import { Medication } from "@/lib/services";

type MedicationFormValues = {
  name: string;
  category: string;
  description: string;
  stock: string;
  unit: string;
  recommendedDose: string;
  batch: string;
  expiryDate: string;
  supplier: string;
  storageLocation: string;
  notes: string;
};

type MedicationFormProps = {
  defaultValues?: Partial<Medication>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: MedicationFormValues) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

export function MedicationForm({
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: MedicationFormProps) {
  const [values, setValues] = useState<MedicationFormValues>({
    name: defaultValues?.name ?? "",
    category: defaultValues?.category ?? "",
    description: defaultValues?.description ?? "",
    stock: typeof defaultValues?.stock === "number" ? String(defaultValues.stock) : "0",
    unit: defaultValues?.unit ?? "ml",
    recommendedDose:
      typeof defaultValues?.recommendedDose === "number"
        ? String(defaultValues.recommendedDose)
        : "",
    batch: defaultValues?.batch ?? "",
    expiryDate: defaultValues?.expiryDate
      ? defaultValues.expiryDate.toDate().toISOString().slice(0, 10)
      : "",
    supplier: defaultValues?.supplier ?? "",
    storageLocation: defaultValues?.storageLocation ?? "",
    notes: defaultValues?.notes ?? "",
  });

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void onSubmit(values);
      }}
      className="grid gap-3 md:grid-cols-2"
    >
      <div>
        <label className="text-sm font-medium text-brand-secondary">Nombre</label>
        <input
          value={values.name}
          onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
          className={inputClassName}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Categoría</label>
        <input
          value={values.category}
          onChange={(event) => setValues((prev) => ({ ...prev, category: event.target.value }))}
          className={inputClassName}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Descripción</label>
        <textarea
          rows={3}
          value={values.description}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, description: event.target.value }))
          }
          className={textareaClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Stock</label>
        <input
          type="number"
          min="0"
          value={values.stock}
          onChange={(event) => setValues((prev) => ({ ...prev, stock: event.target.value }))}
          className={inputClassName}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Unidad</label>
        <input
          value={values.unit}
          onChange={(event) => setValues((prev) => ({ ...prev, unit: event.target.value }))}
          className={inputClassName}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Dosis recomendada</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={values.recommendedDose}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, recommendedDose: event.target.value }))
          }
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Lote</label>
        <input
          value={values.batch}
          onChange={(event) => setValues((prev) => ({ ...prev, batch: event.target.value }))}
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Caducidad</label>
        <input
          type="date"
          value={values.expiryDate}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, expiryDate: event.target.value }))
          }
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Proveedor</label>
        <input
          value={values.supplier}
          onChange={(event) => setValues((prev) => ({ ...prev, supplier: event.target.value }))}
          className={inputClassName}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Ubicación de almacenamiento</label>
        <input
          value={values.storageLocation}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, storageLocation: event.target.value }))
          }
          className={inputClassName}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Notas</label>
        <textarea
          rows={3}
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
          className={textareaClassName}
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}


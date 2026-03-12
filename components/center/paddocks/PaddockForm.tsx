"use client";

import { FormEvent, useState } from "react";
import { Paddock, PaddockStatus, PaddockType } from "@/lib/services";

type PaddockFormValues = {
  name: string;
  code: string;
  maxCapacity: string;
  type: PaddockType;
  status: PaddockStatus;
  surface: string;
  location: string;
  notes: string;
  specialConditions: string;
};

type PaddockFormProps = {
  defaultValues?: Partial<Paddock>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: PaddockFormValues) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";

const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

export function PaddockForm({
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: PaddockFormProps) {
  const [values, setValues] = useState<PaddockFormValues>({
    name: defaultValues?.name ?? "",
    code: defaultValues?.code ?? "",
    maxCapacity:
      typeof defaultValues?.maxCapacity === "number"
        ? String(defaultValues.maxCapacity)
        : "1",
    type: defaultValues?.type ?? "INDIVIDUAL",
    status: defaultValues?.status ?? "AVAILABLE",
    surface: defaultValues?.surface ?? "",
    location: defaultValues?.location ?? "",
    notes: defaultValues?.notes ?? "",
    specialConditions: defaultValues?.specialConditions ?? "",
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
        <label className="text-sm font-medium text-brand-secondary">Código</label>
        <input
          value={values.code}
          onChange={(event) => setValues((prev) => ({ ...prev, code: event.target.value }))}
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Capacidad máxima</label>
        <input
          type="number"
          min="1"
          value={values.maxCapacity}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, maxCapacity: event.target.value }))
          }
          className={inputClassName}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Tipo</label>
        <select
          value={values.type}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, type: event.target.value as PaddockType }))
          }
          className={inputClassName}
        >
          <option value="INDIVIDUAL">Individual</option>
          <option value="SHARED">Compartido</option>
          <option value="REST">Descanso</option>
          <option value="REHABILITATION">Rehabilitación</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Estado</label>
        <select
          value={values.status}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, status: event.target.value as PaddockStatus }))
          }
          className={inputClassName}
        >
          <option value="AVAILABLE">Disponible</option>
          <option value="OCCUPIED">Ocupado</option>
          <option value="MAINTENANCE">Mantenimiento</option>
          <option value="UNAVAILABLE">No disponible</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Superficie</label>
        <input
          value={values.surface}
          onChange={(event) => setValues((prev) => ({ ...prev, surface: event.target.value }))}
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Ubicación</label>
        <input
          value={values.location}
          onChange={(event) => setValues((prev) => ({ ...prev, location: event.target.value }))}
          className={inputClassName}
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Condiciones especiales</label>
        <textarea
          rows={3}
          value={values.specialConditions}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, specialConditions: event.target.value }))
          }
          className={textareaClassName}
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


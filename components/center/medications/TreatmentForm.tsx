"use client";

import { FormEvent, useState } from "react";
import { HorseTreatment, Medication } from "@/lib/services";
import { HorseListItem } from "@/lib/horses";

type TreatmentFormValues = {
  horseId: string;
  startDate: string;
  endDate: string;
  dose: string;
  frequency: string;
  administrationRoute: HorseTreatment["administrationRoute"];
  reason: string;
  notes: string;
  prescribedBy: string;
  status: HorseTreatment["status"];
};

type TreatmentFormProps = {
  horses: HorseListItem[];
  medication?: Medication | null;
  submitting?: boolean;
  onSubmit: (values: TreatmentFormValues) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

export function TreatmentForm({
  horses,
  medication,
  submitting,
  onSubmit,
}: TreatmentFormProps) {
  const [values, setValues] = useState<TreatmentFormValues>({
    horseId: horses[0]?.horse.id ?? "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    dose:
      typeof medication?.recommendedDose === "number"
        ? String(medication.recommendedDose)
        : "",
    frequency: "",
    administrationRoute: "ORAL",
    reason: "",
    notes: "",
    prescribedBy: "",
    status: "PLANNED",
  });

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void onSubmit(values);
      }}
      className="grid gap-3 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Caballo</label>
        <select
          value={values.horseId}
          onChange={(event) => setValues((prev) => ({ ...prev, horseId: event.target.value }))}
          className={inputClassName}
          required
        >
          {horses.map((item) => (
            <option key={item.horse.id} value={item.horse.id}>
              {item.horse.name} · {item.ownerLabel}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Inicio</label>
        <input
          type="date"
          value={values.startDate}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, startDate: event.target.value }))
          }
          className={inputClassName}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fin</label>
        <input
          type="date"
          value={values.endDate}
          onChange={(event) => setValues((prev) => ({ ...prev, endDate: event.target.value }))}
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Dosis</label>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={values.dose}
          onChange={(event) => setValues((prev) => ({ ...prev, dose: event.target.value }))}
          className={inputClassName}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Frecuencia</label>
        <input
          value={values.frequency}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, frequency: event.target.value }))
          }
          className={inputClassName}
          placeholder="Cada 12h, 1 vez al día..."
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Vía</label>
        <select
          value={values.administrationRoute}
          onChange={(event) =>
            setValues((prev) => ({
              ...prev,
              administrationRoute: event.target.value as HorseTreatment["administrationRoute"],
            }))
          }
          className={inputClassName}
        >
          <option value="ORAL">Oral</option>
          <option value="INJECTABLE">Inyectable</option>
          <option value="TOPICAL">Tópica</option>
          <option value="INHALED">Inhalada</option>
          <option value="OTHER">Otra</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Estado</label>
        <select
          value={values.status}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, status: event.target.value as HorseTreatment["status"] }))
          }
          className={inputClassName}
        >
          <option value="PLANNED">Planificado</option>
          <option value="IN_PROGRESS">En curso</option>
          <option value="COMPLETED">Completado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Prescrito por</label>
        <input
          value={values.prescribedBy}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, prescribedBy: event.target.value }))
          }
          className={inputClassName}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Motivo</label>
        <input
          value={values.reason}
          onChange={(event) => setValues((prev) => ({ ...prev, reason: event.target.value }))}
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
          disabled={submitting || !values.horseId}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Crear tratamiento"}
        </button>
      </div>
    </form>
  );
}

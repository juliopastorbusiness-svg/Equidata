"use client";

import { FormEvent, useEffect, useState } from "react";
import { Arena } from "@/lib/firestore/arenas";
import { CenterPersonOption, HorseListItem } from "@/lib/horses";
import { Event } from "@/lib/services";
import { IdMultiSelect } from "@/components/center/shared/IdMultiSelect";

export type EventFormValues = {
  title: string;
  description: string;
  type: Event["type"];
  status: Event["status"];
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  arenaId: string;
  trainerId: string;
  horseIds: string[];
  studentIds: string[];
  notes: string;
};

type EventFormProps = {
  defaultValues?: Partial<Event>;
  initialDate?: string;
  submitting?: boolean;
  trainerOptions: CenterPersonOption[];
  studentOptions: CenterPersonOption[];
  horseOptions: HorseListItem[];
  arenaOptions: Arena[];
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-2xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-2xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

export function EventForm({
  defaultValues,
  initialDate,
  submitting,
  trainerOptions,
  studentOptions,
  horseOptions,
  arenaOptions,
  submitLabel,
  onSubmit,
}: EventFormProps) {
  const [values, setValues] = useState<EventFormValues>({
    title: "",
    description: "",
    type: "GENERAL",
    status: "SCHEDULED",
    date: initialDate ?? "",
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    arenaId: "",
    trainerId: "",
    horseIds: [],
    studentIds: [],
    notes: "",
  });

  useEffect(() => {
    setValues({
      title: defaultValues?.title ?? "",
      description: defaultValues?.description ?? "",
      type: defaultValues?.type ?? "GENERAL",
      status: defaultValues?.status ?? "SCHEDULED",
      date:
        defaultValues?.date ??
        defaultValues?.startAt?.toDate().toISOString().slice(0, 10) ??
        initialDate ??
        "",
      startTime: defaultValues?.startTime ?? "09:00",
      endTime: defaultValues?.endTime ?? "10:00",
      location: defaultValues?.location ?? "",
      arenaId: defaultValues?.arenaId ?? "",
      trainerId: defaultValues?.trainerId ?? "",
      horseIds: defaultValues?.horseIds ?? [],
      studentIds: defaultValues?.studentIds ?? [],
      notes: defaultValues?.notes ?? "",
    });
  }, [defaultValues, initialDate]);

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void onSubmit(values);
      }}
      className="grid gap-4"
    >
      <div>
        <label className="text-sm font-medium text-brand-secondary">Titulo</label>
        <input
          value={values.title}
          onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
          className={inputClassName}
          required
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Tipo</label>
          <select
            value={values.type}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, type: event.target.value as Event["type"] }))
            }
            className={inputClassName}
          >
            <option value="CLASS">Clase</option>
            <option value="TRAINING">Entrenamiento</option>
            <option value="COMPETITION">Competicion</option>
            <option value="VET_REVIEW">Revision veterinaria</option>
            <option value="FARRIER">Herrador</option>
            <option value="GENERAL">Evento general</option>
            <option value="INTERNAL_TASK">Tarea interna</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Estado</label>
          <select
            value={values.status}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, status: event.target.value as Event["status"] }))
            }
            className={inputClassName}
          >
            <option value="SCHEDULED">Pendiente</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fecha</label>
          <input
            type="date"
            value={values.date}
            onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))}
            className={inputClassName}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Inicio</label>
          <input
            type="time"
            value={values.startTime}
            onChange={(event) => setValues((prev) => ({ ...prev, startTime: event.target.value }))}
            className={inputClassName}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fin</label>
          <input
            type="time"
            value={values.endTime}
            onChange={(event) => setValues((prev) => ({ ...prev, endTime: event.target.value }))}
            className={inputClassName}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Ubicacion</label>
          <input
            value={values.location}
            onChange={(event) => setValues((prev) => ({ ...prev, location: event.target.value }))}
            className={inputClassName}
            placeholder="Pista cubierta, centro veterinario, etc."
          />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Pista</label>
          <select
            value={values.arenaId}
            onChange={(event) => setValues((prev) => ({ ...prev, arenaId: event.target.value }))}
            className={inputClassName}
          >
            <option value="">Sin pista</option>
            {arenaOptions.map((arena) => (
              <option key={arena.id} value={arena.id}>
                {arena.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-brand-secondary">Entrenador</label>
        <select
          value={values.trainerId}
          onChange={(event) => setValues((prev) => ({ ...prev, trainerId: event.target.value }))}
          className={inputClassName}
        >
          <option value="">Sin entrenador</option>
          {trainerOptions.map((person) => (
            <option key={person.id} value={person.id}>
              {person.label}
            </option>
          ))}
        </select>
      </div>

      <IdMultiSelect
        label="Caballos"
        value={values.horseIds}
        options={horseOptions.map((item) => ({ id: item.horse.id, label: item.horse.name }))}
        onChange={(horseIds) => setValues((prev) => ({ ...prev, horseIds }))}
      />

      <IdMultiSelect
        label="Alumnos"
        value={values.studentIds}
        options={studentOptions.map((person) => ({ id: person.id, label: person.label }))}
        onChange={(studentIds) => setValues((prev) => ({ ...prev, studentIds }))}
      />

      <div>
        <label className="text-sm font-medium text-brand-secondary">Descripcion</label>
        <textarea
          rows={3}
          value={values.description}
          onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
          className={textareaClassName}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-brand-secondary">Notas</label>
        <textarea
          rows={3}
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
          className={textareaClassName}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-2xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

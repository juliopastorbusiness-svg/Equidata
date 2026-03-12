"use client";

import { FormEvent, useEffect, useState } from "react";
import { Student } from "@/lib/services";

export type StudentFormValues = {
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  emergencyContact: string;
  level: Student["level"];
  status: Student["status"];
  notes: string;
};

type StudentFormProps = {
  defaultValues?: Partial<Student>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: StudentFormValues) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

export function StudentForm({
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: StudentFormProps) {
  const [values, setValues] = useState<StudentFormValues>({
    firstName: defaultValues?.firstName ?? "",
    lastName: defaultValues?.lastName ?? "",
    birthDate: defaultValues?.birthDate
      ? defaultValues.birthDate.toDate().toISOString().slice(0, 10)
      : "",
    phone: defaultValues?.phone ?? "",
    email: defaultValues?.email ?? "",
    emergencyContact: defaultValues?.emergencyContact ?? "",
    level: defaultValues?.level ?? "INITIATION",
    status: defaultValues?.status ?? "ACTIVE",
    notes: defaultValues?.notes ?? "",
  });

  useEffect(() => {
    setValues({
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      birthDate: defaultValues?.birthDate
        ? defaultValues.birthDate.toDate().toISOString().slice(0, 10)
        : "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
      emergencyContact: defaultValues?.emergencyContact ?? "",
      level: defaultValues?.level ?? "INITIATION",
      status: defaultValues?.status ?? "ACTIVE",
      notes: defaultValues?.notes ?? "",
    });
  }, [defaultValues]);

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void onSubmit(values);
      }}
      className="grid gap-3"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Nombre</label>
          <input
            value={values.firstName}
            onChange={(event) => setValues((prev) => ({ ...prev, firstName: event.target.value }))}
            className={inputClassName}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Apellidos</label>
          <input
            value={values.lastName}
            onChange={(event) => setValues((prev) => ({ ...prev, lastName: event.target.value }))}
            className={inputClassName}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fecha de nacimiento</label>
          <input
            type="date"
            value={values.birthDate}
            onChange={(event) => setValues((prev) => ({ ...prev, birthDate: event.target.value }))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Telefono</label>
          <input
            value={values.phone}
            onChange={(event) => setValues((prev) => ({ ...prev, phone: event.target.value }))}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Email</label>
          <input
            type="email"
            value={values.email}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
            className={inputClassName}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Contacto de emergencia</label>
          <input
            value={values.emergencyContact}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, emergencyContact: event.target.value }))
            }
            className={inputClassName}
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Nivel</label>
          <select
            value={values.level}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, level: event.target.value as Student["level"] }))
            }
            className={inputClassName}
          >
            <option value="INITIATION">Iniciacion</option>
            <option value="BASIC">Basico</option>
            <option value="INTERMEDIATE">Intermedio</option>
            <option value="ADVANCED">Avanzado</option>
            <option value="COMPETITION">Competicion</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Estado</label>
          <select
            value={values.status}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, status: event.target.value as Student["status"] }))
            }
            className={inputClassName}
          >
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="LEAD">Lead</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-brand-secondary">Notas</label>
        <textarea
          rows={4}
          value={values.notes}
          onChange={(event) => setValues((prev) => ({ ...prev, notes: event.target.value }))}
          className={textareaClassName}
        />
      </div>

      <div className="flex justify-end">
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

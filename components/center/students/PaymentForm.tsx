"use client";

import { FormEvent, useEffect, useState } from "react";
import { StudentPayment } from "@/lib/services";

export type PaymentFormValues = {
  concept: string;
  type: StudentPayment["type"];
  amount: string;
  date: string;
  paymentMethod: StudentPayment["paymentMethod"];
  status: StudentPayment["status"];
  notes: string;
};

type PaymentFormProps = {
  defaultValues?: Partial<StudentPayment>;
  submitting?: boolean;
  submitLabel: string;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

export function PaymentForm({
  defaultValues,
  submitting,
  submitLabel,
  onSubmit,
}: PaymentFormProps) {
  const [values, setValues] = useState<PaymentFormValues>({
    concept: defaultValues?.concept ?? "",
    type: defaultValues?.type ?? "SINGLE_CLASS",
    amount: typeof defaultValues?.amount === "number" ? String(defaultValues.amount) : "",
    date: defaultValues?.date ? defaultValues.date.toDate().toISOString().slice(0, 10) : "",
    paymentMethod: defaultValues?.paymentMethod ?? "CASH",
    status: defaultValues?.status ?? "PENDING",
    notes: defaultValues?.notes ?? "",
  });

  useEffect(() => {
    setValues({
      concept: defaultValues?.concept ?? "",
      type: defaultValues?.type ?? "SINGLE_CLASS",
      amount: typeof defaultValues?.amount === "number" ? String(defaultValues.amount) : "",
      date: defaultValues?.date ? defaultValues.date.toDate().toISOString().slice(0, 10) : "",
      paymentMethod: defaultValues?.paymentMethod ?? "CASH",
      status: defaultValues?.status ?? "PENDING",
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
      <div>
        <label className="text-sm font-medium text-brand-secondary">Concepto</label>
        <input
          value={values.concept}
          onChange={(event) => setValues((prev) => ({ ...prev, concept: event.target.value }))}
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
              setValues((prev) => ({ ...prev, type: event.target.value as StudentPayment["type"] }))
            }
            className={inputClassName}
          >
            <option value="SINGLE_CLASS">Clase suelta</option>
            <option value="PACK">Bono</option>
            <option value="MONTHLY">Mensualidad</option>
            <option value="COMPETITION">Competicion</option>
            <option value="OTHER">Otro</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Importe</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={(event) => setValues((prev) => ({ ...prev, amount: event.target.value }))}
            className={inputClassName}
            required
          />
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
          <label className="text-sm font-medium text-brand-secondary">Metodo</label>
          <select
            value={values.paymentMethod}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                paymentMethod: event.target.value as StudentPayment["paymentMethod"],
              }))
            }
            className={inputClassName}
          >
            <option value="CASH">Efectivo</option>
            <option value="TRANSFER">Transferencia</option>
            <option value="CARD">Tarjeta</option>
            <option value="STRIPE">Stripe</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Estado</label>
          <select
            value={values.status}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                status: event.target.value as StudentPayment["status"],
              }))
            }
            className={inputClassName}
          >
            <option value="PENDING">Pendiente</option>
            <option value="PARTIAL">Parcial</option>
            <option value="PAID">Pagado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="OVERDUE">Vencido</option>
          </select>
        </div>
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
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

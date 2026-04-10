"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  BillingMovementType,
  BillingPaymentMethod,
  CreateBillingMovementInput,
} from "@/lib/services";

const schema = z
  .object({
    type: z.enum(["expense", "payment"]),
    date: z.string().min(1, "La fecha es obligatoria."),
    description: z.string().trim().min(1, "El concepto es obligatorio."),
    amount: z.coerce.number().positive("El monto debe ser mayor que 0."),
    notes: z.string().trim().optional().or(z.literal("")),
    paymentMethod: z.enum(["cash", "transfer", "card", "other"]).optional(),
    reference: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((values, context) => {
    if (values.type === "payment" && !values.paymentMethod) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un metodo de pago.",
        path: ["paymentMethod"],
      });
    }
  });

type FormValues = z.input<typeof schema>;
type SubmitValues = z.output<typeof schema>;

type BillingMovementFormProps = {
  initialValues?: Partial<CreateBillingMovementInput>;
  forcedType?: BillingMovementType;
  onSubmit: (values: CreateBillingMovementInput) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
};

const toDateInput = (value?: Date) => {
  if (!value) return "";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function BillingMovementForm({
  initialValues,
  forcedType,
  onSubmit,
  onCancel,
  submitting = false,
}: BillingMovementFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, SubmitValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: forcedType ?? initialValues?.type ?? "expense",
      date: toDateInput(initialValues?.date ?? new Date()),
      description: initialValues?.description ?? "",
      amount: initialValues?.amount ?? 0,
      notes: initialValues?.notes ?? "",
      paymentMethod:
        forcedType === "payment"
          ? (initialValues?.paymentMethod as BillingPaymentMethod | undefined) ?? "cash"
          : (initialValues?.paymentMethod as BillingPaymentMethod | undefined),
      reference: initialValues?.reference ?? "",
    },
  });

  useEffect(() => {
    reset({
      type: forcedType ?? initialValues?.type ?? "expense",
      date: toDateInput(initialValues?.date ?? new Date()),
      description: initialValues?.description ?? "",
      amount: initialValues?.amount ?? 0,
      notes: initialValues?.notes ?? "",
      paymentMethod:
        forcedType === "payment"
          ? (initialValues?.paymentMethod as BillingPaymentMethod | undefined) ?? "cash"
          : (initialValues?.paymentMethod as BillingPaymentMethod | undefined),
      reference: initialValues?.reference ?? "",
    });
  }, [forcedType, initialValues, reset]);

  const watchedType = useWatch({ control, name: "type" });
  const type = forcedType ?? watchedType ?? "expense";

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          type: forcedType ?? values.type,
          date: new Date(`${values.date}T00:00:00`),
          description: values.description,
          amount: values.amount,
          notes: values.notes || undefined,
          paymentMethod:
            (forcedType ?? values.type) === "payment"
              ? values.paymentMethod
              : undefined,
          reference:
            (forcedType ?? values.type) === "payment"
              ? values.reference || undefined
              : undefined,
        });
      })}
      className="grid gap-3"
    >
      {!forcedType ? (
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-brand-text">Tipo</label>
          <select
            {...register("type")}
            className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
          >
            <option value="expense">Gasto</option>
            <option value="payment">Pago</option>
          </select>
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-brand-text">Fecha</label>
          <input
            type="date"
            {...register("date")}
            className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
          />
          {errors.date ? <p className="text-xs text-red-600">{errors.date.message}</p> : null}
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-brand-text">Monto</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
            className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
          />
          {errors.amount ? (
            <p className="text-xs text-red-600">{errors.amount.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-brand-text">
          {type === "expense" ? "Concepto" : "Descripcion"}
        </label>
        <input
          {...register("description")}
          className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
          placeholder={type === "expense" ? "Clases, pupilaje, suplemento..." : "Pago recibido"}
        />
        {errors.description ? (
          <p className="text-xs text-red-600">{errors.description.message}</p>
        ) : null}
      </div>

      {type === "payment" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-brand-text">Metodo de pago</label>
            <select
              {...register("paymentMethod")}
              className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
              <option value="other">Otro</option>
            </select>
            {errors.paymentMethod ? (
              <p className="text-xs text-red-600">{errors.paymentMethod.message}</p>
            ) : null}
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-brand-text">Referencia</label>
            <input
              {...register("reference")}
              className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
              placeholder="Opcional"
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-brand-text">Notas</label>
        <textarea
          {...register("notes")}
          rows={3}
          className="rounded-xl border border-brand-border bg-brand-background px-3 py-2 text-sm text-brand-text"
          placeholder="Observaciones internas"
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar movimiento"}
        </button>
      </div>
    </form>
  );
}

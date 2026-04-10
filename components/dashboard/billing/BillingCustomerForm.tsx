"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { UpsertBillingCustomerInput } from "@/lib/services";

const schema = z.object({
  fullName: z.string().trim().min(1, "El nombre completo es obligatorio."),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Introduce un email valido.")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

type BillingCustomerFormProps = {
  initialValues?: UpsertBillingCustomerInput;
  onSubmit: (values: UpsertBillingCustomerInput) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
};

export function BillingCustomerForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
}: BillingCustomerFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initialValues?.fullName ?? "",
      phone: initialValues?.phone ?? "",
      email: initialValues?.email ?? "",
      address: initialValues?.address ?? "",
      notes: initialValues?.notes ?? "",
    },
  });

  useEffect(() => {
    reset({
      fullName: initialValues?.fullName ?? "",
      phone: initialValues?.phone ?? "",
      email: initialValues?.email ?? "",
      address: initialValues?.address ?? "",
      notes: initialValues?.notes ?? "",
    });
  }, [initialValues, reset]);

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit({
          fullName: values.fullName,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          notes: values.notes || undefined,
        });
      })}
      className="grid gap-3"
    >
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-brand-text">Nombre completo</label>
        <input
          {...register("fullName")}
          className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
          placeholder="Nombre del cliente"
        />
        {errors.fullName ? (
          <p className="text-xs text-red-600">{errors.fullName.message}</p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-brand-text">Telefono</label>
          <input
            {...register("phone")}
            className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
            placeholder="Opcional"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-brand-text">Email</label>
          <input
            {...register("email")}
            className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
            placeholder="cliente@email.com"
          />
          {errors.email ? (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-brand-text">Direccion</label>
        <input
          {...register("address")}
          className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
          placeholder="Opcional"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-brand-text">Notas</label>
        <textarea
          {...register("notes")}
          rows={4}
          className="rounded-xl border border-brand-border bg-brand-background px-3 py-2 text-sm text-brand-text"
          placeholder="Observaciones administrativas"
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
          {submitting ? "Guardando..." : "Guardar cliente"}
        </button>
      </div>
    </form>
  );
}

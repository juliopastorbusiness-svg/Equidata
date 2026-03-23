"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Arena } from "@/lib/firestore/arenas";
import { CenterPersonOption } from "@/lib/horses";

const classFormSchema = z.object({
  title: z.string().trim().min(2, "El titulo es obligatorio."),
  discipline: z.string().trim().min(2, "La disciplina es obligatoria."),
  level: z.enum(["initiation", "basic", "intermediate", "advanced", "competition", "mixed"]),
  date: z.string().min(1, "La fecha es obligatoria."),
  startTime: z.string().min(1, "La hora de inicio es obligatoria."),
  endTime: z.string().min(1, "La hora de fin es obligatoria."),
  arenaId: z.string().optional(),
  trainerId: z.string().optional(),
  capacity: z.coerce.number().min(1, "La capacidad debe ser al menos 1."),
  price: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  notes: z.string().optional(),
  visibility: z.enum(["members_only", "private"]),
  bookingMode: z.enum(["manual", "request"]),
  status: z.enum(["draft", "published", "full", "cancelled", "completed"]),
}).refine((values) => values.startTime < values.endTime, {
  message: "La hora de inicio debe ser anterior a la de fin.",
  path: ["endTime"],
});

export type ClassFormValues = z.infer<typeof classFormSchema>;
type ClassFormInput = z.input<typeof classFormSchema>;

type ClassFormProps = {
  defaultValues?: Partial<ClassFormValues>;
  arenas: Arena[];
  trainers: CenterPersonOption[];
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: ClassFormValues) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

const emptyValues: ClassFormInput = {
  title: "",
  discipline: "",
  level: "mixed",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  arenaId: "",
  trainerId: "",
  capacity: 1,
  price: Number.NaN,
  notes: "",
  visibility: "members_only",
  bookingMode: "manual",
  status: "draft",
};

export function ClassForm({
  defaultValues,
  arenas,
  trainers,
  submitting,
  submitLabel,
  onSubmit,
}: ClassFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassFormInput, unknown, ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      ...emptyValues,
      ...defaultValues,
    } as ClassFormInput,
  });

  useEffect(() => {
    reset({
      ...emptyValues,
      ...defaultValues,
    } as ClassFormInput);
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Titulo</label>
          <input {...register("title")} className={inputClassName} />
          {errors.title ? <p className="mt-1 text-sm text-red-500">{errors.title.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Disciplina</label>
          <input {...register("discipline")} className={inputClassName} />
          {errors.discipline ? <p className="mt-1 text-sm text-red-500">{errors.discipline.message}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Nivel</label>
          <select {...register("level")} className={inputClassName}>
            <option value="initiation">Initiation</option>
            <option value="basic">Basic</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="competition">Competition</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fecha</label>
          <input type="date" {...register("date")} className={inputClassName} />
          {errors.date ? <p className="mt-1 text-sm text-red-500">{errors.date.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Precio</label>
          <input type="number" min="0" step="0.01" {...register("price")} className={inputClassName} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Inicio</label>
          <input type="time" {...register("startTime")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fin</label>
          <input type="time" {...register("endTime")} className={inputClassName} />
          {errors.endTime ? <p className="mt-1 text-sm text-red-500">{errors.endTime.message}</p> : null}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Capacidad</label>
          <input type="number" min="1" {...register("capacity")} className={inputClassName} />
          {errors.capacity ? <p className="mt-1 text-sm text-red-500">{errors.capacity.message}</p> : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Pista</label>
          <select {...register("arenaId")} className={inputClassName}>
            <option value="">Sin pista</option>
            {arenas.map((arena) => (
              <option key={arena.id} value={arena.id}>
                {arena.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Profesor</label>
          <select {...register("trainerId")} className={inputClassName}>
            <option value="">Sin profesor</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Visibilidad</label>
          <select {...register("visibility")} className={inputClassName}>
            <option value="members_only">Solo miembros activos</option>
            <option value="private">Privada</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Modo de reserva</label>
          <select {...register("bookingMode")} className={inputClassName}>
            <option value="manual">Manual</option>
            <option value="request">Request</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Estado</label>
          <select {...register("status")} className={inputClassName}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="full">Full</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-brand-secondary">Notas</label>
        <textarea rows={4} {...register("notes")} className={textareaClassName} />
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

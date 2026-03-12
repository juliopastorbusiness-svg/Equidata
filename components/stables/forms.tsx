"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  documentUploadFormSchema,
  DocumentUploadFormValues,
  feedFormSchema,
  FeedFormValues,
  farrierConfigFormSchema,
  FarrierConfigFormValues,
  HorseFormValues,
  horseFormSchema,
  InjuryFormValues,
  injuryFormSchema,
  MedicalRecordFormValues,
  medicalRecordFormSchema,
  WeightEntryFormValues,
  weightEntryFormSchema,
} from "@/lib/horses";
import { CenterPersonOption, FeedInfo, Horse, Injury, MedicalRecord, WeightEntry } from "@/lib/horses";
import { timestampToDateInput } from "@/lib/horses";

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const helperError = (message?: string) =>
  message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;

type HorseFormProps = {
  mode: "create" | "edit";
  ownerOptions: CenterPersonOption[];
  defaultHorse?: Horse | null;
  submitting?: boolean;
  onSubmit: (values: HorseFormValues, photoFile: File | null) => Promise<void>;
  onDelete?: () => Promise<void>;
};

export function HorseForm({
  mode,
  ownerOptions,
  defaultHorse,
  submitting,
  onSubmit,
  onDelete,
}: HorseFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const form = useForm<HorseFormValues>({
    resolver: zodResolver(horseFormSchema),
    defaultValues: {
      name: defaultHorse?.name ?? "",
      breed: defaultHorse?.breed ?? "",
      age: defaultHorse?.age ? String(defaultHorse.age) : "",
      sex: defaultHorse?.sex ?? "UNKNOWN",
      status: defaultHorse?.status ?? "ACTIVE",
      coat: defaultHorse?.coat ?? "",
      stableId: defaultHorse?.stableId ?? "",
      ownerId: defaultHorse?.ownerId ?? "",
      birthDate: timestampToDateInput(defaultHorse?.birthDate),
      enteredCenterAt: timestampToDateInput(defaultHorse?.enteredCenterAt),
      heightCm: defaultHorse?.heightCm ? String(defaultHorse.heightCm) : "",
      microchipId: defaultHorse?.microchipId ?? "",
      notes: defaultHorse?.notes ?? "",
      veterinarianName: defaultHorse?.veterinarianName ?? "",
      farrierName: defaultHorse?.farrierName ?? "",
      trainerName: defaultHorse?.trainerName ?? "",
      nextFarrierVisitAt: timestampToDateInput(defaultHorse?.nextFarrierVisitAt),
      ownerContactName: defaultHorse?.ownerContact?.name ?? "",
      ownerContactPhone: defaultHorse?.ownerContact?.phone ?? "",
      ownerContactEmail: defaultHorse?.ownerContact?.email ?? "",
      veterinarianContactName: defaultHorse?.veterinarianContact?.name ?? "",
      veterinarianContactPhone: defaultHorse?.veterinarianContact?.phone ?? "",
      veterinarianContactEmail: defaultHorse?.veterinarianContact?.email ?? "",
      farrierContactName: defaultHorse?.farrierContact?.name ?? "",
      farrierContactPhone: defaultHorse?.farrierContact?.phone ?? "",
      farrierContactEmail: defaultHorse?.farrierContact?.email ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, photoFile))} className="space-y-8">
      <section className="grid gap-4 rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Nombre</label>
          <input {...register("name")} className={inputClassName} />
          {helperError(errors.name?.message)}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Raza</label>
          <input {...register("breed")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Edad</label>
          <input type="number" min="0" {...register("age")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Sexo</label>
          <select {...register("sex")} className={inputClassName}>
            <option value="UNKNOWN">Sin indicar</option>
            <option value="STALLION">Semental</option>
            <option value="MARE">Yegua</option>
            <option value="GELDING">Castrado</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Estado</label>
          <select {...register("status")} className={inputClassName}>
            <option value="ACTIVE">Activo</option>
            <option value="RESTING">Descanso</option>
            <option value="RECOVERING">Recuperacion</option>
            <option value="INACTIVE">Inactivo</option>
            <option value="ARCHIVED">Archivado</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Capa / color</label>
          <input {...register("coat")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Box</label>
          <input {...register("stableId")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Propietario</label>
          <select {...register("ownerId")} className={inputClassName}>
            <option value="">Sin asignar</option>
            {ownerOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fecha nacimiento</label>
          <input type="date" {...register("birthDate")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Fecha entrada</label>
          <input type="date" {...register("enteredCenterAt")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Altura (cm)</label>
          <input type="number" min="0" {...register("heightCm")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Microchip</label>
          <input {...register("microchipId")} className={inputClassName} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-brand-secondary">Foto</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
            className={`${inputClassName} py-2`}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-brand-secondary">Observaciones</label>
          <textarea rows={4} {...register("notes")} className={textareaClassName} />
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-brand-secondary">Propietario</label>
          <input {...register("ownerContactName")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Telefono propietario</label>
          <input {...register("ownerContactPhone")} className={inputClassName} />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium text-brand-secondary">Email propietario</label>
          <input {...register("ownerContactEmail")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Veterinario</label>
          <input {...register("veterinarianName")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Contacto veterinario</label>
          <input {...register("veterinarianContactName")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Telefono veterinario</label>
          <input {...register("veterinarianContactPhone")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Email veterinario</label>
          <input {...register("veterinarianContactEmail")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Herrador</label>
          <input {...register("farrierName")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Proxima visita herrador</label>
          <input type="date" {...register("nextFarrierVisitAt")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Contacto herrador</label>
          <input {...register("farrierContactName")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Telefono herrador</label>
          <input {...register("farrierContactPhone")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Email herrador</label>
          <input {...register("farrierContactEmail")} className={inputClassName} />
        </div>
        <div>
          <label className="text-sm font-medium text-brand-secondary">Entrenador</label>
          <input {...register("trainerName")} className={inputClassName} />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        {mode === "edit" && onDelete ? (
          <button
            type="button"
            onClick={() => void onDelete()}
            className="inline-flex h-11 items-center rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700"
          >
            Eliminar caballo
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting
            ? "Guardando..."
            : mode === "create"
              ? "Crear caballo"
              : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

type MedicalRecordFormProps = {
  defaultRecord?: MedicalRecord | null;
  presetType?: MedicalRecord["type"];
  submitting?: boolean;
  onSubmit: (values: MedicalRecordFormValues) => Promise<void>;
};

export function MedicalRecordForm({
  defaultRecord,
  presetType,
  submitting,
  onSubmit,
}: MedicalRecordFormProps) {
  const form = useForm<MedicalRecordFormValues>({
    resolver: zodResolver(medicalRecordFormSchema),
    defaultValues: {
      type: defaultRecord?.type ?? presetType ?? "CHECKUP",
      title: defaultRecord?.title ?? "",
      date: timestampToDateInput(defaultRecord?.date),
      veterinarianName: defaultRecord?.veterinarianName ?? "",
      diagnosis: defaultRecord?.diagnosis ?? "",
      treatment: defaultRecord?.treatment ?? "",
      notes: defaultRecord?.notes ?? "",
      nextReviewAt: timestampToDateInput(defaultRecord?.nextReviewAt),
    },
  });

  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-brand-secondary">Tipo</label>
        <select {...register("type")} className={inputClassName}>
          <option value="CHECKUP">Revision</option>
          <option value="VACCINATION">Vacuna</option>
          <option value="DEWORMING">Desparasitacion</option>
          <option value="TREATMENT">Tratamiento</option>
          <option value="SURGERY">Cirugia</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fecha</label>
        <input type="date" {...register("date")} className={inputClassName} />
        {helperError(errors.date?.message)}
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Titulo</label>
        <input {...register("title")} className={inputClassName} />
        {helperError(errors.title?.message)}
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Veterinario</label>
        <input {...register("veterinarianName")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Proxima revision</label>
        <input type="date" {...register("nextReviewAt")} className={inputClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Diagnostico / informe</label>
        <textarea rows={3} {...register("diagnosis")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Tratamiento</label>
        <textarea rows={3} {...register("treatment")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Observaciones</label>
        <textarea rows={3} {...register("notes")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar registro"}
        </button>
      </div>
    </form>
  );
}

type WeightEntryFormProps = {
  defaultEntry?: WeightEntry | null;
  submitting?: boolean;
  onSubmit: (values: WeightEntryFormValues) => Promise<void>;
};

export function WeightEntryForm({
  defaultEntry,
  submitting,
  onSubmit,
}: WeightEntryFormProps) {
  const form = useForm<WeightEntryFormValues>({
    resolver: zodResolver(weightEntryFormSchema),
    defaultValues: {
      date: timestampToDateInput(defaultEntry?.date),
      weightKg: typeof defaultEntry?.weightKg === "number" ? String(defaultEntry.weightKg) : "",
      notes: defaultEntry?.notes ?? "",
    },
  });
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fecha</label>
        <input type="date" {...register("date")} className={inputClassName} />
        {helperError(errors.date?.message)}
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Peso (kg)</label>
        <input type="number" step="0.1" {...register("weightKg")} className={inputClassName} />
        {helperError(errors.weightKg?.message)}
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Observaciones</label>
        <textarea rows={3} {...register("notes")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar peso"}
        </button>
      </div>
    </form>
  );
}

type InjuryFormProps = {
  defaultInjury?: Injury | null;
  submitting?: boolean;
  onSubmit: (values: InjuryFormValues) => Promise<void>;
};

export function InjuryForm({
  defaultInjury,
  submitting,
  onSubmit,
}: InjuryFormProps) {
  const form = useForm<InjuryFormValues>({
    resolver: zodResolver(injuryFormSchema),
    defaultValues: {
      title: defaultInjury?.title ?? "",
      status: defaultInjury?.status ?? "ACTIVE",
      detectedAt: timestampToDateInput(defaultInjury?.detectedAt),
      resolvedAt: timestampToDateInput(defaultInjury?.resolvedAt),
      severity: defaultInjury?.severity ?? "MEDIUM",
      description: defaultInjury?.description ?? "",
      treatmentPlan: defaultInjury?.treatmentPlan ?? "",
      notes: defaultInjury?.notes ?? "",
    },
  });
  const { register, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-brand-secondary">Tipo de lesion</label>
        <input {...register("title")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Estado</label>
        <select {...register("status")} className={inputClassName}>
          <option value="ACTIVE">Activa</option>
          <option value="MONITORING">Seguimiento</option>
          <option value="RESOLVED">Resuelta</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fecha deteccion</label>
        <input type="date" {...register("detectedAt")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fecha resolucion</label>
        <input type="date" {...register("resolvedAt")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Severidad</label>
        <select {...register("severity")} className={inputClassName}>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Descripcion</label>
        <textarea rows={3} {...register("description")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Tratamiento</label>
        <textarea rows={3} {...register("treatmentPlan")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Notas</label>
        <textarea rows={3} {...register("notes")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar lesion"}
        </button>
      </div>
    </form>
  );
}

type FeedFormProps = {
  defaultFeed?: FeedInfo;
  submitting?: boolean;
  onSubmit: (values: FeedFormValues) => Promise<void>;
};

export function FeedForm({ defaultFeed, submitting, onSubmit }: FeedFormProps) {
  const form = useForm<FeedFormValues>({
    resolver: zodResolver(feedFormSchema),
    defaultValues: {
      feedType: defaultFeed?.feedType ?? "",
      planName: defaultFeed?.planName ?? "",
      dailyRationKg:
        typeof defaultFeed?.dailyRationKg === "number"
          ? String(defaultFeed.dailyRationKg)
          : "",
      forage: defaultFeed?.forage ?? "",
      schedule: defaultFeed?.schedule ?? "",
      mealsPerDay:
        typeof defaultFeed?.mealsPerDay === "number"
          ? String(defaultFeed.mealsPerDay)
          : "",
      supplements: defaultFeed?.supplements?.join(", ") ?? "",
      allergies: defaultFeed?.allergies?.join(", ") ?? "",
      notes: defaultFeed?.notes ?? "",
    },
  });
  const { register, handleSubmit } = form;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-brand-secondary">Tipo de pienso</label>
        <input {...register("feedType")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Plan / nombre</label>
        <input {...register("planName")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Racion diaria (kg)</label>
        <input type="number" step="0.1" {...register("dailyRationKg")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Forraje</label>
        <input {...register("forage")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Comidas por dia</label>
        <input type="number" min="0" {...register("mealsPerDay")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Horario</label>
        <input {...register("schedule")} className={inputClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Suplementos (separados por coma)</label>
        <input {...register("supplements")} className={inputClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Alergias (separadas por coma)</label>
        <input {...register("allergies")} className={inputClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Observaciones</label>
        <textarea rows={3} {...register("notes")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar alimentacion"}
        </button>
      </div>
    </form>
  );
}

type FarrierConfigFormProps = {
  defaultValues?: {
    farrierName?: string;
    nextFarrierVisitAt?: string;
    farrierContactName?: string;
    farrierContactPhone?: string;
    farrierContactEmail?: string;
  };
  submitting?: boolean;
  onSubmit: (values: FarrierConfigFormValues) => Promise<void>;
};

export function FarrierConfigForm({
  defaultValues,
  submitting,
  onSubmit,
}: FarrierConfigFormProps) {
  const form = useForm<FarrierConfigFormValues>({
    resolver: zodResolver(farrierConfigFormSchema),
    defaultValues: {
      farrierName: defaultValues?.farrierName ?? "",
      nextFarrierVisitAt: defaultValues?.nextFarrierVisitAt ?? "",
      farrierContactName: defaultValues?.farrierContactName ?? "",
      farrierContactPhone: defaultValues?.farrierContactPhone ?? "",
      farrierContactEmail: defaultValues?.farrierContactEmail ?? "",
    },
  });
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-brand-secondary">Herrador</label>
        <input {...register("farrierName")} className={inputClassName} />
        {helperError(errors.farrierName?.message)}
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Proxima visita</label>
        <input type="date" {...register("nextFarrierVisitAt")} className={inputClassName} />
        {helperError(errors.nextFarrierVisitAt?.message)}
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Nombre contacto</label>
        <input {...register("farrierContactName")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Telefono</label>
        <input {...register("farrierContactPhone")} className={inputClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Email</label>
        <input {...register("farrierContactEmail")} className={inputClassName} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Guardar herrador"}
        </button>
      </div>
    </form>
  );
}

type DocumentUploaderProps = {
  submitting?: boolean;
  onSubmit: (values: DocumentUploadFormValues, file: File | null) => Promise<void>;
};

export function DocumentUploader({ submitting, onSubmit }: DocumentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const form = useForm<DocumentUploadFormValues>({
    resolver: zodResolver(documentUploadFormSchema),
    defaultValues: {
      type: "MEDICAL",
      name: "",
      issuedAt: "",
      expiresAt: "",
      notes: "",
    },
  });
  const { register, handleSubmit, formState: { errors } } = form;

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values, file))} className="grid gap-3 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium text-brand-secondary">Tipo</label>
        <select {...register("type")} className={inputClassName}>
          <option value="MEDICAL">Medico</option>
          <option value="PASSPORT">Pasaporte</option>
          <option value="INSURANCE">Seguro</option>
          <option value="ANALYTICS">Analitica</option>
          <option value="CONTRACT">Contrato</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Nombre</label>
        <input {...register("name")} className={inputClassName} />
        {helperError(errors.name?.message)}
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fecha emision</label>
        <input type="date" {...register("issuedAt")} className={inputClassName} />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fecha vencimiento</label>
        <input type="date" {...register("expiresAt")} className={inputClassName} />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Archivo</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className={`${inputClassName} py-2`}
        />
        <p className="mt-1 text-xs text-brand-secondary">
          Formatos recomendados: PDF, imagenes y documentos ofimaticos.
        </p>
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Notas</label>
        <textarea rows={3} {...register("notes")} className={textareaClassName} />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Subiendo..." : "Subir documento"}
        </button>
      </div>
    </form>
  );
}

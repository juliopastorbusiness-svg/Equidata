import { z } from "zod";

export const horseFormSchema = z.object({
  name: z.string().trim().min(2, "Introduce un nombre valido."),
  breed: z.string().trim().optional(),
  age: z.string().optional(),
  sex: z.enum(["STALLION", "MARE", "GELDING", "UNKNOWN"]),
  status: z.enum(["ACTIVE", "RESTING", "RECOVERING", "INACTIVE", "ARCHIVED"]),
  coat: z.string().trim().optional(),
  stableId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  birthDate: z.string().optional(),
  enteredCenterAt: z.string().optional(),
  heightCm: z.string().optional(),
  microchipId: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  veterinarianName: z.string().trim().optional(),
  farrierName: z.string().trim().optional(),
  trainerName: z.string().trim().optional(),
  nextFarrierVisitAt: z.string().optional(),
  ownerContactName: z.string().trim().optional(),
  ownerContactPhone: z.string().trim().optional(),
  ownerContactEmail: z.string().trim().optional(),
  veterinarianContactName: z.string().trim().optional(),
  veterinarianContactPhone: z.string().trim().optional(),
  veterinarianContactEmail: z.string().trim().optional(),
  farrierContactName: z.string().trim().optional(),
  farrierContactPhone: z.string().trim().optional(),
  farrierContactEmail: z.string().trim().optional(),
});

export const medicalRecordFormSchema = z.object({
  type: z.enum([
    "CHECKUP",
    "VACCINATION",
    "DEWORMING",
    "TREATMENT",
    "SURGERY",
    "OTHER",
  ]),
  title: z.string().trim().min(2, "Introduce un titulo valido."),
  date: z.string().min(1, "Selecciona una fecha."),
  veterinarianName: z.string().trim().optional(),
  diagnosis: z.string().trim().optional(),
  treatment: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  nextReviewAt: z.string().optional(),
});

export const weightEntryFormSchema = z.object({
  date: z.string().min(1, "Selecciona una fecha."),
  weightKg: z.string().min(1, "Indica el peso."),
  notes: z.string().trim().optional(),
});

export const injuryFormSchema = z.object({
  title: z.string().trim().min(2, "Indica el tipo de lesion."),
  status: z.enum(["ACTIVE", "MONITORING", "RESOLVED"]),
  detectedAt: z.string().min(1, "Selecciona una fecha."),
  resolvedAt: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  description: z.string().trim().optional(),
  treatmentPlan: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const feedFormSchema = z.object({
  feedType: z.string().trim().optional(),
  planName: z.string().trim().optional(),
  dailyRationKg: z.string().optional(),
  forage: z.string().trim().optional(),
  schedule: z.string().trim().optional(),
  mealsPerDay: z.string().optional(),
  supplements: z.string().trim().optional(),
  allergies: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const farrierConfigFormSchema = z.object({
  farrierName: z.string().trim().min(2, "Indica el nombre del herrador."),
  nextFarrierVisitAt: z.string().min(1, "Selecciona la proxima visita."),
  farrierContactName: z.string().trim().optional(),
  farrierContactPhone: z.string().trim().optional(),
  farrierContactEmail: z.string().trim().optional(),
});

export const documentUploadFormSchema = z.object({
  type: z.enum(["PASSPORT", "INSURANCE", "ANALYTICS", "MEDICAL", "CONTRACT", "OTHER"]),
  name: z.string().trim().min(2, "Indica un nombre para el documento."),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().trim().optional(),
});

export type HorseFormValues = z.infer<typeof horseFormSchema>;
export type MedicalRecordFormValues = z.infer<typeof medicalRecordFormSchema>;
export type WeightEntryFormValues = z.infer<typeof weightEntryFormSchema>;
export type InjuryFormValues = z.infer<typeof injuryFormSchema>;
export type FeedFormValues = z.infer<typeof feedFormSchema>;
export type FarrierConfigFormValues = z.infer<typeof farrierConfigFormSchema>;
export type DocumentUploadFormValues = z.infer<typeof documentUploadFormSchema>;

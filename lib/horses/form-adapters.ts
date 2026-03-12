import { Timestamp } from "firebase/firestore";
import {
  AddInjuryInput,
  AddMedicalRecordInput,
  AddWeightEntryInput,
  CreateHorseInput,
  DocumentUploadFormValues,
  FarrierConfigFormValues,
  FeedFormValues,
  FeedInfo,
  HorseFormValues,
  InjuryFormValues,
  MedicalRecordFormValues,
  UpdateHorseInput,
  UploadHorseDocumentInput,
  WeightEntryFormValues,
} from "@/lib/horses";
import { dateInputToDate } from "@/lib/horses";

const toOptionalNumber = (value?: string): number | undefined => {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toContact = (name?: string, phone?: string, email?: string) => {
  const normalizedName = name?.trim();
  const normalizedPhone = phone?.trim();
  const normalizedEmail = email?.trim();

  if (!normalizedName && !normalizedPhone && !normalizedEmail) {
    return undefined;
  }

  return {
    name: normalizedName || "Sin nombre",
    phone: normalizedPhone || undefined,
    email: normalizedEmail || undefined,
  };
};

const commaSeparated = (value?: string): string[] | undefined => {
  const items = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items?.length ? items : undefined;
};

export const horseFormValuesToPayload = (
  values: HorseFormValues
): CreateHorseInput | UpdateHorseInput => ({
  name: values.name,
  breed: values.breed || undefined,
  age: toOptionalNumber(values.age),
  sex: values.sex,
  status: values.status,
  coat: values.coat || undefined,
  stableId: values.stableId || undefined,
  ownerId: values.ownerId || undefined,
  birthDate: (() => {
    const date = dateInputToDate(values.birthDate);
    return date ? Timestamp.fromDate(date) : undefined;
  })(),
  enteredCenterAt: (() => {
    const date = dateInputToDate(values.enteredCenterAt);
    return date ? Timestamp.fromDate(date) : undefined;
  })(),
  heightCm: toOptionalNumber(values.heightCm),
  microchipId: values.microchipId || undefined,
  notes: values.notes || undefined,
  veterinarianName: values.veterinarianName || undefined,
  farrierName: values.farrierName || undefined,
  trainerName: values.trainerName || undefined,
  nextFarrierVisitAt: (() => {
    const date = dateInputToDate(values.nextFarrierVisitAt);
    return date ? Timestamp.fromDate(date) : undefined;
  })(),
  ownerContact: toContact(
    values.ownerContactName,
    values.ownerContactPhone,
    values.ownerContactEmail
  ),
  veterinarianContact: toContact(
    values.veterinarianContactName,
    values.veterinarianContactPhone,
    values.veterinarianContactEmail
  ),
  farrierContact: toContact(
    values.farrierContactName,
    values.farrierContactPhone,
    values.farrierContactEmail
  ),
  tags: [],
});

export const medicalRecordValuesToInput = (
  values: MedicalRecordFormValues,
  createdBy: string
): AddMedicalRecordInput => ({
  type: values.type,
  title: values.title,
  date: Timestamp.fromDate(dateInputToDate(values.date) ?? new Date()),
  veterinarianName: values.veterinarianName || undefined,
  diagnosis: values.diagnosis || undefined,
  treatment: values.treatment || undefined,
  notes: values.notes || undefined,
  attachments: [],
  nextReviewAt: values.nextReviewAt
    ? Timestamp.fromDate(dateInputToDate(values.nextReviewAt) ?? new Date())
    : undefined,
  createdBy,
});

export const weightEntryValuesToInput = (
  values: WeightEntryFormValues,
  createdBy: string
): AddWeightEntryInput => ({
  date: Timestamp.fromDate(dateInputToDate(values.date) ?? new Date()),
  weightKg: Number(values.weightKg),
  notes: values.notes || undefined,
  createdBy,
});

export const injuryValuesToInput = (
  values: InjuryFormValues,
  createdBy: string
): AddInjuryInput => ({
  title: values.title,
  status: values.status,
  detectedAt: Timestamp.fromDate(dateInputToDate(values.detectedAt) ?? new Date()),
  resolvedAt: values.resolvedAt
    ? Timestamp.fromDate(dateInputToDate(values.resolvedAt) ?? new Date())
    : undefined,
  severity: values.severity,
  description: values.description || undefined,
  treatmentPlan: values.treatmentPlan || undefined,
  notes: values.notes || undefined,
  createdBy,
});

export const feedValuesToFeedInfo = (values: FeedFormValues): FeedInfo => ({
  feedType: values.feedType || undefined,
  planName: values.planName || undefined,
  dailyRationKg: toOptionalNumber(values.dailyRationKg),
  forage: values.forage || undefined,
  schedule: values.schedule || undefined,
  mealsPerDay: toOptionalNumber(values.mealsPerDay),
  supplements: commaSeparated(values.supplements),
  allergies: commaSeparated(values.allergies),
  notes: values.notes || undefined,
});

export const documentValuesToInput = (
  values: DocumentUploadFormValues,
  file: File,
  uploadedBy: string
): UploadHorseDocumentInput => ({
  type: values.type,
  name: values.name,
  file,
  fileName: file.name,
  contentType: file.type || undefined,
  issuedAt: values.issuedAt
    ? Timestamp.fromDate(dateInputToDate(values.issuedAt) ?? new Date())
    : undefined,
  expiresAt: values.expiresAt
    ? Timestamp.fromDate(dateInputToDate(values.expiresAt) ?? new Date())
    : undefined,
  notes: values.notes || undefined,
  uploadedBy,
});

export const farrierValuesToHorsePatch = (values: FarrierConfigFormValues): UpdateHorseInput => ({
  farrierName: values.farrierName,
  nextFarrierVisitAt: Timestamp.fromDate(dateInputToDate(values.nextFarrierVisitAt) ?? new Date()),
  farrierContact: toContact(
    values.farrierContactName,
    values.farrierContactPhone,
    values.farrierContactEmail
  ),
});

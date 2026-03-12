import {
  FirestoreHorseAlertDoc,
  FirestoreHorseDoc,
  FirestoreHorseDocumentDoc,
  FirestoreInjuryDoc,
  FirestoreMedicalRecordDoc,
  FirestoreWeightEntryDoc,
} from "@/lib/horses/firestore-types";
import {
  ContactInfo,
  FeedInfo,
  Horse,
  HorseAlert,
  HorseDocument,
  Injury,
  MedicalRecord,
  WeightEntry,
} from "@/lib/horses/types";

const mapContactInfo = (
  value?: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  } | null
): ContactInfo | undefined => {
  if (!value) return undefined;
  return {
    name: value.name,
    phone: value.phone ?? undefined,
    email: value.email ?? undefined,
    address: value.address ?? undefined,
  };
};

const mapFeedInfo = (
  value?: {
    planName?: string | null;
    feedType?: string | null;
    notes?: string | null;
    mealsPerDay?: number | null;
    dailyRationKg?: number | null;
    forage?: string | null;
    schedule?: string | null;
    supplements?: string[] | null;
    allergies?: string[] | null;
  } | null
): FeedInfo | undefined => {
  if (!value) return undefined;
  return {
    planName: value.planName ?? undefined,
    feedType: value.feedType ?? undefined,
    notes: value.notes ?? undefined,
    mealsPerDay: value.mealsPerDay ?? undefined,
    dailyRationKg: value.dailyRationKg ?? undefined,
    forage: value.forage ?? undefined,
    schedule: value.schedule ?? undefined,
    supplements: value.supplements ?? undefined,
    allergies: value.allergies ?? undefined,
  };
};

export const mapHorse = (
  id: string,
  data: FirestoreHorseDoc,
  centerId: string
): Horse => ({
  id,
  centerId,
  name: data.name,
  status: data.status,
  ownerId: data.ownerId ?? undefined,
  riderId: data.riderId ?? undefined,
  stableId: data.stableId ?? undefined,
  breed: data.breed ?? undefined,
  coat: data.coat ?? undefined,
  sex: data.sex,
  birthDate: data.birthDate ?? undefined,
  enteredCenterAt: data.enteredCenterAt ?? undefined,
  age: data.age ?? undefined,
  heightCm: data.heightCm ?? undefined,
  weightKg: data.weightKg ?? undefined,
  microchipId: data.microchipId ?? undefined,
  federationId: data.federationId ?? undefined,
  photoUrl: data.photoUrl ?? undefined,
  notes: data.notes ?? undefined,
  feedInfo: mapFeedInfo(data.feedInfo),
  ownerContact: mapContactInfo(data.ownerContact),
  emergencyContact: mapContactInfo(data.emergencyContact),
  veterinarianName: data.veterinarianName ?? undefined,
  veterinarianContact: mapContactInfo(data.veterinarianContact),
  farrierName: data.farrierName ?? undefined,
  farrierContact: mapContactInfo(data.farrierContact),
  trainerName: data.trainerName ?? undefined,
  nextFarrierVisitAt: data.nextFarrierVisitAt ?? undefined,
  tags: data.tags ?? [],
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapMedicalRecord = (
  id: string,
  data: FirestoreMedicalRecordDoc,
  centerId: string,
  horseId: string
): MedicalRecord => ({
  id,
  centerId,
  horseId,
  type: data.type,
  title: data.title,
  date: data.date,
  veterinarianName: data.veterinarianName ?? undefined,
  diagnosis: data.diagnosis ?? undefined,
  treatment: data.treatment ?? undefined,
  notes: data.notes ?? undefined,
  attachments: data.attachments ?? [],
  nextReviewAt: data.nextReviewAt ?? undefined,
  createdBy: data.createdBy,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapWeightEntry = (
  id: string,
  data: FirestoreWeightEntryDoc,
  centerId: string,
  horseId: string
): WeightEntry => ({
  id,
  centerId,
  horseId,
  date: data.date,
  weightKg: data.weightKg,
  notes: data.notes ?? undefined,
  createdBy: data.createdBy,
  createdAt: data.createdAt,
});

export const mapInjury = (
  id: string,
  data: FirestoreInjuryDoc,
  centerId: string,
  horseId: string
): Injury => ({
  id,
  centerId,
  horseId,
  title: data.title,
  status: data.status,
  detectedAt: data.detectedAt,
  resolvedAt: data.resolvedAt ?? undefined,
  severity: data.severity ?? undefined,
  description: data.description ?? undefined,
  treatmentPlan: data.treatmentPlan ?? undefined,
  notes: data.notes ?? undefined,
  createdBy: data.createdBy,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapHorseDocument = (
  id: string,
  data: FirestoreHorseDocumentDoc,
  centerId: string,
  horseId: string
): HorseDocument => ({
  id,
  centerId,
  horseId,
  type: data.type,
  name: data.name,
  fileName: data.fileName,
  storagePath: data.storagePath,
  downloadUrl: data.downloadUrl,
  contentType: data.contentType ?? undefined,
  sizeBytes: data.sizeBytes ?? undefined,
  issuedAt: data.issuedAt ?? undefined,
  expiresAt: data.expiresAt ?? undefined,
  notes: data.notes ?? undefined,
  uploadedBy: data.uploadedBy,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapHorseAlert = (
  id: string,
  data: FirestoreHorseAlertDoc,
  centerId: string,
  horseId: string
): HorseAlert => ({
  id,
  centerId,
  horseId,
  type: data.type,
  severity: data.severity,
  title: data.title,
  description: data.description,
  isActive: data.isActive,
  detectedAt: data.detectedAt,
  dueAt: data.dueAt ?? undefined,
  sourceId: data.sourceId ?? undefined,
  sourceCollection: data.sourceCollection ?? undefined,
  metadata: data.metadata ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

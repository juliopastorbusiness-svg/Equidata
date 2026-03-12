import { Timestamp } from "firebase/firestore";
import {
  HorseAlertSeverity,
  HorseAlertType,
  HorseDocumentType,
  HorseSex,
  HorseStatus,
  InjuryStatus,
  MedicalRecordType,
} from "@/lib/horses/types";

export type FirestoreContactInfo = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type FirestoreFeedInfo = {
  planName?: string | null;
  feedType?: string | null;
  notes?: string | null;
  mealsPerDay?: number | null;
  dailyRationKg?: number | null;
  forage?: string | null;
  schedule?: string | null;
  supplements?: string[] | null;
  allergies?: string[] | null;
};

export type FirestoreHorseDoc = {
  name: string;
  status: HorseStatus;
  ownerId?: string | null;
  riderId?: string | null;
  stableId?: string | null;
  breed?: string | null;
  coat?: string | null;
  sex: HorseSex;
  birthDate?: Timestamp | null;
  enteredCenterAt?: Timestamp | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  microchipId?: string | null;
  federationId?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  feedInfo?: FirestoreFeedInfo | null;
  ownerContact?: FirestoreContactInfo | null;
  emergencyContact?: FirestoreContactInfo | null;
  veterinarianName?: string | null;
  veterinarianContact?: FirestoreContactInfo | null;
  farrierName?: string | null;
  farrierContact?: FirestoreContactInfo | null;
  trainerName?: string | null;
  nextFarrierVisitAt?: Timestamp | null;
  tags?: string[] | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreMedicalRecordDoc = {
  type: MedicalRecordType;
  title: string;
  date: Timestamp;
  veterinarianName?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  notes?: string | null;
  attachments?: string[] | null;
  nextReviewAt?: Timestamp | null;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreWeightEntryDoc = {
  date: Timestamp;
  weightKg: number;
  notes?: string | null;
  createdBy: string;
  createdAt?: Timestamp;
};

export type FirestoreInjuryDoc = {
  title: string;
  status: InjuryStatus;
  detectedAt: Timestamp;
  resolvedAt?: Timestamp | null;
  severity?: HorseAlertSeverity | null;
  description?: string | null;
  treatmentPlan?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreHorseAlertDoc = {
  type: HorseAlertType;
  severity: HorseAlertSeverity;
  title: string;
  description: string;
  isActive: boolean;
  detectedAt: Timestamp;
  dueAt?: Timestamp | null;
  sourceId?: string | null;
  sourceCollection?: string | null;
  metadata?: Record<string, string | number | boolean | null> | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreHorseDocumentDoc = {
  type: HorseDocumentType;
  name: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  contentType?: string | null;
  sizeBytes?: number | null;
  issuedAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
  notes?: string | null;
  uploadedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

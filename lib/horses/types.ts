import { Timestamp } from "firebase/firestore";

export const HORSE_STATUSES = [
  "ACTIVE",
  "RESTING",
  "RECOVERING",
  "INACTIVE",
  "ARCHIVED",
] as const;

export type HorseStatus = (typeof HORSE_STATUSES)[number];

export const HORSE_ALERT_TYPES = [
  "ACTIVE_INJURY",
  "WEIGHT_CHANGE",
  "MEDICAL_REVIEW",
  "UPCOMING_VACCINATION",
  "UPCOMING_DEWORMING",
  "UPCOMING_VET_REVIEW",
  "UPCOMING_FARRIER",
  "OVERDUE_CARE",
  "MISSING_CONFIGURATION",
  "DOCUMENT_EXPIRING",
] as const;

export type HorseAlertType = (typeof HORSE_ALERT_TYPES)[number];

export const HORSE_ALERT_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;

export type HorseAlertSeverity = (typeof HORSE_ALERT_SEVERITIES)[number];

export const MEDICAL_RECORD_TYPES = [
  "CHECKUP",
  "VACCINATION",
  "DEWORMING",
  "TREATMENT",
  "SURGERY",
  "OTHER",
] as const;

export type MedicalRecordType = (typeof MEDICAL_RECORD_TYPES)[number];

export const INJURY_STATUSES = ["ACTIVE", "MONITORING", "RESOLVED"] as const;

export type InjuryStatus = (typeof INJURY_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "PASSPORT",
  "INSURANCE",
  "ANALYTICS",
  "MEDICAL",
  "CONTRACT",
  "OTHER",
] as const;

export type HorseDocumentType = (typeof DOCUMENT_TYPES)[number];

export type HorseSex = "STALLION" | "MARE" | "GELDING" | "UNKNOWN";

export type ContactInfo = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type FeedInfo = {
  planName?: string;
  feedType?: string;
  notes?: string;
  mealsPerDay?: number;
  dailyRationKg?: number;
  forage?: string;
  schedule?: string;
  supplements?: string[];
  allergies?: string[];
};

export type Horse = {
  id: string;
  centerId: string;
  name: string;
  status: HorseStatus;
  ownerId?: string;
  riderId?: string;
  stableId?: string;
  breed?: string;
  coat?: string;
  sex: HorseSex;
  birthDate?: Timestamp;
  enteredCenterAt?: Timestamp;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  microchipId?: string;
  federationId?: string;
  photoUrl?: string;
  notes?: string;
  feedInfo?: FeedInfo;
  ownerContact?: ContactInfo;
  emergencyContact?: ContactInfo;
  veterinarianName?: string;
  veterinarianContact?: ContactInfo;
  farrierName?: string;
  farrierContact?: ContactInfo;
  trainerName?: string;
  nextFarrierVisitAt?: Timestamp;
  tags: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type MedicalRecord = {
  id: string;
  centerId: string;
  horseId: string;
  type: MedicalRecordType;
  title: string;
  date: Timestamp;
  veterinarianName?: string;
  diagnosis?: string;
  treatment?: string;
  notes?: string;
  attachments: string[];
  nextReviewAt?: Timestamp;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type WeightEntry = {
  id: string;
  centerId: string;
  horseId: string;
  date: Timestamp;
  weightKg: number;
  notes?: string;
  createdBy: string;
  createdAt?: Timestamp;
};

export type Injury = {
  id: string;
  centerId: string;
  horseId: string;
  title: string;
  status: InjuryStatus;
  detectedAt: Timestamp;
  resolvedAt?: Timestamp;
  severity?: HorseAlertSeverity;
  description?: string;
  treatmentPlan?: string;
  notes?: string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type HorseAlert = {
  id: string;
  centerId: string;
  horseId: string;
  type: HorseAlertType;
  severity: HorseAlertSeverity;
  title: string;
  description: string;
  isActive: boolean;
  detectedAt: Timestamp;
  dueAt?: Timestamp;
  sourceId?: string;
  sourceCollection?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type HorseDocument = {
  id: string;
  centerId: string;
  horseId: string;
  type: HorseDocumentType;
  name: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  contentType?: string;
  sizeBytes?: number;
  issuedAt?: Timestamp;
  expiresAt?: Timestamp;
  notes?: string;
  uploadedBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type HorseListItem = {
  horse: Horse;
  ownerLabel: string;
  ownerId?: string;
  assignedBox?: string;
  arrivalAt?: Timestamp;
  activeAlerts: HorseAlert[];
};

export type CenterPersonOption = {
  id: string;
  label: string;
};

export type CreateHorseInput = Omit<
  Horse,
  "id" | "centerId" | "createdAt" | "updatedAt"
>;

export type UpdateHorseInput = Partial<CreateHorseInput>;

export type AddMedicalRecordInput = Omit<
  MedicalRecord,
  "id" | "centerId" | "horseId" | "createdAt" | "updatedAt"
>;

export type AddWeightEntryInput = Omit<
  WeightEntry,
  "id" | "centerId" | "horseId" | "createdAt"
>;

export type AddInjuryInput = Omit<
  Injury,
  "id" | "centerId" | "horseId" | "createdAt" | "updatedAt"
>;

export type UploadHorseDocumentInput = {
  type: HorseDocumentType;
  name: string;
  file: File | Blob;
  fileName: string;
  contentType?: string;
  issuedAt?: Timestamp;
  expiresAt?: Timestamp;
  notes?: string;
  uploadedBy: string;
};

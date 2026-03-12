import { Timestamp } from "firebase/firestore";
import {
  AssignmentStatus,
  ClassLevel,
  ClassStatus,
  CompetitionStatus,
  EventStatus,
  EventType,
  MedicationAdministrationRoute,
  PaddockStatus,
  PaddockType,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  ReservationStatus,
  StudentLevel,
  StudentStatus,
  TrainingIntensity,
  TrainingStatus,
  TreatmentStatus,
} from "@/lib/services/types";

export type FirestorePaddockDoc = {
  name: string;
  code?: string | null;
  maxCapacity: number;
  type: PaddockType;
  status: PaddockStatus;
  surface?: string | null;
  location?: string | null;
  notes?: string | null;
  specialConditions?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestorePaddockAssignmentDoc = {
  paddockId: string;
  horseId: string;
  assignedByUid: string;
  startAt: Timestamp;
  endAt?: Timestamp | null;
  status: AssignmentStatus;
  reason?: string | null;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreMedicationDoc = {
  name: string;
  category?: string | null;
  description?: string | null;
  stock: number;
  unit: string;
  recommendedDose?: number | null;
  batch?: string | null;
  expiryDate?: Timestamp | null;
  supplier?: string | null;
  storageLocation?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreHorseTreatmentDoc = {
  horseId: string;
  medicationId: string;
  startDate: Timestamp;
  endDate?: Timestamp | null;
  dose: number;
  frequency?: string | null;
  administrationRoute: MedicationAdministrationRoute;
  reason?: string | null;
  prescribedBy?: string | null;
  status: TreatmentStatus;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreEventDoc = {
  title: string;
  description?: string | null;
  type: EventType;
  status: EventStatus;
  startAt: Timestamp;
  endAt: Timestamp;
  arenaId?: string | null;
  classId?: string | null;
  trainingId?: string | null;
  competitionId?: string | null;
  trainerId?: string | null;
  horseIds?: string[] | null;
  studentIds?: string[] | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreClassDoc = {
  title: string;
  description?: string | null;
  date: Timestamp;
  startTime: string;
  endTime: string;
  trainerId?: string | null;
  studentIds?: string[] | null;
  horseIds?: string[] | null;
  arenaId?: string | null;
  requiredLevel: ClassLevel;
  capacity: number;
  price?: number | null;
  startAt: Timestamp;
  endAt: Timestamp;
  status: ClassStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreTrainingDoc = {
  horseId: string;
  trainerId: string;
  date: Timestamp;
  type: string;
  intensity: TrainingIntensity;
  objective?: string | null;
  arenaId?: string | null;
  startTime: string;
  endTime: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: TrainingStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreCompetitionDoc = {
  name: string;
  discipline?: string | null;
  location?: string | null;
  startDate: Timestamp;
  endDate?: Timestamp | null;
  horseIds?: string[] | null;
  riderIds?: string[] | null;
  status: CompetitionStatus;
  arenaId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreStudentDoc = {
  firstName: string;
  lastName: string;
  birthDate?: Timestamp | null;
  email?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  level: StudentLevel;
  status: StudentStatus;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreClassReservationDoc = {
  classId: string;
  studentId: string;
  reservedByUid?: string | null;
  status: ReservationStatus;
  reservationDate?: Timestamp | null;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreStudentPaymentDoc = {
  studentId: string;
  reservationId?: string | null;
  concept: string;
  type: PaymentType;
  amount: number;
  date: Timestamp;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

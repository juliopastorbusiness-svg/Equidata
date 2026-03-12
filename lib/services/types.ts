import { Timestamp } from "firebase/firestore";
import { AuditFields } from "@/lib/services/shared";

export type PaddockStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "UNAVAILABLE";
export type PaddockType = "INDIVIDUAL" | "SHARED" | "REST" | "REHABILITATION";
export type AssignmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type MedicationAdministrationRoute = "ORAL" | "INJECTABLE" | "TOPICAL" | "INHALED" | "OTHER";
export type TreatmentStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type EventType =
  | "CLASS"
  | "TRAINING"
  | "COMPETITION"
  | "VET_REVIEW"
  | "FARRIER"
  | "GENERAL"
  | "INTERNAL_TASK";
export type EventStatus = "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type ClassLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MIXED";
export type ClassStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
export type TrainingStatus = "PLANNED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type CompetitionStatus = "PLANNED" | "OPEN" | "CLOSED" | "CANCELLED" | "COMPLETED";
export type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";
export type StudentStatus = "ACTIVE" | "INACTIVE" | "LEAD";
export type StudentLevel = "INITIATION" | "BASIC" | "INTERMEDIATE" | "ADVANCED" | "COMPETITION";
export type ReservationStatus = "RESERVED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED" | "OVERDUE";
export type PaymentType = "SINGLE_CLASS" | "PACK" | "MONTHLY" | "COMPETITION" | "OTHER";
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD" | "STRIPE";

export type Paddock = AuditFields & {
  id: string;
  centerId: string;
  name: string;
  code?: string;
  maxCapacity: number;
  type: PaddockType;
  status: PaddockStatus;
  surface?: string;
  location?: string;
  notes?: string;
  specialConditions?: string;
};

export type PaddockAssignment = AuditFields & {
  id: string;
  centerId: string;
  paddockId: string;
  horseId: string;
  assignedByUid: string;
  startAt: Timestamp;
  endAt?: Timestamp;
  status: AssignmentStatus;
  reason?: string;
  notes?: string;
};

export type Medication = AuditFields & {
  id: string;
  centerId: string;
  name: string;
  category?: string;
  description?: string;
  stock: number;
  unit: string;
  recommendedDose?: number;
  batch?: string;
  expiryDate?: Timestamp;
  supplier?: string;
  storageLocation?: string;
  notes?: string;
  isActive: boolean;
};

export type HorseTreatment = AuditFields & {
  id: string;
  centerId: string;
  horseId: string;
  medicationId: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  dose: number;
  frequency?: string;
  administrationRoute: MedicationAdministrationRoute;
  reason?: string;
  prescribedBy?: string;
  status: TreatmentStatus;
  notes?: string;
};

export type Event = AuditFields & {
  id: string;
  centerId: string;
  title: string;
  description?: string;
  type: EventType;
  status: EventStatus;
  date: string;
  startTime: string;
  endTime: string;
  startAt: Timestamp;
  endAt: Timestamp;
  location?: string;
  arenaId?: string;
  classId?: string;
  trainingId?: string;
  competitionId?: string;
  trainerId?: string;
  horseIds: string[];
  studentIds: string[];
  notes?: string;
};

export type Class = AuditFields & {
  id: string;
  centerId: string;
  title: string;
  description?: string;
  date: Timestamp;
  startTime: string;
  endTime: string;
  trainerId?: string;
  studentIds: string[];
  horseIds: string[];
  arenaId?: string;
  requiredLevel: ClassLevel;
  capacity: number;
  price?: number;
  startAt: Timestamp;
  endAt: Timestamp;
  status: ClassStatus;
};

export type Training = AuditFields & {
  id: string;
  centerId: string;
  horseId: string;
  trainerId: string;
  date: Timestamp;
  type: string;
  intensity: TrainingIntensity;
  objective?: string;
  arenaId?: string;
  startTime: string;
  endTime: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: TrainingStatus;
};

export type Competition = AuditFields & {
  id: string;
  centerId: string;
  name: string;
  discipline?: string;
  location?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  horseIds: string[];
  riderIds: string[];
  status: CompetitionStatus;
  arenaId?: string;
};

export type Student = AuditFields & {
  id: string;
  centerId: string;
  firstName: string;
  lastName: string;
  birthDate?: Timestamp;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  level: StudentLevel;
  status: StudentStatus;
  notes?: string;
};

export type ClassReservation = AuditFields & {
  id: string;
  centerId: string;
  classId: string;
  studentId: string;
  reservedByUid?: string;
  status: ReservationStatus;
  reservationDate?: Timestamp;
  notes?: string;
};

export type StudentPayment = AuditFields & {
  id: string;
  centerId: string;
  studentId: string;
  reservationId?: string;
  concept: string;
  type: PaymentType;
  amount: number;
  date: Timestamp;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  notes?: string;
};

export type DateRange = {
  start: Date | Timestamp;
  end: Date | Timestamp;
};

import { Timestamp } from "firebase/firestore";
import {
  ArenaBookingSourceType,
  ArenaBookingStatus,
  BillingCustomerFinancialStatus,
  BillingMovementType,
  BillingPaymentMethod,
  CenterEventSourceType,
  CenterMemberStatus,
  CenterClassBookingMode,
  CenterClassLevel,
  CenterClassStatus,
  CenterClassVisibility,
  CenterStatus,
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
  UserRole,
} from "@/lib/services/types";

export type FirestoreUserProfileDoc = {
  uid?: string;
  role?: UserRole | string | null;
  fullName?: string | null;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  linkedCenters?: string[] | null;
  activeCenterId?: string | null;
  centerId?: string | null;
  proType?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreCenterDoc = {
  name?: string | null;
  nameLower?: string | null;
  slug?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  ownerId?: string | null;
  ownerUid?: string | null;
  isActive?: boolean | null;
  status?: CenterStatus | string | null;
  
  // ✨ NUEVO: Array de módulos habilitados
  enabledModules?: string[] | null; // string[] porque Firestore no soporta tipos de unión
  
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreCenterMemberDoc = {
  userId?: string | null;
  uid?: string | null;
  role?: UserRole | string | null;
  status?: CenterMemberStatus | string | null;
  joinedAt?: Timestamp | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreBillingCustomerDoc = {
  centerId?: string | null;
  fullName?: string | null;
  fullNameLower?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  totalSpent?: number | null;
  totalPaid?: number | null;
  balance?: number | null;
  financialStatus?: BillingCustomerFinancialStatus | string | null;
  lastMovementAt?: Timestamp | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreBillingMovementDoc = {
  centerId?: string | null;
  customerId?: string | null;
  type?: BillingMovementType | string | null;
  date?: Timestamp | null;
  description?: string | null;
  amount?: number | null;
  notes?: string | null;
  paymentMethod?: BillingPaymentMethod | string | null;
  reference?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreArenaBookingDoc = {
  arenaId: string;
  sourceType: ArenaBookingSourceType | string;
  sourceId: string;
  title: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: ArenaBookingStatus | string;
  createdBy: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

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
  sourceType?: CenterEventSourceType | string | null;
  sourceId?: string | null;
  status: EventStatus;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  startAt: Timestamp;
  endAt: Timestamp;
  location?: string | null;
  arenaId?: string | null;
  riderId?: string | null;
  classId?: string | null;
  trainingId?: string | null;
  competitionId?: string | null;
  trainerId?: string | null;
  horseIds?: string[] | null;
  studentIds?: string[] | null;
  notes?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirestoreClassDoc = {
  title: string;
  description?: string | null;
  notes?: string | null;
  discipline?: string | null;
  level?: CenterClassLevel | string | null;
  date: Timestamp;
  startTime: string;
  endTime: string;
  trainerId?: string | null;
  studentIds?: string[] | null;
  horseIds?: string[] | null;
  arenaId?: string | null;
  requiredLevel: ClassLevel;
  capacity: number;
  availableSpots?: number | null;
  price?: number | null;
  startAt: Timestamp;
  endAt: Timestamp;
  status: CenterClassStatus | ClassStatus | string;
  visibility?: CenterClassVisibility | string | null;
  bookingMode?: CenterClassBookingMode | string | null;
  createdBy?: string | null;
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
  riderId?: string | null;
  studentId?: string | null;
  reservedByUid?: string | null;
  status: ReservationStatus;
  reservedAt?: Timestamp | null;
  reservationDate?: Timestamp | null;
  notes?: string | null;
  paymentStatus?: PaymentStatus | null;
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

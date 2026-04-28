import { Timestamp } from "firebase/firestore";
import { AuditFields } from "@/lib/services/shared";
import type { ModuleId } from "@/lib/modules/moduleConfig";

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
export type CenterEventSourceType = "class" | "training" | "competition" | "manual";
export type ClassLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "MIXED";
export type ClassStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
export type TrainingStatus = "PLANNED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type CompetitionStatus = "PLANNED" | "OPEN" | "CLOSED" | "CANCELLED" | "COMPLETED";
export type TrainingIntensity = "LOW" | "MEDIUM" | "HIGH";
export type StudentStatus = "ACTIVE" | "INACTIVE" | "LEAD";
export type StudentLevel = "INITIATION" | "BASIC" | "INTERMEDIATE" | "ADVANCED" | "COMPETITION";
export type ClassReservationStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type LegacyReservationStatus = "RESERVED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export type ReservationStatus = ClassReservationStatus | LegacyReservationStatus;
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED" | "OVERDUE";
export type PaymentType = "SINGLE_CLASS" | "PACK" | "MONTHLY" | "COMPETITION" | "OTHER";
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD" | "STRIPE";
export type UserRole = "center_owner" | "center_staff" | "rider" | "pro";
export type CenterStatus = "active" | "inactive";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";
export type CenterMemberStatus = "pending" | "active" | "rejected";
export type CenterClassLevel =
  | "initiation"
  | "basic"
  | "intermediate"
  | "advanced"
  | "competition"
  | "mixed";
export type CenterClassStatus = "draft" | "published" | "full" | "cancelled" | "completed";
export type CenterClassVisibility = "members_only" | "private";
export type CenterClassBookingMode = "manual" | "request";
export type ArenaBookingSourceType = "class" | "training" | "maintenance" | "internal_block";
export type ArenaBookingStatus = "active" | "cancelled" | "completed";
export type BillingCustomerFinancialStatus = "pending" | "paid" | "credit";
export type BillingMovementType = "expense" | "payment";
export type BillingPaymentMethod = "cash" | "transfer" | "card" | "other";

export type UserProfile = AuditFields & {
  uid: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  linkedCenters?: string[];
  activeCenterId?: string;
  displayName?: string;
  name?: string;
  centerId?: string | null;
  proType?: string | null;
  planId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
};

export type RiderProfile = UserProfile & {
  role: "rider";
};

export type Center = AuditFields & {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  province?: string;
  ownerId: string;
  status: CenterStatus;
  
  enabledModules?: ModuleId[];
  planId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: Date | null;
  horseLimit?: number | null;
  featureLimit?: number | null;
  billingUpdatedAt?: Date | null;
};

export type CenterMember = AuditFields & {
  id: string;
  centerId: string;
  userId: string;
  role: UserRole;
  status: CenterMemberStatus;
  joinedAt?: Timestamp;
};

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

export type CenterEvent = AuditFields & {
  id: string;
  centerId: string;
  type: EventType;
  sourceType: CenterEventSourceType;
  sourceId: string;
  title: string;
  startAt: Timestamp;
  endAt: Timestamp;
  arenaId?: string;
  trainerId?: string;
  riderId?: string;
  classId?: string;
  status: EventStatus;
};

export type Event = CenterEvent & {
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  trainingId?: string;
  competitionId?: string;
  horseIds: string[];
  studentIds: string[];
  notes?: string;
};

export type CenterClass = AuditFields & {
  id: string;
  centerId: string;
  title: string;
  discipline: string;
  level: CenterClassLevel;
  description?: string;
  date: Timestamp;
  startTime: string;
  endTime: string;
  startAt: Timestamp;
  endAt: Timestamp;
  trainerId?: string;
  studentIds: string[];
  horseIds: string[];
  arenaId?: string;
  requiredLevel: ClassLevel;
  capacity: number;
  availableSpots: number;
  price?: number;
  status: CenterClassStatus;
  legacyStatus?: ClassStatus;
  notes?: string;
  visibility: CenterClassVisibility;
  bookingMode: CenterClassBookingMode;
  createdBy: string;
};

export type Class = CenterClass;

export type ArenaBooking = AuditFields & {
  id: string;
  centerId: string;
  arenaId: string;
  sourceType: ArenaBookingSourceType;
  sourceId: string;
  title: string;
  startAt: Timestamp;
  endAt: Timestamp;
  status: ArenaBookingStatus;
  createdBy: string;
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
  riderId: string;
  studentId?: string;
  reservedByUid?: string;
  status: ReservationStatus;
  legacyStatus?: LegacyReservationStatus;
  reservedAt?: Timestamp;
  reservationDate?: Timestamp;
  notes?: string;
  paymentStatus?: PaymentStatus;
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

export type BillingCustomer = AuditFields & {
  id: string;
  centerId: string;
  fullName: string;
  fullNameLower: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  totalSpent: number;
  totalPaid: number;
  balance: number;
  financialStatus: BillingCustomerFinancialStatus;
  lastMovementAt?: Timestamp;
  createdBy: string;
  updatedBy?: string;
};

export type BillingMovement = AuditFields & {
  id: string;
  centerId: string;
  customerId: string;
  type: BillingMovementType;
  date: Timestamp;
  description: string;
  amount: number;
  notes?: string;
  paymentMethod?: BillingPaymentMethod;
  reference?: string;
  createdBy: string;
  updatedBy?: string;
};

export type DateRange = {
  start: Date | Timestamp;
  end: Date | Timestamp;
};

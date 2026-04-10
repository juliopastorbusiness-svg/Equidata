import { Timestamp } from "firebase/firestore";
import {
  FirestoreArenaBookingDoc,
  FirestoreBillingCustomerDoc,
  FirestoreBillingMovementDoc,
  FirestoreCenterDoc,
  FirestoreCenterMemberDoc,
  FirestoreClassDoc,
  FirestoreClassReservationDoc,
  FirestoreCompetitionDoc,
  FirestoreEventDoc,
  FirestoreHorseTreatmentDoc,
  FirestoreMedicationDoc,
  FirestorePaddockAssignmentDoc,
  FirestorePaddockDoc,
  FirestoreStudentDoc,
  FirestoreStudentPaymentDoc,
  FirestoreTrainingDoc,
  FirestoreUserProfileDoc,
} from "@/lib/services/firestoreTypes";
import {
  ArenaBooking,
  BillingCustomer,
  BillingMovement,
  Center,
  CenterEvent,
  CenterMember,
  CenterClass,
  Class,
  ClassReservation,
  Competition,
  Event,
  HorseTreatment,
  Medication,
  Paddock,
  PaddockAssignment,
  Student,
  StudentPayment,
  Training,
  UserProfile,
} from "@/lib/services/types";
import { optionalStringArray } from "@/lib/services/shared";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeUserRole = (role?: string | null): UserProfile["role"] => {
  if (role === "center_owner" || role === "centerOwner") return "center_owner";
  if (role === "center_staff" || role === "CENTER_ADMIN") return "center_staff";
  if (role === "pro" || role === "rider") return role;
  return "rider";
};

const normalizeClassLevel = (level?: string | null): CenterClass["level"] => {
  if (
    level === "initiation" ||
    level === "basic" ||
    level === "intermediate" ||
    level === "advanced" ||
    level === "competition" ||
    level === "mixed"
  ) {
    return level;
  }
  if (level === "BEGINNER") return "initiation";
  if (level === "INTERMEDIATE") return "intermediate";
  if (level === "ADVANCED") return "advanced";
  return "mixed";
};

const normalizeRequiredLevel = (level: CenterClass["level"]): Class["requiredLevel"] => {
  if (level === "initiation" || level === "basic") return "BEGINNER";
  if (level === "intermediate") return "INTERMEDIATE";
  if (level === "advanced" || level === "competition") return "ADVANCED";
  return "MIXED";
};

const normalizeClassStatus = (status?: string | null): CenterClass["status"] => {
  if (
    status === "draft" ||
    status === "published" ||
    status === "full" ||
    status === "cancelled" ||
    status === "completed"
  ) {
    return status;
  }
  if (status === "DRAFT") return "draft";
  if (status === "PUBLISHED") return "published";
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  return "draft";
};

const normalizeArenaBookingStatus = (status?: string | null): ArenaBooking["status"] => {
  if (status === "active" || status === "cancelled" || status === "completed") {
    return status;
  }
  if (status === "ACTIVE") return "active";
  if (status === "CANCELLED") return "cancelled";
  if (status === "COMPLETED") return "completed";
  return "active";
};

const normalizeArenaSourceType = (sourceType?: string | null): ArenaBooking["sourceType"] => {
  if (
    sourceType === "class" ||
    sourceType === "training" ||
    sourceType === "maintenance" ||
    sourceType === "internal_block"
  ) {
    return sourceType;
  }
  return "internal_block";
};

const normalizeBillingCustomerStatus = (
  status?: string | null
): BillingCustomer["financialStatus"] => {
  if (status === "pending" || status === "paid" || status === "credit") {
    return status;
  }
  return "paid";
};

const normalizeBillingMovementType = (
  type?: string | null
): BillingMovement["type"] => {
  if (type === "expense" || type === "payment") {
    return type;
  }
  return "expense";
};

const normalizeBillingPaymentMethod = (
  value?: string | null
): BillingMovement["paymentMethod"] => {
  if (value === "cash" || value === "transfer" || value === "card" || value === "other") {
    return value;
  }
  return undefined;
};

const normalizeCenterEventSourceType = (
  sourceType?: string | null
): CenterEvent["sourceType"] => {
  if (
    sourceType === "class" ||
    sourceType === "training" ||
    sourceType === "competition" ||
    sourceType === "manual"
  ) {
    return sourceType;
  }
  return "manual";
};

const normalizeReservationStatus = (status?: string | null): ClassReservation["status"] => {
  if (
    status === "pending" ||
    status === "confirmed" ||
    status === "cancelled" ||
    status === "completed" ||
    status === "no_show" ||
    status === "RESERVED" ||
    status === "CONFIRMED" ||
    status === "CANCELLED" ||
    status === "COMPLETED" ||
    status === "NO_SHOW"
  ) {
    return status;
  }
  return "pending";
};

export const mapUserProfile = (id: string, data: FirestoreUserProfileDoc): UserProfile => ({
  uid: data.uid?.trim() || id,
  role: normalizeUserRole(data.role),
  fullName:
    data.fullName?.trim() ||
    data.displayName?.trim() ||
    data.name?.trim() ||
    data.email?.trim() ||
    id,
  email: data.email?.trim() || "",
  phone: data.phone?.trim() || undefined,
  avatarUrl: data.avatarUrl?.trim() || undefined,
  linkedCenters: optionalStringArray(data.linkedCenters),
  activeCenterId: data.activeCenterId?.trim() || data.centerId?.trim() || undefined,
  displayName: data.displayName?.trim() || undefined,
  name: data.name?.trim() || undefined,
  centerId: data.centerId?.trim() || null,
  proType: data.proType?.trim() || null,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapCenter = (id: string, data: FirestoreCenterDoc): Center => ({
  id,
  name: data.name?.trim() || "Centro sin nombre",
  slug: data.slug?.trim() || slugify(data.name?.trim() || id) || id,
  address: data.address?.trim() || undefined,
  city: data.city?.trim() || undefined,
  province: data.province?.trim() || undefined,
  ownerId: data.ownerId?.trim() || data.ownerUid?.trim() || "",
  status:
    data.status === "inactive" || data.isActive === false
      ? "inactive"
      : "active",
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapCenterMember = (
  id: string,
  data: FirestoreCenterMemberDoc,
  centerId: string
): CenterMember => ({
  id,
  centerId,
  userId: data.userId?.trim() || data.uid?.trim() || id,
  role: normalizeUserRole(data.role),
  status:
    data.status === "active" || data.status === "rejected" || data.status === "pending"
      ? data.status
      : "pending",
  joinedAt: data.joinedAt ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapBillingCustomer = (
  id: string,
  data: FirestoreBillingCustomerDoc,
  centerId: string
): BillingCustomer => ({
  id,
  centerId,
  fullName: data.fullName?.trim() || id,
  fullNameLower: data.fullNameLower?.trim() || data.fullName?.trim().toLowerCase() || id.toLowerCase(),
  phone: data.phone?.trim() || undefined,
  email: data.email?.trim() || undefined,
  address: data.address?.trim() || undefined,
  notes: data.notes?.trim() || undefined,
  totalSpent: typeof data.totalSpent === "number" ? data.totalSpent : 0,
  totalPaid: typeof data.totalPaid === "number" ? data.totalPaid : 0,
  balance:
    typeof data.balance === "number"
      ? data.balance
      : (typeof data.totalSpent === "number" ? data.totalSpent : 0) -
        (typeof data.totalPaid === "number" ? data.totalPaid : 0),
  financialStatus: normalizeBillingCustomerStatus(data.financialStatus),
  lastMovementAt: data.lastMovementAt ?? undefined,
  createdBy: data.createdBy?.trim() || "",
  updatedBy: data.updatedBy?.trim() || undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapBillingMovement = (
  id: string,
  data: FirestoreBillingMovementDoc,
  centerId: string,
  customerId: string
): BillingMovement => ({
  id,
  centerId,
  customerId: data.customerId?.trim() || customerId,
  type: normalizeBillingMovementType(data.type),
  date: data.date ?? Timestamp.now(),
  description: data.description?.trim() || id,
  amount: typeof data.amount === "number" ? data.amount : 0,
  notes: data.notes?.trim() || undefined,
  paymentMethod: normalizeBillingPaymentMethod(data.paymentMethod),
  reference: data.reference?.trim() || undefined,
  createdBy: data.createdBy?.trim() || "",
  updatedBy: data.updatedBy?.trim() || undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapArenaBooking = (
  id: string,
  data: FirestoreArenaBookingDoc,
  centerId: string
): ArenaBooking => ({
  id,
  centerId,
  arenaId: data.arenaId,
  sourceType: normalizeArenaSourceType(data.sourceType),
  sourceId: data.sourceId,
  title: data.title,
  startAt: data.startAt,
  endAt: data.endAt,
  status: normalizeArenaBookingStatus(data.status),
  createdBy: data.createdBy,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTimeValue = (date: Date) =>
  date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export const mapPaddock = (id: string, data: FirestorePaddockDoc, centerId: string): Paddock => ({
  id,
  centerId,
  name: data.name,
  code: data.code ?? undefined,
  maxCapacity: data.maxCapacity,
  type: data.type,
  status: data.status,
  surface: data.surface ?? undefined,
  location: data.location ?? undefined,
  notes: data.notes ?? undefined,
  specialConditions: data.specialConditions ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapPaddockAssignment = (
  id: string,
  data: FirestorePaddockAssignmentDoc,
  centerId: string
): PaddockAssignment => ({
  id,
  centerId,
  paddockId: data.paddockId,
  horseId: data.horseId,
  assignedByUid: data.assignedByUid,
  startAt: data.startAt,
  endAt: data.endAt ?? undefined,
  status: data.status,
  reason: data.reason ?? undefined,
  notes: data.notes ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapMedication = (
  id: string,
  data: FirestoreMedicationDoc,
  centerId: string
): Medication => ({
  id,
  centerId,
  name: data.name,
  category: data.category ?? undefined,
  description: data.description ?? undefined,
  stock: data.stock,
  unit: data.unit,
  recommendedDose: data.recommendedDose ?? undefined,
  batch: data.batch ?? undefined,
  expiryDate: data.expiryDate ?? undefined,
  supplier: data.supplier ?? undefined,
  storageLocation: data.storageLocation ?? undefined,
  notes: data.notes ?? undefined,
  isActive: data.isActive,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapHorseTreatment = (
  id: string,
  data: FirestoreHorseTreatmentDoc,
  centerId: string
): HorseTreatment => ({
  id,
  centerId,
  horseId: data.horseId,
  medicationId: data.medicationId,
  startDate: data.startDate,
  endDate: data.endDate ?? undefined,
  dose: data.dose,
  frequency: data.frequency ?? undefined,
  administrationRoute: data.administrationRoute,
  reason: data.reason ?? undefined,
  prescribedBy: data.prescribedBy ?? undefined,
  status: data.status,
  notes: data.notes ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapEvent = (id: string, data: FirestoreEventDoc, centerId: string): Event => ({
  id,
  centerId,
  type: data.type,
  sourceType:
    normalizeCenterEventSourceType(data.sourceType) ||
    (data.classId
      ? "class"
      : data.trainingId
        ? "training"
        : data.competitionId
          ? "competition"
          : "manual"),
  sourceId:
    data.sourceId ??
    data.classId ??
    data.trainingId ??
    data.competitionId ??
    id,
  title: data.title,
  description: data.description ?? undefined,
  status: data.status,
  date: data.date ?? formatDateKey(data.startAt.toDate()),
  startTime: data.startTime ?? formatTimeValue(data.startAt.toDate()),
  endTime: data.endTime ?? formatTimeValue(data.endAt.toDate()),
  startAt: data.startAt,
  endAt: data.endAt,
  location: data.location ?? undefined,
  arenaId: data.arenaId ?? undefined,
  riderId: data.riderId ?? undefined,
  classId: data.classId ?? undefined,
  trainingId: data.trainingId ?? undefined,
  competitionId: data.competitionId ?? undefined,
  trainerId: data.trainerId ?? undefined,
  horseIds: optionalStringArray(data.horseIds),
  studentIds: optionalStringArray(data.studentIds),
  notes: data.notes ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapCenterEvent = (
  id: string,
  data: FirestoreEventDoc,
  centerId: string
): CenterEvent => {
  const event = mapEvent(id, data, centerId);
  return {
    id: event.id,
    centerId: event.centerId,
    type: event.type,
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    title: event.title,
    startAt: event.startAt,
    endAt: event.endAt,
    arenaId: event.arenaId,
    trainerId: event.trainerId,
    riderId: event.riderId,
    classId: event.classId,
    status: event.status,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
};

export const mapClass = (id: string, data: FirestoreClassDoc, centerId: string): Class => {
  const level = normalizeClassLevel(data.level ?? data.requiredLevel);
  const status = normalizeClassStatus(data.status);

  return {
    id,
    centerId,
    title: data.title,
    discipline: data.discipline?.trim() || "General",
    level,
    description: data.description ?? data.notes ?? undefined,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    startAt: data.startAt,
    endAt: data.endAt,
    trainerId: data.trainerId ?? undefined,
    studentIds: optionalStringArray(data.studentIds),
    horseIds: optionalStringArray(data.horseIds),
    arenaId: data.arenaId ?? undefined,
    requiredLevel: data.requiredLevel ?? normalizeRequiredLevel(level),
    capacity: data.capacity,
    availableSpots: typeof data.availableSpots === "number" ? data.availableSpots : data.capacity,
    price: data.price ?? undefined,
    status,
    legacyStatus:
      status === "draft"
        ? "DRAFT"
        : status === "published" || status === "full"
          ? "PUBLISHED"
          : status === "cancelled"
            ? "CANCELLED"
            : "COMPLETED",
    notes: data.notes ?? data.description ?? undefined,
    visibility: data.visibility === "private" ? "private" : "members_only",
    bookingMode: data.bookingMode === "request" ? "request" : "manual",
    createdBy: data.createdBy?.trim() || "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
};

export const mapTraining = (
  id: string,
  data: FirestoreTrainingDoc,
  centerId: string
): Training => ({
  id,
  centerId,
  horseId: data.horseId,
  trainerId: data.trainerId,
  date: data.date,
  type: data.type,
  intensity: data.intensity,
  objective: data.objective ?? undefined,
  arenaId: data.arenaId ?? undefined,
  startTime: data.startTime,
  endTime: data.endTime,
  startAt: data.startAt,
  endAt: data.endAt,
  status: data.status,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapCompetition = (
  id: string,
  data: FirestoreCompetitionDoc,
  centerId: string
): Competition => ({
  id,
  centerId,
  name: data.name,
  discipline: data.discipline ?? undefined,
  location: data.location ?? undefined,
  startDate: data.startDate,
  endDate: data.endDate ?? undefined,
  horseIds: optionalStringArray(data.horseIds),
  riderIds: optionalStringArray(data.riderIds),
  status: data.status,
  arenaId: data.arenaId ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapStudent = (id: string, data: FirestoreStudentDoc, centerId: string): Student => ({
  id,
  centerId,
  firstName: data.firstName,
  lastName: data.lastName,
  birthDate: data.birthDate ?? undefined,
  email: data.email ?? undefined,
  phone: data.phone ?? undefined,
  emergencyContact: data.emergencyContact ?? undefined,
  level: data.level,
  status: data.status,
  notes: data.notes ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapClassReservation = (
  id: string,
  data: FirestoreClassReservationDoc,
  centerId: string
): ClassReservation => ({
  id,
  centerId,
  classId: data.classId,
  riderId: data.riderId ?? data.studentId ?? id,
  studentId: data.studentId ?? data.riderId ?? undefined,
  reservedByUid: data.reservedByUid ?? undefined,
  status: normalizeReservationStatus(data.status),
  legacyStatus:
    data.status === "RESERVED" ||
    data.status === "CONFIRMED" ||
    data.status === "CANCELLED" ||
    data.status === "COMPLETED" ||
    data.status === "NO_SHOW"
      ? data.status
      : data.status === "confirmed"
        ? "CONFIRMED"
        : data.status === "cancelled"
          ? "CANCELLED"
          : data.status === "completed"
            ? "COMPLETED"
            : data.status === "no_show"
              ? "NO_SHOW"
              : "RESERVED",
  reservedAt: data.reservedAt ?? data.reservationDate ?? undefined,
  reservationDate: data.reservationDate ?? data.reservedAt ?? undefined,
  notes: data.notes ?? undefined,
  paymentStatus: data.paymentStatus ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

export const mapStudentPayment = (
  id: string,
  data: FirestoreStudentPaymentDoc,
  centerId: string
): StudentPayment => ({
  id,
  centerId,
  studentId: data.studentId,
  reservationId: data.reservationId ?? undefined,
  concept: data.concept,
  type: data.type,
  amount: data.amount,
  date: data.date,
  paymentMethod: data.paymentMethod,
  status: data.status,
  notes: data.notes ?? undefined,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

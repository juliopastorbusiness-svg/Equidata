import {
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
} from "@/lib/services/firestoreTypes";
import {
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
} from "@/lib/services/types";
import { optionalStringArray } from "@/lib/services/shared";

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
  title: data.title,
  description: data.description ?? undefined,
  type: data.type,
  status: data.status,
  date: data.date ?? formatDateKey(data.startAt.toDate()),
  startTime: data.startTime ?? formatTimeValue(data.startAt.toDate()),
  endTime: data.endTime ?? formatTimeValue(data.endAt.toDate()),
  startAt: data.startAt,
  endAt: data.endAt,
  location: data.location ?? undefined,
  arenaId: data.arenaId ?? undefined,
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

export const mapClass = (id: string, data: FirestoreClassDoc, centerId: string): Class => ({
  id,
  centerId,
  title: data.title,
  description: data.description ?? undefined,
  date: data.date,
  startTime: data.startTime,
  endTime: data.endTime,
  trainerId: data.trainerId ?? undefined,
  studentIds: optionalStringArray(data.studentIds),
  horseIds: optionalStringArray(data.horseIds),
  arenaId: data.arenaId ?? undefined,
  requiredLevel: data.requiredLevel,
  capacity: data.capacity,
  price: data.price ?? undefined,
  startAt: data.startAt,
  endAt: data.endAt,
  status: data.status,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

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
  studentId: data.studentId,
  reservedByUid: data.reservedByUid ?? undefined,
  status: data.status,
  reservationDate: data.reservationDate ?? undefined,
  notes: data.notes ?? undefined,
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

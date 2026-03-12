import {
  Timestamp,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  FirestoreClassDoc,
  FirestoreClassReservationDoc,
  FirestoreEventDoc,
} from "@/lib/services/firestoreTypes";
import { mapClass, mapClassReservation } from "@/lib/services/mappers";
import { Class, ClassReservation } from "@/lib/services/types";
import { createEvent, deleteEvent, updateEvent } from "@/lib/services/calendarService";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  ensureNonNegativeNumber,
  optionalStringArray,
  optionalStringOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreateClassInput = {
  title: string;
  description?: string;
  date: Date;
  startTime: string;
  endTime: string;
  trainerId?: string;
  studentIds?: string[];
  horseIds?: string[];
  arenaId?: string;
  requiredLevel?: Class["requiredLevel"];
  capacity: number;
  status?: Class["status"];
  price?: number;
};

export type UpdateClassInput = Partial<CreateClassInput>;

export type CreateClassReservationInput = {
  classId: string;
  studentId: string;
  reservedByUid?: string;
  status?: ClassReservation["status"];
  reservationDate?: Date;
  notes?: string;
};

export type UpdateClassReservationInput = Partial<CreateClassReservationInput>;

const classesCollection = (centerId: string) =>
  centerCollection<FirestoreClassDoc>(centerId, "classes");
const classDoc = (centerId: string, classId: string) =>
  centerDocument<FirestoreClassDoc>(centerId, "classes", classId);
const reservationsCollection = (centerId: string) =>
  centerCollection<FirestoreClassReservationDoc>(centerId, "classReservations");
const reservationDoc = (centerId: string, reservationId: string) =>
  centerDocument<FirestoreClassReservationDoc>(centerId, "classReservations", reservationId);
const eventsCollection = (centerId: string) =>
  centerCollection<FirestoreEventDoc>(centerId, "events");

const combineDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
};

const getLinkedEventId = async (centerId: string, classId: string): Promise<string | null> => {
  const snapshot = await getDocs(query(eventsCollection(centerId), where("classId", "==", classId)));
  return snapshot.docs[0]?.id ?? null;
};

const assertReservationAllowed = async (
  centerId: string,
  classId: string,
  studentId: string,
  excludeReservationId?: string
) => {
  const [classItem, reservations] = await Promise.all([
    getClassById(centerId, classId),
    getReservations(centerId, { classId }),
  ]);

  if (!classItem) {
    throw new Error("La clase no existe.");
  }

  const activeReservations = reservations.filter((item) => item.id !== excludeReservationId);
  if (
    activeReservations.some(
      (item) => item.studentId === studentId && item.status !== "CANCELLED"
    )
  ) {
    throw new Error("El alumno ya tiene una reserva activa para esta clase.");
  }

  const occupied = activeReservations.filter((item) =>
    item.status === "RESERVED" || item.status === "CONFIRMED"
  ).length;

  if (occupied >= classItem.capacity) {
    throw new Error("La clase ha alcanzado su capacidad maxima.");
  }
};

export const getClasses = async (centerId: string): Promise<Class[]> => {
  const snapshot = await getDocs(query(classesCollection(centerId), orderBy("startAt", "asc")));
  return snapshot.docs.map((row) => mapClass(row.id, row.data(), centerId));
};

export const getClassById = async (centerId: string, classId: string): Promise<Class | null> => {
  const snapshot = await getDoc(classDoc(centerId, classId));
  if (!snapshot.exists()) return null;
  return mapClass(snapshot.id, snapshot.data(), centerId);
};

export const createClass = async (centerId: string, input: CreateClassInput): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const startAt = combineDateTime(input.date, input.startTime);
  const endAt = combineDateTime(input.date, input.endTime);
  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("La hora de inicio debe ser anterior a la de fin.");
  }

  const ref = await addDoc(classesCollection(normalizedCenterId), {
    title: assertRequiredString("El titulo de la clase", input.title),
    description: optionalStringOrNull(input.description),
    date: Timestamp.fromDate(new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate())),
    startTime: input.startTime,
    endTime: input.endTime,
    trainerId: optionalStringOrNull(input.trainerId),
    studentIds: optionalStringArray(input.studentIds),
    horseIds: optionalStringArray(input.horseIds),
    arenaId: optionalStringOrNull(input.arenaId),
    requiredLevel: input.requiredLevel ?? "MIXED",
    capacity: ensureNonNegativeNumber("La capacidad", input.capacity),
    price: typeof input.price === "number" ? ensureNonNegativeNumber("El precio", input.price) : null,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    status: input.status ?? "DRAFT",
    ...withCreateAudit(),
  });

  await createEvent(normalizedCenterId, {
    title: input.title,
    description: input.description,
    type: "CLASS",
    status: input.status === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
    startAt,
    endAt,
    arenaId: input.arenaId,
    classId: ref.id,
    trainerId: input.trainerId,
    horseIds: input.horseIds,
    studentIds: input.studentIds,
  });

  return ref.id;
};

export const updateClass = async (
  centerId: string,
  classId: string,
  input: UpdateClassInput
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const current = await getClassById(normalizedCenterId, classId);
  if (!current) throw new Error("La clase no existe.");

  const baseDate = input.date ?? current.date.toDate();
  const nextStartTime = input.startTime ?? current.startTime;
  const nextEndTime = input.endTime ?? current.endTime;
  const startAt = combineDateTime(baseDate, nextStartTime);
  const endAt = combineDateTime(baseDate, nextEndTime);
  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("La hora de inicio debe ser anterior a la de fin.");
  }

  const patch: Partial<FirestoreClassDoc> = {
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    date: Timestamp.fromDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())),
    startTime: nextStartTime,
    endTime: nextEndTime,
  };
  if (typeof input.title === "string") patch.title = assertRequiredString("El titulo de la clase", input.title);
  if ("description" in input) patch.description = optionalStringOrNull(input.description);
  if ("trainerId" in input) patch.trainerId = optionalStringOrNull(input.trainerId);
  if ("studentIds" in input) patch.studentIds = optionalStringArray(input.studentIds);
  if ("horseIds" in input) patch.horseIds = optionalStringArray(input.horseIds);
  if ("arenaId" in input) patch.arenaId = optionalStringOrNull(input.arenaId);
  if (input.requiredLevel) patch.requiredLevel = input.requiredLevel;
  if (typeof input.capacity === "number") patch.capacity = ensureNonNegativeNumber("La capacidad", input.capacity);
  if ("price" in input) patch.price = typeof input.price === "number" ? ensureNonNegativeNumber("El precio", input.price) : null;
  if (input.status) patch.status = input.status;

  await updateDoc(classDoc(normalizedCenterId, classId), {
    ...patch,
    ...withUpdateAudit(),
  });

  const eventId = await getLinkedEventId(normalizedCenterId, classId);
  if (eventId) {
    await updateEvent(normalizedCenterId, eventId, {
      title: input.title ?? current.title,
      description: input.description ?? current.description,
      status: (input.status ?? current.status) === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
      startAt,
      endAt,
      arenaId: input.arenaId ?? current.arenaId,
      trainerId: input.trainerId ?? current.trainerId,
      horseIds: input.horseIds ?? current.horseIds,
      studentIds: input.studentIds ?? current.studentIds,
    });
  }
};

export const deleteClass = async (centerId: string, classId: string): Promise<void> => {
  const linkedEventId = await getLinkedEventId(centerId, classId);
  if (linkedEventId) {
    await deleteEvent(centerId, linkedEventId);
  }
  await deleteDoc(classDoc(centerId, classId));
};

export const getReservations = async (
  centerId: string,
  filters?: { classId?: string; studentId?: string }
): Promise<ClassReservation[]> => {
  const snapshot = await getDocs(query(reservationsCollection(centerId), orderBy("reservationDate", "desc")));

  return snapshot.docs
    .map((row) => mapClassReservation(row.id, row.data(), centerId))
    .filter((item) => (filters?.classId ? item.classId === filters.classId : true))
    .filter((item) => (filters?.studentId ? item.studentId === filters.studentId : true));
};

export const getReservationById = async (
  centerId: string,
  reservationId: string
): Promise<ClassReservation | null> => {
  const snapshot = await getDoc(reservationDoc(centerId, reservationId));
  if (!snapshot.exists()) return null;
  return mapClassReservation(snapshot.id, snapshot.data(), centerId);
};

export const createReservation = async (
  centerId: string,
  input: CreateClassReservationInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  await assertReservationAllowed(normalizedCenterId, input.classId, input.studentId);

  const ref = await addDoc(reservationsCollection(normalizedCenterId), {
    classId: assertRequiredString("classId", input.classId),
    studentId: assertRequiredString("studentId", input.studentId),
    reservedByUid: optionalStringOrNull(input.reservedByUid),
    status: input.status ?? "RESERVED",
    reservationDate: Timestamp.fromDate(input.reservationDate ?? new Date()),
    notes: optionalStringOrNull(input.notes),
    ...withCreateAudit(),
  });
  return ref.id;
};

export const updateReservation = async (
  centerId: string,
  reservationId: string,
  input: UpdateClassReservationInput
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const current = await getReservationById(normalizedCenterId, reservationId);
  if (!current) {
    throw new Error("La reserva no existe.");
  }

  const nextClassId = input.classId ?? current.classId;
  const nextStudentId = input.studentId ?? current.studentId;
  const nextStatus = input.status ?? current.status;

  if (nextStatus === "RESERVED" || nextStatus === "CONFIRMED") {
    await assertReservationAllowed(normalizedCenterId, nextClassId, nextStudentId, reservationId);
  }

  const patch: Partial<FirestoreClassReservationDoc> = {};
  if (typeof input.classId === "string") patch.classId = assertRequiredString("classId", input.classId);
  if (typeof input.studentId === "string") patch.studentId = assertRequiredString("studentId", input.studentId);
  if ("reservedByUid" in input) patch.reservedByUid = optionalStringOrNull(input.reservedByUid);
  if (input.status) patch.status = input.status;
  if ("reservationDate" in input) {
    patch.reservationDate = input.reservationDate
      ? Timestamp.fromDate(input.reservationDate)
      : null;
  }
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);

  await updateDoc(reservationDoc(normalizedCenterId, reservationId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deleteReservation = async (
  centerId: string,
  reservationId: string
): Promise<void> => {
  await deleteDoc(reservationDoc(centerId, reservationId));
};

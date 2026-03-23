import {
  Timestamp,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FirestoreClassDoc,
  FirestoreClassReservationDoc,
} from "@/lib/services/firestoreTypes";
import { mapClass, mapClassReservation } from "@/lib/services/mappers";
import { Class, ClassReservation } from "@/lib/services/types";
import {
  cancelArenaBooking,
  checkArenaAvailability,
  createArenaBookingFromClass,
  deleteArenaBooking,
  getClassArenaBookingId,
  updateArenaBookingFromClass,
} from "@/lib/services/arenaBookingService";
import {
  cancelCenterEventFromClass,
  createCenterEventFromClass,
  deleteEvent,
  getCenterEventsByDateRange,
  updateCenterEventFromClass,
} from "@/lib/services/calendarService";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  ensurePositiveNumber,
  optionalStringArray,
  optionalStringOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreateClassInput = {
  title: string;
  discipline: string;
  level: Class["level"];
  date: Date;
  startTime: string;
  endTime: string;
  arenaId?: string;
  trainerId?: string;
  capacity: number;
  price?: number;
  notes?: string;
  visibility?: Class["visibility"];
  bookingMode?: Class["bookingMode"];
  status?: Class["status"];
  createdBy: string;
};

export type UpdateClassInput = Partial<Omit<CreateClassInput, "createdBy">>;

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

const combineDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
};

const normalizeRequiredLevel = (level: Class["level"]): Class["requiredLevel"] => {
  if (level === "initiation" || level === "basic") return "BEGINNER";
  if (level === "intermediate") return "INTERMEDIATE";
  if (level === "advanced" || level === "competition") return "ADVANCED";
  return "MIXED";
};

const normalizeClassStatus = (
  status: Class["status"] | undefined,
  availableSpots: number
): Class["status"] => {
  if (status === "cancelled" || status === "completed" || status === "draft") {
    return status;
  }
  if (availableSpots <= 0) return "full";
  return status ?? "draft";
};

const getOccupiedReservationCount = async (centerId: string, classId: string) => {
  const reservations = await getReservations(centerId, { classId });
  return reservations.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "confirmed" ||
      item.status === "RESERVED" ||
      item.status === "CONFIRMED"
  ).length;
};

const isBlockingReservationStatus = (status: ClassReservation["status"]) =>
  status === "pending" ||
  status === "confirmed" ||
  status === "RESERVED" ||
  status === "CONFIRMED";

const cancelClassReservations = async (
  centerId: string,
  classId: string,
  capacity: number
): Promise<void> => {
  const reservations = await getReservations(centerId, { classId });
  const activeReservations = reservations.filter((reservation) =>
    isBlockingReservationStatus(reservation.status)
  );

  if (activeReservations.length === 0) return;

  const batch = writeBatch(db);
  activeReservations.forEach((reservation) => {
    batch.update(reservationDoc(centerId, reservation.id), {
      status: "cancelled",
      ...withUpdateAudit(),
    });
  });
  batch.update(classDoc(centerId, classId), {
    availableSpots: capacity,
    ...withUpdateAudit(),
  });
  await batch.commit();
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
      (item) =>
        (item.riderId === studentId || item.studentId === studentId) &&
        item.status !== "cancelled" &&
        item.status !== "CANCELLED"
    )
  ) {
    throw new Error("El alumno ya tiene una reserva activa para esta clase.");
  }

  const occupied = activeReservations.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "confirmed" ||
      item.status === "RESERVED" ||
      item.status === "CONFIRMED"
  ).length;

  if (occupied >= classItem.capacity) {
    throw new Error("La clase ha alcanzado su capacidad maxima.");
  }
};

const syncClassAvailability = async (centerId: string, classId: string): Promise<void> => {
  const classItem = await getClassById(centerId, classId);
  if (!classItem) return;

  const occupiedReservations = await getOccupiedReservationCount(centerId, classId);
  const availableSpots = Math.max(classItem.capacity - occupiedReservations, 0);
  const nextStatus =
    classItem.status === "cancelled" || classItem.status === "completed"
      ? classItem.status
      : availableSpots === 0 && classItem.status !== "draft"
        ? "full"
        : classItem.status === "full" && availableSpots > 0
          ? "published"
          : classItem.status;

  await updateDoc(classDoc(centerId, classId), {
    availableSpots,
    status: nextStatus,
    ...withUpdateAudit(),
  });
};

export const getClassesByCenter = async (centerId: string): Promise<Class[]> => {
  const snapshot = await getDocs(query(classesCollection(centerId), orderBy("startAt", "asc")));
  return snapshot.docs.map((row) => mapClass(row.id, row.data(), centerId));
};

export const getClasses = getClassesByCenter;

export const getPublishedClassesByCenter = async (centerId: string): Promise<Class[]> => {
  const items = await getClassesByCenter(centerId);
  return items.filter((item) => item.status === "published" || item.status === "full");
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

  const capacity = ensurePositiveNumber("La capacidad", input.capacity);
  const availableSpots = capacity;
  const nextStatus = normalizeClassStatus(input.status, availableSpots);
  const normalizedArenaId = optionalStringOrNull(input.arenaId) ?? undefined;

  if (normalizedArenaId) {
    await checkArenaAvailability(
      normalizedCenterId,
      normalizedArenaId,
      Timestamp.fromDate(startAt),
      Timestamp.fromDate(endAt),
      getClassArenaBookingId(`pending-${Date.now()}`)
    );
  }

  const ref = await addDoc(classesCollection(normalizedCenterId), {
    title: assertRequiredString("El titulo de la clase", input.title),
    discipline: assertRequiredString("La disciplina", input.discipline),
    level: input.level,
    description: optionalStringOrNull(input.notes),
    notes: optionalStringOrNull(input.notes),
    date: Timestamp.fromDate(new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate())),
    startTime: input.startTime,
    endTime: input.endTime,
    trainerId: optionalStringOrNull(input.trainerId),
    studentIds: optionalStringArray([]),
    horseIds: optionalStringArray([]),
    arenaId: optionalStringOrNull(input.arenaId),
    requiredLevel: normalizeRequiredLevel(input.level),
    capacity,
    availableSpots,
    price: typeof input.price === "number" ? input.price : null,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    status: nextStatus,
    visibility: input.visibility ?? "members_only",
    bookingMode: input.bookingMode ?? "manual",
    createdBy: assertRequiredString("createdBy", input.createdBy),
    ...withCreateAudit(),
  });

  const classItem = await getClassById(normalizedCenterId, ref.id);

  try {
    if (classItem?.arenaId) {
      await createArenaBookingFromClass(normalizedCenterId, classItem, ref.id);
    }

    if (classItem) {
      await createCenterEventFromClass(normalizedCenterId, classItem, ref.id);
    }
  } catch (error) {
    await deleteArenaBooking(normalizedCenterId, getClassArenaBookingId(ref.id)).catch(() => undefined);
    await deleteDoc(classDoc(normalizedCenterId, ref.id));
    throw error;
  }

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

  const nextCapacity =
    typeof input.capacity === "number"
      ? ensurePositiveNumber("La capacidad", input.capacity)
      : current.capacity;
  const occupiedReservations = await getOccupiedReservationCount(normalizedCenterId, classId);
  if (nextCapacity < occupiedReservations) {
    throw new Error("La capacidad no puede ser menor que las plazas ya ocupadas.");
  }

  const availableSpots = Math.max(nextCapacity - occupiedReservations, 0);
  const requestedStatus = input.status ?? current.status;
  const nextStatus = normalizeClassStatus(requestedStatus, availableSpots);
  const nextArenaId = "arenaId" in input ? optionalStringOrNull(input.arenaId) ?? undefined : current.arenaId;

  if (nextArenaId) {
    await checkArenaAvailability(
      normalizedCenterId,
      nextArenaId,
      Timestamp.fromDate(startAt),
      Timestamp.fromDate(endAt),
      getClassArenaBookingId(classId)
    );
  }

  const patch: Partial<FirestoreClassDoc> = {
    date: Timestamp.fromDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate())),
    startTime: nextStartTime,
    endTime: nextEndTime,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    capacity: nextCapacity,
    availableSpots,
    status: nextStatus,
  };

  if (typeof input.title === "string") patch.title = assertRequiredString("El titulo de la clase", input.title);
  if (typeof input.discipline === "string") {
    patch.discipline = assertRequiredString("La disciplina", input.discipline);
  }
  if (input.level) {
    patch.level = input.level;
    patch.requiredLevel = normalizeRequiredLevel(input.level);
  }
  if ("trainerId" in input) patch.trainerId = optionalStringOrNull(input.trainerId);
  if ("arenaId" in input) patch.arenaId = optionalStringOrNull(input.arenaId);
  if ("price" in input) patch.price = typeof input.price === "number" ? input.price : null;
  if ("notes" in input) {
    patch.notes = optionalStringOrNull(input.notes);
    patch.description = optionalStringOrNull(input.notes);
  }
  if ("visibility" in input) patch.visibility = input.visibility ?? "members_only";
  if ("bookingMode" in input) patch.bookingMode = input.bookingMode ?? "manual";

  await updateDoc(classDoc(normalizedCenterId, classId), {
    ...patch,
    ...withUpdateAudit(),
  });

  const nextClass = await getClassById(normalizedCenterId, classId);
  if (!nextClass) {
    throw new Error("La clase no existe tras la actualizacion.");
  }

  await updateArenaBookingFromClass(normalizedCenterId, nextClass, classId);

  await updateCenterEventFromClass(normalizedCenterId, nextClass, classId);
};

export const cancelClass = async (centerId: string, classId: string): Promise<void> => {
  const current = await getClassById(centerId, classId);
  if (!current) {
    throw new Error("La clase no existe.");
  }

  await cancelClassReservations(centerId, classId, current.capacity);

  await updateDoc(classDoc(centerId, classId), {
    status: "cancelled",
    availableSpots: current.capacity,
    ...withUpdateAudit(),
  });

  const bookingId = getClassArenaBookingId(classId);
  const bookingError = cancelArenaBooking(centerId, bookingId).catch(() => undefined);

  await cancelCenterEventFromClass(centerId, classId);

  await bookingError;
};

export const deleteClass = async (centerId: string, classId: string): Promise<void> => {
  const reservations = await getReservations(centerId, { classId });
  if (reservations.some((reservation) => isBlockingReservationStatus(reservation.status))) {
    throw new Error("No se puede eliminar una clase con reservas activas. Cancelala primero.");
  }

  const bookingId = getClassArenaBookingId(classId);
  await deleteArenaBooking(centerId, bookingId).catch(() => undefined);
  const linkedEventId = (
    await getCenterEventsByDateRange(
      centerId,
      new Date(0),
      new Date("2100-01-01T00:00:00.000Z"),
      { sourceType: "class", sourceId: classId }
    )
  )[0]?.id;
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
    riderId: assertRequiredString("studentId", input.studentId),
    studentId: assertRequiredString("studentId", input.studentId),
    reservedByUid: optionalStringOrNull(input.reservedByUid),
    status: input.status ?? "pending",
    reservedAt: Timestamp.fromDate(input.reservationDate ?? new Date()),
    reservationDate: Timestamp.fromDate(input.reservationDate ?? new Date()),
    paymentStatus: null,
    notes: optionalStringOrNull(input.notes),
    ...withCreateAudit(),
  });

  await syncClassAvailability(normalizedCenterId, input.classId);
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
  const nextStudentId = input.studentId ?? current.studentId ?? current.riderId;
  const nextStatus = input.status ?? current.status;

  if (
    nextStatus === "pending" ||
    nextStatus === "confirmed" ||
    nextStatus === "RESERVED" ||
    nextStatus === "CONFIRMED"
  ) {
    await assertReservationAllowed(normalizedCenterId, nextClassId, nextStudentId, reservationId);
  }

  const patch: Partial<FirestoreClassReservationDoc> = {};
  if (typeof input.classId === "string") patch.classId = assertRequiredString("classId", input.classId);
  if (typeof input.studentId === "string") {
    patch.studentId = assertRequiredString("studentId", input.studentId);
    patch.riderId = assertRequiredString("studentId", input.studentId);
  }
  if ("reservedByUid" in input) patch.reservedByUid = optionalStringOrNull(input.reservedByUid);
  if (input.status) patch.status = input.status;
  if ("reservationDate" in input) {
    patch.reservationDate = input.reservationDate
      ? Timestamp.fromDate(input.reservationDate)
      : null;
    patch.reservedAt = input.reservationDate ? Timestamp.fromDate(input.reservationDate) : null;
  }
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);

  await updateDoc(reservationDoc(normalizedCenterId, reservationId), {
    ...patch,
    ...withUpdateAudit(),
  });

  await Promise.all([
    syncClassAvailability(normalizedCenterId, current.classId),
    nextClassId !== current.classId
      ? syncClassAvailability(normalizedCenterId, nextClassId)
      : Promise.resolve(),
  ]);
};

export const deleteReservation = async (
  centerId: string,
  reservationId: string
): Promise<void> => {
  const current = await getReservationById(centerId, reservationId);
  await deleteDoc(reservationDoc(centerId, reservationId));
  if (current) {
    await syncClassAvailability(centerId, current.classId);
  }
};

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
import { FirestoreEventDoc } from "@/lib/services/firestoreTypes";
import { mapEvent } from "@/lib/services/mappers";
import { DateRange, Event } from "@/lib/services/types";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  optionalStringArray,
  optionalStringOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type EventFilters = {
  trainerId?: string;
  studentId?: string;
  horseId?: string;
  arenaId?: string;
  type?: Event["type"];
};

export type CreateEventInput = {
  title: string;
  description?: string;
  type: Event["type"];
  status?: Event["status"];
  startAt: Date;
  endAt: Date;
  arenaId?: string;
  classId?: string;
  trainingId?: string;
  competitionId?: string;
  trainerId?: string;
  horseIds?: string[];
  studentIds?: string[];
};

export type UpdateEventInput = Partial<CreateEventInput>;

const eventsCollection = (centerId: string) =>
  centerCollection<FirestoreEventDoc>(centerId, "events");

const eventDoc = (centerId: string, eventId: string) =>
  centerDocument<FirestoreEventDoc>(centerId, "events", eventId);

const toTimestamp = (value: Date | Timestamp): Timestamp =>
  value instanceof Timestamp ? value : Timestamp.fromDate(value);

const overlaps = (
  leftStart: Timestamp,
  leftEnd: Timestamp,
  rightStart: Timestamp,
  rightEnd: Timestamp
) => leftStart.toMillis() < rightEnd.toMillis() && rightStart.toMillis() < leftEnd.toMillis();

const assertDateOrder = (startAt: Date, endAt: Date) => {
  if (startAt.getTime() >= endAt.getTime()) {
    throw new Error("La fecha de inicio debe ser anterior a la de fin.");
  }
};

const filterEvent = (event: Event, filters?: EventFilters): boolean => {
  if (!filters) return true;
  if (filters.type && event.type !== filters.type) return false;
  if (filters.trainerId && event.trainerId !== filters.trainerId) return false;
  if (filters.arenaId && event.arenaId !== filters.arenaId) return false;
  if (filters.horseId && !event.horseIds.includes(filters.horseId)) return false;
  if (filters.studentId && !event.studentIds.includes(filters.studentId)) return false;
  return true;
};

export const getEventsByDateRange = async (
  centerId: string,
  range: DateRange,
  filters?: EventFilters
): Promise<Event[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(
      eventsCollection(normalizedCenterId),
      where("startAt", ">=", toTimestamp(range.start)),
      where("startAt", "<=", toTimestamp(range.end)),
      orderBy("startAt", "asc")
    )
  );

  return snapshot.docs
    .map((row) => mapEvent(row.id, row.data(), normalizedCenterId))
    .filter((event) => filterEvent(event, filters));
};

export const getEventById = async (
  centerId: string,
  eventId: string
): Promise<Event | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(eventDoc(normalizedCenterId, eventId));
  if (!snapshot.exists()) return null;
  return mapEvent(snapshot.id, snapshot.data(), normalizedCenterId);
};

export const assertNoSchedulingConflicts = async (
  centerId: string,
  input: {
    startAt: Date;
    endAt: Date;
    arenaId?: string | null;
    trainerId?: string | null;
    horseIds?: string[];
    studentIds?: string[];
    excludeEventId?: string;
  }
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const candidateStart = Timestamp.fromDate(input.startAt);
  const candidateEnd = Timestamp.fromDate(input.endAt);
  const snapshot = await getDocs(
    query(
      eventsCollection(normalizedCenterId),
      where("startAt", "<=", candidateEnd),
      orderBy("startAt", "asc")
    )
  );
  const events = snapshot.docs.map((row) =>
    mapEvent(row.id, row.data(), normalizedCenterId)
  );

  const nextHorseIds = optionalStringArray(input.horseIds);
  const nextStudentIds = optionalStringArray(input.studentIds);

  for (const event of events) {
    if (input.excludeEventId && event.id === input.excludeEventId) continue;
    if (!overlaps(candidateStart, candidateEnd, event.startAt, event.endAt)) continue;

    if (input.arenaId && event.arenaId === input.arenaId) {
      throw new Error("Conflicto de horario: la pista ya está reservada en ese tramo.");
    }
    if (input.trainerId && event.trainerId === input.trainerId) {
      throw new Error("Conflicto de horario: el entrenador ya tiene un evento en ese tramo.");
    }
    if (nextHorseIds.some((horseId) => event.horseIds.includes(horseId))) {
      throw new Error("Conflicto de horario: uno de los caballos ya está reservado.");
    }
    if (nextStudentIds.some((studentId) => event.studentIds.includes(studentId))) {
      throw new Error("Conflicto de horario: uno de los alumnos ya está reservado.");
    }
  }
};

export const createEvent = async (
  centerId: string,
  input: CreateEventInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  assertDateOrder(input.startAt, input.endAt);
  await assertNoSchedulingConflicts(normalizedCenterId, input);

  const ref = await addDoc(eventsCollection(normalizedCenterId), {
    title: assertRequiredString("El titulo del evento", input.title),
    description: optionalStringOrNull(input.description),
    type: input.type,
    status: input.status ?? "SCHEDULED",
    startAt: Timestamp.fromDate(input.startAt),
    endAt: Timestamp.fromDate(input.endAt),
    arenaId: optionalStringOrNull(input.arenaId),
    classId: optionalStringOrNull(input.classId),
    trainingId: optionalStringOrNull(input.trainingId),
    competitionId: optionalStringOrNull(input.competitionId),
    trainerId: optionalStringOrNull(input.trainerId),
    horseIds: optionalStringArray(input.horseIds),
    studentIds: optionalStringArray(input.studentIds),
    ...withCreateAudit(),
  });

  return ref.id;
};

export const updateEvent = async (
  centerId: string,
  eventId: string,
  input: UpdateEventInput
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const current = await getEventById(normalizedCenterId, eventId);
  if (!current) {
    throw new Error("El evento no existe.");
  }

  const nextStart = input.startAt ?? current.startAt.toDate();
  const nextEnd = input.endAt ?? current.endAt.toDate();
  assertDateOrder(nextStart, nextEnd);

  await assertNoSchedulingConflicts(normalizedCenterId, {
    startAt: nextStart,
    endAt: nextEnd,
    arenaId: input.arenaId ?? current.arenaId ?? null,
    trainerId: input.trainerId ?? current.trainerId ?? null,
    horseIds: input.horseIds ?? current.horseIds,
    studentIds: input.studentIds ?? current.studentIds,
    excludeEventId: eventId,
  });

  const patch: Partial<FirestoreEventDoc> = {};
  if (typeof input.title === "string") {
    patch.title = assertRequiredString("El titulo del evento", input.title);
  }
  if ("description" in input) patch.description = optionalStringOrNull(input.description);
  if (input.type) patch.type = input.type;
  if (input.status) patch.status = input.status;
  if (input.startAt) patch.startAt = Timestamp.fromDate(input.startAt);
  if (input.endAt) patch.endAt = Timestamp.fromDate(input.endAt);
  if ("arenaId" in input) patch.arenaId = optionalStringOrNull(input.arenaId);
  if ("classId" in input) patch.classId = optionalStringOrNull(input.classId);
  if ("trainingId" in input) patch.trainingId = optionalStringOrNull(input.trainingId);
  if ("competitionId" in input) patch.competitionId = optionalStringOrNull(input.competitionId);
  if ("trainerId" in input) patch.trainerId = optionalStringOrNull(input.trainerId);
  if ("horseIds" in input) patch.horseIds = optionalStringArray(input.horseIds);
  if ("studentIds" in input) patch.studentIds = optionalStringArray(input.studentIds);

  await updateDoc(eventDoc(normalizedCenterId, eventId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deleteEvent = async (centerId: string, eventId: string): Promise<void> => {
  await deleteDoc(eventDoc(centerId, eventId));
};

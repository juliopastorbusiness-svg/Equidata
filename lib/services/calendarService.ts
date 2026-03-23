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
import { mapCenterEvent, mapEvent } from "@/lib/services/mappers";
import { CenterEvent, Class, DateRange, Event } from "@/lib/services/types";
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
  sourceType?: CenterEvent["sourceType"];
  sourceId?: string;
};

export type CreateEventInput = {
  title: string;
  description?: string;
  type: Event["type"];
  sourceType?: CenterEvent["sourceType"];
  sourceId?: string;
  status?: Event["status"];
  date?: string;
  startTime?: string;
  endTime?: string;
  startAt: Date;
  endAt: Date;
  location?: string;
  arenaId?: string;
  riderId?: string;
  classId?: string;
  trainingId?: string;
  competitionId?: string;
  trainerId?: string;
  horseIds?: string[];
  studentIds?: string[];
  notes?: string;
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

const filterEvent = (event: Event, filters?: EventFilters): boolean => {
  if (!filters) return true;
  if (filters.type && event.type !== filters.type) return false;
  if (filters.sourceType && event.sourceType !== filters.sourceType) return false;
  if (filters.sourceId && event.sourceId !== filters.sourceId) return false;
  if (filters.trainerId && event.trainerId !== filters.trainerId) return false;
  if (filters.arenaId && event.arenaId !== filters.arenaId) return false;
  if (filters.horseId && !event.horseIds.includes(filters.horseId)) return false;
  if (filters.studentId && !event.studentIds.includes(filters.studentId)) return false;
  return true;
};

export async function getEventsByDateRange(
  centerId: string,
  range: DateRange,
  filters?: EventFilters
): Promise<Event[]>;
export async function getEventsByDateRange(
  centerId: string,
  startDate: Date | Timestamp,
  endDate: Date | Timestamp,
  filters?: EventFilters
): Promise<Event[]>;
export async function getEventsByDateRange(
  centerId: string,
  rangeOrStart: DateRange | Date | Timestamp,
  endOrFilters?: Date | Timestamp | EventFilters,
  maybeFilters?: EventFilters
): Promise<Event[]> {
  const normalizedCenterId = assertCenterId(centerId);
  const range =
    rangeOrStart instanceof Date || rangeOrStart instanceof Timestamp
      ? {
          start: rangeOrStart,
          end: endOrFilters as Date | Timestamp,
        }
      : rangeOrStart;
  const filters =
    rangeOrStart instanceof Date || rangeOrStart instanceof Timestamp
      ? maybeFilters
      : (endOrFilters as EventFilters | undefined);
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
}

export async function getCenterEventsByDateRange(
  centerId: string,
  range: DateRange,
  filters?: EventFilters
): Promise<CenterEvent[]>;
export async function getCenterEventsByDateRange(
  centerId: string,
  startDate: Date | Timestamp,
  endDate: Date | Timestamp,
  filters?: EventFilters
): Promise<CenterEvent[]>;
export async function getCenterEventsByDateRange(
  centerId: string,
  rangeOrStart: DateRange | Date | Timestamp,
  endOrFilters?: Date | Timestamp | EventFilters,
  maybeFilters?: EventFilters
): Promise<CenterEvent[]> {
  const events = await getEventsByDateRange(
    centerId,
    rangeOrStart as DateRange & Date & Timestamp,
    endOrFilters as Date | Timestamp & EventFilters,
    maybeFilters
  );

  return events.map((event) =>
    mapCenterEvent(
      event.id,
      {
        title: event.title,
        description: event.description,
        type: event.type,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        status: event.status,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        startAt: event.startAt,
        endAt: event.endAt,
        location: event.location,
        arenaId: event.arenaId,
        riderId: event.riderId,
        classId: event.classId,
        trainingId: event.trainingId,
        competitionId: event.competitionId,
        trainerId: event.trainerId,
        horseIds: event.horseIds,
        studentIds: event.studentIds,
        notes: event.notes,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      },
      event.centerId
    )
  );
}

export const getEventById = async (
  centerId: string,
  eventId: string
): Promise<Event | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(eventDoc(normalizedCenterId, eventId));
  if (!snapshot.exists()) return null;
  return mapEvent(snapshot.id, snapshot.data(), normalizedCenterId);
};

const getEventBySource = async (
  centerId: string,
  sourceType: CenterEvent["sourceType"],
  sourceId: string
): Promise<Event | null> => {
  const snapshot = await getDocs(
    query(
      eventsCollection(centerId),
      where("sourceType", "==", sourceType),
      where("sourceId", "==", sourceId)
    )
  );
  const first = snapshot.docs[0];
  if (!first) return null;
  return mapEvent(first.id, first.data(), centerId);
};

export const getEventsByDay = async (
  centerId: string,
  date: string,
  filters?: EventFilters
): Promise<Event[]> => {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59.999`);
  return getEventsByDateRange(centerId, { start, end }, filters);
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
    sourceType: input.sourceType ?? "manual",
    sourceId:
      optionalStringOrNull(input.sourceId) ??
      optionalStringOrNull(input.classId) ??
      optionalStringOrNull(input.trainingId) ??
      optionalStringOrNull(input.competitionId),
    status: input.status ?? "SCHEDULED",
    date: input.date ?? formatDateKey(input.startAt),
    startTime: input.startTime ?? formatTimeValue(input.startAt),
    endTime: input.endTime ?? formatTimeValue(input.endAt),
    startAt: Timestamp.fromDate(input.startAt),
    endAt: Timestamp.fromDate(input.endAt),
    location: optionalStringOrNull(input.location),
    arenaId: optionalStringOrNull(input.arenaId),
    riderId: optionalStringOrNull(input.riderId),
    classId: optionalStringOrNull(input.classId),
    trainingId: optionalStringOrNull(input.trainingId),
    competitionId: optionalStringOrNull(input.competitionId),
    trainerId: optionalStringOrNull(input.trainerId),
    horseIds: optionalStringArray(input.horseIds),
    studentIds: optionalStringArray(input.studentIds),
    notes: optionalStringOrNull(input.notes),
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
  if ("sourceType" in input) patch.sourceType = input.sourceType ?? "manual";
  if ("sourceId" in input) patch.sourceId = optionalStringOrNull(input.sourceId);
  if (input.status) patch.status = input.status;
  if (typeof input.date === "string") patch.date = input.date;
  if (typeof input.startTime === "string") patch.startTime = input.startTime;
  if (typeof input.endTime === "string") patch.endTime = input.endTime;
  if (input.startAt) patch.startAt = Timestamp.fromDate(input.startAt);
  if (input.endAt) patch.endAt = Timestamp.fromDate(input.endAt);
  if ("location" in input) patch.location = optionalStringOrNull(input.location);
  if ("arenaId" in input) patch.arenaId = optionalStringOrNull(input.arenaId);
  if ("riderId" in input) patch.riderId = optionalStringOrNull(input.riderId);
  if ("classId" in input) patch.classId = optionalStringOrNull(input.classId);
  if ("trainingId" in input) patch.trainingId = optionalStringOrNull(input.trainingId);
  if ("competitionId" in input) patch.competitionId = optionalStringOrNull(input.competitionId);
  if ("trainerId" in input) patch.trainerId = optionalStringOrNull(input.trainerId);
  if ("horseIds" in input) patch.horseIds = optionalStringArray(input.horseIds);
  if ("studentIds" in input) patch.studentIds = optionalStringArray(input.studentIds);
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);

  await updateDoc(eventDoc(normalizedCenterId, eventId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deleteEvent = async (centerId: string, eventId: string): Promise<void> => {
  await deleteDoc(eventDoc(centerId, eventId));
};

const normalizeCenterEventStatusFromClass = (classStatus: Class["status"]): Event["status"] => {
  if (classStatus === "cancelled") return "CANCELLED";
  if (classStatus === "completed") return "COMPLETED";
  return "SCHEDULED";
};

export const createCenterEventFromClass = async (
  centerId: string,
  classData: Class,
  classId: string
): Promise<string> => {
  return createEvent(centerId, {
    title: classData.title,
    description: classData.notes,
    type: "CLASS",
    sourceType: "class",
    sourceId: classId,
    status: normalizeCenterEventStatusFromClass(classData.status),
    startAt: classData.startAt.toDate(),
    endAt: classData.endAt.toDate(),
    arenaId: classData.arenaId,
    trainerId: classData.trainerId,
    classId,
    horseIds: classData.horseIds,
    studentIds: classData.studentIds,
    notes: classData.notes,
  });
};

export const updateCenterEventFromClass = async (
  centerId: string,
  classData: Class,
  classId: string
): Promise<string> => {
  const existing = await getEventBySource(centerId, "class", classId);
  const payload: UpdateEventInput = {
    title: classData.title,
    description: classData.notes,
    type: "CLASS",
    sourceType: "class",
    sourceId: classId,
    status: normalizeCenterEventStatusFromClass(classData.status),
    startAt: classData.startAt.toDate(),
    endAt: classData.endAt.toDate(),
    arenaId: classData.arenaId,
    trainerId: classData.trainerId,
    classId,
    horseIds: classData.horseIds,
    studentIds: classData.studentIds,
    notes: classData.notes,
  };

  if (!existing) {
    return createCenterEventFromClass(centerId, classData, classId);
  }

  await updateEvent(centerId, existing.id, payload);
  return existing.id;
};

export const cancelCenterEventFromClass = async (
  centerId: string,
  classId: string
): Promise<void> => {
  const existing = await getEventBySource(centerId, "class", classId);
  if (!existing) return;

  await updateEvent(centerId, existing.id, {
    status: "CANCELLED",
    sourceType: "class",
    sourceId: classId,
    classId,
  });
};

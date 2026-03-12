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
import { FirestoreCompetitionDoc, FirestoreEventDoc } from "@/lib/services/firestoreTypes";
import { mapCompetition } from "@/lib/services/mappers";
import { Competition } from "@/lib/services/types";
import { createEvent, deleteEvent, updateEvent } from "@/lib/services/calendarService";
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

export type CreateCompetitionInput = {
  name: string;
  discipline?: string;
  location?: string;
  startDate: Date;
  endDate?: Date;
  horseIds?: string[];
  riderIds?: string[];
  status?: Competition["status"];
  arenaId?: string;
};

export type UpdateCompetitionInput = Partial<CreateCompetitionInput>;

const competitionsCollection = (centerId: string) =>
  centerCollection<FirestoreCompetitionDoc>(centerId, "competitions");
const competitionDoc = (centerId: string, competitionId: string) =>
  centerDocument<FirestoreCompetitionDoc>(centerId, "competitions", competitionId);
const eventsCollection = (centerId: string) =>
  centerCollection<FirestoreEventDoc>(centerId, "events");

const getLinkedEventId = async (centerId: string, competitionId: string) => {
  const snapshot = await getDocs(
    query(eventsCollection(centerId), where("competitionId", "==", competitionId))
  );
  return snapshot.docs[0]?.id ?? null;
};

const normalizeEventEnd = (startDate: Date, endDate?: Date) => {
  if (endDate && endDate.getTime() > startDate.getTime()) {
    return endDate;
  }

  const next = new Date(startDate);
  next.setHours(next.getHours() + 1);
  return next;
};

export const getCompetitions = async (centerId: string): Promise<Competition[]> => {
  const snapshot = await getDocs(
    query(competitionsCollection(centerId), orderBy("startDate", "asc"))
  );
  return snapshot.docs.map((row) => mapCompetition(row.id, row.data(), centerId));
};

export const getCompetitionById = async (
  centerId: string,
  competitionId: string
): Promise<Competition | null> => {
  const snapshot = await getDoc(competitionDoc(centerId, competitionId));
  if (!snapshot.exists()) return null;
  return mapCompetition(snapshot.id, snapshot.data(), centerId);
};

export const createCompetition = async (
  centerId: string,
  input: CreateCompetitionInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const normalizedEventEnd = normalizeEventEnd(input.startDate, input.endDate);

  const ref = await addDoc(competitionsCollection(normalizedCenterId), {
    name: assertRequiredString("El nombre de la competicion", input.name),
    discipline: optionalStringOrNull(input.discipline),
    location: optionalStringOrNull(input.location),
    startDate: Timestamp.fromDate(input.startDate),
    endDate: input.endDate ? Timestamp.fromDate(input.endDate) : null,
    horseIds: optionalStringArray(input.horseIds),
    riderIds: optionalStringArray(input.riderIds),
    status: input.status ?? "PLANNED",
    arenaId: optionalStringOrNull(input.arenaId),
    ...withCreateAudit(),
  });

  await createEvent(normalizedCenterId, {
    title: `Competicion · ${input.name}`,
    description: input.discipline,
    type: "COMPETITION",
    status: input.status === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
    startAt: input.startDate,
    endAt: normalizedEventEnd,
    competitionId: ref.id,
    arenaId: input.arenaId,
    horseIds: input.horseIds,
    studentIds: input.riderIds,
  });

  return ref.id;
};

export const updateCompetition = async (
  centerId: string,
  competitionId: string,
  input: UpdateCompetitionInput
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const current = await getCompetitionById(normalizedCenterId, competitionId);
  if (!current) throw new Error("La competicion no existe.");

  const nextStartDate = input.startDate ?? current.startDate.toDate();
  const nextEndDate = "endDate" in input ? input.endDate : current.endDate?.toDate();

  const patch: Partial<FirestoreCompetitionDoc> = {};
  if (typeof input.name === "string") {
    patch.name = assertRequiredString("El nombre de la competicion", input.name);
  }
  if ("discipline" in input) patch.discipline = optionalStringOrNull(input.discipline);
  if ("location" in input) patch.location = optionalStringOrNull(input.location);
  if (input.startDate) patch.startDate = Timestamp.fromDate(input.startDate);
  if ("endDate" in input) patch.endDate = input.endDate ? Timestamp.fromDate(input.endDate) : null;
  if ("horseIds" in input) patch.horseIds = optionalStringArray(input.horseIds);
  if ("riderIds" in input) patch.riderIds = optionalStringArray(input.riderIds);
  if (input.status) patch.status = input.status;
  if ("arenaId" in input) patch.arenaId = optionalStringOrNull(input.arenaId);

  await updateDoc(competitionDoc(normalizedCenterId, competitionId), {
    ...patch,
    ...withUpdateAudit(),
  });

  const eventId = await getLinkedEventId(normalizedCenterId, competitionId);
  if (eventId) {
    await updateEvent(normalizedCenterId, eventId, {
      title: `Competicion · ${input.name ?? current.name}`,
      description: input.discipline ?? current.discipline,
      startAt: nextStartDate,
      endAt: normalizeEventEnd(nextStartDate, nextEndDate),
      arenaId: input.arenaId ?? current.arenaId,
      horseIds: input.horseIds ?? current.horseIds,
      studentIds: input.riderIds ?? current.riderIds,
      status: (input.status ?? current.status) === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
    });
  }
};

export const deleteCompetition = async (
  centerId: string,
  competitionId: string
): Promise<void> => {
  const eventId = await getLinkedEventId(centerId, competitionId);
  if (eventId) await deleteEvent(centerId, eventId);
  await deleteDoc(competitionDoc(centerId, competitionId));
};

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
import { FirestoreEventDoc, FirestoreTrainingDoc } from "@/lib/services/firestoreTypes";
import { mapTraining } from "@/lib/services/mappers";
import { Training } from "@/lib/services/types";
import { createEvent, deleteEvent, updateEvent } from "@/lib/services/calendarService";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  optionalStringOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreateTrainingInput = {
  horseId: string;
  trainerId: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: string;
  intensity: Training["intensity"];
  objective?: string;
  arenaId?: string;
  status?: Training["status"];
};

export type UpdateTrainingInput = Partial<CreateTrainingInput>;

const trainingsCollection = (centerId: string) =>
  centerCollection<FirestoreTrainingDoc>(centerId, "trainings");
const trainingDoc = (centerId: string, trainingId: string) =>
  centerDocument<FirestoreTrainingDoc>(centerId, "trainings", trainingId);
const eventsCollection = (centerId: string) =>
  centerCollection<FirestoreEventDoc>(centerId, "events");

const combineDateTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
};

const getLinkedEventId = async (centerId: string, trainingId: string) => {
  const snapshot = await getDocs(query(eventsCollection(centerId), where("trainingId", "==", trainingId)));
  return snapshot.docs[0]?.id ?? null;
};

export const getTrainings = async (centerId: string): Promise<Training[]> => {
  const snapshot = await getDocs(query(trainingsCollection(centerId), orderBy("startAt", "asc")));
  return snapshot.docs.map((row) => mapTraining(row.id, row.data(), centerId));
};

export const getTrainingById = async (
  centerId: string,
  trainingId: string
): Promise<Training | null> => {
  const snapshot = await getDoc(trainingDoc(centerId, trainingId));
  if (!snapshot.exists()) return null;
  return mapTraining(snapshot.id, snapshot.data(), centerId);
};

export const createTraining = async (
  centerId: string,
  input: CreateTrainingInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const startAt = combineDateTime(input.date, input.startTime);
  const endAt = combineDateTime(input.date, input.endTime);
  if (startAt >= endAt) throw new Error("La hora de inicio debe ser anterior a la de fin.");

  const ref = await addDoc(trainingsCollection(normalizedCenterId), {
    horseId: assertRequiredString("horseId", input.horseId),
    trainerId: assertRequiredString("trainerId", input.trainerId),
    date: Timestamp.fromDate(new Date(input.date.getFullYear(), input.date.getMonth(), input.date.getDate())),
    type: assertRequiredString("El tipo", input.type),
    intensity: input.intensity,
    objective: optionalStringOrNull(input.objective),
    arenaId: optionalStringOrNull(input.arenaId),
    startTime: input.startTime,
    endTime: input.endTime,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    status: input.status ?? "PLANNED",
    ...withCreateAudit(),
  });

  await createEvent(normalizedCenterId, {
    title: `Entrenamiento · ${input.type}`,
    description: input.objective,
    type: "TRAINING",
    status: input.status === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
    startAt,
    endAt,
    arenaId: input.arenaId,
    trainingId: ref.id,
    trainerId: input.trainerId,
    horseIds: [input.horseId],
  });

  return ref.id;
};

export const updateTraining = async (
  centerId: string,
  trainingId: string,
  input: UpdateTrainingInput
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const current = await getTrainingById(normalizedCenterId, trainingId);
  if (!current) throw new Error("El entrenamiento no existe.");

  const date = input.date ?? current.date.toDate();
  const startTime = input.startTime ?? current.startTime;
  const endTime = input.endTime ?? current.endTime;
  const startAt = combineDateTime(date, startTime);
  const endAt = combineDateTime(date, endTime);
  if (startAt >= endAt) throw new Error("La hora de inicio debe ser anterior a la de fin.");

  const patch: Partial<FirestoreTrainingDoc> = {
    date: Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate())),
    startTime,
    endTime,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
  };
  if (typeof input.horseId === "string") patch.horseId = assertRequiredString("horseId", input.horseId);
  if (typeof input.trainerId === "string") patch.trainerId = assertRequiredString("trainerId", input.trainerId);
  if (typeof input.type === "string") patch.type = assertRequiredString("El tipo", input.type);
  if (input.intensity) patch.intensity = input.intensity;
  if ("objective" in input) patch.objective = optionalStringOrNull(input.objective);
  if ("arenaId" in input) patch.arenaId = optionalStringOrNull(input.arenaId);
  if (input.status) patch.status = input.status;

  await updateDoc(trainingDoc(normalizedCenterId, trainingId), {
    ...patch,
    ...withUpdateAudit(),
  });

  const eventId = await getLinkedEventId(normalizedCenterId, trainingId);
  if (eventId) {
    await updateEvent(normalizedCenterId, eventId, {
      title: `Entrenamiento · ${input.type ?? current.type}`,
      description: input.objective ?? current.objective,
      type: "TRAINING",
      status: (input.status ?? current.status) === "CANCELLED" ? "CANCELLED" : "SCHEDULED",
      startAt,
      endAt,
      arenaId: input.arenaId ?? current.arenaId,
      trainerId: input.trainerId ?? current.trainerId,
      horseIds: [input.horseId ?? current.horseId],
    });
  }
};

export const deleteTraining = async (centerId: string, trainingId: string): Promise<void> => {
  const eventId = await getLinkedEventId(centerId, trainingId);
  if (eventId) await deleteEvent(centerId, eventId);
  await deleteDoc(trainingDoc(centerId, trainingId));
};

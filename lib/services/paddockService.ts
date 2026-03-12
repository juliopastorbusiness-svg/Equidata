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
  FirestorePaddockAssignmentDoc,
  FirestorePaddockDoc,
} from "@/lib/services/firestoreTypes";
import { mapPaddock, mapPaddockAssignment } from "@/lib/services/mappers";
import {
  AssignmentStatus,
  Paddock,
  PaddockAssignment,
  PaddockStatus,
  PaddockType,
} from "@/lib/services/types";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  ensurePositiveNumber,
  optionalStringOrNull,
  optionalTimestampOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreatePaddockInput = {
  name: string;
  code?: string;
  maxCapacity: number;
  type: PaddockType;
  status?: PaddockStatus;
  surface?: string;
  location?: string;
  notes?: string;
  specialConditions?: string;
};

export type UpdatePaddockInput = Partial<CreatePaddockInput>;

export type CreatePaddockAssignmentInput = {
  horseId: string;
  paddockId: string;
  assignedByUid: string;
  startAt: Date;
  endAt?: Date;
  status?: AssignmentStatus;
  reason?: string;
  notes?: string;
};

export type MoveHorseToPaddockInput = {
  horseId: string;
  toPaddockId: string;
  assignedByUid: string;
  startAt: Date;
  reason?: string;
  notes?: string;
};

export type ClosePaddockAssignmentInput = {
  assignmentId: string;
  endAt: Date;
  status?: Extract<AssignmentStatus, "COMPLETED" | "CANCELLED">;
  reason?: string;
  notes?: string;
};

const paddocksCollection = (centerId: string) =>
  centerCollection<FirestorePaddockDoc>(centerId, "paddocks");

const paddockDoc = (centerId: string, paddockId: string) =>
  centerDocument<FirestorePaddockDoc>(centerId, "paddocks", paddockId);

const assignmentsCollection = (centerId: string) =>
  centerCollection<FirestorePaddockAssignmentDoc>(centerId, "paddockAssignments");

const assignmentDoc = (centerId: string, assignmentId: string) =>
  centerDocument<FirestorePaddockAssignmentDoc>(
    centerId,
    "paddockAssignments",
    assignmentId
  );

const assertPaddockWritable = (paddock: FirestorePaddockDoc) => {
  if (paddock.status === "MAINTENANCE") {
    throw new Error("No se pueden asignar caballos a un paddock en mantenimiento.");
  }
  if (paddock.status === "UNAVAILABLE") {
    throw new Error("No se pueden asignar caballos a un paddock no disponible.");
  }
};

const countActiveAssignments = (docs: FirestorePaddockAssignmentDoc[]) =>
  docs.filter((item) => item.status === "ACTIVE").length;

export const getPaddocksByCenter = async (centerId: string): Promise<Paddock[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(paddocksCollection(normalizedCenterId), orderBy("name", "asc"))
  );

  return snapshot.docs.map((row) =>
    mapPaddock(row.id, row.data(), normalizedCenterId)
  );
};

export const getPaddockById = async (
  centerId: string,
  paddockId: string
): Promise<Paddock | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(paddockDoc(normalizedCenterId, paddockId));
  if (!snapshot.exists()) return null;
  return mapPaddock(snapshot.id, snapshot.data(), normalizedCenterId);
};

export const createPaddock = async (
  centerId: string,
  input: CreatePaddockInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const ref = await addDoc(paddocksCollection(normalizedCenterId), {
    name: assertRequiredString("El nombre del paddock", input.name),
    code: optionalStringOrNull(input.code),
    maxCapacity: ensurePositiveNumber("La capacidad maxima", input.maxCapacity),
    type: input.type,
    status: input.status ?? "AVAILABLE",
    surface: optionalStringOrNull(input.surface),
    location: optionalStringOrNull(input.location),
    notes: optionalStringOrNull(input.notes),
    specialConditions: optionalStringOrNull(input.specialConditions),
    ...withCreateAudit(),
  });

  return ref.id;
};

export const updatePaddock = async (
  centerId: string,
  paddockId: string,
  input: UpdatePaddockInput
): Promise<void> => {
  const patch: Partial<FirestorePaddockDoc> = {};

  if (typeof input.name === "string") {
    patch.name = assertRequiredString("El nombre del paddock", input.name);
  }
  if ("code" in input) patch.code = optionalStringOrNull(input.code);
  if (typeof input.maxCapacity === "number") {
    patch.maxCapacity = ensurePositiveNumber(
      "La capacidad maxima",
      input.maxCapacity
    );
  }
  if (input.type) patch.type = input.type;
  if (input.status) patch.status = input.status;
  if ("surface" in input) patch.surface = optionalStringOrNull(input.surface);
  if ("location" in input) patch.location = optionalStringOrNull(input.location);
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);
  if ("specialConditions" in input) {
    patch.specialConditions = optionalStringOrNull(input.specialConditions);
  }

  await updateDoc(paddockDoc(centerId, paddockId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deletePaddock = async (centerId: string, paddockId: string): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const activeAssignments = await getDocs(
    query(
      assignmentsCollection(normalizedCenterId),
      where("paddockId", "==", paddockId),
      where("status", "==", "ACTIVE")
    )
  );

  if (!activeAssignments.empty) {
    throw new Error("No se puede eliminar un paddock con caballos activos.");
  }

  await deleteDoc(paddockDoc(normalizedCenterId, paddockId));
};

export const getPaddockAssignmentsByCenter = async (
  centerId: string
): Promise<PaddockAssignment[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(assignmentsCollection(normalizedCenterId), orderBy("startAt", "desc"))
  );

  return snapshot.docs.map((row) =>
    mapPaddockAssignment(row.id, row.data(), normalizedCenterId)
  );
};

export const getAssignmentsByPaddock = async (
  centerId: string,
  paddockId: string,
  onlyActive = false
): Promise<PaddockAssignment[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const constraints = [where("paddockId", "==", paddockId), orderBy("startAt", "desc")] as const;
  const activeConstraints = onlyActive
    ? [where("paddockId", "==", paddockId), where("status", "==", "ACTIVE"), orderBy("startAt", "desc")] as const
    : constraints;
  const snapshot = await getDocs(query(assignmentsCollection(normalizedCenterId), ...activeConstraints));

  return snapshot.docs.map((row) =>
    mapPaddockAssignment(row.id, row.data(), normalizedCenterId)
  );
};

export const getActiveAssignmentByHorse = async (
  centerId: string,
  horseId: string
): Promise<PaddockAssignment | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(
      assignmentsCollection(normalizedCenterId),
      where("horseId", "==", horseId),
      where("status", "==", "ACTIVE")
    )
  );

  const first = snapshot.docs[0];
  if (!first) return null;
  return mapPaddockAssignment(first.id, first.data(), normalizedCenterId);
};

export const createPaddockAssignment = async (
  centerId: string,
  input: CreatePaddockAssignmentInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const paddockRef = paddockDoc(normalizedCenterId, input.paddockId);
  const paddockSnapshot = await getDoc(paddockRef);
  if (!paddockSnapshot.exists()) {
    throw new Error("El paddock no existe.");
  }

  const paddock = paddockSnapshot.data();
  assertPaddockWritable(paddock);

  const [activePaddockAssignments, activeHorseAssignments] = await Promise.all([
    getDocs(
      query(
        assignmentsCollection(normalizedCenterId),
        where("paddockId", "==", input.paddockId),
        where("status", "==", "ACTIVE")
      )
    ),
    getDocs(
      query(
        assignmentsCollection(normalizedCenterId),
        where("horseId", "==", input.horseId),
        where("status", "==", "ACTIVE")
      )
    ),
  ]);

  if (!activeHorseAssignments.empty) {
    throw new Error("El caballo ya tiene una asignacion activa.");
  }
  if (activePaddockAssignments.size >= paddock.maxCapacity) {
    throw new Error("El paddock ha alcanzado su capacidad maxima.");
  }

  const ref = await addDoc(assignmentsCollection(normalizedCenterId), {
    horseId: assertRequiredString("horseId", input.horseId),
    paddockId: assertRequiredString("paddockId", input.paddockId),
    assignedByUid: assertRequiredString("assignedByUid", input.assignedByUid),
    startAt: Timestamp.fromDate(input.startAt),
    endAt: optionalTimestampOrNull(input.endAt),
    status: input.status ?? "ACTIVE",
    reason: optionalStringOrNull(input.reason),
    notes: optionalStringOrNull(input.notes),
    ...withCreateAudit(),
  });

  await updateDoc(paddockRef, {
    status:
      activePaddockAssignments.size + 1 >= paddock.maxCapacity
        ? "OCCUPIED"
        : "AVAILABLE",
    ...withUpdateAudit(),
  });

  return ref.id;
};

export const moveHorseToPaddock = async (
  centerId: string,
  input: MoveHorseToPaddockInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const targetPaddockRef = paddockDoc(normalizedCenterId, input.toPaddockId);
  const targetPaddockSnapshot = await getDoc(targetPaddockRef);
  if (!targetPaddockSnapshot.exists()) {
    throw new Error("El paddock destino no existe.");
  }

  const targetPaddock = targetPaddockSnapshot.data();
  assertPaddockWritable(targetPaddock);

  const [activeHorseAssignments, activeTargetAssignments] = await Promise.all([
    getDocs(
      query(
        assignmentsCollection(normalizedCenterId),
        where("horseId", "==", input.horseId),
        where("status", "==", "ACTIVE")
      )
    ),
    getDocs(
      query(
        assignmentsCollection(normalizedCenterId),
        where("paddockId", "==", input.toPaddockId),
        where("status", "==", "ACTIVE")
      )
    ),
  ]);

  const currentAssignment = activeHorseAssignments.docs[0];
  if (currentAssignment?.data().paddockId === input.toPaddockId) {
    throw new Error("El caballo ya esta asignado a este paddock.");
  }
  if (activeTargetAssignments.size >= targetPaddock.maxCapacity) {
    throw new Error("El paddock destino ha alcanzado su capacidad maxima.");
  }

  if (currentAssignment) {
    await updateDoc(currentAssignment.ref, {
      status: "COMPLETED",
      endAt: Timestamp.fromDate(input.startAt),
      reason: optionalStringOrNull(input.reason) ?? currentAssignment.data().reason ?? null,
      notes: optionalStringOrNull(input.notes) ?? currentAssignment.data().notes ?? null,
      ...withUpdateAudit(),
    });

    const previousPaddockRef = paddockDoc(
      normalizedCenterId,
      currentAssignment.data().paddockId
    );
    const previousActiveAssignments = await getDocs(
      query(
        assignmentsCollection(normalizedCenterId),
        where("paddockId", "==", currentAssignment.data().paddockId),
        where("status", "==", "ACTIVE")
      )
    );
    await updateDoc(previousPaddockRef, {
      status: previousActiveAssignments.size === 0 ? "AVAILABLE" : "OCCUPIED",
      ...withUpdateAudit(),
    });
  }

  const newAssignmentRef = await addDoc(assignmentsCollection(normalizedCenterId), {
    horseId: assertRequiredString("horseId", input.horseId),
    paddockId: assertRequiredString("paddockId", input.toPaddockId),
    assignedByUid: assertRequiredString("assignedByUid", input.assignedByUid),
    startAt: Timestamp.fromDate(input.startAt),
    endAt: null,
    status: "ACTIVE",
    reason: optionalStringOrNull(input.reason),
    notes: optionalStringOrNull(input.notes),
    ...withCreateAudit(),
  });

  await updateDoc(targetPaddockRef, {
    status:
      activeTargetAssignments.size + 1 >= targetPaddock.maxCapacity
        ? "OCCUPIED"
        : "AVAILABLE",
    ...withUpdateAudit(),
  });

  return newAssignmentRef.id;
};

export const closePaddockAssignment = async (
  centerId: string,
  input: ClosePaddockAssignmentInput
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const assignmentRef = assignmentDoc(normalizedCenterId, input.assignmentId);
  const assignmentSnapshot = await getDoc(assignmentRef);
  if (!assignmentSnapshot.exists()) {
    throw new Error("La asignacion no existe.");
  }

  const assignment = assignmentSnapshot.data();
  if (assignment.status !== "ACTIVE") {
    throw new Error("Solo se pueden cerrar asignaciones activas.");
  }

  await updateDoc(assignmentRef, {
    status: input.status ?? "COMPLETED",
    endAt: Timestamp.fromDate(input.endAt),
    reason: optionalStringOrNull(input.reason) ?? assignment.reason ?? null,
    notes: optionalStringOrNull(input.notes) ?? assignment.notes ?? null,
    ...withUpdateAudit(),
  });

  const paddockRef = paddockDoc(normalizedCenterId, assignment.paddockId);
  const activeAssignments = await getDocs(
    query(
      assignmentsCollection(normalizedCenterId),
      where("paddockId", "==", assignment.paddockId),
      where("status", "==", "ACTIVE")
    )
  );
  await updateDoc(paddockRef, {
    status: activeAssignments.size === 0 ? "AVAILABLE" : "OCCUPIED",
    ...withUpdateAudit(),
  });
};

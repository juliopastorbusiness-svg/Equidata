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
  FirestoreHorseTreatmentDoc,
  FirestoreMedicationDoc,
} from "@/lib/services/firestoreTypes";
import { mapHorseTreatment, mapMedication } from "@/lib/services/mappers";
import { HorseTreatment, Medication, TreatmentStatus } from "@/lib/services/types";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  ensureNonNegativeNumber,
  ensurePositiveNumber,
  optionalStringOrNull,
  optionalTimestampOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreateMedicationInput = {
  name: string;
  category?: string;
  description?: string;
  stock: number;
  unit: string;
  recommendedDose?: number;
  batch?: string;
  expiryDate?: Date;
  supplier?: string;
  storageLocation?: string;
  notes?: string;
  isActive?: boolean;
};

export type UpdateMedicationInput = Partial<CreateMedicationInput>;

export type CreateHorseTreatmentInput = {
  horseId: string;
  medicationId: string;
  startDate: Date;
  endDate?: Date;
  dose: number;
  frequency?: string;
  administrationRoute: HorseTreatment["administrationRoute"];
  reason?: string;
  notes?: string;
  prescribedBy?: string;
  status?: TreatmentStatus;
};

export type UpdateHorseTreatmentInput = Partial<CreateHorseTreatmentInput>;

export type MedicationAlertLevel = "NONE" | "LOW_STOCK" | "EXPIRING_SOON" | "CRITICAL";

export type MedicationInventoryItem = {
  medication: Medication;
  lowStock: boolean;
  expiringSoon: boolean;
  expired: boolean;
  alertLevel: MedicationAlertLevel;
};

const medicationsCollection = (centerId: string) =>
  centerCollection<FirestoreMedicationDoc>(centerId, "medications");

const medicationDoc = (centerId: string, medicationId: string) =>
  centerDocument<FirestoreMedicationDoc>(centerId, "medications", medicationId);

const treatmentsCollection = (centerId: string) =>
  centerCollection<FirestoreHorseTreatmentDoc>(centerId, "horseTreatments");

const treatmentDoc = (centerId: string, treatmentId: string) =>
  centerDocument<FirestoreHorseTreatmentDoc>(centerId, "horseTreatments", treatmentId);

const LOW_STOCK_THRESHOLD = 5;
const EXPIRY_ALERT_DAYS = 30;

const computeInventoryAlert = (medication: Medication): MedicationInventoryItem => {
  const now = Date.now();
  const expiryMs = medication.expiryDate?.toMillis();
  const lowStock = medication.stock <= LOW_STOCK_THRESHOLD;
  const expired = typeof expiryMs === "number" && expiryMs < now;
  const expiringSoon =
    typeof expiryMs === "number" &&
    expiryMs >= now &&
    expiryMs <= now + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000;

  const alertLevel: MedicationAlertLevel = expired
    ? "CRITICAL"
    : lowStock && expiringSoon
      ? "CRITICAL"
      : lowStock
        ? "LOW_STOCK"
        : expiringSoon
          ? "EXPIRING_SOON"
          : "NONE";

  return {
    medication,
    lowStock,
    expiringSoon,
    expired,
    alertLevel,
  };
};

export const getMedications = async (centerId: string): Promise<Medication[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(medicationsCollection(normalizedCenterId), orderBy("name", "asc"))
  );

  return snapshot.docs.map((row) =>
    mapMedication(row.id, row.data(), normalizedCenterId)
  );
};

export const getMedicationInventory = async (
  centerId: string
): Promise<MedicationInventoryItem[]> => {
  const medications = await getMedications(centerId);
  return medications.map(computeInventoryAlert);
};

export const getMedicationById = async (
  centerId: string,
  medicationId: string
): Promise<Medication | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(medicationDoc(normalizedCenterId, medicationId));
  if (!snapshot.exists()) return null;
  return mapMedication(snapshot.id, snapshot.data(), normalizedCenterId);
};

export const createMedication = async (
  centerId: string,
  input: CreateMedicationInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const ref = await addDoc(medicationsCollection(normalizedCenterId), {
    name: assertRequiredString("El nombre del medicamento", input.name),
    category: optionalStringOrNull(input.category),
    description: optionalStringOrNull(input.description),
    stock: ensureNonNegativeNumber("El stock", input.stock),
    unit: assertRequiredString("La unidad", input.unit),
    recommendedDose:
      typeof input.recommendedDose === "number"
        ? ensurePositiveNumber("La dosis recomendada", input.recommendedDose)
        : null,
    batch: optionalStringOrNull(input.batch),
    expiryDate: optionalTimestampOrNull(input.expiryDate),
    supplier: optionalStringOrNull(input.supplier),
    storageLocation: optionalStringOrNull(input.storageLocation),
    notes: optionalStringOrNull(input.notes),
    isActive: input.isActive ?? true,
    ...withCreateAudit(),
  });

  return ref.id;
};

export const updateMedication = async (
  centerId: string,
  medicationId: string,
  input: UpdateMedicationInput
): Promise<void> => {
  const patch: Partial<FirestoreMedicationDoc> = {};

  if (typeof input.name === "string") {
    patch.name = assertRequiredString("El nombre del medicamento", input.name);
  }
  if ("category" in input) patch.category = optionalStringOrNull(input.category);
  if ("description" in input) patch.description = optionalStringOrNull(input.description);
  if (typeof input.stock === "number") {
    patch.stock = ensureNonNegativeNumber("El stock", input.stock);
  }
  if (typeof input.unit === "string") {
    patch.unit = assertRequiredString("La unidad", input.unit);
  }
  if ("recommendedDose" in input) {
    patch.recommendedDose =
      typeof input.recommendedDose === "number"
        ? ensurePositiveNumber("La dosis recomendada", input.recommendedDose)
        : null;
  }
  if ("batch" in input) patch.batch = optionalStringOrNull(input.batch);
  if ("expiryDate" in input) patch.expiryDate = optionalTimestampOrNull(input.expiryDate);
  if ("supplier" in input) patch.supplier = optionalStringOrNull(input.supplier);
  if ("storageLocation" in input) {
    patch.storageLocation = optionalStringOrNull(input.storageLocation);
  }
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);
  if (typeof input.isActive === "boolean") patch.isActive = input.isActive;

  await updateDoc(medicationDoc(centerId, medicationId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deleteMedication = async (
  centerId: string,
  medicationId: string
): Promise<void> => {
  const normalizedCenterId = assertCenterId(centerId);
  const activeTreatments = await getDocs(
    query(
      treatmentsCollection(normalizedCenterId),
      where("medicationId", "==", medicationId),
      where("status", "in", ["PLANNED", "IN_PROGRESS"])
    )
  );

  if (!activeTreatments.empty) {
    throw new Error("No se puede eliminar un medicamento con tratamientos activos.");
  }

  await deleteDoc(medicationDoc(normalizedCenterId, medicationId));
};

export const getHorseTreatments = async (
  centerId: string,
  filters?: { horseId?: string; medicationId?: string }
): Promise<HorseTreatment[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(treatmentsCollection(normalizedCenterId), orderBy("startDate", "desc"))
  );

  return snapshot.docs
    .map((row) => mapHorseTreatment(row.id, row.data(), normalizedCenterId))
    .filter((item) => (filters?.horseId ? item.horseId === filters.horseId : true))
    .filter((item) => (filters?.medicationId ? item.medicationId === filters.medicationId : true));
};

export const createHorseTreatment = async (
  centerId: string,
  input: CreateHorseTreatmentInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const ref = await addDoc(treatmentsCollection(normalizedCenterId), {
    horseId: assertRequiredString("horseId", input.horseId),
    medicationId: assertRequiredString("medicationId", input.medicationId),
    startDate: Timestamp.fromDate(input.startDate),
    endDate: optionalTimestampOrNull(input.endDate),
    dose: ensurePositiveNumber("La dosis", input.dose),
    frequency: optionalStringOrNull(input.frequency),
    administrationRoute: input.administrationRoute,
    reason: optionalStringOrNull(input.reason),
    notes: optionalStringOrNull(input.notes),
    prescribedBy: optionalStringOrNull(input.prescribedBy),
    status: input.status ?? "PLANNED",
    ...withCreateAudit(),
  });

  return ref.id;
};

export const updateHorseTreatment = async (
  centerId: string,
  treatmentId: string,
  input: UpdateHorseTreatmentInput
): Promise<void> => {
  const patch: Partial<FirestoreHorseTreatmentDoc> = {};

  if (typeof input.horseId === "string") patch.horseId = assertRequiredString("horseId", input.horseId);
  if (typeof input.medicationId === "string") {
    patch.medicationId = assertRequiredString("medicationId", input.medicationId);
  }
  if (input.startDate) patch.startDate = Timestamp.fromDate(input.startDate);
  if ("endDate" in input) patch.endDate = optionalTimestampOrNull(input.endDate);
  if (typeof input.dose === "number") patch.dose = ensurePositiveNumber("La dosis", input.dose);
  if ("frequency" in input) patch.frequency = optionalStringOrNull(input.frequency);
  if (input.administrationRoute) patch.administrationRoute = input.administrationRoute;
  if ("reason" in input) patch.reason = optionalStringOrNull(input.reason);
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);
  if ("prescribedBy" in input) patch.prescribedBy = optionalStringOrNull(input.prescribedBy);
  if (input.status) patch.status = input.status;

  await updateDoc(treatmentDoc(centerId, treatmentId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deleteHorseTreatment = async (
  centerId: string,
  treatmentId: string
): Promise<void> => {
  await deleteDoc(treatmentDoc(centerId, treatmentId));
};

export const getMedicationAlertSummary = async (centerId: string) => {
  const inventory = await getMedicationInventory(centerId);
  return {
    total: inventory.length,
    lowStock: inventory.filter((item) => item.lowStock).length,
    expiringSoon: inventory.filter((item) => item.expiringSoon || item.expired).length,
    critical: inventory.filter((item) => item.alertLevel === "CRITICAL").length,
  };
};

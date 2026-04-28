import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import {
  FirestoreHorseAlertDoc,
  FirestoreHorseDoc,
  FirestoreHorseDocumentDoc,
  FirestoreInjuryDoc,
  FirestoreMedicalRecordDoc,
  FirestoreWeightEntryDoc,
} from "@/lib/horses/firestore-types";
import {
  mapHorse,
  mapHorseAlert,
  mapHorseDocument,
  mapInjury,
  mapMedicalRecord,
  mapWeightEntry,
} from "@/lib/horses/mappers";
import {
  centerHorseCollection,
  horseAlertsCollection,
  horseDocRef,
  horseDocumentStorageRef,
  horseDocumentsCollection,
  horseInjuriesCollection,
  horseMedicalRecordsCollection,
  horseWeightHistoryCollection,
} from "@/lib/horses/paths";
import {
  AddInjuryInput,
  AddMedicalRecordInput,
  AddWeightEntryInput,
  CenterPersonOption,
  CreateHorseInput,
  Horse,
  HorseAlert,
  HorseDocument,
  Injury,
  HorseListItem,
  HORSE_STATUSES,
  HorseStatus,
  MedicalRecord,
  UpdateHorseInput,
  UploadHorseDocumentInput,
  WeightEntry,
} from "@/lib/horses/types";
import { daysFromNow, toTimestampOrNull } from "@/lib/horses/timestamps";

const trimOrNull = (value?: string | null): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const trimArray = (value?: string[]): string[] => {
  if (!value) return [];
  return value.map((item) => item.trim()).filter(Boolean);
};

const sanitizeFileName = (value: string): string => {
  const normalized = value.trim().replace(/\s+/g, "-");
  const sanitized = normalized.replace(/[^a-zA-Z0-9._-]/g, "");
  return sanitized || `file-${Date.now()}`;
};

const assertId = (label: string, value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} es obligatorio.`);
  }
  return normalized;
};

const normalizeHorseStatus = (status?: HorseStatus): HorseStatus => {
  if (status && HORSE_STATUSES.includes(status)) {
    return status;
  }
  return "ACTIVE";
};

const normalizeHorseWrite = (
  payload: CreateHorseInput | UpdateHorseInput
): Partial<FirestoreHorseDoc> => {
  const next: Partial<FirestoreHorseDoc> = {};

  if ("name" in payload && typeof payload.name === "string") {
    const name = payload.name.trim();
    if (name.length < 2) {
      throw new Error("El nombre del caballo debe tener al menos 2 caracteres.");
    }
    next.name = name;
  }

  if ("status" in payload) next.status = normalizeHorseStatus(payload.status);
  if ("ownerId" in payload) next.ownerId = trimOrNull(payload.ownerId);
  if ("riderId" in payload) next.riderId = trimOrNull(payload.riderId);
  if ("stableId" in payload) next.stableId = trimOrNull(payload.stableId);
  if ("breed" in payload) next.breed = trimOrNull(payload.breed);
  if ("coat" in payload) next.coat = trimOrNull(payload.coat);
  if ("sex" in payload && payload.sex) next.sex = payload.sex;
  if ("birthDate" in payload) next.birthDate = toTimestampOrNull(payload.birthDate);
  if ("enteredCenterAt" in payload) {
    next.enteredCenterAt = toTimestampOrNull(payload.enteredCenterAt);
  }
  if ("age" in payload) next.age = payload.age ?? null;
  if ("heightCm" in payload) next.heightCm = payload.heightCm ?? null;
  if ("weightKg" in payload) next.weightKg = payload.weightKg ?? null;
  if ("microchipId" in payload) next.microchipId = trimOrNull(payload.microchipId);
  if ("federationId" in payload) {
    next.federationId = trimOrNull(payload.federationId);
  }
  if ("photoUrl" in payload) next.photoUrl = trimOrNull(payload.photoUrl);
  if ("notes" in payload) next.notes = trimOrNull(payload.notes);
  if ("tags" in payload) next.tags = trimArray(payload.tags);

  if ("feedInfo" in payload) {
    next.feedInfo = payload.feedInfo
      ? {
          planName: trimOrNull(payload.feedInfo.planName),
          feedType: trimOrNull(payload.feedInfo.feedType),
          notes: trimOrNull(payload.feedInfo.notes),
          mealsPerDay: payload.feedInfo.mealsPerDay ?? null,
          dailyRationKg: payload.feedInfo.dailyRationKg ?? null,
          forage: trimOrNull(payload.feedInfo.forage),
          schedule: trimOrNull(payload.feedInfo.schedule),
          supplements: trimArray(payload.feedInfo.supplements),
          allergies: trimArray(payload.feedInfo.allergies),
        }
      : null;
  }

  if ("ownerContact" in payload) {
    next.ownerContact = payload.ownerContact
      ? {
          name: payload.ownerContact.name.trim(),
          phone: trimOrNull(payload.ownerContact.phone),
          email: trimOrNull(payload.ownerContact.email),
          address: trimOrNull(payload.ownerContact.address),
        }
      : null;
  }

  if ("emergencyContact" in payload) {
    next.emergencyContact = payload.emergencyContact
      ? {
          name: payload.emergencyContact.name.trim(),
          phone: trimOrNull(payload.emergencyContact.phone),
          email: trimOrNull(payload.emergencyContact.email),
          address: trimOrNull(payload.emergencyContact.address),
        }
      : null;
  }

  if ("veterinarianName" in payload) {
    next.veterinarianName = trimOrNull(payload.veterinarianName);
  }
  if ("veterinarianContact" in payload) {
    next.veterinarianContact = payload.veterinarianContact
      ? {
          name: payload.veterinarianContact.name.trim(),
          phone: trimOrNull(payload.veterinarianContact.phone),
          email: trimOrNull(payload.veterinarianContact.email),
          address: trimOrNull(payload.veterinarianContact.address),
        }
      : null;
  }

  if ("farrierName" in payload) next.farrierName = trimOrNull(payload.farrierName);
  if ("farrierContact" in payload) {
    next.farrierContact = payload.farrierContact
      ? {
          name: payload.farrierContact.name.trim(),
          phone: trimOrNull(payload.farrierContact.phone),
          email: trimOrNull(payload.farrierContact.email),
          address: trimOrNull(payload.farrierContact.address),
        }
      : null;
  }
  if ("trainerName" in payload) next.trainerName = trimOrNull(payload.trainerName);
  if ("nextFarrierVisitAt" in payload) {
    next.nextFarrierVisitAt = toTimestampOrNull(payload.nextFarrierVisitAt);
  }

  return next;
};

const requireHorse = async (centerId: string, horseId: string) => {
  const horseSnapshot = await getDoc(horseDocRef(centerId, horseId));
  if (!horseSnapshot.exists()) {
    throw new Error("El caballo no existe en este centro.");
  }
};

const nowTimestamp = () => Timestamp.now();

type CenterMemberDoc = {
  displayName?: string;
  email?: string;
};

type UserDoc = {
  displayName?: string;
  name?: string;
  email?: string;
};

type HorseStayDoc = {
  horseId?: string;
  riderUid?: string;
  assignedStableId?: string | null;
  active?: boolean;
  startedAt?: Timestamp;
};

const centerMembersCollection = (centerId: string) =>
  collection(db, "centers", centerId, "members");

const horseStaysCollection = (centerId: string) =>
  collection(db, "centers", centerId, "horseStays");

const usersCollection = () => collection(db, "users");

const chooseWindowDays = (daysUntilDue: number): number | null => {
  if (daysUntilDue <= 7) return 7;
  if (daysUntilDue <= 15) return 15;
  if (daysUntilDue <= 30) return 30;
  return null;
};

const buildTimedAlert = ({
  type,
  title,
  description,
  dueAt,
  sourceId,
  sourceCollection,
  metadata,
}: {
  type: FirestoreHorseAlertDoc["type"];
  title: string;
  description: string;
  dueAt: Timestamp;
  sourceId?: string;
  sourceCollection?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): FirestoreHorseAlertDoc => {
  const nowMs = nowTimestamp().toMillis();
  const dueAtMs = dueAt.toMillis();
  const daysUntilDue = Math.ceil((dueAtMs - nowMs) / (1000 * 60 * 60 * 24));
  const windowDays = chooseWindowDays(daysUntilDue);
  const isOverdue = dueAtMs <= nowMs;

  return {
    type: isOverdue ? "OVERDUE_CARE" : type,
    severity: isOverdue ? "HIGH" : windowDays === 7 ? "HIGH" : windowDays === 15 ? "MEDIUM" : "LOW",
    title,
    description: isOverdue
      ? `${description} Esta vencida.`
      : `${description} Prevista dentro de ${windowDays ?? 30} dias.`,
    isActive: true,
    detectedAt: nowTimestamp(),
    dueAt,
    sourceId: sourceId ?? null,
    sourceCollection: sourceCollection ?? null,
    metadata: {
      ...metadata,
      dueAtMs,
      daysUntilDue,
      windowDays: windowDays ?? 30,
      overdue: isOverdue,
    },
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
  };
};

const shouldTrackMedicalAlert = (medical: FirestoreMedicalRecordDoc) => {
  return Boolean(medical.nextReviewAt);
};

const buildWeightAlert = async (
  centerId: string,
  horseId: string
): Promise<FirestoreHorseAlertDoc | null> => {
  const snapshot = await getDocs(
    query(horseWeightHistoryCollection(centerId, horseId), orderBy("date", "desc"))
  );
  const [latest, previous] = snapshot.docs;

  if (!latest || !previous) return null;

  const latestWeight = Number((latest.data() as FirestoreWeightEntryDoc).weightKg);
  const previousWeight = Number((previous.data() as FirestoreWeightEntryDoc).weightKg);

  if (!Number.isFinite(latestWeight) || !Number.isFinite(previousWeight) || previousWeight <= 0) {
    return null;
  }

  const changeRatio = Math.abs((latestWeight - previousWeight) / previousWeight);
  if (changeRatio < 0.08) {
    return null;
  }

  return {
    type: "WEIGHT_CHANGE",
    severity: changeRatio >= 0.12 ? "HIGH" : "MEDIUM",
    title: "Cambio de peso detectado",
    description: `Variacion del ${(changeRatio * 100).toFixed(1)}% entre las dos ultimas mediciones.`,
    isActive: true,
    detectedAt: nowTimestamp(),
    sourceId: latest.id,
    sourceCollection: "weightHistory",
    metadata: {
      latestWeight,
      previousWeight,
      changeRatio: Number(changeRatio.toFixed(4)),
    },
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
  };
};

export const getHorsesByCenter = async (centerId: string): Promise<Horse[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const snapshot = await getDocs(
    query(centerHorseCollection(normalizedCenterId), orderBy("name", "asc"))
  );

  return snapshot.docs.map((horseSnapshot) =>
    mapHorse(
      horseSnapshot.id,
      horseSnapshot.data() as FirestoreHorseDoc,
      normalizedCenterId
    )
  );
};

export const getHorseById = async (
  centerId: string,
  horseId: string
): Promise<Horse | null> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const snapshot = await getDoc(horseDocRef(normalizedCenterId, normalizedHorseId));

  if (!snapshot.exists()) return null;

  return mapHorse(
    snapshot.id,
    snapshot.data() as FirestoreHorseDoc,
    normalizedCenterId
  );
};

export const createHorse = async (
  centerId: string,
  payload: CreateHorseInput
): Promise<string> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const nextHorse = normalizeHorseWrite(payload);

  if (!nextHorse.name) {
    throw new Error("El nombre del caballo es obligatorio.");
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error("Debes iniciar sesion para crear caballos.");
  }

  const response = await fetch("/api/center/horses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      centerId: normalizedCenterId,
      horse: {
        ...nextHorse,
        status: nextHorse.status ?? "ACTIVE",
        sex: nextHorse.sex ?? "UNKNOWN",
      },
    }),
  });

  const data = (await response.json()) as {
    horseId?: string;
    error?: string;
    code?: string;
  };

  if (!response.ok || !data.horseId) {
    throw new Error(data.error || "No se pudo crear el caballo.");
  }

  await recalculateHorseAlerts(normalizedCenterId, data.horseId);
  return data.horseId;
};

export const updateHorse = async (
  centerId: string,
  horseId: string,
  patch: UpdateHorseInput
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const nextPatch = normalizeHorseWrite(patch);

  await updateDoc(horseDocRef(normalizedCenterId, normalizedHorseId), {
    ...nextPatch,
    updatedAt: serverTimestamp(),
  });
  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const deleteHorse = async (
  centerId: string,
  horseId: string
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const [medicalSnapshot, weightSnapshot, injurySnapshot, alertSnapshot, documentSnapshot, staysSnapshot] =
    await Promise.all([
      getDocs(horseMedicalRecordsCollection(normalizedCenterId, normalizedHorseId)),
      getDocs(horseWeightHistoryCollection(normalizedCenterId, normalizedHorseId)),
      getDocs(horseInjuriesCollection(normalizedCenterId, normalizedHorseId)),
      getDocs(horseAlertsCollection(normalizedCenterId, normalizedHorseId)),
      getDocs(horseDocumentsCollection(normalizedCenterId, normalizedHorseId)),
      getDocs(
        query(horseStaysCollection(normalizedCenterId), where("horseId", "==", normalizedHorseId))
      ),
    ]);

  await Promise.all(
    documentSnapshot.docs.map(async (documentDoc) => {
      const horseDocument = documentDoc.data() as FirestoreHorseDocumentDoc;
      if (horseDocument.storagePath) {
        await deleteObject(ref(storage, horseDocument.storagePath)).catch(() => undefined);
      }
    })
  );

  const batch = writeBatch(db);
  medicalSnapshot.docs.forEach((documentDoc) => batch.delete(documentDoc.ref));
  weightSnapshot.docs.forEach((documentDoc) => batch.delete(documentDoc.ref));
  injurySnapshot.docs.forEach((documentDoc) => batch.delete(documentDoc.ref));
  alertSnapshot.docs.forEach((documentDoc) => batch.delete(documentDoc.ref));
  documentSnapshot.docs.forEach((documentDoc) => batch.delete(documentDoc.ref));
  staysSnapshot.docs.forEach((documentDoc) => batch.delete(documentDoc.ref));
  batch.delete(horseDocRef(normalizedCenterId, normalizedHorseId));
  await batch.commit();
};

export const addMedicalRecord = async (
  centerId: string,
  horseId: string,
  payload: AddMedicalRecordInput
): Promise<string> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  await requireHorse(normalizedCenterId, normalizedHorseId);

  const title = payload.title.trim();
  if (title.length < 2) {
    throw new Error("El titulo del registro medico debe tener al menos 2 caracteres.");
  }

  const docRef = await addDoc(
    horseMedicalRecordsCollection(normalizedCenterId, normalizedHorseId),
    {
      type: payload.type,
      title,
      date: payload.date,
      veterinarianName: trimOrNull(payload.veterinarianName),
      diagnosis: trimOrNull(payload.diagnosis),
      treatment: trimOrNull(payload.treatment),
      notes: trimOrNull(payload.notes),
      attachments: trimArray(payload.attachments),
      nextReviewAt: toTimestampOrNull(payload.nextReviewAt),
      createdBy: assertId("createdBy", payload.createdBy),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
  return docRef.id;
};

export const addWeightEntry = async (
  centerId: string,
  horseId: string,
  payload: AddWeightEntryInput
): Promise<string> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  await requireHorse(normalizedCenterId, normalizedHorseId);

  const weightKg = Number(payload.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error("weightKg debe ser un numero mayor que 0.");
  }

  const docRef = await addDoc(
    horseWeightHistoryCollection(normalizedCenterId, normalizedHorseId),
    {
      date: payload.date,
      weightKg,
      notes: trimOrNull(payload.notes),
      createdBy: assertId("createdBy", payload.createdBy),
      createdAt: serverTimestamp(),
    }
  );

  await updateDoc(horseDocRef(normalizedCenterId, normalizedHorseId), {
    weightKg,
    updatedAt: serverTimestamp(),
  });

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
  return docRef.id;
};

export const addInjury = async (
  centerId: string,
  horseId: string,
  payload: AddInjuryInput
): Promise<string> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  await requireHorse(normalizedCenterId, normalizedHorseId);

  const title = payload.title.trim();
  if (title.length < 2) {
    throw new Error("La lesion debe tener un titulo valido.");
  }

  const docRef = await addDoc(
    horseInjuriesCollection(normalizedCenterId, normalizedHorseId),
    {
      title,
      status: payload.status,
      detectedAt: payload.detectedAt,
      resolvedAt: toTimestampOrNull(payload.resolvedAt),
      severity: payload.severity ?? null,
      description: trimOrNull(payload.description),
      treatmentPlan: trimOrNull(payload.treatmentPlan),
      notes: trimOrNull(payload.notes),
      createdBy: assertId("createdBy", payload.createdBy),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  if (payload.status === "ACTIVE" || payload.status === "MONITORING") {
    await updateDoc(horseDocRef(normalizedCenterId, normalizedHorseId), {
      status: "RECOVERING",
      updatedAt: serverTimestamp(),
    });
  }

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
  return docRef.id;
};

export const uploadHorseDocument = async (
  centerId: string,
  horseId: string,
  payload: UploadHorseDocumentInput
): Promise<string> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  await requireHorse(normalizedCenterId, normalizedHorseId);

  const safeFileName = `${Date.now()}-${sanitizeFileName(payload.fileName)}`;
  const storageRef = horseDocumentStorageRef(
    normalizedCenterId,
    normalizedHorseId,
    safeFileName
  );

  const uploadResult = await uploadBytes(storageRef, payload.file, {
    contentType: payload.contentType,
  });
  const downloadUrl = await getDownloadURL(uploadResult.ref);

  const docRef = await addDoc(
    horseDocumentsCollection(normalizedCenterId, normalizedHorseId),
    {
      type: payload.type,
      name: payload.name.trim(),
      fileName: payload.fileName,
      storagePath: uploadResult.ref.fullPath,
      downloadUrl,
      contentType: payload.contentType ?? payload.file.type ?? null,
      sizeBytes: "size" in payload.file ? payload.file.size : null,
      issuedAt: toTimestampOrNull(payload.issuedAt),
      expiresAt: toTimestampOrNull(payload.expiresAt),
      notes: trimOrNull(payload.notes),
      uploadedBy: assertId("uploadedBy", payload.uploadedBy),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
  return docRef.id;
};

export const getHorseAlerts = async (
  centerId: string,
  horseId: string
): Promise<HorseAlert[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const snapshot = await getDocs(
    query(
      horseAlertsCollection(normalizedCenterId, normalizedHorseId),
      orderBy("detectedAt", "desc")
    )
  );

  return snapshot.docs.map((alertSnapshot) =>
    mapHorseAlert(
      alertSnapshot.id,
      alertSnapshot.data() as FirestoreHorseAlertDoc,
      normalizedCenterId,
      normalizedHorseId
    )
  );
};

export const listMedicalRecordsByHorse = async (
  centerId: string,
  horseId: string
): Promise<MedicalRecord[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const snapshot = await getDocs(
    query(
      horseMedicalRecordsCollection(normalizedCenterId, normalizedHorseId),
      orderBy("date", "desc")
    )
  );

  return snapshot.docs.map((recordDoc) =>
    mapMedicalRecord(
      recordDoc.id,
      recordDoc.data() as FirestoreMedicalRecordDoc,
      normalizedCenterId,
      normalizedHorseId
    )
  );
};

export const updateMedicalRecord = async (
  centerId: string,
  horseId: string,
  recordId: string,
  payload: Partial<AddMedicalRecordInput>
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const normalizedRecordId = assertId("recordId", recordId);

  const nextPatch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (payload.type) nextPatch.type = payload.type;
  if (typeof payload.title === "string") nextPatch.title = payload.title.trim();
  if (payload.date) nextPatch.date = payload.date;
  if ("veterinarianName" in payload) {
    nextPatch.veterinarianName = trimOrNull(payload.veterinarianName);
  }
  if ("diagnosis" in payload) nextPatch.diagnosis = trimOrNull(payload.diagnosis);
  if ("treatment" in payload) nextPatch.treatment = trimOrNull(payload.treatment);
  if ("notes" in payload) nextPatch.notes = trimOrNull(payload.notes);
  if ("attachments" in payload) nextPatch.attachments = trimArray(payload.attachments);
  if ("nextReviewAt" in payload) {
    nextPatch.nextReviewAt = toTimestampOrNull(payload.nextReviewAt);
  }

  await updateDoc(
    doc(
      horseMedicalRecordsCollection(normalizedCenterId, normalizedHorseId),
      normalizedRecordId
    ),
    nextPatch
  );

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const deleteMedicalRecord = async (
  centerId: string,
  horseId: string,
  recordId: string
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const normalizedRecordId = assertId("recordId", recordId);

  await deleteDoc(
    doc(
      horseMedicalRecordsCollection(normalizedCenterId, normalizedHorseId),
      normalizedRecordId
    )
  );

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const listWeightEntriesByHorse = async (
  centerId: string,
  horseId: string
): Promise<WeightEntry[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const snapshot = await getDocs(
    query(
      horseWeightHistoryCollection(normalizedCenterId, normalizedHorseId),
      orderBy("date", "asc")
    )
  );

  return snapshot.docs.map((weightDoc) =>
    mapWeightEntry(
      weightDoc.id,
      weightDoc.data() as FirestoreWeightEntryDoc,
      normalizedCenterId,
      normalizedHorseId
    )
  );
};

export const updateWeightEntry = async (
  centerId: string,
  horseId: string,
  weightId: string,
  payload: Partial<AddWeightEntryInput>
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const normalizedWeightId = assertId("weightId", weightId);

  const nextPatch: Record<string, unknown> = {};
  if (payload.date) nextPatch.date = payload.date;
  if (typeof payload.weightKg === "number") nextPatch.weightKg = payload.weightKg;
  if ("notes" in payload) nextPatch.notes = trimOrNull(payload.notes);

  await updateDoc(
    doc(
      horseWeightHistoryCollection(normalizedCenterId, normalizedHorseId),
      normalizedWeightId
    ),
    nextPatch
  );

  const weightEntries = await listWeightEntriesByHorse(normalizedCenterId, normalizedHorseId);
  const latestEntry = weightEntries.at(-1);
  await updateDoc(horseDocRef(normalizedCenterId, normalizedHorseId), {
    weightKg: latestEntry?.weightKg ?? null,
    updatedAt: serverTimestamp(),
  });
  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const deleteWeightEntry = async (
  centerId: string,
  horseId: string,
  weightId: string
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const normalizedWeightId = assertId("weightId", weightId);

  await deleteDoc(
    doc(
      horseWeightHistoryCollection(normalizedCenterId, normalizedHorseId),
      normalizedWeightId
    )
  );

  const weightEntries = await listWeightEntriesByHorse(normalizedCenterId, normalizedHorseId);
  const latestEntry = weightEntries.at(-1);
  await updateDoc(horseDocRef(normalizedCenterId, normalizedHorseId), {
    weightKg: latestEntry?.weightKg ?? null,
    updatedAt: serverTimestamp(),
  });
  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const listInjuriesByHorse = async (
  centerId: string,
  horseId: string
): Promise<Injury[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const snapshot = await getDocs(
    query(
      horseInjuriesCollection(normalizedCenterId, normalizedHorseId),
      orderBy("detectedAt", "desc")
    )
  );

  return snapshot.docs.map((injuryDoc) =>
    mapInjury(
      injuryDoc.id,
      injuryDoc.data() as FirestoreInjuryDoc,
      normalizedCenterId,
      normalizedHorseId
    )
  );
};

export const updateInjury = async (
  centerId: string,
  horseId: string,
  injuryId: string,
  payload: Partial<AddInjuryInput>
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const normalizedInjuryId = assertId("injuryId", injuryId);

  const nextPatch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof payload.title === "string") nextPatch.title = payload.title.trim();
  if (payload.status) nextPatch.status = payload.status;
  if (payload.detectedAt) nextPatch.detectedAt = payload.detectedAt;
  if ("resolvedAt" in payload) nextPatch.resolvedAt = toTimestampOrNull(payload.resolvedAt);
  if ("severity" in payload) nextPatch.severity = payload.severity ?? null;
  if ("description" in payload) nextPatch.description = trimOrNull(payload.description);
  if ("treatmentPlan" in payload) {
    nextPatch.treatmentPlan = trimOrNull(payload.treatmentPlan);
  }
  if ("notes" in payload) nextPatch.notes = trimOrNull(payload.notes);

  await updateDoc(
    doc(horseInjuriesCollection(normalizedCenterId, normalizedHorseId), normalizedInjuryId),
    nextPatch
  );

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const deleteInjury = async (
  centerId: string,
  horseId: string,
  injuryId: string
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const normalizedInjuryId = assertId("injuryId", injuryId);

  await deleteDoc(
    doc(horseInjuriesCollection(normalizedCenterId, normalizedHorseId), normalizedInjuryId)
  );

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const listHorseDocuments = async (
  centerId: string,
  horseId: string
): Promise<HorseDocument[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const snapshot = await getDocs(
    query(
      horseDocumentsCollection(normalizedCenterId, normalizedHorseId),
      orderBy("createdAt", "desc")
    )
  );

  return snapshot.docs.map((documentDoc) =>
    mapHorseDocument(
      documentDoc.id,
      documentDoc.data() as FirestoreHorseDocumentDoc,
      normalizedCenterId,
      normalizedHorseId
    )
  );
};

export const deleteHorseDocument = async (
  centerId: string,
  horseId: string,
  documentId: string
): Promise<void> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const normalizedDocumentId = assertId("documentId", documentId);
  const documentRef = doc(
    horseDocumentsCollection(normalizedCenterId, normalizedHorseId),
    normalizedDocumentId
  );
  const snapshot = await getDoc(documentRef);

  if (!snapshot.exists()) return;

  const horseDocument = snapshot.data() as FirestoreHorseDocumentDoc;
  if (horseDocument.storagePath) {
    await deleteObject(ref(storage, horseDocument.storagePath)).catch(() => undefined);
  }

  await deleteDoc(documentRef);
  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const uploadHorsePhoto = async (
  centerId: string,
  horseId: string,
  file: File | Blob
): Promise<string> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  const fileName = `photo-${Date.now()}-${sanitizeFileName("profile-image")}`;
  const storageRef = ref(
    storage,
    `centers/${normalizedCenterId}/horses/${normalizedHorseId}/profile/${fileName}`
  );
  const uploadResult = await uploadBytes(storageRef, file, {
    contentType: file.type || undefined,
  });
  const downloadUrl = await getDownloadURL(uploadResult.ref);

  await updateDoc(horseDocRef(normalizedCenterId, normalizedHorseId), {
    photoUrl: downloadUrl,
    updatedAt: serverTimestamp(),
  });

  await recalculateHorseAlerts(normalizedCenterId, normalizedHorseId);
  return downloadUrl;
};

export const getHorseListItemsByCenter = async (
  centerId: string
): Promise<HorseListItem[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const [horses, membersSnapshot, staysSnapshot] = await Promise.all([
    getHorsesByCenter(normalizedCenterId),
    getDocs(centerMembersCollection(normalizedCenterId)),
    getDocs(query(horseStaysCollection(normalizedCenterId), where("active", "==", true))),
  ]);

  const memberLabelMap = new Map<string, string>();
  membersSnapshot.docs.forEach((memberDoc) => {
    const data = memberDoc.data() as CenterMemberDoc;
    memberLabelMap.set(
      memberDoc.id,
      data.displayName?.trim() || data.email?.trim() || memberDoc.id
    );
  });

  const stayMap = new Map<string, HorseStayDoc>();
  const missingUserIds = new Set<string>();

  staysSnapshot.docs.forEach((stayDoc) => {
    const stay = stayDoc.data() as HorseStayDoc;
    if (stay.horseId) {
      stayMap.set(stay.horseId, stay);
    }
    if (stay.riderUid && !memberLabelMap.has(stay.riderUid)) {
      missingUserIds.add(stay.riderUid);
    }
  });

  horses.forEach((horse) => {
    if (horse.ownerId && !memberLabelMap.has(horse.ownerId)) {
      missingUserIds.add(horse.ownerId);
    }
  });

  const userLabelMap = new Map<string, string>();
  await Promise.all(
    Array.from(missingUserIds).map(async (userId) => {
      const userSnapshot = await getDoc(doc(usersCollection(), userId));
      if (!userSnapshot.exists()) return;
      const user = userSnapshot.data() as UserDoc;
      userLabelMap.set(
        userId,
        user.displayName?.trim() || user.name?.trim() || user.email?.trim() || userId
      );
    })
  );

  const alertSets = await Promise.all(
    horses.map(async (horse) => ({
      horseId: horse.id,
      alerts: await getHorseAlerts(normalizedCenterId, horse.id),
    }))
  );
  const alertMap = new Map(
    alertSets.map((entry) => [entry.horseId, entry.alerts.filter((alert) => alert.isActive)])
  );

  return horses.map((horse) => {
    const stay = stayMap.get(horse.id);
    const ownerId = horse.ownerId ?? stay?.riderUid;
    const ownerLabel =
      (ownerId ? memberLabelMap.get(ownerId) ?? userLabelMap.get(ownerId) : null) ??
      horse.ownerContact?.name?.trim() ??
      "Sin propietario";

    return {
      horse,
      ownerId,
      ownerLabel,
      assignedBox: stay?.assignedStableId?.trim() || horse.stableId || undefined,
      arrivalAt: stay?.startedAt ?? horse.createdAt,
      activeAlerts: alertMap.get(horse.id) ?? [],
    };
  });
};

export const getCenterPersonOptions = async (
  centerId: string
): Promise<CenterPersonOption[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const membersSnapshot = await getDocs(centerMembersCollection(normalizedCenterId));
  const memberIds = membersSnapshot.docs.map((memberDoc) => {
    const data = memberDoc.data() as CenterMemberDoc & { userId?: string; uid?: string; status?: string };
    return data.userId?.trim() || data.uid?.trim() || memberDoc.id;
  });

  const userSnapshots = await Promise.all(
    memberIds.map(async (userId) => ({
      userId,
      snapshot: await getDoc(doc(usersCollection(), userId)),
    }))
  );

  const userLabelMap = new Map<string, string>();
  userSnapshots.forEach(({ userId, snapshot }) => {
    if (!snapshot.exists()) return;
    const data = snapshot.data() as UserDoc & { fullName?: string };
    userLabelMap.set(
      userId,
      data.fullName?.trim() ||
        data.displayName?.trim() ||
        data.name?.trim() ||
        data.email?.trim() ||
        userId
    );
  });

  return membersSnapshot.docs
    .map((memberDoc) => {
      const data = memberDoc.data() as CenterMemberDoc & { userId?: string; uid?: string; status?: string };
      const userId = data.userId?.trim() || data.uid?.trim() || memberDoc.id;
      return {
        id: userId,
        label:
          data.displayName?.trim() ||
          data.email?.trim() ||
          userLabelMap.get(userId) ||
          userId,
      };
    })
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((left, right) => left.label.localeCompare(right.label, "es"));
};

export const recalculateHorseAlerts = async (
  centerId: string,
  horseId: string
): Promise<HorseAlert[]> => {
  const normalizedCenterId = assertId("centerId", centerId);
  const normalizedHorseId = assertId("horseId", horseId);
  await requireHorse(normalizedCenterId, normalizedHorseId);

  const [horseSnapshot, injurySnapshot, medicalSnapshot, documentSnapshot, weightAlert] =
    await Promise.all([
      getDoc(horseDocRef(normalizedCenterId, normalizedHorseId)),
      getDocs(
        query(
          horseInjuriesCollection(normalizedCenterId, normalizedHorseId),
          orderBy("detectedAt", "desc")
        )
      ),
      getDocs(
        query(
          horseMedicalRecordsCollection(normalizedCenterId, normalizedHorseId),
          orderBy("date", "desc")
        )
      ),
      getDocs(
        query(
          horseDocumentsCollection(normalizedCenterId, normalizedHorseId),
          orderBy("createdAt", "desc")
        )
      ),
      buildWeightAlert(normalizedCenterId, normalizedHorseId),
    ]);

  const thresholdMs = daysFromNow(30).toMillis();
  const computedAlerts: FirestoreHorseAlertDoc[] = [];
  const horse = horseSnapshot.data() as FirestoreHorseDoc | undefined;

  injurySnapshot.docs.forEach((injuryDoc) => {
    const injury = injuryDoc.data() as FirestoreInjuryDoc;
    if (injury.status === "ACTIVE" || injury.status === "MONITORING") {
      computedAlerts.push({
        type: "ACTIVE_INJURY",
        severity: injury.severity ?? "MEDIUM",
        title: injury.title,
        description:
          injury.description?.trim() || "Existe una lesion activa o en seguimiento.",
        isActive: true,
        detectedAt: injury.detectedAt,
        dueAt: null,
        sourceId: injuryDoc.id,
        sourceCollection: "injuries",
        metadata: { status: injury.status },
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      });
    }
  });

  medicalSnapshot.docs.forEach((medicalDoc) => {
    const medical = medicalDoc.data() as FirestoreMedicalRecordDoc;
    const reviewAtMs = medical.nextReviewAt?.toMillis();
    if (shouldTrackMedicalAlert(medical) && reviewAtMs && reviewAtMs <= thresholdMs) {
      const type =
        medical.type === "VACCINATION"
          ? "UPCOMING_VACCINATION"
          : medical.type === "DEWORMING"
            ? "UPCOMING_DEWORMING"
            : "UPCOMING_VET_REVIEW";
      const baseDescription =
        medical.type === "VACCINATION"
          ? "Vacuna pendiente o proxima."
          : medical.type === "DEWORMING"
            ? "Desparasitacion pendiente o proxima."
            : "Revision veterinaria pendiente o proxima.";
      computedAlerts.push(
        buildTimedAlert({
          type,
          title: medical.title,
          description: baseDescription,
          dueAt: medical.nextReviewAt!,
          sourceId: medicalDoc.id,
          sourceCollection: "medicalRecords",
          metadata: {
            medicalType: medical.type,
            reviewAt: reviewAtMs,
          },
        })
      );
    }
  });

  const hasVaccinationConfig = medicalSnapshot.docs.some((medicalDoc) => {
    const medical = medicalDoc.data() as FirestoreMedicalRecordDoc;
    return medical.type === "VACCINATION";
  });

  const hasDewormingConfig = medicalSnapshot.docs.some((medicalDoc) => {
    const medical = medicalDoc.data() as FirestoreMedicalRecordDoc;
    return medical.type === "DEWORMING";
  });

  const hasVetReviewConfig = medicalSnapshot.docs.some((medicalDoc) => {
    const medical = medicalDoc.data() as FirestoreMedicalRecordDoc;
    return medical.type === "CHECKUP" || medical.type === "TREATMENT";
  });

  if (!hasVaccinationConfig) {
    computedAlerts.push({
      type: "MISSING_CONFIGURATION",
      severity: "LOW",
      title: "Vacunacion sin configurar",
      description: "No hay una proxima vacuna registrada para este caballo.",
      isActive: true,
      detectedAt: nowTimestamp(),
      dueAt: null,
      sourceId: null,
      sourceCollection: "medicalRecords",
      metadata: { config: "vaccination" },
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    });
  }

  if (!hasDewormingConfig) {
    computedAlerts.push({
      type: "MISSING_CONFIGURATION",
      severity: "LOW",
      title: "Desparasitacion sin configurar",
      description: "No hay una proxima desparasitacion registrada para este caballo.",
      isActive: true,
      detectedAt: nowTimestamp(),
      dueAt: null,
      sourceId: null,
      sourceCollection: "medicalRecords",
      metadata: { config: "deworming" },
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    });
  }

  if (!hasVetReviewConfig) {
    computedAlerts.push({
      type: "MISSING_CONFIGURATION",
      severity: "LOW",
      title: "Revision veterinaria sin configurar",
      description: "No hay una proxima revision veterinaria registrada para este caballo.",
      isActive: true,
      detectedAt: nowTimestamp(),
      dueAt: null,
      sourceId: null,
      sourceCollection: "medicalRecords",
      metadata: { config: "vetReview" },
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    });
  }

  if (horse?.nextFarrierVisitAt) {
    const farrierDueMs = horse.nextFarrierVisitAt.toMillis();
    if (farrierDueMs <= thresholdMs) {
      computedAlerts.push(
        buildTimedAlert({
          type: "UPCOMING_FARRIER",
          title: horse.farrierName?.trim() || "Visita del herrador",
          description: "La proxima visita del herrador requiere seguimiento.",
          dueAt: horse.nextFarrierVisitAt,
          sourceCollection: "horses",
          metadata: {
            farrierName: horse.farrierName ?? null,
          },
        })
      );
    }
  } else {
    computedAlerts.push({
      type: "MISSING_CONFIGURATION",
      severity: "LOW",
      title: "Herrador sin configurar",
      description: "No hay una proxima visita del herrador registrada para este caballo.",
      isActive: true,
      detectedAt: nowTimestamp(),
      dueAt: null,
      sourceId: null,
      sourceCollection: "horses",
      metadata: { config: "farrier" },
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    });
  }

  documentSnapshot.docs.forEach((documentDoc) => {
    const horseDocument = documentDoc.data() as FirestoreHorseDocumentDoc;
    const expiresAtMs = horseDocument.expiresAt?.toMillis();
    if (expiresAtMs && expiresAtMs <= thresholdMs) {
      computedAlerts.push(
        buildTimedAlert({
          type: "DOCUMENT_EXPIRING",
          title: horseDocument.name,
          description: "Documento pendiente de renovacion.",
          dueAt: horseDocument.expiresAt!,
          sourceId: documentDoc.id,
          sourceCollection: "documents",
          metadata: {
            expiresAt: expiresAtMs,
            documentType: horseDocument.type,
          },
        })
      );
    }
  });

  if (weightAlert) {
    computedAlerts.push(weightAlert);
  }

  const alertsCollection = horseAlertsCollection(normalizedCenterId, normalizedHorseId);
  const existingAlerts = await getDocs(alertsCollection);
  const batch = writeBatch(db);

  existingAlerts.docs.forEach((alertDoc) => {
    batch.delete(alertDoc.ref);
  });

  const persistedAlerts: HorseAlert[] = [];

  computedAlerts.forEach((alert) => {
    const alertRef = doc(alertsCollection);
    batch.set(alertRef, {
      ...alert,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    persistedAlerts.push(
      mapHorseAlert(alertRef.id, alert, normalizedCenterId, normalizedHorseId)
    );
  });

  await batch.commit();
  return persistedAlerts;
};

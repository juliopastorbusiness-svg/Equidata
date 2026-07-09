import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirestoreProfessionalRecordDoc } from "@/lib/services/firestoreTypes";
import {
  ProfessionalRecord,
  ProfessionalRecordAttachment,
  ProfessionalRecordMetadata,
  ProfessionalRecordMetadataValue,
  ProfessionalRecordType,
} from "@/lib/services/types";
import { assertCenterId, assertRequiredString } from "@/lib/services/shared";

export type CreateProfessionalRecordInput = {
  horseId: string;
  centerId: string;
  professionalId: string;
  profession: string;
  recordType: ProfessionalRecordType | string;
  title: string;
  description: string;
  date: Timestamp | Date;
  attachments?: ProfessionalRecordAttachment[];
  createdBy: string;
  metadata?: ProfessionalRecordMetadata;
};

export type UpdateProfessionalRecordInput = Partial<{
  professionalId: string;
  profession: string;
  recordType: ProfessionalRecordType | string;
  title: string;
  description: string;
  date: Timestamp | Date;
  attachments: ProfessionalRecordAttachment[];
  metadata: ProfessionalRecordMetadata;
}> & {
  updatedBy: string;
};

const professionalRecordsCollection = (centerId: string, horseId: string) =>
  collection(
    db,
    "centers",
    assertCenterId(centerId),
    "horses",
    assertRequiredString("horseId", horseId),
    "professionalRecords"
  );

const professionalRecordRef = (centerId: string, horseId: string, recordId: string) =>
  doc(
    db,
    "centers",
    assertCenterId(centerId),
    "horses",
    assertRequiredString("horseId", horseId),
    "professionalRecords",
    assertRequiredString("recordId", recordId)
  );

const normalizeTimestamp = (value: Timestamp | Date): Timestamp =>
  value instanceof Timestamp ? value : Timestamp.fromDate(value);

const normalizeAttachments = (
  attachments?: ProfessionalRecordAttachment[]
): ProfessionalRecordAttachment[] => {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .map((attachment) => ({
      name: attachment.name.trim(),
      url: attachment.url.trim(),
      type: attachment.type.trim() || "application/octet-stream",
      size: Number.isFinite(attachment.size) ? attachment.size : 0,
      uploadedAt: attachment.uploadedAt,
    }))
    .filter((attachment) => attachment.name && attachment.url);
};

const normalizeMetadataValue = (
  value: ProfessionalRecordMetadataValue | undefined
): ProfessionalRecordMetadataValue | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Timestamp) return value;

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeMetadataValue(item))
      .filter((item): item is ProfessionalRecordMetadataValue => item !== undefined);
  }

  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, normalizeMetadataValue(item)] as const)
      .filter(([, item]) => item !== undefined);

    return Object.fromEntries(entries) as ProfessionalRecordMetadataValue;
  }

  return value;
};

const normalizeMetadata = (
  metadata?: ProfessionalRecordMetadata
): ProfessionalRecordMetadata => {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata)
      .map(([key, value]) => [key.trim(), normalizeMetadataValue(value)] as const)
      .filter(
        ([key, value]) =>
          key.length > 0 && value !== undefined
      )
  ) as ProfessionalRecordMetadata;
};

const mapProfessionalRecord = (
  id: string,
  data: FirestoreProfessionalRecordDoc
): ProfessionalRecord => ({
  id,
  horseId: data.horseId,
  centerId: data.centerId,
  professionalId: data.professionalId,
  profession: data.profession,
  recordType: data.recordType,
  title: data.title,
  description: data.description,
  date: data.date,
  attachments: normalizeAttachments(data.attachments ?? []),
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
  createdBy: data.createdBy,
  updatedBy: data.updatedBy ?? undefined,
  metadata: normalizeMetadata(data.metadata ?? {}),
});

export const createRecord = async (
  input: CreateProfessionalRecordInput
): Promise<string> => {
  const centerId = assertCenterId(input.centerId);
  const horseId = assertRequiredString("horseId", input.horseId);
  const professionalId = assertRequiredString("professionalId", input.professionalId);
  const createdBy = assertRequiredString("createdBy", input.createdBy);
  const profession = assertRequiredString("profession", input.profession);
  const recordType = assertRequiredString("recordType", input.recordType);
  const title = assertRequiredString("title", input.title);
  const description = input.description.trim();

  const docRef = await addDoc(professionalRecordsCollection(centerId, horseId), {
    horseId,
    centerId,
    professionalId,
    profession,
    recordType,
    title,
    description,
    date: normalizeTimestamp(input.date),
    attachments: normalizeAttachments(input.attachments),
    createdBy,
    updatedBy: null,
    metadata: normalizeMetadata(input.metadata),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const updateRecord = async (
  centerId: string,
  horseId: string,
  recordId: string,
  input: UpdateProfessionalRecordInput
): Promise<void> => {
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  patch.updatedBy = assertRequiredString("updatedBy", input.updatedBy);

  if (typeof input.professionalId === "string") {
    patch.professionalId = assertRequiredString("professionalId", input.professionalId);
  }
  if (typeof input.profession === "string") {
    patch.profession = assertRequiredString("profession", input.profession);
  }
  if (typeof input.recordType === "string") {
    patch.recordType = assertRequiredString("recordType", input.recordType);
  }
  if (typeof input.title === "string") {
    patch.title = assertRequiredString("title", input.title);
  }
  if (typeof input.description === "string") {
    patch.description = input.description.trim();
  }
  if (input.date) {
    patch.date = normalizeTimestamp(input.date);
  }
  if (input.attachments) {
    patch.attachments = normalizeAttachments(input.attachments);
  }
  if (input.metadata) {
    patch.metadata = normalizeMetadata(input.metadata);
  }

  await updateDoc(professionalRecordRef(centerId, horseId, recordId), patch);
};

export const deleteRecord = async (
  centerId: string,
  horseId: string,
  recordId: string
): Promise<void> => {
  await deleteDoc(professionalRecordRef(centerId, horseId, recordId));
};

export const getHorseRecords = async (
  centerId: string,
  horseId: string
): Promise<ProfessionalRecord[]> => {
  const snapshot = await getDocs(
    query(professionalRecordsCollection(centerId, horseId), orderBy("date", "desc"))
  );

  return snapshot.docs.map((recordDoc) =>
    mapProfessionalRecord(
      recordDoc.id,
      recordDoc.data() as FirestoreProfessionalRecordDoc
    )
  );
};

export const getRecord = async (
  centerId: string,
  horseId: string,
  recordId: string
): Promise<ProfessionalRecord | null> => {
  const snapshot = await getDoc(professionalRecordRef(centerId, horseId, recordId));
  if (!snapshot.exists()) return null;

  return mapProfessionalRecord(
    snapshot.id,
    snapshot.data() as FirestoreProfessionalRecordDoc
  );
};

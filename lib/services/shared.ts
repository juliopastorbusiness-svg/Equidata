import {
  Timestamp,
  collection,
  doc,
  serverTimestamp,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AuditFields = {
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export const assertCenterId = (centerId: string): string => {
  const normalized = centerId.trim();
  if (!normalized) {
    throw new Error("centerId es obligatorio.");
  }
  return normalized;
};

export const assertRequiredString = (label: string, value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} es obligatorio.`);
  }
  return normalized;
};

export const optionalStringOrNull = (value?: string | null): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

export const optionalStringArray = (value?: string[] | null): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item.trim()).filter(Boolean);
};

export const optionalNumberOrNull = (value?: number | null): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

export const optionalTimestampOrNull = (
  value?: Date | Timestamp | null
): Timestamp | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  return Timestamp.fromDate(value);
};

export const ensureNonNegativeNumber = (label: string, value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} debe ser un numero mayor o igual que 0.`);
  }
  return value;
};

export const ensurePositiveNumber = (label: string, value: number): number => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} debe ser un numero mayor que 0.`);
  }
  return value;
};

export const withCreateAudit = () => ({
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

export const withUpdateAudit = () => ({
  updatedAt: serverTimestamp(),
});

export const centerCollection = <T extends DocumentData = DocumentData>(
  centerId: string,
  collectionName: string
): CollectionReference<T> =>
  collection(db, "centers", assertCenterId(centerId), collectionName) as CollectionReference<T>;

export const centerDocument = <T extends DocumentData = DocumentData>(
  centerId: string,
  collectionName: string,
  docId: string
): DocumentReference<T> =>
  doc(db, "centers", assertCenterId(centerId), collectionName, docId) as DocumentReference<T>;

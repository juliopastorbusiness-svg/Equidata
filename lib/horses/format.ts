import { Timestamp } from "firebase/firestore";

export const timestampToDateInput = (value?: Timestamp | null): string => {
  if (!value) return "";
  const date = value.toDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const dateInputToDate = (value?: string): Date | null => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
};

export const formatDate = (value?: Timestamp | null): string => {
  if (!value) return "Sin fecha";
  return value.toDate().toLocaleDateString("es-ES");
};

export const formatDateTime = (value?: Timestamp | null): string => {
  if (!value) return "Sin fecha";
  return value.toDate().toLocaleString("es-ES");
};

export const formatWeight = (value?: number | null): string => {
  if (typeof value !== "number") return "Sin dato";
  return `${value.toFixed(1)} kg`;
};

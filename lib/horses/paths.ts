import { collection, doc } from "firebase/firestore";
import { ref } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export const centerHorseCollection = (centerId: string) =>
  collection(db, "centers", centerId, "horses");

export const horseDocRef = (centerId: string, horseId: string) =>
  doc(db, "centers", centerId, "horses", horseId);

export const horseMedicalRecordsCollection = (centerId: string, horseId: string) =>
  collection(db, "centers", centerId, "horses", horseId, "medicalRecords");

export const horseWeightHistoryCollection = (centerId: string, horseId: string) =>
  collection(db, "centers", centerId, "horses", horseId, "weightHistory");

export const horseInjuriesCollection = (centerId: string, horseId: string) =>
  collection(db, "centers", centerId, "horses", horseId, "injuries");

export const horseDocumentsCollection = (centerId: string, horseId: string) =>
  collection(db, "centers", centerId, "horses", horseId, "documents");

export const horseAlertsCollection = (centerId: string, horseId: string) =>
  collection(db, "centers", centerId, "horses", horseId, "alerts");

export const horseDocumentStorageRef = (
  centerId: string,
  horseId: string,
  fileName: string
) => ref(storage, `centers/${centerId}/horses/${horseId}/documents/${fileName}`);

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type CenterDoc = {
  id: string;
  name?: string;
  stablesCapacity?: number;
};

export type HorseStay = {
  id: string;
  horseId: string;
  riderUid: string;
  active: boolean;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  assignedStableId?: string;
  createdAt?: Timestamp;
};

export type CreateHorseStayPayload = {
  horseId: string;
  riderUid: string;
  assignedStableId?: string;
};

export type BillingService = {
  id: string;
  riderUid: string;
  horseId: string;
  name: string;
  amount: number;
  billingCycle: "MONTHLY";
  dueDay: number;
  active: boolean;
  createdAt?: Timestamp;
};

const getCenterRef = (centerId: string) => doc(db, "centers", centerId);
const horseStaysCollection = (centerId: string) =>
  collection(db, "centers", centerId, "horseStays");
const billingServicesCollection = (centerId: string) =>
  collection(db, "centers", centerId, "billingServices");

export const getCenter = async (centerId: string): Promise<CenterDoc | null> => {
  const snap = await getDoc(getCenterRef(centerId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<CenterDoc, "id">) };
};

export const updateCenterCapacity = async (
  centerId: string,
  stablesCapacity: number
): Promise<void> => {
  const parsed = Number(stablesCapacity);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("La capacidad debe ser un numero mayor o igual que 0.");
  }
  await updateDoc(getCenterRef(centerId), { stablesCapacity: parsed });
};

export const listActiveHorseStays = (
  centerId: string,
  onChange: (stays: HorseStay[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(horseStaysCollection(centerId), where("active", "==", true));
  return onSnapshot(
    q,
    (snap) => {
      const stays: HorseStay[] = snap.docs
        .map((stayDoc) => ({
          id: stayDoc.id,
          ...(stayDoc.data() as Omit<HorseStay, "id">),
        }))
        .sort((a, b) => {
          const aMs = a.startedAt?.toMillis() ?? 0;
          const bMs = b.startedAt?.toMillis() ?? 0;
          return bMs - aMs;
        });
      onChange(stays);
    },
    (error) => onError?.(error)
  );
};

export const createHorseStay = async (
  centerId: string,
  payload: CreateHorseStayPayload
): Promise<void> => {
  const horseId = payload.horseId.trim();
  const riderUid = payload.riderUid.trim();
  const assignedStableId = payload.assignedStableId?.trim();

  if (!horseId || !riderUid) {
    throw new Error("horseId y riderUid son obligatorios.");
  }

  const center = await getCenter(centerId);
  if (!center) {
    throw new Error("El centro no existe.");
  }

  const capacity = center.stablesCapacity ?? 0;
  const activeSnap = await getDocs(
    query(horseStaysCollection(centerId), where("active", "==", true))
  );
  if (activeSnap.size >= capacity) {
    throw new Error("No hay capacidad disponible en cuadras.");
  }

  await addDoc(horseStaysCollection(centerId), {
    horseId,
    riderUid,
    active: true,
    startedAt: serverTimestamp(),
    assignedStableId: assignedStableId || null,
    createdAt: serverTimestamp(),
  });
};

export const listBillingServicesByHorse = async (
  centerId: string,
  horseId: string
): Promise<BillingService[]> => {
  const q = query(
    billingServicesCollection(centerId),
    where("horseId", "==", horseId),
    where("active", "==", true)
  );

  const snap = await getDocs(q);
  return snap.docs.map((serviceDoc) => ({
    id: serviceDoc.id,
    ...(serviceDoc.data() as Omit<BillingService, "id">),
  }));
};

import {
  addDoc,
  collection,
  deleteDoc,
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

export type Arena = {
  id: string;
  name: string;
  type?: string;
  surface?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: Timestamp;
};

export type ArenaTimeSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxHorses: number;
  isActive: boolean;
  createdAt?: Timestamp;
};

export type ArenaBookingRole = "RIDER" | "PRO";
export type ArenaBookingStatus = "ACTIVE" | "CANCELLED";

export type ArenaBooking = {
  id: string;
  arenaId: string;
  date: string;
  slotId: string;
  startTime: string;
  endTime: string;
  horseId: string;
  riderUid: string;
  bookedByUid: string;
  bookedByRole: ArenaBookingRole;
  status: ArenaBookingStatus;
  createdAt?: Timestamp;
};

export type CreateArenaPayload = {
  name: string;
  type?: string;
  surface?: string;
  notes?: string;
  isActive: boolean;
};

export type CreateArenaSlotPayload = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxHorses: number;
  isActive: boolean;
};

export type CreateArenaBookingPayload = {
  arenaId: string;
  date: string;
  slotId: string;
  startTime: string;
  endTime: string;
  horseId: string;
  riderUid: string;
  bookedByUid: string;
  bookedByRole: ArenaBookingRole;
};

const isValidIsoDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidTime = (value: string): boolean =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const ensureSlotPayload = (payload: CreateArenaSlotPayload) => {
  if (!Number.isInteger(payload.dayOfWeek) || payload.dayOfWeek < 0 || payload.dayOfWeek > 6) {
    throw new Error("dayOfWeek debe estar entre 0 y 6.");
  }
  if (!isValidTime(payload.startTime) || !isValidTime(payload.endTime)) {
    throw new Error("startTime y endTime deben estar en formato HH:MM.");
  }
  if (toMinutes(payload.startTime) >= toMinutes(payload.endTime)) {
    throw new Error("startTime debe ser menor que endTime.");
  }
  if (!Number.isFinite(payload.maxHorses) || payload.maxHorses < 1) {
    throw new Error("maxHorses debe ser mayor o igual que 1.");
  }
};

const arenasCollection = (centerId: string) =>
  collection(db, "centers", centerId, "arenas");

const arenaSlotsCollection = (centerId: string, arenaId: string) =>
  collection(db, "centers", centerId, "arenas", arenaId, "timeSlots");

const arenaBookingsCollection = (centerId: string) =>
  collection(db, "centers", centerId, "arenaBookings");

export const listArenas = (
  centerId: string,
  onChange: (arenas: Arena[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  return onSnapshot(
    arenasCollection(centerId),
    (snap) => {
      const arenas = snap.docs
        .map((arenaDoc) => ({
          id: arenaDoc.id,
          ...(arenaDoc.data() as Omit<Arena, "id">),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      onChange(arenas);
    },
    (error) => onError?.(error)
  );
};

export const createArena = async (
  centerId: string,
  payload: CreateArenaPayload
): Promise<void> => {
  const name = payload.name.trim();
  if (name.length < 2) {
    throw new Error("El nombre de la pista debe tener al menos 2 caracteres.");
  }

  await addDoc(arenasCollection(centerId), {
    ...payload,
    name,
    type: payload.type?.trim() || null,
    surface: payload.surface?.trim() || null,
    notes: payload.notes?.trim() || null,
    createdAt: serverTimestamp(),
  });
};

export const updateArena = async (
  centerId: string,
  arenaId: string,
  patch: Partial<CreateArenaPayload>
): Promise<void> => {
  const nextPatch: Record<string, unknown> = {};

  if (typeof patch.name === "string") {
    const name = patch.name.trim();
    if (name.length < 2) {
      throw new Error("El nombre de la pista debe tener al menos 2 caracteres.");
    }
    nextPatch.name = name;
  }
  if (typeof patch.type === "string") nextPatch.type = patch.type.trim() || null;
  if (typeof patch.surface === "string") nextPatch.surface = patch.surface.trim() || null;
  if (typeof patch.notes === "string") nextPatch.notes = patch.notes.trim() || null;
  if (typeof patch.isActive === "boolean") nextPatch.isActive = patch.isActive;

  await updateDoc(doc(db, "centers", centerId, "arenas", arenaId), nextPatch);
};

export const deleteArena = async (centerId: string, arenaId: string): Promise<void> => {
  await deleteDoc(doc(db, "centers", centerId, "arenas", arenaId));
};

export const listArenaSlots = (
  centerId: string,
  arenaId: string,
  onChange: (slots: ArenaTimeSlot[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  return onSnapshot(
    arenaSlotsCollection(centerId, arenaId),
    (snap) => {
      const slots = snap.docs
        .map((slotDoc) => ({
          id: slotDoc.id,
          ...(slotDoc.data() as Omit<ArenaTimeSlot, "id">),
        }))
        .sort((a, b) => {
          if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
          return a.startTime.localeCompare(b.startTime);
        });
      onChange(slots);
    },
    (error) => onError?.(error)
  );
};

export const createArenaSlot = async (
  centerId: string,
  arenaId: string,
  payload: CreateArenaSlotPayload
): Promise<void> => {
  ensureSlotPayload(payload);

  await addDoc(arenaSlotsCollection(centerId, arenaId), {
    ...payload,
    createdAt: serverTimestamp(),
  });
};

export const updateArenaSlot = async (
  centerId: string,
  arenaId: string,
  slotId: string,
  patch: Partial<CreateArenaSlotPayload>
): Promise<void> => {
  const slotRef = doc(db, "centers", centerId, "arenas", arenaId, "timeSlots", slotId);
  const slotSnap = await getDoc(slotRef);
  if (!slotSnap.exists()) {
    throw new Error("El slot no existe.");
  }

  const current = slotSnap.data() as Omit<ArenaTimeSlot, "id">;
  const merged: CreateArenaSlotPayload = {
    dayOfWeek: patch.dayOfWeek ?? current.dayOfWeek,
    startTime: patch.startTime ?? current.startTime,
    endTime: patch.endTime ?? current.endTime,
    maxHorses: patch.maxHorses ?? current.maxHorses,
    isActive: patch.isActive ?? current.isActive,
  };
  ensureSlotPayload(merged);

  await updateDoc(slotRef, patch);
};

export const deleteArenaSlot = async (
  centerId: string,
  arenaId: string,
  slotId: string
): Promise<void> => {
  await deleteDoc(doc(db, "centers", centerId, "arenas", arenaId, "timeSlots", slotId));
};

export const listArenaBookingsByDate = (
  centerId: string,
  date: string,
  onChange: (bookings: ArenaBooking[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(arenaBookingsCollection(centerId), where("date", "==", date));

  return onSnapshot(
    q,
    (snap) => {
      const bookings = snap.docs
        .map((bookingDoc) => ({
          id: bookingDoc.id,
          ...(bookingDoc.data() as Omit<ArenaBooking, "id">),
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      onChange(bookings);
    },
    (error) => onError?.(error)
  );
};

export const createBooking = async (
  centerId: string,
  payload: CreateArenaBookingPayload
): Promise<void> => {
  if (!isValidIsoDate(payload.date)) {
    throw new Error("La fecha debe tener formato YYYY-MM-DD.");
  }
  if (!isValidTime(payload.startTime) || !isValidTime(payload.endTime)) {
    throw new Error("Las horas deben tener formato HH:MM.");
  }
  if (toMinutes(payload.startTime) >= toMinutes(payload.endTime)) {
    throw new Error("La hora de inicio debe ser menor que la hora de fin.");
  }

  const slotRef = doc(
    db,
    "centers",
    centerId,
    "arenas",
    payload.arenaId,
    "timeSlots",
    payload.slotId
  );
  const slotSnap = await getDoc(slotRef);
  if (!slotSnap.exists()) {
    throw new Error("El timeSlot no existe.");
  }
  const slot = slotSnap.data() as Omit<ArenaTimeSlot, "id">;
  if (!slot.isActive) {
    throw new Error("El timeSlot seleccionado no esta activo.");
  }

  const sameDaySnap = await getDocs(
    query(arenaBookingsCollection(centerId), where("date", "==", payload.date))
  );
  const activeCount = sameDaySnap.docs.filter((docSnap) => {
    const booking = docSnap.data() as Omit<ArenaBooking, "id">;
    return (
      booking.status === "ACTIVE" &&
      booking.arenaId === payload.arenaId &&
      booking.slotId === payload.slotId
    );
  }).length;

  if (activeCount >= slot.maxHorses) {
    throw new Error("No hay cupo disponible para esta pista/fecha/slot.");
  }

  await addDoc(arenaBookingsCollection(centerId), {
    ...payload,
    status: "ACTIVE" as ArenaBookingStatus,
    createdAt: serverTimestamp(),
  });
};

export const updateBooking = async (
  centerId: string,
  bookingId: string,
  patch: Partial<ArenaBooking>
): Promise<void> => {
  await updateDoc(doc(db, "centers", centerId, "arenaBookings", bookingId), patch);
};

export const deleteBooking = async (
  centerId: string,
  bookingId: string
): Promise<void> => {
  await deleteDoc(doc(db, "centers", centerId, "arenaBookings", bookingId));
};

export const cancelBooking = async (
  centerId: string,
  bookingId: string
): Promise<void> => {
  await updateDoc(doc(db, "centers", centerId, "arenaBookings", bookingId), {
    status: "CANCELLED" as ArenaBookingStatus,
  });
};

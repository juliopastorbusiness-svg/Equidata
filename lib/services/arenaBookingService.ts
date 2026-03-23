import {
  Timestamp,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  QueryConstraint,
  updateDoc,
  where,
} from "firebase/firestore";
import { mapArenaBooking } from "@/lib/services/mappers";
import { centerCollection, centerDocument, withCreateAudit, withUpdateAudit } from "@/lib/services/shared";
import { FirestoreArenaBookingDoc } from "@/lib/services/firestoreTypes";
import { ArenaBooking, Class } from "@/lib/services/types";

export type GetArenaBookingsFilters = {
  arenaId?: string;
  sourceType?: ArenaBooking["sourceType"];
  sourceId?: string;
  status?: ArenaBooking["status"];
  startAtFrom?: Date | Timestamp;
  startAtTo?: Date | Timestamp;
};

const arenaBookingsCollection = (centerId: string) =>
  centerCollection<FirestoreArenaBookingDoc>(centerId, "arenaBookings");
const arenaBookingDoc = (centerId: string, bookingId: string) =>
  centerDocument<FirestoreArenaBookingDoc>(centerId, "arenaBookings", bookingId);

export const getClassArenaBookingId = (classId: string) => `class_${classId}`;

const hasOverlap = (
  leftStartAt: Timestamp,
  leftEndAt: Timestamp,
  rightStartAt: Timestamp,
  rightEndAt: Timestamp
) => leftStartAt.toMillis() < rightEndAt.toMillis() && rightStartAt.toMillis() < leftEndAt.toMillis();

export const getArenaBookings = async (
  centerId: string,
  filters: GetArenaBookingsFilters = {}
): Promise<ArenaBooking[]> => {
  const constraints: QueryConstraint[] = [];
  if (filters.arenaId) constraints.push(where("arenaId", "==", filters.arenaId));
  if (filters.sourceType) constraints.push(where("sourceType", "==", filters.sourceType));
  if (filters.sourceId) constraints.push(where("sourceId", "==", filters.sourceId));

  const snapshot = await getDocs(
    query(arenaBookingsCollection(centerId), ...constraints, orderBy("startAt", "asc"))
  );

  return snapshot.docs
    .map((row) => mapArenaBooking(row.id, row.data(), centerId))
    .filter((item) => (filters.status ? item.status === filters.status : true))
    .filter((item) => {
      if (!filters.startAtFrom) return true;
      const startAtFrom =
        filters.startAtFrom instanceof Timestamp
          ? filters.startAtFrom.toMillis()
          : filters.startAtFrom.getTime();
      return item.endAt.toMillis() >= startAtFrom;
    })
    .filter((item) => {
      if (!filters.startAtTo) return true;
      const startAtTo =
        filters.startAtTo instanceof Timestamp
          ? filters.startAtTo.toMillis()
          : filters.startAtTo.getTime();
      return item.startAt.toMillis() <= startAtTo;
    });
};

export const getArenaBookingById = async (
  centerId: string,
  bookingId: string
): Promise<ArenaBooking | null> => {
  const snapshot = await getDoc(arenaBookingDoc(centerId, bookingId));
  if (!snapshot.exists()) return null;
  return mapArenaBooking(snapshot.id, snapshot.data(), centerId);
};

export const checkArenaAvailability = async (
  centerId: string,
  arenaId: string,
  startAt: Date | Timestamp,
  endAt: Date | Timestamp,
  excludeBookingId?: string
): Promise<void> => {
  const startAtTs = startAt instanceof Timestamp ? startAt : Timestamp.fromDate(startAt);
  const endAtTs = endAt instanceof Timestamp ? endAt : Timestamp.fromDate(endAt);

  const bookings = await getArenaBookings(centerId, { arenaId });
  const conflict = bookings.find((booking) => {
    if (excludeBookingId && booking.id === excludeBookingId) return false;
    if (booking.status !== "active") return false;
    return hasOverlap(booking.startAt, booking.endAt, startAtTs, endAtTs);
  });

  if (conflict) {
    throw new Error("La pista ya esta ocupada en ese tramo.");
  }
};

const toArenaBookingDoc = (classData: Class, classId: string): FirestoreArenaBookingDoc => ({
  arenaId: classData.arenaId ?? "",
  sourceType: "class",
  sourceId: classId,
  title: classData.title,
  startAt: classData.startAt,
  endAt: classData.endAt,
  status:
    classData.status === "cancelled"
      ? "cancelled"
      : classData.status === "completed"
        ? "completed"
        : "active",
  createdBy: classData.createdBy,
});

export const createArenaBookingFromClass = async (
  centerId: string,
  classData: Class,
  classId: string
): Promise<string | null> => {
  if (!classData.arenaId) return null;

  const bookingId = getClassArenaBookingId(classId);
  await checkArenaAvailability(centerId, classData.arenaId, classData.startAt, classData.endAt, bookingId);

  await setDoc(arenaBookingDoc(centerId, bookingId), {
    ...toArenaBookingDoc(classData, classId),
    ...withCreateAudit(),
  });

  return bookingId;
};

export const updateArenaBookingFromClass = async (
  centerId: string,
  classData: Class,
  classId: string
): Promise<string | null> => {
  const bookingId = getClassArenaBookingId(classId);
  const existing = await getArenaBookingById(centerId, bookingId);

  if (!classData.arenaId) {
    if (existing) {
      await deleteDoc(arenaBookingDoc(centerId, bookingId));
    }
    return null;
  }

  await checkArenaAvailability(centerId, classData.arenaId, classData.startAt, classData.endAt, bookingId);

  if (!existing) {
    await setDoc(arenaBookingDoc(centerId, bookingId), {
      ...toArenaBookingDoc(classData, classId),
      ...withCreateAudit(),
    });
    return bookingId;
  }

  await updateDoc(arenaBookingDoc(centerId, bookingId), {
    ...toArenaBookingDoc(classData, classId),
    ...withUpdateAudit(),
  });

  return bookingId;
};

export const cancelArenaBooking = async (centerId: string, bookingId: string): Promise<void> => {
  await updateDoc(arenaBookingDoc(centerId, bookingId), {
    status: "cancelled",
    ...withUpdateAudit(),
  });
};

export const deleteArenaBooking = async (centerId: string, bookingId: string): Promise<void> => {
  await deleteDoc(arenaBookingDoc(centerId, bookingId));
};

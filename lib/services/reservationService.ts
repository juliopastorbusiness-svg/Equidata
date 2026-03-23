import {
  Timestamp,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapClass, mapClassReservation } from "@/lib/services/mappers";
import {
  FirestoreCenterMemberDoc,
  FirestoreClassDoc,
  FirestoreClassReservationDoc,
} from "@/lib/services/firestoreTypes";
import { Class, ClassReservation } from "@/lib/services/types";
import { centerCollection, centerDocument, withUpdateAudit } from "@/lib/services/shared";

const reservationsCollection = (centerId: string) =>
  centerCollection<FirestoreClassReservationDoc>(centerId, "classReservations");
const reservationDoc = (centerId: string, reservationId: string) =>
  centerDocument<FirestoreClassReservationDoc>(centerId, "classReservations", reservationId);
const classDoc = (centerId: string, classId: string) =>
  centerDocument<FirestoreClassDoc>(centerId, "classes", classId);
const memberDoc = (centerId: string, userId: string) =>
  centerDocument<FirestoreCenterMemberDoc>(centerId, "members", userId);

const isBlockingReservationStatus = (status: ClassReservation["status"]) =>
  status === "pending" ||
  status === "confirmed" ||
  status === "RESERVED" ||
  status === "CONFIRMED";

const normalizePublishedStatus = (availableSpots: number): Class["status"] =>
  availableSpots <= 0 ? "full" : "published";

const buildReservationId = (classId: string, riderId: string) => `${classId}__${riderId}`;

export const getReservationsByRider = async (
  centerId: string,
  riderId: string
): Promise<ClassReservation[]> => {
  const [byRiderSnap, byStudentSnap] = await Promise.all([
    getDocs(query(reservationsCollection(centerId), where("riderId", "==", riderId), orderBy("reservedAt", "desc"))),
    getDocs(query(reservationsCollection(centerId), where("studentId", "==", riderId), orderBy("reservationDate", "desc"))),
  ]);

  const seen = new Set<string>();
  return [...byRiderSnap.docs, ...byStudentSnap.docs]
    .filter((row) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    })
    .map((row) => mapClassReservation(row.id, row.data(), centerId));
};

export const getReservationsByCenter = async (
  centerId: string
): Promise<ClassReservation[]> => {
  const snapshot = await getDocs(query(reservationsCollection(centerId), orderBy("reservedAt", "desc")));
  return snapshot.docs.map((row) => mapClassReservation(row.id, row.data(), centerId));
};

export const getReservationsByClass = async (
  centerId: string,
  classId: string
): Promise<ClassReservation[]> => {
  const snapshot = await getDocs(
    query(reservationsCollection(centerId), where("classId", "==", classId), orderBy("reservedAt", "desc"))
  );
  return snapshot.docs.map((row) => mapClassReservation(row.id, row.data(), centerId));
};

export const createClassReservation = async (
  centerId: string,
  classId: string,
  riderId: string
): Promise<ClassReservation> => reserveClassSpot(centerId, classId, riderId);

export const reserveClassSpot = async (
  centerId: string,
  classId: string,
  riderId: string
): Promise<ClassReservation> => {
  const existingReservations = await getReservationsByRider(centerId, riderId);
  if (
    existingReservations.some(
      (reservation) =>
        reservation.classId === classId && isBlockingReservationStatus(reservation.status)
    )
  ) {
    throw new Error("El rider ya tiene una reserva para esta clase.");
  }

  const reservationId = buildReservationId(classId, riderId);
  const result = await runTransaction(db, async (transaction) => {
    const [memberSnapshot, classSnapshot, reservationSnapshot] = await Promise.all([
      transaction.get(memberDoc(centerId, riderId)),
      transaction.get(classDoc(centerId, classId)),
      transaction.get(reservationDoc(centerId, reservationId)),
    ]);

    if (!memberSnapshot.exists()) {
      throw new Error("El rider no pertenece a este centro.");
    }

    const memberData = memberSnapshot.data();
    if (memberData.status !== "active") {
      throw new Error("El rider no tiene una membresia activa en este centro.");
    }

    if (!classSnapshot.exists()) {
      throw new Error("La clase no existe.");
    }

    if (reservationSnapshot.exists()) {
      const current = mapClassReservation(reservationSnapshot.id, reservationSnapshot.data(), centerId);
      if (isBlockingReservationStatus(current.status)) {
        throw new Error("El rider ya tiene una reserva para esta clase.");
      }
    }

    const classItem = mapClass(classSnapshot.id, classSnapshot.data(), centerId);
    if (classItem.status === "cancelled") {
      throw new Error("La clase esta cancelada.");
    }
    if (classItem.status !== "published") {
      throw new Error("La clase no esta disponible para reservas.");
    }
    if (classItem.availableSpots <= 0) {
      throw new Error("La clase ya no tiene plazas disponibles.");
    }

    const nextAvailableSpots = classItem.availableSpots - 1;
    const reservedAt = Timestamp.now();

    transaction.set(reservationDoc(centerId, reservationId), {
      classId,
      riderId,
      studentId: riderId,
      status: "confirmed",
      reservedAt,
      reservationDate: reservedAt,
      notes: null,
      paymentStatus: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(classDoc(centerId, classId), {
      availableSpots: nextAvailableSpots,
      status: normalizePublishedStatus(nextAvailableSpots),
      updatedAt: serverTimestamp(),
    });

    return {
      reservationId,
      reservedAt,
    };
  });

  const nextSnap = await getDoc(reservationDoc(centerId, result.reservationId));
  if (!nextSnap.exists()) {
    throw new Error("No se pudo confirmar la reserva.");
  }
  return mapClassReservation(nextSnap.id, nextSnap.data(), centerId);
};

export const cancelClassReservation = async (
  centerId: string,
  reservationId: string
): Promise<ClassReservation> => {
  await runTransaction(db, async (transaction) => {
    const reservationSnap = await transaction.get(reservationDoc(centerId, reservationId));
    if (!reservationSnap.exists()) {
      throw new Error("La reserva no existe.");
    }

    const reservation = mapClassReservation(reservationSnap.id, reservationSnap.data(), centerId);
    if (!isBlockingReservationStatus(reservation.status)) {
      throw new Error("La reserva no se puede cancelar en su estado actual.");
    }

    const classSnap = await transaction.get(classDoc(centerId, reservation.classId));
    if (!classSnap.exists()) {
      throw new Error("La clase asociada ya no existe.");
    }

    const classItem = mapClass(classSnap.id, classSnap.data(), centerId);
    const nextAvailableSpots = Math.min(classItem.availableSpots + 1, classItem.capacity);

    transaction.update(reservationDoc(centerId, reservationId), {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });

    transaction.update(classDoc(centerId, reservation.classId), {
      availableSpots: nextAvailableSpots,
      status:
        classItem.status === "cancelled" || classItem.status === "completed"
          ? classItem.status
          : normalizePublishedStatus(nextAvailableSpots),
      updatedAt: serverTimestamp(),
    });
  });

  const nextSnap = await getDoc(reservationDoc(centerId, reservationId));
  if (!nextSnap.exists()) {
    throw new Error("No se pudo recuperar la reserva cancelada.");
  }
  return mapClassReservation(nextSnap.id, nextSnap.data(), centerId);
};

export const syncClassAvailableSpotsFromReservations = async (
  centerId: string,
  classId: string
): Promise<void> => {
  const [classSnap, reservations] = await Promise.all([
    getDoc(classDoc(centerId, classId)),
    getReservationsByClass(centerId, classId),
  ]);

  if (!classSnap.exists()) return;

  const classItem = mapClass(classSnap.id, classSnap.data(), centerId);
  const occupied = reservations.filter((reservation) => isBlockingReservationStatus(reservation.status)).length;
  const availableSpots = Math.max(classItem.capacity - occupied, 0);

  await updateDoc(classDoc(centerId, classId), {
    availableSpots,
    status:
      classItem.status === "cancelled" || classItem.status === "completed"
        ? classItem.status
        : normalizePublishedStatus(availableSpots),
    ...withUpdateAudit(),
  });
};

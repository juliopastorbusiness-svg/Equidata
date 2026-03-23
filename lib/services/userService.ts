import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapCenter, mapUserProfile } from "@/lib/services/mappers";
import { FirestoreCenterDoc, FirestoreUserProfileDoc } from "@/lib/services/firestoreTypes";
import { Center, UserProfile } from "@/lib/services/types";
import { getUserCenterMemberships } from "@/lib/services/memberService";

export const getUserById = async (userId: string): Promise<UserProfile | null> => {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return mapUserProfile(snap.id, snap.data() as FirestoreUserProfileDoc);
};

export const getUserCenters = async (userId: string): Promise<Center[]> => {
  const memberships = await getUserCenterMemberships(userId);
  const activeMemberships = memberships.filter((membership) => membership.status === "active");

  const centers = await Promise.all(
    activeMemberships.map(async (membership) => {
      const snap = await getDoc(doc(db, "centers", membership.centerId));
      if (!snap.exists()) return null;
      return mapCenter(snap.id, snap.data() as FirestoreCenterDoc);
    })
  );

  return centers
    .filter((item): item is Center => Boolean(item))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
};

export const syncUserLinkedCenters = async (
  userId: string,
  centerId: string,
  operation: "add" | "remove"
) => {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    linkedCenters: operation === "add" ? arrayUnion(centerId) : arrayRemove(centerId),
    updatedAt: serverTimestamp(),
  });
};

export const setActiveCenter = async (userId: string, centerId: string): Promise<void> => {
  const [userSnap, centerSnap] = await Promise.all([
    getDoc(doc(db, "users", userId)),
    getDoc(doc(db, "centers", centerId)),
  ]);

  if (!userSnap.exists()) {
    throw new Error("El usuario no existe.");
  }

  if (!centerSnap.exists()) {
    throw new Error("El centro no existe.");
  }

  const memberships = await getUserCenterMemberships(userId);
  const hasActiveMembership = memberships.some(
    (membership) => membership.centerId === centerId && membership.status === "active"
  );

  const userProfile = mapUserProfile(userSnap.id, userSnap.data() as FirestoreUserProfileDoc);
  const isCenterOwner = centerSnap.data()?.ownerId === userId || centerSnap.data()?.ownerUid === userId;
  const hasLinkedCenter = userProfile.linkedCenters?.includes(centerId) ?? false;

  if (!hasActiveMembership && !hasLinkedCenter && !isCenterOwner) {
    throw new Error("No puedes activar un centro al que no perteneces.");
  }

  await updateDoc(doc(db, "users", userId), {
    activeCenterId: centerId,
    centerId: centerId,
    linkedCenters: arrayUnion(centerId),
    updatedAt: serverTimestamp(),
  });
};

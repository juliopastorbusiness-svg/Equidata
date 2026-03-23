import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapCenterMember } from "@/lib/services/mappers";
import { centerCollection, centerDocument } from "@/lib/services/shared";
import { FirestoreCenterMemberDoc } from "@/lib/services/firestoreTypes";
import { CenterMember, RiderProfile, UserProfile } from "@/lib/services/types";
import { getCenterById } from "@/lib/services/centerService";

const membersCollectionName = "members";

export const getCenterMembers = async (centerId: string): Promise<CenterMember[]> => {
  const snap = await getDocs(centerCollection<FirestoreCenterMemberDoc>(centerId, membersCollectionName));
  return snap.docs
    .map((row) => mapCenterMember(row.id, row.data(), centerId))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return a.userId.localeCompare(b.userId);
    });
};

export const getCenterMemberByUser = async (
  centerId: string,
  userId: string
): Promise<CenterMember | null> => {
  const snap = await getDoc(centerDocument<FirestoreCenterMemberDoc>(centerId, membersCollectionName, userId));
  if (!snap.exists()) return null;
  return mapCenterMember(snap.id, snap.data(), centerId);
};

export const getUserCenterMemberships = async (userId: string): Promise<CenterMember[]> => {
  const [userIdSnap, uidSnap] = await Promise.all([
    getDocs(query(collectionGroup(db, membersCollectionName), where("userId", "==", userId))),
    getDocs(query(collectionGroup(db, membersCollectionName), where("uid", "==", userId))),
  ]);

  const seen = new Set<string>();
  return [...userIdSnap.docs, ...uidSnap.docs]
    .map((row) => {
      const centerId = row.ref.parent.parent?.id;
      if (!centerId) return null;
      const key = `${centerId}:${row.id}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return mapCenterMember(row.id, row.data() as FirestoreCenterMemberDoc, centerId);
    })
    .filter((item): item is CenterMember => Boolean(item));
};

export const requestCenterLink = async (
  centerId: string,
  riderUser: RiderProfile | UserProfile
): Promise<CenterMember> => {
  if (riderUser.role !== "rider") {
    throw new Error("Solo los riders pueden solicitar vinculacion a un centro.");
  }

  const center = await getCenterById(centerId);
  if (!center) {
    throw new Error("El centro no existe.");
  }

  const memberRef = centerDocument<FirestoreCenterMemberDoc>(centerId, membersCollectionName, riderUser.uid);
  const existingSnap = await getDoc(memberRef);

  if (existingSnap.exists()) {
    const existing = mapCenterMember(existingSnap.id, existingSnap.data(), centerId);
    if (existing.status === "active" || existing.status === "pending") {
      return existing;
    }
  }

  await setDoc(
    memberRef,
    {
      userId: riderUser.uid,
      uid: riderUser.uid,
      role: "rider",
      status: "pending",
      createdAt: existingSnap.exists() ? existingSnap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
      joinedAt: null,
    },
    { merge: true }
  );

  const nextSnap = await getDoc(memberRef);
  return mapCenterMember(nextSnap.id, nextSnap.data() as FirestoreCenterMemberDoc, centerId);
};

export const approveCenterMember = async (
  centerId: string,
  memberId: string
): Promise<CenterMember> => {
  const memberRef = centerDocument<FirestoreCenterMemberDoc>(centerId, membersCollectionName, memberId);
  const currentSnap = await getDoc(memberRef);
  if (!currentSnap.exists()) {
    throw new Error("La solicitud de vinculacion no existe.");
  }

  const current = mapCenterMember(currentSnap.id, currentSnap.data(), centerId);

  await updateDoc(memberRef, {
    status: "active",
    joinedAt: current.joinedAt ?? Timestamp.now(),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "users", current.userId), {
    linkedCenters: arrayUnion(centerId),
    updatedAt: serverTimestamp(),
  });

  const nextSnap = await getDoc(memberRef);
  return mapCenterMember(nextSnap.id, nextSnap.data() as FirestoreCenterMemberDoc, centerId);
};

export const rejectCenterMember = async (
  centerId: string,
  memberId: string
): Promise<CenterMember> => {
  const memberRef = centerDocument<FirestoreCenterMemberDoc>(centerId, membersCollectionName, memberId);
  const currentSnap = await getDoc(memberRef);
  if (!currentSnap.exists()) {
    throw new Error("La solicitud de vinculacion no existe.");
  }

  const current = mapCenterMember(currentSnap.id, currentSnap.data(), centerId);

  await updateDoc(memberRef, {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, "users", current.userId), {
    linkedCenters: arrayRemove(centerId),
    updatedAt: serverTimestamp(),
  });

  const nextSnap = await getDoc(memberRef);
  return mapCenterMember(nextSnap.id, nextSnap.data() as FirestoreCenterMemberDoc, centerId);
};

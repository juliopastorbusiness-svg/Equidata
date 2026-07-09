import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ProfessionalRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type ProfessionalRequest = {
  id: string;
  professionalId: string;
  centerId: string;
  professionalName: string;
  professionalPhoto?: string | null;
  profession: string;
  centerName: string;
  message: string;
  status: ProfessionalRequestStatus;
  rejectionReason?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  acceptedAt?: Timestamp;
  rejectedAt?: Timestamp;
  cancelledAt?: Timestamp;
};

export type ProfessionalProfileSummary = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  profession: string;
  speciality?: string;
  description?: string;
  company?: string;
  province?: string;
  city?: string;
  experienceYears?: number | string | null;
  servicesDescription?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  verificationStatus?: string;
  profileCompletion?: number;
};

export type CreateProfessionalRequestInput = {
  professionalId: string;
  centerId: string;
  professionalName: string;
  professionalPhoto?: string | null;
  profession: string;
  centerName: string;
  message: string;
};

const collectionName = "professional_requests";

const requestsCollection = () => collection(db, collectionName);

const mapRequest = (id: string, data: Record<string, unknown>): ProfessionalRequest => ({
  id,
  professionalId: typeof data.professionalId === "string" ? data.professionalId : "",
  centerId: typeof data.centerId === "string" ? data.centerId : "",
  professionalName: typeof data.professionalName === "string" ? data.professionalName : "",
  professionalPhoto: typeof data.professionalPhoto === "string" ? data.professionalPhoto : null,
  profession: typeof data.profession === "string" ? data.profession : "",
  centerName: typeof data.centerName === "string" ? data.centerName : "",
  message: typeof data.message === "string" ? data.message : "",
  status:
    data.status === "accepted" ||
    data.status === "rejected" ||
    data.status === "cancelled" ||
    data.status === "pending"
      ? data.status
      : "pending",
  rejectionReason: typeof data.rejectionReason === "string" ? data.rejectionReason : null,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  acceptedAt: data.acceptedAt instanceof Timestamp ? data.acceptedAt : undefined,
  rejectedAt: data.rejectedAt instanceof Timestamp ? data.rejectedAt : undefined,
  cancelledAt: data.cancelledAt instanceof Timestamp ? data.cancelledAt : undefined,
});

export const subscribeProfessionalRequests = (
  professionalId: string,
  onChange: (requests: ProfessionalRequest[]) => void,
  onError?: (error: Error) => void
) => {
  const requestsQuery = query(
    requestsCollection(),
    where("professionalId", "==", professionalId)
  );

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map((requestDoc) =>
          mapRequest(requestDoc.id, requestDoc.data() as Record<string, unknown>)
        )
        .sort((left, right) => {
          const leftMs = left.createdAt?.toMillis() ?? 0;
          const rightMs = right.createdAt?.toMillis() ?? 0;
          return rightMs - leftMs;
        });
      onChange(requests);
    },
    (snapshotError) => {
      onError?.(snapshotError);
    }
  );
};

export const subscribeCenterProfessionalRequests = (
  centerId: string,
  onChange: (requests: ProfessionalRequest[]) => void,
  onError?: (error: Error) => void
) => {
  const requestsQuery = query(requestsCollection(), where("centerId", "==", centerId));

  return onSnapshot(
    requestsQuery,
    (snapshot) => {
      const requests = snapshot.docs
        .map((requestDoc) =>
          mapRequest(requestDoc.id, requestDoc.data() as Record<string, unknown>)
        )
        .sort((left, right) => {
          const leftMs = left.createdAt?.toMillis() ?? 0;
          const rightMs = right.createdAt?.toMillis() ?? 0;
          return rightMs - leftMs;
        });
      onChange(requests);
    },
    (snapshotError) => {
      onError?.(snapshotError);
    }
  );
};

export const createProfessionalRequest = async (
  input: CreateProfessionalRequestInput
): Promise<string> => {
  const message = input.message.trim();
  if (!message) {
    throw new Error("El mensaje es obligatorio.");
  }

  const memberSnap = await getDoc(
    doc(db, "centers", input.centerId, "members", input.professionalId)
  );
  const memberData = memberSnap.exists()
    ? (memberSnap.data() as { status?: string })
    : null;
  if (memberData?.status === "active") {
    throw new Error("Ya perteneces a este centro.");
  }

  const duplicateQuery = query(
    requestsCollection(),
    where("professionalId", "==", input.professionalId)
  );
  const duplicateSnap = await getDocs(duplicateQuery);
  const existing = duplicateSnap.docs
    .map((requestDoc) =>
      mapRequest(requestDoc.id, requestDoc.data() as Record<string, unknown>)
    )
    .find(
      (request) =>
        request.centerId === input.centerId &&
        (request.status === "pending" || request.status === "accepted")
    );

  if (existing) {
    if (existing.status === "pending") {
      throw new Error("Ya existe una solicitud pendiente para este centro.");
    }
    throw new Error("Ya perteneces o tienes una solicitud aceptada en este centro.");
  }

  const docRef = await addDoc(requestsCollection(), {
    professionalId: input.professionalId,
    centerId: input.centerId,
    professionalName: input.professionalName.trim(),
    professionalPhoto: input.professionalPhoto || null,
    profession: input.profession.trim(),
    centerName: input.centerName.trim(),
    message,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
};

export const cancelProfessionalRequest = async (requestId: string): Promise<void> => {
  await updateDoc(doc(db, collectionName, requestId), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const acceptProfessionalRequest = async (
  request: ProfessionalRequest
): Promise<void> => {
  await setDoc(
    doc(db, "centers", request.centerId, "members", request.professionalId),
    {
      userId: request.professionalId,
      uid: request.professionalId,
      role: "pro",
      status: "active",
      professionalRequestId: request.id,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await updateDoc(doc(db, collectionName, request.id), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const rejectProfessionalRequest = async (
  requestId: string,
  reason?: string
): Promise<void> => {
  await updateDoc(doc(db, collectionName, requestId), {
    status: "rejected",
    rejectionReason: reason?.trim() || null,
    rejectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const removeProfessionalAccess = async (
  request: ProfessionalRequest
): Promise<void> => {
  await deleteDoc(doc(db, "centers", request.centerId, "members", request.professionalId));
  await updateDoc(doc(db, collectionName, request.id), {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getProfessionalProfileSummary = async (
  professionalId: string
): Promise<ProfessionalProfileSummary | null> => {
  const snap = await getDoc(doc(db, "users", professionalId));
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;
  const profile =
    data.professionalProfile && typeof data.professionalProfile === "object"
      ? (data.professionalProfile as Record<string, unknown>)
      : {};

  const name =
    (typeof data.fullName === "string" && data.fullName.trim()) ||
    (typeof data.displayName === "string" && data.displayName.trim()) ||
    (typeof data.name === "string" && data.name.trim()) ||
    "Profesional";

  return {
    id: professionalId,
    name,
    email: typeof data.email === "string" ? data.email : "",
    phone: typeof profile.phone === "string" ? profile.phone : undefined,
    photoUrl:
      (typeof data.avatarUrl === "string" && data.avatarUrl) ||
      (typeof data.photoURL === "string" && data.photoURL) ||
      undefined,
    profession:
      (typeof data.profession === "string" && data.profession) ||
      (typeof data.proType === "string" && data.proType) ||
      "Profesional ecuestre",
    speciality: typeof profile.speciality === "string" ? profile.speciality : undefined,
    description: typeof profile.description === "string" ? profile.description : undefined,
    company: typeof profile.company === "string" ? profile.company : undefined,
    province: typeof profile.province === "string" ? profile.province : undefined,
    city: typeof profile.city === "string" ? profile.city : undefined,
    experienceYears:
      typeof profile.experienceYears === "number" || typeof profile.experienceYears === "string"
        ? profile.experienceYears
        : null,
    servicesDescription:
      typeof profile.servicesDescription === "string" ? profile.servicesDescription : undefined,
    website: typeof profile.website === "string" ? profile.website : undefined,
    instagram: typeof profile.instagram === "string" ? profile.instagram : undefined,
    facebook: typeof profile.facebook === "string" ? profile.facebook : undefined,
    linkedin: typeof profile.linkedin === "string" ? profile.linkedin : undefined,
    verificationStatus:
      (typeof data.verificationStatus === "string" && data.verificationStatus) ||
      (data.verified === true ? "verified" : "unverified"),
    profileCompletion:
      typeof profile.profileCompletion === "number" ? profile.profileCompletion : 0,
  };
};

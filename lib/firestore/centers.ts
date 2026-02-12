import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CenterScopedRole, normalizeCenterRole, UserProfile } from "@/lib/auth/types";

export type CenterMembership = {
  centerId: string;
  centerName: string;
  role: CenterScopedRole;
};

type CenterDoc = {
  name?: string;
  ownerUid?: string;
  ownerId?: string;
  admins?: string[];
};

type CenterMemberDoc = {
  uid?: string;
  role?: string;
  displayName?: string;
  email?: string;
  status?: string;
};

const ROLE_PRIORITY: Record<CenterScopedRole, number> = {
  CENTER_OWNER: 2,
  CENTER_ADMIN: 1,
};

const upsertMembership = (
  map: Map<string, CenterMembership>,
  nextMembership: CenterMembership
) => {
  const existing = map.get(nextMembership.centerId);
  if (!existing) {
    map.set(nextMembership.centerId, nextMembership);
    return;
  }
  if (ROLE_PRIORITY[nextMembership.role] > ROLE_PRIORITY[existing.role]) {
    map.set(nextMembership.centerId, nextMembership);
  }
};

const readCenterName = (data: CenterDoc): string => {
  return data.name?.trim() || "Centro sin nombre";
};

export const getCenterMemberships = async (
  uid: string
): Promise<CenterMembership[]> => {
  const membershipMap = new Map<string, CenterMembership>();

  const [ownerUidSnap, ownerIdSnap, adminsSnap] = await Promise.all([
    getDocs(query(collection(db, "centers"), where("ownerUid", "==", uid))),
    getDocs(query(collection(db, "centers"), where("ownerId", "==", uid))),
    getDocs(query(collection(db, "centers"), where("admins", "array-contains", uid))),
  ]);

  ownerUidSnap.docs.forEach((centerDoc) => {
    const data = centerDoc.data() as CenterDoc;
    upsertMembership(membershipMap, {
      centerId: centerDoc.id,
      centerName: readCenterName(data),
      role: "CENTER_OWNER",
    });
  });

  ownerIdSnap.docs.forEach((centerDoc) => {
    const data = centerDoc.data() as CenterDoc;
    upsertMembership(membershipMap, {
      centerId: centerDoc.id,
      centerName: readCenterName(data),
      role: "CENTER_OWNER",
    });
  });

  adminsSnap.docs.forEach((centerDoc) => {
    const data = centerDoc.data() as CenterDoc;
    upsertMembership(membershipMap, {
      centerId: centerDoc.id,
      centerName: readCenterName(data),
      role: "CENTER_ADMIN",
    });
  });

  try {
    const centerNameCache = new Map<string, string>();
    const membersSnap = await getDocs(
      query(collectionGroup(db, "members"), where("uid", "==", uid))
    );

    for (const memberDoc of membersSnap.docs) {
      const memberData = memberDoc.data() as CenterMemberDoc;
      if (memberData.status && memberData.status !== "active") {
        continue;
      }

      const memberRole = normalizeCenterRole(memberData.role);
      if (!memberRole) {
        continue;
      }

      const centerId = memberDoc.ref.parent.parent?.id;
      if (!centerId) {
        continue;
      }

      const existing = membershipMap.get(centerId);
      if (existing && ROLE_PRIORITY[existing.role] >= ROLE_PRIORITY[memberRole]) {
        continue;
      }

      let centerName = centerNameCache.get(centerId);
      if (!centerName) {
        centerName = "Centro sin nombre";
        const centerSnap = await getDoc(doc(db, "centers", centerId));
        if (centerSnap.exists()) {
          centerName = readCenterName(centerSnap.data() as CenterDoc);
        }
        centerNameCache.set(centerId, centerName);
      }

      upsertMembership(membershipMap, {
        centerId,
        centerName,
        role: memberRole,
      });
    }
  } catch (err) {
    console.error("No se pudieron leer membresias de centers/*/members:", err);
  }

  return Array.from(membershipMap.values()).sort((a, b) =>
    a.centerName.localeCompare(b.centerName)
  );
};

export const pickPreferredCenterId = (
  memberships: CenterMembership[],
  preferredCenterIds: Array<string | null | undefined>
): string | null => {
  const validIds = preferredCenterIds.filter(
    (value): value is string => Boolean(value)
  );

  for (const id of validIds) {
    if (memberships.some((membership) => membership.centerId === id)) {
      return id;
    }
  }

  const firstOwner = memberships.find(
    (membership) => membership.role === "CENTER_OWNER"
  );
  return firstOwner?.centerId ?? memberships[0]?.centerId ?? null;
};

export const pickLegacyRoleHome = (profile: UserProfile | null): string => {
  const role = profile?.role;
  if (role === "pro") return "/dashboard/pro";
  if (role === "rider") return "/dashboard/rider";
  return "/dashboard";
};

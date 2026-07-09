import {
  Timestamp,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { assertRequiredString } from "@/lib/services/shared";

export type ProfessionalPermissionMap = Record<string, boolean>;

export type ProfessionalPermissions = {
  id: string;
  centerId: string;
  professionalId: string;
  roleTemplate: string;
  permissions: ProfessionalPermissionMap;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy: string;
};

export type CreatePermissionsInput = {
  centerId: string;
  professionalId: string;
  roleTemplate: string;
  permissions: ProfessionalPermissionMap;
  updatedBy: string;
};

export type UpdatePermissionsInput = Partial<{
  roleTemplate: string;
  permissions: ProfessionalPermissionMap;
}> & {
  updatedBy: string;
};

const collectionName = "professional_permissions";

const permissionDocId = (centerId: string, professionalId: string) => {
  const normalizedCenterId = assertRequiredString("centerId", centerId);
  const normalizedProfessionalId = assertRequiredString("professionalId", professionalId);
  return `${normalizedCenterId}_${normalizedProfessionalId}`;
};

const permissionDocRef = (centerId: string, professionalId: string) =>
  doc(db, collectionName, permissionDocId(centerId, professionalId));

const normalizePermissions = (
  permissions: ProfessionalPermissionMap
): ProfessionalPermissionMap =>
  Object.fromEntries(
    Object.entries(permissions).filter(
      ([key, value]) => key.trim() && typeof value === "boolean"
    )
  );

const mapPermissions = (
  id: string,
  data: Record<string, unknown>
): ProfessionalPermissions => ({
  id,
  centerId: typeof data.centerId === "string" ? data.centerId : "",
  professionalId: typeof data.professionalId === "string" ? data.professionalId : "",
  roleTemplate: typeof data.roleTemplate === "string" ? data.roleTemplate : "",
  permissions:
    data.permissions && typeof data.permissions === "object"
      ? normalizePermissions(data.permissions as ProfessionalPermissionMap)
      : {},
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
});

export const createPermissions = async (
  input: CreatePermissionsInput
): Promise<ProfessionalPermissions> => {
  const centerId = assertRequiredString("centerId", input.centerId);
  const professionalId = assertRequiredString("professionalId", input.professionalId);
  const updatedBy = assertRequiredString("updatedBy", input.updatedBy);
  const roleTemplate = assertRequiredString("roleTemplate", input.roleTemplate);
  const permissions = normalizePermissions(input.permissions);
  const ref = permissionDocRef(centerId, professionalId);

  await setDoc(ref, {
    centerId,
    professionalId,
    roleTemplate,
    permissions,
    updatedBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: ref.id,
    centerId,
    professionalId,
    roleTemplate,
    permissions,
    updatedBy,
  };
};

export const getPermissions = async (
  centerId: string,
  professionalId: string
): Promise<ProfessionalPermissions | null> => {
  const snapshot = await getDoc(permissionDocRef(centerId, professionalId));
  if (!snapshot.exists()) return null;
  return mapPermissions(snapshot.id, snapshot.data() as Record<string, unknown>);
};

export const updatePermissions = async (
  centerId: string,
  professionalId: string,
  input: UpdatePermissionsInput
): Promise<void> => {
  const updatedBy = assertRequiredString("updatedBy", input.updatedBy);
  const patch: Record<string, unknown> = {
    updatedBy,
    updatedAt: serverTimestamp(),
  };

  if (typeof input.roleTemplate === "string") {
    patch.roleTemplate = assertRequiredString("roleTemplate", input.roleTemplate);
  }

  if (input.permissions) {
    patch.permissions = normalizePermissions(input.permissions);
  }

  await updateDoc(permissionDocRef(centerId, professionalId), patch);
};

export const deletePermissions = async (
  centerId: string,
  professionalId: string
): Promise<void> => {
  await deleteDoc(permissionDocRef(centerId, professionalId));
};

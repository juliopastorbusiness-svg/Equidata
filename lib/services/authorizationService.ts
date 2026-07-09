import { Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { assertRequiredString } from "@/lib/services/shared";

export type ProfessionalPermissionsDocument = {
  id: string;
  centerId: string;
  professionalId: string;
  roleTemplate: string;
  permissions: Record<string, boolean>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  updatedBy: string;
};

const collectionName = "professional_permissions";

const permissionDocId = (centerId: string, professionalId: string) => {
  const normalizedCenterId = assertRequiredString("centerId", centerId);
  const normalizedProfessionalId = assertRequiredString("professionalId", professionalId);
  return `${normalizedCenterId}_${normalizedProfessionalId}`;
};

const permissionKey = (module: string, action: string) =>
  `${assertRequiredString("module", module)}.${assertRequiredString("action", action)}`;

const mapPermissions = (
  id: string,
  data: Record<string, unknown>
): ProfessionalPermissionsDocument => ({
  id,
  centerId: typeof data.centerId === "string" ? data.centerId : "",
  professionalId: typeof data.professionalId === "string" ? data.professionalId : "",
  roleTemplate: typeof data.roleTemplate === "string" ? data.roleTemplate : "",
  permissions:
    data.permissions && typeof data.permissions === "object"
      ? Object.fromEntries(
          Object.entries(data.permissions as Record<string, unknown>).filter(
            ([key, value]) => key.trim() && typeof value === "boolean"
          )
        ) as Record<string, boolean>
      : {},
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
});

/**
 * Obtiene el documento de permisos de un profesional dentro de un centro.
 * Devuelve null si no existe o si no se puede leer.
 */
export const getProfessionalPermissions = async (
  centerId: string,
  professionalId: string
): Promise<ProfessionalPermissionsDocument | null> => {
  try {
    const snapshot = await getDoc(
      doc(db, collectionName, permissionDocId(centerId, professionalId))
    );
    if (!snapshot.exists()) return null;
    return mapPermissions(snapshot.id, snapshot.data() as Record<string, unknown>);
  } catch (error) {
    console.error("No se pudieron leer los permisos profesionales:", error);
    return null;
  }
};

/**
 * Comprueba si un profesional tiene un permiso concreto de modulo/accion.
 * Devuelve false si no hay documento de permisos.
 */
export const hasPermission = async (
  centerId: string,
  professionalId: string,
  module: string,
  action: string
): Promise<boolean> => {
  const permissionDoc = await getProfessionalPermissions(centerId, professionalId);
  if (!permissionDoc) return false;
  return permissionDoc.permissions[permissionKey(module, action)] === true;
};

/**
 * Comprueba si un profesional tiene al menos un permiso activo dentro de un modulo.
 * Devuelve false si no hay documento de permisos.
 */
export const hasAnyPermission = async (
  centerId: string,
  professionalId: string,
  module: string
): Promise<boolean> => {
  const permissionDoc = await getProfessionalPermissions(centerId, professionalId);
  if (!permissionDoc) return false;

  const prefix = `${assertRequiredString("module", module)}.`;
  return Object.entries(permissionDoc.permissions).some(
    ([key, value]) => key.startsWith(prefix) && value === true
  );
};

/**
 * Indica si el profesional solo tiene permisos de lectura.
 * Devuelve false si no hay permisos registrados o si no tiene ningun permiso activo.
 */
export const isReadOnly = async (
  centerId: string,
  professionalId: string
): Promise<boolean> => {
  const permissionDoc = await getProfessionalPermissions(centerId, professionalId);
  if (!permissionDoc) return false;

  const activePermissions = Object.entries(permissionDoc.permissions).filter(([, value]) => value);
  if (!activePermissions.length) return false;

  return activePermissions.every(([key]) => {
    const action = key.split(".").at(-1) ?? "";
    return (
      action === "list" ||
      action === "detail" ||
      action === "view" ||
      action === "viewOwners" ||
      action === "viewStudents" ||
      action === "viewClasses" ||
      action === "viewHistory"
    );
  });
};

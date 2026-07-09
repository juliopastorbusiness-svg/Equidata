"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ProfessionalPermissionsDocument,
  getProfessionalPermissions,
} from "@/lib/services/authorizationService";

type UseProfessionalPermissionsResult = {
  permissions: ProfessionalPermissionsDocument | null;
  loading: boolean;
  error: string | null;
  hasPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (module: string) => boolean;
  isReadOnly: () => boolean;
};

const readOnlyActions = new Set([
  "list",
  "detail",
  "view",
  "viewOwners",
  "viewStudents",
  "viewClasses",
  "viewHistory",
]);

const permissionKey = (module: string, action: string) => `${module}.${action}`;

/**
 * Carga los permisos de un profesional dentro de un centro y expone helpers para React.
 * Si faltan centerId o professionalId no realiza consulta y devuelve permisos vacios.
 */
export const useProfessionalPermissions = (
  centerId?: string | null,
  professionalId?: string | null
): UseProfessionalPermissionsResult => {
  const [permissions, setPermissions] = useState<ProfessionalPermissionsDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId || !professionalId) {
      setPermissions(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const loadPermissions = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await getProfessionalPermissions(centerId, professionalId);
        if (!cancelled) {
          setPermissions(result);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setPermissions(null);
          setError("No se pudieron cargar los permisos profesionales.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [centerId, professionalId]);

  /** Comprueba un permiso concreto del documento cargado. */
  const hasPermission = useCallback(
    (module: string, action: string) => {
      if (!permissions) return false;
      return permissions.permissions[permissionKey(module, action)] === true;
    },
    [permissions]
  );

  /** Comprueba si existe cualquier permiso activo dentro de un modulo. */
  const hasAnyPermission = useCallback(
    (module: string) => {
      if (!permissions) return false;
      const prefix = `${module}.`;
      return Object.entries(permissions.permissions).some(
        ([key, value]) => key.startsWith(prefix) && value === true
      );
    },
    [permissions]
  );

  /** Indica si los permisos activos son solo de lectura. */
  const isReadOnly = useCallback(() => {
    if (!permissions) return false;
    const activePermissions = Object.entries(permissions.permissions).filter(([, value]) => value);
    if (!activePermissions.length) return false;

    return activePermissions.every(([key]) => {
      const action = key.split(".").at(-1) ?? "";
      return readOnlyActions.has(action);
    });
  }, [permissions]);

  return {
    permissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    isReadOnly,
  };
};

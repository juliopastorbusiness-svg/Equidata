import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModuleId } from "@/lib/modules/moduleConfig";
import { useModuleEnabled } from "./useModuleEnabled";
import { useRequireCenterRole } from "./useRequireCenterRole";

interface UseModuleProtectionOptions {
  fallbackUrl?: string;
  showWarning?: boolean;
  activeCenterId?: string | null;
  hasRole?: boolean;
  roleLoading?: boolean;
}

/**
 * Hook para proteger rutas que requieren un modulo especifico.
 * Puede reutilizar el contexto de centro/resolucion ya calculado por la pagina.
 */
export function useModuleProtection(
  moduleId: ModuleId,
  options: UseModuleProtectionOptions = {}
) {
  const router = useRouter();
  const roleGuard = useRequireCenterRole([
    "CENTER_OWNER",
    "CENTER_ADMIN",
  ]);

  const {
    fallbackUrl = "/dashboard/center",
    showWarning = true,
    activeCenterId: externalCenterId,
    hasRole: externalHasRole,
    roleLoading: externalRoleLoading = false,
  } = options;

  const activeCenterId = externalCenterId ?? roleGuard.activeCenterId;
  const hasRole = externalHasRole ?? roleGuard.isAllowed;
  const roleLoading =
    externalCenterId !== undefined || externalHasRole !== undefined
      ? externalRoleLoading
      : roleGuard.loading;

  const { isEnabled, loading, error } = useModuleEnabled(activeCenterId, moduleId);
  const isLoading = loading || roleLoading;

  useEffect(() => {
    if (isLoading || !hasRole || !activeCenterId) return;
    if (error) return;

    if (!isEnabled) {
      if (showWarning) {
        console.warn(`Modulo "${moduleId}" no esta habilitado en este centro`);
      }
      router.replace(fallbackUrl);
    }
  }, [
    activeCenterId,
    error,
    fallbackUrl,
    hasRole,
    isEnabled,
    isLoading,
    moduleId,
    router,
    showWarning,
  ]);

  return {
    isProtected:
      Boolean(activeCenterId) && !isLoading && !error && (!isEnabled || !hasRole),
    loading: isLoading,
    error,
  };
}

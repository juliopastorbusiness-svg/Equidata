import { useEffect, useState } from "react";
import { ModuleId } from "@/lib/modules/moduleConfig";
import { db } from "@/lib/firebase";
import { ModuleService } from "@/lib/services/moduleService";

/**
 * Hook para verificar si un módulo está habilitado en un centro
 */
export function useModuleEnabled(
  centerId: string | null,
  moduleId: ModuleId
): {
  isEnabled: boolean;
  loading: boolean;
  error: string | null;
} {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!centerId) {
      setLoading(false);
      return;
    }

    const fetchModuleStatus = async () => {
      try {
        setLoading(true);
        const moduleService = new ModuleService(db);
        const enabledModules = await moduleService.getEnabledModules(centerId);
        setIsEnabled(enabledModules.includes(moduleId));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    fetchModuleStatus();
  }, [centerId, moduleId]);

  return { isEnabled, loading, error };
}
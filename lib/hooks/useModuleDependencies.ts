import { useMemo } from "react";
import {
  ModuleId,
  MODULE_REGISTRY,
  getModuleDependencies,
  getDependentModules,
} from "@/lib/modules/moduleConfig";

interface UseModuleDependenciesResult {
  dependencies: ModuleId[]; // Módulos que este necesita
  dependents: ModuleId[]; // Módulos que dependen de este
  dependenciesInfo: Array<{ id: ModuleId; title: string }>; // Info para UI
  dependentsInfo: Array<{ id: ModuleId; title: string }>;
}

/**
 * Hook para obtener info de dependencias de un módulo
 */
export function useModuleDependencies(
  moduleId: ModuleId
): UseModuleDependenciesResult {
  const dependencies = useMemo(
    () => getModuleDependencies(moduleId),
    [moduleId]
  );

  const dependents = useMemo(
    () => getDependentModules(moduleId),
    [moduleId]
  );

  const dependenciesInfo = useMemo(
    () =>
      dependencies.map((id) => ({
        id,
        title: MODULE_REGISTRY[id].title,
      })),
    [dependencies]
  );

  const dependentsInfo = useMemo(
    () =>
      dependents.map((id) => ({
        id,
        title: MODULE_REGISTRY[id].title,
      })),
    [dependents]
  );

  return {
    dependencies,
    dependents,
    dependenciesInfo,
    dependentsInfo,
  };
}
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  Firestore,
} from "firebase/firestore";
import {
  ModuleId,
  DEFAULT_ENABLED_MODULES,
  validateModuleSet,
  getModuleDependencies,
  getAllDependentModules,
} from "@/lib/modules/moduleConfig";
import type { Center } from "./types";

/**
 * Servicio para gestionar módulos habilitados en un centro
 */
export class ModuleService {
  constructor(private firestore: Firestore) {}

  /**
   * Obtener módulos habilitados de un centro
   */
  async getEnabledModules(centerId: string): Promise<ModuleId[]> {
    try {
      const centerRef = doc(this.firestore, "centers", centerId);
      const centerDoc = await getDoc(centerRef);

      if (!centerDoc.exists()) {
        throw new Error(`Centro ${centerId} no existe`);
      }

      const center = centerDoc.data() as any;
      return center.enabledModules || DEFAULT_ENABLED_MODULES;
    } catch (error) {
      console.error("Error obteniendo módulos:", error);
      return DEFAULT_ENABLED_MODULES; // Fallback seguro
    }
  }

  /**
   * Habilitar un módulo (respetando dependencias)
   * Retorna: módulos que se activarán
   */
  async enableModule(
    centerId: string,
    moduleId: ModuleId,
    autoActivateDependencies: boolean = true
  ): Promise<{
    success: boolean;
    activated: ModuleId[];
    error?: string;
  }> {
    try {
      const current = await this.getEnabledModules(centerId);

      if (current.includes(moduleId)) {
        return { success: true, activated: [] }; // Ya está activo
      }

      // Obtener dependencias del módulo
      const dependencies = getModuleDependencies(moduleId);

      let toActivate: ModuleId[] = [moduleId];

      if (autoActivateDependencies) {
        // Activar dependencias automáticamente
        const missingDeps = dependencies.filter((dep) => !current.includes(dep));
        toActivate = [...new Set([...current, moduleId, ...missingDeps])];
      } else {
        // Solo activar si las dependencias ya existen
        const hasMissingDeps = dependencies.some((dep) => !current.includes(dep));
        if (hasMissingDeps) {
          const missing = dependencies
            .filter((dep) => !current.includes(dep))
            .map((m) => m);
          return {
            success: false,
            activated: [],
            error: `Este módulo requiere: ${missing.join(", ")}`,
          };
        }
        toActivate = [...new Set([...current, moduleId])];
      }

      // Validar que el conjunto resultante es válido
      const validation = validateModuleSet(toActivate);
      if (!validation.valid) {
        return {
          success: false,
          activated: [],
          error: validation.errors.join("; "),
        };
      }

      // Actualizar en Firestore
      const centerRef = doc(this.firestore, "centers", centerId);
      await updateDoc(centerRef, {
        enabledModules: toActivate,
        updatedAt: new Date(),
      });

      const activated = toActivate.filter((m) => !current.includes(m));

      return { success: true, activated };
    } catch (error) {
      return {
        success: false,
        activated: [],
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  /**
   * Desactivar un módulo (con advertencia de dependientes)
   */
  async disableModule(
    centerId: string,
    moduleId: ModuleId,
    force: boolean = false
  ): Promise<{
    success: boolean;
    disabled: ModuleId[];
    affectedModules?: ModuleId[]; // Módulos que también se desactivarán
    error?: string;
  }> {
    try {
      const current = await this.getEnabledModules(centerId);

      if (!current.includes(moduleId)) {
        return { success: true, disabled: [] }; // Ya está desactivo
      }

      // Importar función para obtener módulos dependientes
      const affected = getAllDependentModules(moduleId);
      const affectedEnabled = affected.filter((m) => current.includes(m));

      if (affectedEnabled.length > 0 && !force) {
        return {
          success: false,
          disabled: [],
          affectedModules: affectedEnabled,
          error: `Si desactivas este módulo, también se verán afectados: ${affectedEnabled.join(", ")}`,
        };
      }

      // Desactivar el módulo y sus dependientes (si force=true)
      const toDisable = force ? [moduleId, ...affectedEnabled] : [moduleId];
      const updated = current.filter((m) => !toDisable.includes(m));

      // Validar que el conjunto resultante es válido
      const validation = validateModuleSet(updated);
      if (!validation.valid) {
        return {
          success: false,
          disabled: [],
          error: validation.errors.join("; "),
        };
      }

      // Actualizar en Firestore
      const centerRef = doc(this.firestore, "centers", centerId);
      await updateDoc(centerRef, {
        enabledModules: updated,
        updatedAt: new Date(),
      });

      return {
        success: true,
        disabled: toDisable,
        affectedModules: force ? affectedEnabled : undefined,
      };
    } catch (error) {
      return {
        success: false,
        disabled: [],
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  /**
   * Establecer múltiples módulos de una vez (reemplaza toda la lista)
   */
  async setEnabledModules(
    centerId: string,
    moduleIds: ModuleId[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validar que el conjunto es válido
      const validation = validateModuleSet(moduleIds);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; "),
        };
      }

      const centerRef = doc(this.firestore, "centers", centerId);
      await updateDoc(centerRef, {
        enabledModules: moduleIds,
        updatedAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  /**
   * Inicializar módulos para un nuevo centro
   */
  async initializeModulesForNewCenter(centerId: string): Promise<void> {
    const centerRef = doc(this.firestore, "centers", centerId);
    await updateDoc(centerRef, {
      enabledModules: DEFAULT_ENABLED_MODULES,
    });
  }
}

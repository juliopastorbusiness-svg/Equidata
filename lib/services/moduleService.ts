import { doc, Firestore, getDoc } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import {
  DEFAULT_ENABLED_MODULES,
  ModuleId,
} from "@/lib/modules/moduleConfig";

type ModuleMutationResult = {
  success: boolean;
  modules?: ModuleId[];
  activated?: ModuleId[];
  disabled?: ModuleId[];
  affectedModules?: ModuleId[];
  error?: string;
};

/**
 * Servicio para gestionar modulos habilitados en un centro.
 * Las mutaciones pasan por API backend para aplicar limites reales del plan.
 */
export class ModuleService {
  constructor(private firestore: Firestore) {}

  private async patchModules(payload: Record<string, unknown>): Promise<ModuleMutationResult> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      return {
        success: false,
        error: "Debes iniciar sesion para gestionar modulos.",
      };
    }

    const response = await fetch("/api/center/modules", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as ModuleMutationResult;

    return {
      success: response.ok && data.success === true,
      modules: data.modules,
      activated: data.activated,
      disabled: data.disabled,
      affectedModules: data.affectedModules,
      error: data.error,
    };
  }

  async getEnabledModules(centerId: string): Promise<ModuleId[]> {
    try {
      const centerRef = doc(this.firestore, "centers", centerId);
      const centerDoc = await getDoc(centerRef);

      if (!centerDoc.exists()) {
        throw new Error(`Centro ${centerId} no existe`);
      }

      const center = centerDoc.data() as { enabledModules?: ModuleId[] };
      return center.enabledModules || DEFAULT_ENABLED_MODULES;
    } catch (error) {
      console.error("Error obteniendo modulos:", error);
      return DEFAULT_ENABLED_MODULES;
    }
  }

  async enableModule(
    centerId: string,
    moduleId: ModuleId,
    autoActivateDependencies: boolean = true
  ): Promise<{
    success: boolean;
    activated: ModuleId[];
    error?: string;
  }> {
    const result = await this.patchModules({
      action: "enable",
      centerId,
      moduleId,
      autoActivateDependencies,
    });

    return {
      success: result.success,
      activated: result.activated ?? [],
      error: result.error,
    };
  }

  async disableModule(
    centerId: string,
    moduleId: ModuleId,
    force: boolean = false
  ): Promise<{
    success: boolean;
    disabled: ModuleId[];
    affectedModules?: ModuleId[];
    error?: string;
  }> {
    const result = await this.patchModules({
      action: "disable",
      centerId,
      moduleId,
      force,
    });

    return {
      success: result.success,
      disabled: result.disabled ?? [],
      affectedModules: result.affectedModules,
      error: result.error,
    };
  }

  async setEnabledModules(
    centerId: string,
    moduleIds: ModuleId[]
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.patchModules({
      action: "set",
      centerId,
      moduleIds,
    });

    return {
      success: result.success,
      error: result.error,
    };
  }

  async initializeModulesForNewCenter(centerId: string): Promise<void> {
    await this.setEnabledModules(centerId, DEFAULT_ENABLED_MODULES);
  }
}

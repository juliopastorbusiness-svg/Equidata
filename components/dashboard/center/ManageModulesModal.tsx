"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MODULE_REGISTRY,
  ModuleId,
  getAllDependentModules,
  getModuleDependencies,
} from "@/lib/modules/moduleConfig";
import { ModuleService } from "@/lib/services/moduleService";
import { db } from "@/lib/firebase";
import { useModuleDependencies } from "@/lib/hooks/useModuleDependencies";

interface ManageModulesModalProps {
  centerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (modules: ModuleId[]) => void;
}

export function ManageModulesModal({
  centerId,
  isOpen,
  onClose,
  onSave,
}: ManageModulesModalProps) {
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    type: "error" | "warning" | "info";
    message: string;
    detail?: string;
  } | null>(null);

  const [pendingDisable, setPendingDisable] = useState<ModuleId | null>(null);

  // Cargar módulos actuales
  useEffect(() => {
    if (!isOpen) return;

    const loadModules = async () => {
      try {
        setLoading(true);
        const moduleService = new ModuleService(db);
        const modules = await moduleService.getEnabledModules(centerId);
        setEnabledModules(modules);
        setAlert(null);
      } catch (error) {
        setAlert({
          type: "error",
          message: "Error al cargar módulos",
          detail: error instanceof Error ? error.message : "",
        });
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, [isOpen, centerId]);

  // Manejar toggle de módulo
  const handleToggleModule = useCallback(
    async (moduleId: ModuleId, shouldEnable: boolean) => {
      const moduleService = new ModuleService(db);

      if (shouldEnable) {
        // ACTIVAR módulo con dependencias automáticas
        const result = await moduleService.enableModule(
          centerId,
          moduleId,
          true // auto-activar dependencias
        );

        if (result.success) {
          // Recargar módulos desde Firestore
          const updated = await moduleService.getEnabledModules(centerId);
          setEnabledModules(updated);

          if (result.activated.length > 1) {
            setAlert({
              type: "info",
              message: `Se activaron también los módulos necesarios: ${result.activated
                .slice(1)
                .map((m) => MODULE_REGISTRY[m].title)
                .join(", ")}`,
            });
          }
        } else {
          setAlert({
            type: "error",
            message: "Error al activar módulo",
            detail: result.error,
          });
        }
      } else {
        // DESACTIVAR - primero verificar dependientes
        const dependents = getAllDependentModules(moduleId).filter((m) =>
          enabledModules.includes(m)
        );

        if (dependents.length > 0) {
          // Mostrar advertencia de dependientes
          setPendingDisable(moduleId);
          setAlert({
            type: "warning",
            message: `Si desactivas "${MODULE_REGISTRY[moduleId].title}", también se desactivarán:`,
            detail: dependents
              .map((m) => `• ${MODULE_REGISTRY[m].title}`)
              .join("\n"),
          });
          return;
        }

        // Sin dependientes, desactivar directamente
        const result = await moduleService.disableModule(centerId, moduleId);

        if (result.success) {
          const updated = await moduleService.getEnabledModules(centerId);
          setEnabledModules(updated);
          setAlert(null);
        } else {
          setAlert({
            type: "error",
            message: "Error al desactivar módulo",
            detail: result.error,
          });
        }
      }
    },
    [centerId, enabledModules]
  );

  // Confirmar desactivación con dependientes
  const handleConfirmDisable = useCallback(async () => {
    if (!pendingDisable) return;

    const moduleService = new ModuleService(db);
    const result = await moduleService.disableModule(
      centerId,
      pendingDisable,
      true // force: desactivar También dependientes
    );

    if (result.success) {
      const updated = await moduleService.getEnabledModules(centerId);
      setEnabledModules(updated);
      setPendingDisable(null);
      setAlert({
        type: "info",
        message: `Se desactivaron: ${Array.from(new Set(result.disabled || []))
          .map((m) => MODULE_REGISTRY[m].title)
          .join(", ")}`,
      });
    } else {
      setAlert({
        type: "error",
        message: "Error al desactivar módulo",
        detail: result.error,
      });
    }
  }, [centerId, pendingDisable]);

  // Cancelar desactivación
  const handleCancelDisable = useCallback(() => {
    setPendingDisable(null);
    setAlert(null);
  }, []);

  // Guardar cambios
  const handleSave = async () => {
    try {
      setSaving(true);
      const moduleService = new ModuleService(db);
      const result = await moduleService.setEnabledModules(
        centerId,
        enabledModules
      );

      if (result.success) {
        setAlert({
          type: "info",
          message: "Cambios guardados correctamente",
        });
        onSave?.(enabledModules);
        setTimeout(onClose, 1500);
      } else {
        setAlert({
          type: "error",
          message: "Error al guardar",
          detail: result.error,
        });
      }
    } catch (error) {
      setAlert({
        type: "error",
        message: "Error inesperado",
        detail: error instanceof Error ? error.message : "",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const modules = Object.values(MODULE_REGISTRY);
  const categories = Array.from(
    new Set(modules.map((m) => m.category))
  ).sort();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 border-b border-emerald-200">
          <h2 className="text-2xl font-bold">Gestionar Módulos</h2>
          <p className="text-emerald-50 text-sm mt-1">
            Activa o desactiva las funcionalidades disponibles para tu centro
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-600"></div>
            </div>
          ) : (
            <>
              {/* Alert */}
              {alert && (
                <div
                  className={`mb-6 p-4 rounded-lg border-l-4 ${
                    alert.type === "error"
                      ? "bg-red-50 border-red-400 text-red-700"
                      : alert.type === "warning"
                        ? "bg-yellow-50 border-yellow-400 text-yellow-700"
                        : "bg-emerald-50 border-emerald-400 text-emerald-700"
                  }`}
                >
                  <p className="font-semibold">{alert.message}</p>
                  {alert.detail && (
                    <p className="text-sm mt-2 whitespace-pre-line">
                      {alert.detail}
                    </p>
                  )}

                  {pendingDisable && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleConfirmDisable}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                      >
                        Desactivar igualmente
                      </button>
                      <button
                        onClick={handleCancelDisable}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Módulos por categoría */}
              {categories.map((category) => (
                <div key={category} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
                    {category === "administrative"
                      ? "📋 Administrativo"
                      : category === "operational"
                        ? "⚙️ Operativo"
                        : category === "educational"
                          ? "🎓 Educativo"
                          : "🏆 Deportivo"}
                  </h3>

                  <div className="space-y-3">
                    {modules
                      .filter((m) => m.category === category)
                      .map((module) => (
                        <ModuleToggleItem
                          key={module.id}
                          module={module}
                          isEnabled={enabledModules.includes(module.id)}
                          onToggle={handleToggleModule}
                          pendingDisable={pendingDisable}
                          allEnabledModules={enabledModules}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente para cada módulo en el modal
 */
interface ModuleToggleItemProps {
  module: (typeof MODULE_REGISTRY)[keyof typeof MODULE_REGISTRY];
  isEnabled: boolean;
  onToggle: (moduleId: ModuleId, shouldEnable: boolean) => void;
  pendingDisable: ModuleId | null;
  allEnabledModules: ModuleId[];
}

function ModuleToggleItem({
  module,
  isEnabled,
  onToggle,
  pendingDisable,
  allEnabledModules,
}: ModuleToggleItemProps) {
  const { dependenciesInfo, dependentsInfo } =
    useModuleDependencies(module.id);

  const activeDependents = getAllDependentModules(module.id).filter((m) =>
    allEnabledModules.includes(m)
  );

  const showDependencyWarning =
    pendingDisable === module.id && activeDependents.length > 0;

  return (
    <div
      className={`p-4 border rounded-lg transition-all ${
        isEnabled
          ? "bg-emerald-50 border-emerald-300"
          : "bg-gray-50 border-gray-300"
      } ${showDependencyWarning ? "ring-2 ring-yellow-400" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{module.icon}</span>
            <div>
              <h4 className="font-semibold text-gray-900">{module.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                {module.description}
              </p>

              {/* Mostrar dependencias */}
              {dependenciesInfo.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="inline-block mr-2">
                    🔗 Depende de:{" "}
                    {dependenciesInfo
                      .map((d) => d.title)
                      .join(", ")}
                  </span>
                </div>
              )}

              {/* Advertencia de módulos dependientes activos */}
              {activeDependents.length > 0 && !isEnabled && (
                <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded border border-yellow-200">
                  ⚠️ {activeDependents.map((m) => MODULE_REGISTRY[m].title).join(", ")} dependen de este módulo
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(module.id, !isEnabled)}
          disabled={pendingDisable !== null && pendingDisable !== module.id}
          className={`ml-4 flex-shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? "bg-emerald-600" : "bg-gray-300"
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

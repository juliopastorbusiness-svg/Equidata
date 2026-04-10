/**
 * Configuración centralizada de todos los módulos disponibles
 * Incluye: definiciones, dependencias, icons, descriptions
 */

export type ModuleId =
  | "facturacion"
  | "piensos"
  | "pistas"
  | "cuadras"
  | "paddocks"
  | "medicamentos"
  | "agenda"
  | "clases"
  | "reservas"
  | "entrenamientos"
  | "competiciones"
  | "alumnos"
  | "tareas";

export interface ModuleConfig {
  id: ModuleId;
  title: string;
  description: string;
  icon: string;
  href: string;
  dependsOn?: ModuleId[]; // Módulos que deben estar activos para este
  category: "administrative" | "operational" | "educational" | "sports";
  requiredRoles?: Array<"CENTER_OWNER" | "CENTER_ADMIN">; // Si no especificado, accesible a ambos
}

export type ModuleRegistry = {
  [key in ModuleId]: ModuleConfig;
};

/**
 * Definición de todos los módulos disponibles
 * Orden: importancia + categoría
 */
export const MODULE_REGISTRY: ModuleRegistry = {
  agenda: {
    id: "agenda",
    title: "Agenda",
    description: "Calendario diario, semanal y mensual del centro.",
    icon: "📅",
    href: "/dashboard/center/agenda",
    category: "administrative",
    // Sin dependencias - módulo base
  },

  cuadras: {
    id: "cuadras",
    title: "Cuadras",
    description: "Ocupación, estancias y gestión de boxes.",
    icon: "🐴",
    href: "/dashboard/center/stables",
    category: "administrative",
  },

  pistas: {
    id: "pistas",
    title: "Pistas",
    description: "Reservas, estado y disponibilidad de pistas.",
    icon: "🏇",
    href: "/dashboard/center/arenas",
    category: "operational",
  },

  piensos: {
    id: "piensos",
    title: "Piensos",
    description: "Stock, consumos y control de alimento.",
    icon: "🌾",
    href: "/dashboard/center/feed",
    category: "operational",
  },

  paddocks: {
    id: "paddocks",
    title: "Paddocks",
    description: "Rotación, ocupación y gestión de prados.",
    icon: "🌿",
    href: "/dashboard/center/paddocks",
    category: "operational",
  },

  medicamentos: {
    id: "medicamentos",
    title: "Medicamentos",
    description: "Inventario, stock y tratamientos por caballo.",
    icon: "💊",
    href: "/dashboard/center/medications",
    category: "administrative",
  },

  facturacion: {
    id: "facturacion",
    title: "Facturación",
    description: "Clientes, cobros y resumen mensual del centro.",
    icon: "💳",
    href: "/dashboard/center/billing",
    category: "administrative",
  },

  clases: {
    id: "clases",
    title: "Clases",
    description: "Clases, alumnos, caballos y capacidad.",
    icon: "🎓",
    href: "/dashboard/clases",
    category: "educational",
    dependsOn: ["agenda"], // Las clases necesitan el calendario
  },

  alumnos: {
    id: "alumnos",
    title: "Alumnos",
    description: "Fichas, reservas y pagos del area formativa.",
    icon: "🧑‍🎓",
    href: "/dashboard/center/students",
    category: "educational",
    dependsOn: ["clases"], // Alumnos necesitan clases
  },

  reservas: {
    id: "reservas",
    title: "Reservas",
    description: "Seguimiento de riders, estados y demanda por clase.",
    icon: "🧾",
    href: "/dashboard/reservas",
    category: "educational",
    dependsOn: ["clases", "pistas"], // Reservas de clases y pistas
  },

  entrenamientos: {
    id: "entrenamientos",
    title: "Entrenamientos",
    description: "Planificacion deportiva con control de solapes.",
    icon: "🏋️",
    href: "/dashboard/center/trainings",
    category: "sports",
    dependsOn: ["agenda"], // Necesita calendario
  },

  competiciones: {
    id: "competiciones",
    title: "Competiciones",
    description: "Calendario competitivo de caballos y jinetes.",
    icon: "🏆",
    href: "/dashboard/center/competitions",
    category: "sports",
    dependsOn: ["agenda", "entrenamientos"], // Depende de entrenamientos
  },

  tareas: {
    id: "tareas",
    title: "Tareas",
    description: "Plan diario y seguimiento del equipo.",
    icon: "✅",
    href: "/dashboard/center/tasks",
    category: "administrative",
    dependsOn: ["agenda"],
  },
};

/**
 * Módulos que vienen activos por defecto al crear un centro
 */
export const DEFAULT_ENABLED_MODULES: ModuleId[] = ["agenda", "cuadras"];

/**
 * Obtener todas las dependencias de un módulo (recursivo)
 */
export function getModuleDependencies(
  moduleId: ModuleId,
  registry: ModuleRegistry = MODULE_REGISTRY
): ModuleId[] {
  const config = registry[moduleId];
  if (!config || !config.dependsOn) return [];

  const directDeps = config.dependsOn;
  const transitiveDeps = directDeps.flatMap((dep) =>
    getModuleDependencies(dep, registry)
  );

  return Array.from(new Set([...directDeps, ...transitiveDeps]));
}

/**
 * Obtener módulos que dependen de uno dado (dependientes inversos)
 */
export function getDependentModules(
  moduleId: ModuleId,
  registry: ModuleRegistry = MODULE_REGISTRY
): ModuleId[] {
  return Object.values(registry)
    .filter((config) => config.dependsOn?.includes(moduleId))
    .map((config) => config.id);
}

/**
 * Obtener todos los modulos dependientes de uno dado (directos e indirectos)
 */
export function getAllDependentModules(
  moduleId: ModuleId,
  registry: ModuleRegistry = MODULE_REGISTRY
): ModuleId[] {
  const directDependents = getDependentModules(moduleId, registry);
  const transitiveDependents = directDependents.flatMap((dependentId) =>
    getAllDependentModules(dependentId, registry)
  );

  return Array.from(new Set([...directDependents, ...transitiveDependents]));
}

/**
 * Validar que un conjunto de módulos es coherente (respeta dependencias)
 */
export function validateModuleSet(
  enabledModules: ModuleId[],
  registry: ModuleRegistry = MODULE_REGISTRY
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const enabled = new Set(enabledModules);

  for (const moduleId of enabledModules) {
    const deps = getModuleDependencies(moduleId, registry);
    const missing = deps.filter((dep) => !enabled.has(dep));

    if (missing.length > 0) {
      errors.push(
        `"${registry[moduleId].title}" requiere: ${missing.map((m) => `"${registry[m].title}"`).join(", ")}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

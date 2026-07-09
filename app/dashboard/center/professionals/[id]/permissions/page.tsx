"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  ProfessionalProfileSummary,
  getProfessionalProfileSummary,
} from "@/lib/services/professionalRequestService";
import {
  createPermissions,
  getPermissions,
  updatePermissions,
} from "@/lib/services/professionalPermissions";

const permissionModules = [
  {
    title: "Caballos",
    permissions: [
      ["horses.list", "Ver listado"],
      ["horses.detail", "Ver ficha"],
      ["horses.create", "Crear"],
      ["horses.edit", "Editar"],
      ["horses.delete", "Eliminar"],
    ],
  },
  {
    title: "Clientes",
    permissions: [
      ["clients.viewOwners", "Ver propietarios"],
      ["clients.viewStudents", "Ver alumnos"],
      ["clients.create", "Crear clientes"],
      ["clients.edit", "Editar clientes"],
    ],
  },
  {
    title: "Agenda",
    permissions: [
      ["agenda.view", "Ver agenda"],
      ["agenda.createEvents", "Crear eventos"],
      ["agenda.editEvents", "Editar eventos"],
      ["agenda.deleteEvents", "Eliminar eventos"],
    ],
  },
  {
    title: "Veterinaria",
    permissions: [
      ["veterinary.viewHistory", "Ver historial"],
      ["veterinary.createTreatment", "Crear tratamiento"],
      ["veterinary.editTreatment", "Editar tratamiento"],
      ["veterinary.vaccines", "Vacunas"],
      ["veterinary.medication", "Medicacion"],
    ],
  },
  {
    title: "Clases",
    permissions: [
      ["classes.viewStudents", "Ver alumnos"],
      ["classes.viewClasses", "Ver clases"],
      ["classes.create", "Crear clases"],
      ["classes.edit", "Editar clases"],
      ["classes.attendance", "Pasar asistencia"],
    ],
  },
] as const;

const emptyPermissionState = Object.fromEntries(
  permissionModules.flatMap((module) =>
    module.permissions.map(([key]) => [key, false])
  )
) as Record<string, boolean>;

type RoleTemplate = "custom" | "veterinarian" | "teacher" | "farrier" | "stablehand";

const permissionTemplates: Record<RoleTemplate, { label: string; permissions: string[] }> = {
  custom: {
    label: "Personalizada",
    permissions: [],
  },
  veterinarian: {
    label: "Veterinario",
    permissions: [
      "horses.list",
      "horses.detail",
      "veterinary.viewHistory",
      "veterinary.createTreatment",
      "veterinary.editTreatment",
      "veterinary.vaccines",
      "veterinary.medication",
      "agenda.view",
      "agenda.createEvents",
    ],
  },
  teacher: {
    label: "Profesor",
    permissions: [
      "horses.list",
      "horses.detail",
      "clients.viewStudents",
      "classes.viewStudents",
      "classes.viewClasses",
      "classes.create",
      "classes.edit",
      "classes.attendance",
      "agenda.view",
      "agenda.createEvents",
    ],
  },
  farrier: {
    label: "Herrador",
    permissions: ["horses.list", "horses.detail", "agenda.view", "agenda.createEvents"],
  },
  stablehand: {
    label: "Mozo",
    permissions: ["horses.list", "horses.detail", "agenda.view"],
  },
};

const roleTemplateOptions = Object.entries(permissionTemplates) as Array<
  [RoleTemplate, { label: string; permissions: string[] }]
>;

const isRoleTemplate = (value: string): value is RoleTemplate =>
  value in permissionTemplates;

export default function ProfessionalPermissionsPage() {
  const params = useParams();
  const professionalId = params?.id as string;
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    userId,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [profile, setProfile] = useState<ProfessionalProfileSummary | null>(null);
  const [permissionState, setPermissionState] = useState<Record<string, boolean>>(emptyPermissionState);
  const [selectedRoleTemplate, setSelectedRoleTemplate] = useState<RoleTemplate>("custom");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [existingPermissions, setExistingPermissions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!professionalId) {
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setError(null);

      try {
        const professionalProfile = await getProfessionalProfileSummary(professionalId);
        if (cancelled) return;
        setProfile(professionalProfile);
        if (!professionalProfile) {
          setError("No se encontro el profesional.");
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("No se pudo cargar el profesional.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProfile(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [professionalId]);

  useEffect(() => {
    if (!activeCenterId || !professionalId) return;

    let cancelled = false;

    const loadPermissions = async () => {
      setError(null);

      try {
        const permissionDoc = await getPermissions(activeCenterId, professionalId);
        if (cancelled) return;

        setExistingPermissions(Boolean(permissionDoc));
        if (!permissionDoc) return;

        setSelectedRoleTemplate(
          isRoleTemplate(permissionDoc.roleTemplate) ? permissionDoc.roleTemplate : "custom"
        );
        setPermissionState(
          Object.fromEntries(
            Object.keys(emptyPermissionState).map((key) => [
              key,
              Boolean(permissionDoc.permissions[key]),
            ])
          )
        );
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("No se pudieron cargar los permisos.");
        }
      }
    };

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [activeCenterId, professionalId]);

  const applyTemplate = (roleTemplate: RoleTemplate) => {
    const template = permissionTemplates[roleTemplate];
    const selectedPermissions = new Set(template.permissions);

    setSelectedRoleTemplate(roleTemplate);
    setPermissionState(
      Object.fromEntries(
        Object.keys(emptyPermissionState).map((key) => [key, selectedPermissions.has(key)])
      )
    );
  };

  const handleSave = async () => {
    if (!activeCenterId || !professionalId || !userId) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    const permissions = Object.fromEntries(
      Object.keys(emptyPermissionState).map((key) => [key, Boolean(permissionState[key])])
    );

    try {
      if (existingPermissions) {
        await updatePermissions(activeCenterId, professionalId, {
          roleTemplate: selectedRoleTemplate,
          permissions,
          updatedBy: userId,
        });
      } else {
        await createPermissions({
          centerId: activeCenterId,
          professionalId,
          roleTemplate: selectedRoleTemplate,
          permissions,
          updatedBy: userId,
        });
        setExistingPermissions(true);
      }

      setMessage("Permisos guardados correctamente.");
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudieron guardar los permisos.");
    } finally {
      setSaving(false);
    }
  };

  if (guardLoading || loadingProfile) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando permisos...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso a esta configuracion.</p>
        </div>
      </main>
    );
  }

  const displayName = profile?.name ?? "Profesional";
  const profession = profile?.profession ?? "Profesional ecuestre";
  const speciality = profile?.speciality ?? "";
  const photoUrl = profile?.photoUrl ?? "";

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Configuracion de permisos"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center/professionals"
      />

      <div className="app-shell">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            {message}
          </p>
        ) : null}

        <section className="rounded-2xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-brand-background">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-brand-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-brand-text">{displayName}</h2>
                <p className="mt-1 text-sm text-brand-secondary">{profession}</p>
                {speciality ? (
                  <p className="mt-1 text-sm text-brand-secondary">Especialidad: {speciality}</p>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              disabled={saving || !activeCenterId || !userId}
              onClick={handleSave}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </section>

        <section className="min-h-64 rounded-2xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-text">Permisos</h2>
              <p className="mt-1 text-sm text-brand-secondary">
                Selecciona una plantilla rapida o ajusta cada permiso manualmente.
              </p>
            </div>
            <label className="w-full text-sm font-medium text-brand-secondary sm:max-w-xs">
              Aplicar plantilla
              <select
                value={selectedRoleTemplate}
                onChange={(event) => applyTemplate(event.target.value as RoleTemplate)}
                className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                {roleTemplateOptions.map(([value, template]) => (
                  <option key={value} value={value}>
                    {template.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5 grid gap-4">
            {permissionModules.map((module) => (
              <div key={module.title} className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">
                  {module.title}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {module.permissions.map(([key, label]) => (
                    <label
                      key={key}
                      className="flex min-h-12 items-center gap-3 rounded-xl border border-brand-border bg-white/70 px-4 py-3 text-sm font-medium text-brand-text"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(permissionState[key])}
                        onChange={(event) =>
                          setPermissionState((current) => ({
                            ...current,
                            [key]: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-brand-border"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

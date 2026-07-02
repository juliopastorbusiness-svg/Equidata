"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  Client,
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from "@/lib/services";

type ClientFormValues = {
  fullName: string;
  phone: string;
  email: string;
  dni: string;
  address: string;
  status: Client["status"];
  isStudent: boolean;
  isOwner: boolean;
  notes: string;
};

type RoleFilter = "all" | "students" | "owners" | "both";

const emptyFormValues: ClientFormValues = {
  fullName: "",
  phone: "",
  email: "",
  dni: "",
  address: "",
  status: "ACTIVE",
  isStudent: false,
  isOwner: false,
  notes: "",
};

const inputClassName =
  "h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text placeholder:text-brand-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";
const textareaClassName =
  "w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text placeholder:text-brand-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary";

const statusLabels: Record<Client["status"], string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  LEAD: "Lead",
};

const roleFilterLabels: Record<RoleFilter, string> = {
  all: "Todos",
  students: "Solo alumnos",
  owners: "Solo propietarios",
  both: "Ambos",
};

const toFormValues = (client: Client): ClientFormValues => ({
  fullName: client.fullName,
  phone: client.phone ?? "",
  email: client.email ?? "",
  dni: client.dni ?? "",
  address: client.address ?? "",
  status: client.status,
  isStudent: client.isStudent,
  isOwner: client.isOwner,
  notes: client.notes ?? "",
});

function ClientRoleBadges({ client }: { client: Client }) {
  if (!client.isStudent && !client.isOwner) {
    return <span className="text-sm text-brand-secondary">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {client.isStudent && (
        <span className="inline-flex rounded-full border border-brand-border bg-brand-background px-2.5 py-1 text-xs font-semibold text-brand-text">
          Alumno
        </span>
      )}
      {client.isOwner && (
        <span className="inline-flex rounded-full border border-brand-border bg-brand-background px-2.5 py-1 text-xs font-semibold text-brand-text">
          Propietario
        </span>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const router = useRouter();
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formValues, setFormValues] = useState<ClientFormValues>(emptyFormValues);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClients = useCallback(async (centerId: string) => {
    const nextClients = await getClients(centerId);
    setClients(nextClients);
  }, []);

  useEffect(() => {
    if (!activeCenterId) {
      setClients([]);
      setEditingClient(null);
      setFormValues(emptyFormValues);
      setIsFormOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    loadClients(activeCenterId)
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudieron cargar los clientes.");
      })
      .finally(() => setLoading(false));
  }, [activeCenterId, loadClients]);

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "students" && client.isStudent) ||
        (roleFilter === "owners" && client.isOwner) ||
        (roleFilter === "both" && client.isStudent && client.isOwner);

      if (!matchesRole) return false;
      if (!normalizedSearch) return true;

      return [
        client.fullName,
        client.phone ?? "",
        client.email ?? "",
        client.dni ?? "",
        client.address ?? "",
        statusLabels[client.status],
        client.isStudent ? "Alumno" : "",
        client.isOwner ? "Propietario" : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [clients, roleFilter, searchTerm]);

  const resetEditor = () => {
    setEditingClient(null);
    setFormValues(emptyFormValues);
    setError(null);
  };

  const openCreateClient = () => {
    setEditingClient(null);
    setFormValues(emptyFormValues);
    setError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetEditor();
  };

  const onEditClient = (client: Client) => {
    setEditingClient(client);
    setFormValues(toFormValues(client));
    setError(null);
    setIsFormOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        fullName: formValues.fullName,
        phone: formValues.phone,
        email: formValues.email,
        dni: formValues.dni,
        address: formValues.address,
        status: formValues.status,
        isStudent: formValues.isStudent,
        isOwner: formValues.isOwner,
        notes: formValues.notes,
      };

      if (editingClient) {
        await updateClient(activeCenterId, editingClient.id, payload);
      } else {
        await createClient(activeCenterId, payload);
      }

      await loadClients(activeCenterId);
      resetEditor();
      setIsFormOpen(false);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el cliente.");
    } finally {
      setSaving(false);
    }
  };

  const onDeleteClient = async (client: Client) => {
    if (!activeCenterId) return;
    const confirmed = window.confirm(`Eliminar cliente "${client.fullName}"?`);
    if (!confirmed) return;

    setSaving(true);
    setError(null);

    try {
      await deleteClient(activeCenterId, client.id);
      await loadClients(activeCenterId);

      if (editingClient?.id === client.id) {
        resetEditor();
        setIsFormOpen(false);
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el cliente.");
    } finally {
      setSaving(false);
    }
  };

  const openClientDetail = (clientId: string) => {
    router.push(`/clientes/${clientId}`);
  };

  const onClientRowKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, clientId: string) => {
    const target = event.target as HTMLElement;
    if (target.closest("button,a")) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openClientDetail(clientId);
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando clientes...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Clientes"
        subtitle="Gestiona alumnos, propietarios y clientes del centro."
        backHref="/dashboard/center"
        primaryActionLabel="Nuevo cliente"
        onPrimaryAction={openCreateClient}
      />

      <div className="app-shell">
        {guardError && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {memberships.length > 1 && (
          <section className="w-full rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
            <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
              Cambiar centro activo
            </label>
            <select
              id="center-selector"
              value={activeCenterId ?? ""}
              onChange={(event) => setActiveCenterId(event.target.value)}
              className={inputClassName}
            >
              {memberships.map((membership) => (
                <option key={membership.centerId} value={membership.centerId}>
                  {membership.centerName} ({membership.role})
                </option>
              ))}
            </select>
          </section>
        )}

        {!activeCenterId ? (
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
            No tienes centro asignado.
          </section>
        ) : (
          <section>
            <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">Listado</h2>
                  <p className="text-sm text-brand-secondary">
                    {loading ? "Cargando..." : `${filteredClients.length} clientes registrados.`}
                  </p>
                </div>

                <div className="w-full md:max-w-sm">
                  <label htmlFor="client-search" className="mb-2 block text-sm text-brand-secondary">
                    Buscar cliente
                  </label>
                  <input
                    id="client-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Nombre, teléfono, email..."
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {(Object.keys(roleFilterLabels) as RoleFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setRoleFilter(filter)}
                    className={`inline-flex h-10 items-center rounded-xl border px-3 text-sm font-semibold transition ${
                      roleFilter === filter
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-brand-border bg-white text-brand-text hover:border-brand-primary hover:text-brand-primary"
                    }`}
                  >
                    {roleFilterLabels[filter]}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white/70">
                <table className="w-full min-w-[62rem] text-sm">
                  <thead>
                    <tr className="border-b border-brand-border text-left text-brand-secondary">
                      <th className="px-4 py-3 font-semibold">Nombre</th>
                      <th className="px-4 py-3 font-semibold">Roles</th>
                      <th className="px-4 py-3 font-semibold">Teléfono</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">DNI</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-brand-secondary">
                          Cargando clientes...
                        </td>
                      </tr>
                    ) : filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-brand-secondary">
                          Aún no hay clientes registrados.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr
                          key={client.id}
                          tabIndex={0}
                          onClick={() => openClientDetail(client.id)}
                          onKeyDown={(event) => onClientRowKeyDown(event, client.id)}
                          className="cursor-pointer border-b border-brand-border transition hover:bg-brand-background/70 focus-visible:bg-brand-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary last:border-0"
                        >
                          <td className="px-4 py-3 font-medium text-brand-text">
                            <Link
                              href={`/clientes/${client.id}`}
                              className="hover:text-brand-primary hover:underline"
                            >
                              {client.fullName}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <ClientRoleBadges client={client} />
                          </td>
                          <td className="px-4 py-3 text-brand-secondary">{client.phone ?? "-"}</td>
                          <td className="px-4 py-3 text-brand-secondary">{client.email ?? "-"}</td>
                          <td className="px-4 py-3 text-brand-secondary">{client.dni ?? "-"}</td>
                          <td className="px-4 py-3 text-brand-secondary">
                            <span className="inline-flex rounded-full border border-brand-border bg-brand-background px-2.5 py-1 text-xs font-semibold">
                              {statusLabels[client.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onEditClient(client);
                                }}
                                className="inline-flex h-9 items-center rounded-xl border border-brand-border px-3 text-sm font-medium text-brand-text transition hover:border-brand-primary hover:text-brand-primary"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void onDeleteClient(client);
                                }}
                                disabled={saving}
                                className="inline-flex h-9 items-center rounded-xl border border-red-200 px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            {false && (
            <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">
                    {editingClient ? "Editar cliente" : "Nuevo cliente"}
                  </h2>
                  <p className="text-sm text-brand-secondary">
                    Datos básicos del cliente del centro.
                  </p>
                </div>

                {editingClient && (
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <form onSubmit={onSubmit} className="grid gap-3">
                <div>
                  <label htmlFor="client-full-name" className="text-sm font-medium text-brand-secondary">
                    Nombre completo
                  </label>
                  <input
                    id="client-full-name"
                    value={formValues.fullName}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    className={`${inputClassName} mt-1`}
                    required
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor="client-phone" className="text-sm font-medium text-brand-secondary">
                      Teléfono
                    </label>
                    <input
                      id="client-phone"
                      value={formValues.phone}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      className={`${inputClassName} mt-1`}
                    />
                  </div>
                  <div>
                    <label htmlFor="client-dni" className="text-sm font-medium text-brand-secondary">
                      DNI
                    </label>
                    <input
                      id="client-dni"
                      value={formValues.dni}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, dni: event.target.value }))
                      }
                      className={`${inputClassName} mt-1`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="client-email" className="text-sm font-medium text-brand-secondary">
                    Email
                  </label>
                  <input
                    id="client-email"
                    type="email"
                    value={formValues.email}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className={`${inputClassName} mt-1`}
                  />
                </div>

                <div>
                  <label htmlFor="client-address" className="text-sm font-medium text-brand-secondary">
                    Dirección
                  </label>
                  <input
                    id="client-address"
                    value={formValues.address}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, address: event.target.value }))
                    }
                    className={`${inputClassName} mt-1`}
                  />
                </div>

                <div className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                  <p className="text-sm font-medium text-brand-secondary">Roles</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-border bg-white px-3 text-sm font-medium text-brand-text">
                      <input
                        type="checkbox"
                        checked={formValues.isStudent}
                        onChange={(event) =>
                          setFormValues((prev) => ({ ...prev, isStudent: event.target.checked }))
                        }
                        className="h-4 w-4 accent-brand-primary"
                      />
                      Alumno
                    </label>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-border bg-white px-3 text-sm font-medium text-brand-text">
                      <input
                        type="checkbox"
                        checked={formValues.isOwner}
                        onChange={(event) =>
                          setFormValues((prev) => ({ ...prev, isOwner: event.target.checked }))
                        }
                        className="h-4 w-4 accent-brand-primary"
                      />
                      Propietario
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="client-status" className="text-sm font-medium text-brand-secondary">
                    Estado
                  </label>
                  <select
                    id="client-status"
                    value={formValues.status}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        status: event.target.value as Client["status"],
                      }))
                    }
                    className={`${inputClassName} mt-1`}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="LEAD">Lead</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="client-notes" className="text-sm font-medium text-brand-secondary">
                    Notas
                  </label>
                  <textarea
                    id="client-notes"
                    rows={4}
                    value={formValues.notes}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    className={`${textareaClassName} mt-1`}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
                  >
                    {saving
                      ? "Guardando..."
                      : editingClient
                        ? "Guardar cambios"
                        : "Crear cliente"}
                  </button>
                </div>
              </form>
            </article>
            )}
          </section>
        )}
      </div>

      {isFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="client-form-title"
        >
          <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-brand-border bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-border bg-brand-background/70 px-5 py-4">
              <div>
                <h2 id="client-form-title" className="text-lg font-semibold text-brand-text">
                  {editingClient ? "Editar cliente" : "Nuevo cliente"}
                </h2>
                <p className="text-sm text-brand-secondary">
                  Datos bÃ¡sicos del cliente del centro.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-text transition hover:border-brand-primary hover:text-brand-primary"
                aria-label="Cerrar formulario"
              >
                x
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {error && (
                <p className="mb-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <form onSubmit={onSubmit} className="grid gap-3">
                <div>
                  <label htmlFor="modal-client-full-name" className="text-sm font-medium text-brand-secondary">
                    Nombre completo
                  </label>
                  <input
                    id="modal-client-full-name"
                    value={formValues.fullName}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, fullName: event.target.value }))
                    }
                    className={`${inputClassName} mt-1`}
                    required
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor="modal-client-phone" className="text-sm font-medium text-brand-secondary">
                      TelÃ©fono
                    </label>
                    <input
                      id="modal-client-phone"
                      value={formValues.phone}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, phone: event.target.value }))
                      }
                      className={`${inputClassName} mt-1`}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-client-dni" className="text-sm font-medium text-brand-secondary">
                      DNI
                    </label>
                    <input
                      id="modal-client-dni"
                      value={formValues.dni}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, dni: event.target.value }))
                      }
                      className={`${inputClassName} mt-1`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-client-email" className="text-sm font-medium text-brand-secondary">
                    Email
                  </label>
                  <input
                    id="modal-client-email"
                    type="email"
                    value={formValues.email}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className={`${inputClassName} mt-1`}
                  />
                </div>

                <div>
                  <label htmlFor="modal-client-address" className="text-sm font-medium text-brand-secondary">
                    DirecciÃ³n
                  </label>
                  <input
                    id="modal-client-address"
                    value={formValues.address}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, address: event.target.value }))
                    }
                    className={`${inputClassName} mt-1`}
                  />
                </div>

                <div className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                  <p className="text-sm font-medium text-brand-secondary">Roles</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-border bg-white px-3 text-sm font-medium text-brand-text">
                      <input
                        type="checkbox"
                        checked={formValues.isStudent}
                        onChange={(event) =>
                          setFormValues((prev) => ({ ...prev, isStudent: event.target.checked }))
                        }
                        className="h-4 w-4 accent-brand-primary"
                      />
                      Alumno
                    </label>
                    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-brand-border bg-white px-3 text-sm font-medium text-brand-text">
                      <input
                        type="checkbox"
                        checked={formValues.isOwner}
                        onChange={(event) =>
                          setFormValues((prev) => ({ ...prev, isOwner: event.target.checked }))
                        }
                        className="h-4 w-4 accent-brand-primary"
                      />
                      Propietario
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="modal-client-status" className="text-sm font-medium text-brand-secondary">
                    Estado
                  </label>
                  <select
                    id="modal-client-status"
                    value={formValues.status}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        status: event.target.value as Client["status"],
                      }))
                    }
                    className={`${inputClassName} mt-1`}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                    <option value="LEAD">Lead</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="modal-client-notes" className="text-sm font-medium text-brand-secondary">
                    Notas
                  </label>
                  <textarea
                    id="modal-client-notes"
                    rows={4}
                    value={formValues.notes}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    className={`${textareaClassName} mt-1`}
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-5 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:text-brand-primary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
                  >
                    {saving
                      ? "Guardando..."
                      : editingClient
                        ? "Guardar cambios"
                        : "Crear cliente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

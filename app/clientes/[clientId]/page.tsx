"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ComponentProps, useEffect, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { HorseForm } from "@/components/stables/forms";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrors";
import {
  createHorse,
  CreateHorseInput,
  getHorseListItemsByCenter,
  HorseListItem,
  horseFormValuesToPayload,
  uploadHorsePhoto,
} from "@/lib/horses";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { Client, getClientById } from "@/lib/services";

const statusLabels: Record<Client["status"], string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  LEAD: "Lead",
};

const horseStatusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  RESTING: "Descanso",
  RECOVERING: "Recuperación",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
};

const emptyValue = "Sin registrar";

const filterOwnerHorses = (horseItems: HorseListItem[], ownerId: string): HorseListItem[] =>
  horseItems.filter((item) => item.ownerId === ownerId || item.horse.ownerId === ownerId);

const formatDate = (client: Client): string => {
  const value = client.createdAt?.toDate();
  return value ? value.toLocaleDateString("es-ES") : emptyValue;
};

type InfoItemProps = {
  label: string;
  value?: string | null;
};

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-brand-text">
        {value?.trim() || emptyValue}
      </p>
    </div>
  );
}

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = typeof params.clientId === "string" ? params.clientId : "";

  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [client, setClient] = useState<Client | null>(null);
  const [linkedHorses, setLinkedHorses] = useState<HorseListItem[]>([]);
  const [isHorseFormOpen, setIsHorseFormOpen] = useState(false);
  const [savingHorse, setSavingHorse] = useState(false);
  const [horseError, setHorseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId || !clientId) {
      setClient(null);
      setLinkedHorses([]);
      setIsHorseFormOpen(false);
      setHorseError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadClient = async () => {
      setLoading(true);
      setError(null);

      try {
        const [nextClient, horseItems] = await Promise.all([
          getClientById(activeCenterId, clientId),
          getHorseListItemsByCenter(activeCenterId),
        ]);
        if (!isMounted) return;
        setClient(nextClient);
        setLinkedHorses(
          nextClient?.isOwner
            ? filterOwnerHorses(horseItems, nextClient.id)
            : []
        );
      } catch (loadError) {
        console.error(loadError);
        if (isMounted) {
          setError("No se pudo cargar la ficha del cliente.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadClient();

    return () => {
      isMounted = false;
    };
  }, [activeCenterId, clientId]);

  const closeHorseForm = () => {
    setIsHorseFormOpen(false);
    setHorseError(null);
  };

  const handleCreateHorse = async (
    values: Parameters<ComponentProps<typeof HorseForm>["onSubmit"]>[0],
    photoFile: File | null
  ) => {
    if (!activeCenterId || !client) return;

    setSavingHorse(true);
    setHorseError(null);

    try {
      const payload = horseFormValuesToPayload(values) as CreateHorseInput;
      payload.ownerId = client.id;
      payload.ownerName = client.fullName;

      const horseId = await createHorse(activeCenterId, payload);
      if (photoFile) {
        await uploadHorsePhoto(activeCenterId, horseId, photoFile);
      }

      const horseItems = await getHorseListItemsByCenter(activeCenterId);
      setLinkedHorses(filterOwnerHorses(horseItems, client.id));
      closeHorseForm();
    } catch (saveError) {
      console.error(saveError);
      setHorseError(getFirebaseErrorMessage(saveError, "No se pudo crear el caballo."));
    } finally {
      setSavingHorse(false);
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando cliente...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={client?.fullName ?? "Cliente"}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/clientes"
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

        {loading ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-brand-secondary">Cargando ficha...</p>
          </section>
        ) : !client ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-brand-secondary">
              No se ha encontrado el cliente solicitado dentro del centro activo.
            </p>
            <Link
              href="/clientes"
              className="mt-4 inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text"
            >
              Volver
            </Link>
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-secondary">
                    Detalle de cliente
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-brand-text">
                    {client.fullName}
                  </h2>
                </div>
                <span className="inline-flex w-fit rounded-full border border-brand-border bg-brand-background px-3 py-1.5 text-sm font-semibold text-brand-text">
                  {statusLabels[client.status]}
                </span>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="Nombre completo" value={client.fullName} />
              <InfoItem label="Teléfono" value={client.phone} />
              <InfoItem label="Email" value={client.email} />
              <InfoItem label="DNI" value={client.dni} />
              <InfoItem label="Dirección" value={client.address} />
              <InfoItem label="Estado" value={statusLabels[client.status]} />
              <InfoItem label="Fecha de alta" value={formatDate(client)} />
            </section>

            <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                Notas
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-brand-secondary">
                {client.notes?.trim() || "No hay notas registradas."}
              </p>
            </section>

            {client.isStudent && (
              <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">
                    Información de alumno
                  </h2>
                  <p className="text-sm text-brand-secondary">
                    Datos formativos asociados al cliente.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoItem label="Tipo" value="Alumno" />
                  <InfoItem label="Estado" value={statusLabels[client.status]} />
                  <InfoItem label="Teléfono" value={client.phone} />
                  <InfoItem label="Email" value={client.email} />
                </div>

                <div className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                    Notas
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-brand-secondary">
                    {client.notes?.trim() || "No hay notas registradas."}
                  </p>
                </div>

                <p className="mt-4 rounded-2xl border border-dashed border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
                  No hay información académica adicional registrada.
                </p>
              </section>
            )}

            {client.isOwner && (
              <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">
                    Información de propietario
                  </h2>
                  <p className="text-sm text-brand-secondary">
                    Datos básicos y espacio reservado para futuras vinculaciones.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InfoItem label="Nombre completo" value={client.fullName} />
                  <InfoItem label="Teléfono" value={client.phone} />
                  <InfoItem label="Email" value={client.email} />
                  <InfoItem label="DNI" value={client.dni} />
                  <InfoItem label="Dirección" value={client.address} />
                  <InfoItem label="Estado" value={statusLabels[client.status]} />
                </div>

                <div className="mt-4 rounded-2xl border border-brand-border bg-white/70 p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                    <h3 className="text-base font-semibold text-brand-text">
                      Caballos vinculados
                    </h3>
                    <p className="text-sm text-brand-secondary">
                      Relación leída desde los caballos actuales del centro.
                    </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setHorseError(null);
                        setIsHorseFormOpen(true);
                      }}
                      className="inline-flex h-10 w-fit items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                    >
                      Añadir caballo
                    </button>
                  </div>

                  {linkedHorses.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-brand-border bg-brand-background/50 p-5 text-sm text-brand-secondary">
                      Este propietario todavía no tiene caballos vinculados.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white">
                      <table className="w-full min-w-[36rem] text-sm">
                        <thead>
                          <tr className="border-b border-brand-border text-left text-brand-secondary">
                            <th className="px-4 py-3 font-semibold">Nombre caballo</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 font-semibold">Cuadra asignada</th>
                          </tr>
                        </thead>
                        <tbody>
                          {linkedHorses.map((item) => (
                            <tr
                              key={item.horse.id}
                              className="cursor-pointer border-b border-brand-border transition hover:bg-brand-background/70 last:border-0"
                            >
                              <td className="px-4 py-3 font-medium text-brand-text">
                                <Link
                                  href={`/dashboard/center/stables/${item.horse.id}`}
                                  className="block hover:text-brand-primary hover:underline"
                                >
                                  {item.horse.name}
                                </Link>
                              </td>
                              <td className="px-4 py-3 text-brand-secondary">
                                <span className="inline-flex rounded-full border border-brand-border bg-brand-background px-2.5 py-1 text-xs font-semibold text-brand-text">
                                  {horseStatusLabels[item.horse.status] ?? item.horse.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-brand-secondary">
                                {item.assignedBox || "Sin asignar"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            <div>
              <Link
                href="/clientes"
                className="inline-flex h-11 items-center rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:text-brand-primary"
              >
                Volver
              </Link>
            </div>
          </>
        )}
      </div>

      {client?.isOwner && isHorseFormOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="horse-form-title"
        >
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-brand-border bg-brand-background shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-brand-border bg-white/80 px-5 py-4">
              <div>
                <h2 id="horse-form-title" className="text-lg font-semibold text-brand-text">
                  Añadir caballo
                </h2>
                <p className="text-sm text-brand-secondary">
                  El caballo quedará vinculado a {client.fullName}.
                </p>
              </div>
              <button
                type="button"
                onClick={closeHorseForm}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white text-brand-text transition hover:border-brand-primary hover:text-brand-primary"
                aria-label="Cerrar formulario"
              >
                x
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {horseError && (
                <p className="mb-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                  {horseError}
                </p>
              )}

              <HorseForm
                mode="create"
                ownerOptions={[{ id: client.id, label: client.fullName }]}
                defaultHorse={{
                  ownerId: client.id,
                  ownerName: client.fullName,
                  ownerContact: {
                    name: client.fullName,
                    phone: client.phone,
                    email: client.email,
                    address: client.address,
                  },
                }}
                submitting={savingHorse}
                onSubmit={handleCreateHorse}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

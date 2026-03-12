"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { PaddockAssignmentForm } from "@/components/center/paddocks/PaddockAssignmentForm";
import { PaddockForm } from "@/components/center/paddocks/PaddockForm";
import { PaddockOccupancyBadge } from "@/components/center/paddocks/PaddockOccupancyBadge";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getHorseListItemsByCenter, HorseListItem } from "@/lib/horses";
import {
  closePaddockAssignment,
  deletePaddock,
  getAssignmentsByPaddock,
  getPaddockById,
  moveHorseToPaddock,
  Paddock,
  PaddockAssignment,
  updatePaddock,
} from "@/lib/services";

type AssignmentViewItem = PaddockAssignment & {
  horseName: string;
  ownerLabel: string;
};

export default function CenterPaddockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paddockId = params?.paddockId as string;
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
    userId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [paddock, setPaddock] = useState<Paddock | null>(null);
  const [assignments, setAssignments] = useState<PaddockAssignment[]>([]);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string, currentPaddockId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [nextPaddock, nextAssignments, nextHorses] = await Promise.all([
        getPaddockById(centerId, currentPaddockId),
        getAssignmentsByPaddock(centerId, currentPaddockId),
        getHorseListItemsByCenter(centerId),
      ]);

      setPaddock(nextPaddock);
      setAssignments(nextAssignments);
      setHorses(nextHorses);
      if (!nextPaddock) {
        setError("No se encontró el paddock.");
      }
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el paddock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId || !paddockId) {
      setLoading(false);
      return;
    }
    void loadData(activeCenterId, paddockId);
  }, [activeCenterId, paddockId]);

  const horseMap = useMemo(
    () => new Map(horses.map((item) => [item.horse.id, item])),
    [horses]
  );

  const activeAssignments = useMemo<AssignmentViewItem[]>(
    () =>
      assignments
        .filter((item) => item.status === "ACTIVE")
        .map((item) => ({
          ...item,
          horseName: horseMap.get(item.horseId)?.horse.name ?? item.horseId,
          ownerLabel: horseMap.get(item.horseId)?.ownerLabel ?? "Sin propietario",
        })),
    [assignments, horseMap]
  );

  const historyAssignments = useMemo<AssignmentViewItem[]>(
    () =>
      assignments
        .filter((item) => item.status !== "ACTIVE")
        .map((item) => ({
          ...item,
          horseName: horseMap.get(item.horseId)?.horse.name ?? item.horseId,
          ownerLabel: horseMap.get(item.horseId)?.ownerLabel ?? "Sin propietario",
        })),
    [assignments, horseMap]
  );

  if (guardLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando paddock...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={paddock?.name ?? "Paddock"}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center/paddocks"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
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
          <section className="max-w-xl rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
            <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
              Cambiar centro activo
            </label>
            <select
              id="center-selector"
              value={activeCenterId ?? ""}
              onChange={(event) => setActiveCenterId(event.target.value)}
              className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
            >
              {memberships.map((membership) => (
                <option key={membership.centerId} value={membership.centerId}>
                  {membership.centerName} ({membership.role})
                </option>
              ))}
            </select>
          </section>
        )}

        {!activeCenterId || !paddock ? (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 text-sm text-brand-secondary">
            No se ha encontrado el paddock solicitado.
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-brand-secondary">{paddock.code || "Sin código"}</p>
                    <h2 className="text-xl font-semibold text-brand-text">{paddock.name}</h2>
                  </div>
                  <PaddockOccupancyBadge
                    occupied={activeAssignments.length}
                    maxCapacity={paddock.maxCapacity}
                  />
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-brand-secondary">Tipo</dt>
                    <dd className="font-medium text-brand-text">{paddock.type}</dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Estado</dt>
                    <dd className="font-medium text-brand-text">{paddock.status}</dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Superficie</dt>
                    <dd className="font-medium text-brand-text">{paddock.surface || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Ubicación</dt>
                    <dd className="font-medium text-brand-text">{paddock.location || "-"}</dd>
                  </div>
                </dl>

                {(paddock.specialConditions || paddock.notes) && (
                  <div className="mt-4 space-y-3">
                    {paddock.specialConditions && (
                      <div className="rounded-2xl bg-brand-background/60 p-3 text-sm">
                        <p className="font-semibold text-brand-text">Condiciones especiales</p>
                        <p className="mt-1 text-brand-secondary">{paddock.specialConditions}</p>
                      </div>
                    )}
                    {paddock.notes && (
                      <div className="rounded-2xl bg-brand-background/60 p-3 text-sm">
                        <p className="font-semibold text-brand-text">Notas</p>
                        <p className="mt-1 text-brand-secondary">{paddock.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeCenterId || !paddock) return;
                      if (!window.confirm(`Eliminar ${paddock.name}?`)) return;
                      setSaving(true);
                      setError(null);
                      try {
                        await deletePaddock(activeCenterId, paddock.id);
                        router.push("/dashboard/center/paddocks");
                      } catch (deleteError) {
                        console.error(deleteError);
                        setError(
                          deleteError instanceof Error
                            ? deleteError.message
                            : "No se pudo eliminar el paddock."
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="inline-flex h-11 items-center rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700"
                  >
                    Eliminar paddock
                  </button>
                </div>
              </article>

              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Editar paddock</h2>
                  <p className="text-sm text-brand-secondary">
                    Ajusta capacidad, estado y condiciones sin salir de la ficha.
                  </p>
                </div>
                <PaddockForm
                  defaultValues={paddock}
                  submitLabel="Guardar cambios"
                  submitting={saving}
                  onSubmit={async (values) => {
                    if (!activeCenterId || !paddock) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await updatePaddock(activeCenterId, paddock.id, {
                        name: values.name,
                        code: values.code,
                        maxCapacity: Number(values.maxCapacity),
                        type: values.type,
                        status: values.status,
                        surface: values.surface,
                        location: values.location,
                        notes: values.notes,
                        specialConditions: values.specialConditions,
                      });
                      await loadData(activeCenterId, paddock.id);
                    } catch (saveError) {
                      console.error(saveError);
                      setError(
                        saveError instanceof Error
                          ? saveError.message
                          : "No se pudo actualizar el paddock."
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Rotación</h2>
                  <p className="text-sm text-brand-secondary">
                    Asigna un caballo nuevo o muévelo desde otro paddock.
                  </p>
                </div>
                <PaddockAssignmentForm
                  horses={horses}
                  submitting={saving}
                  onSubmit={async (values) => {
                    if (!activeCenterId || !paddock) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await moveHorseToPaddock(activeCenterId, {
                        horseId: values.horseId,
                        toPaddockId: paddock.id,
                        assignedByUid: userId ?? "system",
                        startAt: new Date(`${values.startAt}T08:00:00`),
                        reason: values.reason,
                        notes: values.notes,
                      });
                      await loadData(activeCenterId, paddock.id);
                    } catch (saveError) {
                      console.error(saveError);
                      setError(
                        saveError instanceof Error
                          ? saveError.message
                          : "No se pudo registrar la rotación."
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              </article>

              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-brand-text">Caballos activos</h2>
                    <p className="text-sm text-brand-secondary">
                      Vista rápida de ocupación actual del paddock.
                    </p>
                  </div>
                  <PaddockOccupancyBadge
                    occupied={activeAssignments.length}
                    maxCapacity={paddock.maxCapacity}
                  />
                </div>
                {activeAssignments.length === 0 ? (
                  <p className="text-sm text-brand-secondary">No hay caballos activos en este paddock.</p>
                ) : (
                  <div className="space-y-3">
                    {activeAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="rounded-2xl border border-brand-border bg-brand-background/50 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-brand-text">{assignment.horseName}</p>
                            <p className="text-sm text-brand-secondary">{assignment.ownerLabel}</p>
                            <p className="text-xs text-brand-secondary">
                              Entrada: {assignment.startAt.toDate().toLocaleDateString("es-ES")}
                            </p>
                            {assignment.reason && (
                              <p className="mt-1 text-xs text-brand-secondary">
                                Motivo: {assignment.reason}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeCenterId || !paddock) return;
                              setSaving(true);
                              setError(null);
                              try {
                                await closePaddockAssignment(activeCenterId, {
                                  assignmentId: assignment.id,
                                  endAt: new Date(),
                                  status: "COMPLETED",
                                  reason: "Salida del paddock",
                                });
                                await loadData(activeCenterId, paddock.id);
                              } catch (closeError) {
                                console.error(closeError);
                                setError(
                                  closeError instanceof Error
                                    ? closeError.message
                                    : "No se pudo registrar la salida."
                                );
                              } finally {
                                setSaving(false);
                              }
                            }}
                            className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text"
                          >
                            Registrar salida
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-brand-text">Historial</h2>
                <p className="text-sm text-brand-secondary">
                  Entradas y salidas registradas para este paddock.
                </p>
              </div>
              {historyAssignments.length === 0 ? (
                <p className="text-sm text-brand-secondary">Sin historial todavía.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-brand-border text-left text-brand-secondary">
                      <tr>
                        <th className="py-2 pr-4">Caballo</th>
                        <th className="py-2 pr-4">Entrada</th>
                        <th className="py-2 pr-4">Salida</th>
                        <th className="py-2 pr-4">Estado</th>
                        <th className="py-2 pr-4">Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyAssignments.map((assignment) => (
                        <tr key={assignment.id} className="border-b border-brand-border">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-brand-text">{assignment.horseName}</div>
                            <div className="text-xs text-brand-secondary">{assignment.ownerLabel}</div>
                          </td>
                          <td className="py-3 pr-4">
                            {assignment.startAt.toDate().toLocaleDateString("es-ES")}
                          </td>
                          <td className="py-3 pr-4">
                            {assignment.endAt
                              ? assignment.endAt.toDate().toLocaleDateString("es-ES")
                              : "-"}
                          </td>
                          <td className="py-3 pr-4">{assignment.status}</td>
                          <td className="py-3 pr-4">{assignment.reason || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <Link
                href="/dashboard/center/paddocks"
                className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
              >
                Volver al listado
              </Link>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

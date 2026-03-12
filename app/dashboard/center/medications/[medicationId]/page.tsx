"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { MedicationForm } from "@/components/center/medications/MedicationForm";
import { StockAlertBadge } from "@/components/center/medications/StockAlertBadge";
import { TreatmentForm } from "@/components/center/medications/TreatmentForm";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getHorseListItemsByCenter, HorseListItem } from "@/lib/horses";
import {
  createHorseTreatment,
  deleteHorseTreatment,
  deleteMedication,
  getHorseTreatments,
  getMedicationById,
  getMedicationInventory,
  HorseTreatment,
  Medication,
  MedicationInventoryItem,
  updateMedication,
} from "@/lib/services";

export default function CenterMedicationDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const medicationId = params?.medicationId as string;
  const horseIdFilter = searchParams.get("horseId");
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [medication, setMedication] = useState<Medication | null>(null);
  const [inventoryItem, setInventoryItem] = useState<MedicationInventoryItem | null>(null);
  const [treatments, setTreatments] = useState<HorseTreatment[]>([]);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string, currentMedicationId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [nextMedication, inventory, nextTreatments, nextHorses] = await Promise.all([
        getMedicationById(centerId, currentMedicationId),
        getMedicationInventory(centerId),
        getHorseTreatments(centerId, {
          medicationId: currentMedicationId,
          horseId: horseIdFilter ?? undefined,
        }),
        getHorseListItemsByCenter(centerId),
      ]);

      setMedication(nextMedication);
      setInventoryItem(
        inventory.find((item) => item.medication.id === currentMedicationId) ?? null
      );
      setTreatments(nextTreatments);
      setHorses(nextHorses);
      if (!nextMedication) {
        setError("No se encontró el medicamento.");
      }
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el medicamento.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId || !medicationId) {
      setLoading(false);
      return;
    }
    void loadData(activeCenterId, medicationId);
  }, [activeCenterId, medicationId, horseIdFilter]);

  const horseMap = useMemo(
    () => new Map(horses.map((item) => [item.horse.id, item])),
    [horses]
  );

  if (guardLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando medicamento...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={medication?.name ?? "Medicamento"}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center/medications"
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

        {!activeCenterId || !medication ? (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 text-sm text-brand-secondary">
            No se encontró el medicamento solicitado.
          </section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-brand-secondary">{medication.category || "Sin categoría"}</p>
                    <h2 className="text-xl font-semibold text-brand-text">{medication.name}</h2>
                  </div>
                  {inventoryItem && <StockAlertBadge item={inventoryItem} />}
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-brand-secondary">Stock</dt>
                    <dd className="font-medium text-brand-text">
                      {medication.stock} {medication.unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Dosis recomendada</dt>
                    <dd className="font-medium text-brand-text">
                      {typeof medication.recommendedDose === "number"
                        ? medication.recommendedDose
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Lote</dt>
                    <dd className="font-medium text-brand-text">{medication.batch || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Caducidad</dt>
                    <dd className="font-medium text-brand-text">
                      {medication.expiryDate
                        ? medication.expiryDate.toDate().toLocaleDateString("es-ES")
                        : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Proveedor</dt>
                    <dd className="font-medium text-brand-text">{medication.supplier || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-brand-secondary">Ubicación</dt>
                    <dd className="font-medium text-brand-text">{medication.storageLocation || "-"}</dd>
                  </div>
                </dl>

                {(medication.description || medication.notes) && (
                  <div className="mt-4 space-y-3">
                    {medication.description && (
                      <div className="rounded-2xl bg-brand-background/60 p-3 text-sm text-brand-secondary">
                        {medication.description}
                      </div>
                    )}
                    {medication.notes && (
                      <div className="rounded-2xl bg-brand-background/60 p-3 text-sm text-brand-secondary">
                        {medication.notes}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeCenterId || !medication) return;
                      if (!window.confirm(`Eliminar ${medication.name}?`)) return;
                      setSaving(true);
                      setError(null);
                      try {
                        await deleteMedication(activeCenterId, medication.id);
                        router.push("/dashboard/center/medications");
                      } catch (deleteError) {
                        console.error(deleteError);
                        setError(
                          deleteError instanceof Error
                            ? deleteError.message
                            : "No se pudo eliminar el medicamento."
                        );
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="inline-flex h-11 items-center rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-700"
                  >
                    Eliminar medicamento
                  </button>
                </div>
              </article>

              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Editar medicamento</h2>
                </div>
                <MedicationForm
                  defaultValues={medication}
                  submitLabel="Guardar cambios"
                  submitting={saving}
                  onSubmit={async (values) => {
                    if (!activeCenterId || !medication) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await updateMedication(activeCenterId, medication.id, {
                        name: values.name,
                        category: values.category,
                        description: values.description,
                        stock: Number(values.stock),
                        unit: values.unit,
                        recommendedDose: values.recommendedDose ? Number(values.recommendedDose) : undefined,
                        batch: values.batch,
                        expiryDate: values.expiryDate ? new Date(`${values.expiryDate}T00:00:00`) : undefined,
                        supplier: values.supplier,
                        storageLocation: values.storageLocation,
                        notes: values.notes,
                      });
                      await loadData(activeCenterId, medication.id);
                    } catch (saveError) {
                      console.error(saveError);
                      setError(
                        saveError instanceof Error
                          ? saveError.message
                          : "No se pudo actualizar el medicamento."
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
                  <h2 className="text-lg font-semibold text-brand-text">Nuevo tratamiento</h2>
                  <p className="text-sm text-brand-secondary">
                    Asigna este medicamento a un caballo del centro.
                  </p>
                </div>
                <TreatmentForm
                  horses={horses}
                  medication={medication}
                  submitting={saving}
                  onSubmit={async (values) => {
                    if (!activeCenterId || !medication) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await createHorseTreatment(activeCenterId, {
                        horseId: values.horseId,
                        medicationId: medication.id,
                        startDate: new Date(`${values.startDate}T08:00:00`),
                        endDate: values.endDate ? new Date(`${values.endDate}T08:00:00`) : undefined,
                        dose: Number(values.dose),
                        frequency: values.frequency,
                        administrationRoute: values.administrationRoute,
                        reason: values.reason,
                        notes: values.notes,
                        prescribedBy: values.prescribedBy,
                        status: values.status,
                      });
                      await loadData(activeCenterId, medication.id);
                    } catch (saveError) {
                      console.error(saveError);
                      setError(
                        saveError instanceof Error
                          ? saveError.message
                          : "No se pudo crear el tratamiento."
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
                    <h2 className="text-lg font-semibold text-brand-text">Tratamientos</h2>
                    <p className="text-sm text-brand-secondary">
                      {horseIdFilter
                        ? "Filtrado por caballo desde la ficha."
                        : "Tratamientos activos e históricos de este medicamento."}
                    </p>
                  </div>
                  {horseIdFilter && (
                    <Link
                      href={`/dashboard/center/stables/${horseIdFilter}`}
                      className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text"
                    >
                      Volver al caballo
                    </Link>
                  )}
                </div>

                {treatments.length === 0 ? (
                  <p className="text-sm text-brand-secondary">Sin tratamientos para este medicamento.</p>
                ) : (
                  <div className="space-y-3">
                    {treatments.map((treatment) => {
                      const horse = horseMap.get(treatment.horseId);
                      return (
                        <div
                          key={treatment.id}
                          className="rounded-2xl border border-brand-border bg-brand-background/50 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-brand-text">
                                {horse?.horse.name ?? treatment.horseId}
                              </p>
                              <p className="text-sm text-brand-secondary">
                                {treatment.dose} {medication.unit} · {treatment.administrationRoute}
                              </p>
                              <p className="text-xs text-brand-secondary">
                                {treatment.startDate.toDate().toLocaleDateString("es-ES")}
                                {treatment.endDate
                                  ? ` - ${treatment.endDate.toDate().toLocaleDateString("es-ES")}`
                                  : ""}
                              </p>
                              {treatment.reason && (
                                <p className="mt-1 text-xs text-brand-secondary">
                                  Motivo: {treatment.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex rounded-full bg-brand-background px-2.5 py-1 text-xs font-semibold text-brand-text">
                                {treatment.status}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!activeCenterId) return;
                                  setSaving(true);
                                  setError(null);
                                  try {
                                    await deleteHorseTreatment(activeCenterId, treatment.id);
                                    await loadData(activeCenterId, medication.id);
                                  } catch (deleteError) {
                                    console.error(deleteError);
                                    setError("No se pudo eliminar el tratamiento.");
                                  } finally {
                                    setSaving(false);
                                  }
                                }}
                                className="inline-flex h-9 items-center rounded-xl border border-red-300 px-3 text-xs font-semibold text-red-700"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

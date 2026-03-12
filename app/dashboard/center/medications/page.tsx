"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { MedicationForm } from "@/components/center/medications/MedicationForm";
import { MedicationList } from "@/components/center/medications/MedicationList";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  createMedication,
  getMedicationInventory,
  MedicationInventoryItem,
} from "@/lib/services";

export default function CenterMedicationsPage() {
  const searchParams = useSearchParams();
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

  const [items, setItems] = useState<MedicationInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const nextItems = await getMedicationInventory(centerId);
      setItems(nextItems);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el inventario de medicamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId) {
      setItems([]);
      setLoading(false);
      return;
    }
    void loadData(activeCenterId);
  }, [activeCenterId]);

  const summary = useMemo(() => {
    const total = items.length;
    const lowStock = items.filter((item) => item.lowStock).length;
    const expiringSoon = items.filter((item) => item.expiringSoon || item.expired).length;
    const critical = items.filter((item) => item.alertLevel === "CRITICAL").length;
    return { total, lowStock, expiringSoon, critical };
  }, [items]);

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando medicamentos...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Medicamentos"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
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

        {!activeCenterId ? (
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
            No tienes centro asignado.
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Total</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{summary.total}</p>
              </article>
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Stock bajo</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{summary.lowStock}</p>
              </article>
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Próximos a caducar</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{summary.expiringSoon}</p>
              </article>
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Alertas críticas</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{summary.critical}</p>
              </article>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Inventario</h2>
                  <p className="text-sm text-brand-secondary">
                    {horseIdFilter
                      ? "Selecciona un medicamento para crear un tratamiento a este caballo."
                      : "Stock, caducidad y alertas visuales del centro."}
                  </p>
                </div>
                {loading ? (
                  <p className="text-sm text-brand-secondary">Cargando...</p>
                ) : (
                  <MedicationList items={items} horseId={horseIdFilter} />
                )}
              </article>

              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Nuevo medicamento</h2>
                  <p className="text-sm text-brand-secondary">
                    Añade un medicamento al inventario central.
                  </p>
                </div>
                <MedicationForm
                  submitLabel="Crear medicamento"
                  submitting={saving}
                  onSubmit={async (values) => {
                    if (!activeCenterId) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await createMedication(activeCenterId, {
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
                      await loadData(activeCenterId);
                    } catch (saveError) {
                      console.error(saveError);
                      setError(
                        saveError instanceof Error
                          ? saveError.message
                          : "No se pudo crear el medicamento."
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              </article>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

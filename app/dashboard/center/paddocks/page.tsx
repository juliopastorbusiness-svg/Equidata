"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { PaddockForm } from "@/components/center/paddocks/PaddockForm";
import { PaddockList } from "@/components/center/paddocks/PaddockList";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getHorseListItemsByCenter, HorseListItem } from "@/lib/horses";
import {
  createPaddock,
  getPaddockAssignmentsByCenter,
  getPaddocksByCenter,
  Paddock,
  PaddockAssignment,
} from "@/lib/services";

type PaddockListViewItem = {
  paddock: Paddock;
  occupied: number;
  horseNames: string[];
};

export default function CenterPaddocksPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [paddocks, setPaddocks] = useState<Paddock[]>([]);
  const [assignments, setAssignments] = useState<PaddockAssignment[]>([]);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [nextPaddocks, nextAssignments, nextHorses] = await Promise.all([
        getPaddocksByCenter(centerId),
        getPaddockAssignmentsByCenter(centerId),
        getHorseListItemsByCenter(centerId),
      ]);
      setPaddocks(nextPaddocks);
      setAssignments(nextAssignments);
      setHorses(nextHorses);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el módulo de paddocks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId) {
      setLoading(false);
      setPaddocks([]);
      setAssignments([]);
      setHorses([]);
      return;
    }
    void loadData(activeCenterId);
  }, [activeCenterId]);

  const listItems = useMemo<PaddockListViewItem[]>(() => {
    const horseNameById = new Map(horses.map((item) => [item.horse.id, item.horse.name]));
    const activeAssignments = assignments.filter((item) => item.status === "ACTIVE");

    return paddocks.map((paddock) => {
      const paddockAssignments = activeAssignments.filter(
        (item) => item.paddockId === paddock.id
      );
      return {
        paddock,
        occupied: paddockAssignments.length,
        horseNames: paddockAssignments
          .map((item) => horseNameById.get(item.horseId) ?? item.horseId)
          .sort((left, right) => left.localeCompare(right, "es")),
      };
    });
  }, [assignments, horses, paddocks]);

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando paddocks...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Paddocks"
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
            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Listado</h2>
                  <p className="text-sm text-brand-secondary">
                    Vista rápida de ocupación y caballos en paddock.
                  </p>
                </div>
                {loading ? <p className="text-sm text-brand-secondary">Cargando...</p> : <PaddockList items={listItems} />}
              </article>

              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-brand-text">Nuevo paddock</h2>
                  <p className="text-sm text-brand-secondary">
                    Crea paddocks individuales, compartidos o de rehabilitación.
                  </p>
                </div>
                <PaddockForm
                  submitLabel="Crear paddock"
                  submitting={saving}
                  onSubmit={async (values) => {
                    if (!activeCenterId) return;
                    setSaving(true);
                    setError(null);
                    try {
                      await createPaddock(activeCenterId, {
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
                      await loadData(activeCenterId);
                    } catch (saveError) {
                      console.error(saveError);
                      setError(
                        saveError instanceof Error
                          ? saveError.message
                          : "No se pudo crear el paddock."
                      );
                    } finally {
                      setSaving(false);
                    }
                  }}
                />
              </article>
            </section>

            {listItems.length > 0 && (
              <section className="rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
                <p className="text-sm text-brand-secondary">
                  Abre un paddock para editarlo, ver historial y gestionar rotaciones.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {listItems.map((item) => (
                    <Link
                      key={item.paddock.id}
                      href={`/dashboard/center/paddocks/${item.paddock.id}`}
                      className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text"
                    >
                      {item.paddock.name}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}


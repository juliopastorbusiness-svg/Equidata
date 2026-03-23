"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { DashboardClassTable } from "@/components/dashboard/classes/DashboardClassTable";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import { cancelClass, getClassesByCenter, Class } from "@/lib/services";

export default function DashboardClassesPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [items, setItems] = useState<Class[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [trainers, setTrainers] = useState<CenterPersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      setItems([]);
      setArenas([]);
      setTrainers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = listArenas(
      activeCenterId,
      (rows) => setArenas(rows),
      () => setError("No se pudieron cargar las pistas.")
    );

    void (async () => {
      try {
        const [classes, people] = await Promise.all([
          getClassesByCenter(activeCenterId),
          getCenterPersonOptions(activeCenterId),
        ]);
        setItems(classes);
        setTrainers(people);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudieron cargar las clases.");
      } finally {
        setLoading(false);
      }
    })();

    return () => unsubscribe();
  }, [activeCenterId]);

  const trainerLabels = useMemo(
    () => new Map(trainers.map((item) => [item.id, item.label] as const)),
    [trainers]
  );
  const arenaLabels = useMemo(
    () => new Map(arenas.map((item) => [item.id, item.name] as const)),
    [arenas]
  );

  const publishedCount = items.filter((item) => item.status === "published" || item.status === "full").length;

  const handleCancel = async (item: Class) => {
    if (!activeCenterId) return;
    setError(null);
    try {
      await cancelClass(activeCenterId, item.id);
      setItems(await getClassesByCenter(activeCenterId));
    } catch (cancelError) {
      console.error(cancelError);
      setError(cancelError instanceof Error ? cancelError.message : "No se pudo cancelar la clase.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando clases...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Clases publicadas"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{guardError}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        {!activeCenterId ? (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
            No tienes centro activo.
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Total clases</p>
                <p className="mt-2 text-3xl font-semibold">{items.length}</p>
              </article>
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Publicadas</p>
                <p className="mt-2 text-3xl font-semibold">{publishedCount}</p>
              </article>
              <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <p className="text-sm text-brand-secondary">Plazas disponibles</p>
                <p className="mt-2 text-3xl font-semibold">
                  {items.reduce((sum, item) => sum + item.availableSpots, 0)}
                </p>
              </article>
            </section>

            <section className="flex justify-end">
              <Link
                href="/dashboard/clases/new"
                className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white"
              >
                Nueva clase
              </Link>
            </section>

            {loading ? (
              <section className="rounded-3xl border border-brand-border bg-white/80 p-6 text-sm text-brand-secondary shadow-sm">
                Cargando...
              </section>
            ) : (
              <DashboardClassTable
                items={items}
                trainerLabels={trainerLabels}
                arenaLabels={arenaLabels}
                onCancel={handleCancel}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

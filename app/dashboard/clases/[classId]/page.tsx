"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { ClassSpotsBadge } from "@/components/dashboard/classes/ClassSpotsBadge";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import { cancelClass, getClassById, Class } from "@/lib/services";

export default function DashboardClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const router = useRouter();
  const classId = params.classId;
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [item, setItem] = useState<Class | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [trainers, setTrainers] = useState<CenterPersonOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId || !classId) return;

    const unsubscribe = listArenas(activeCenterId, setArenas, () =>
      setError("No se pudieron cargar las pistas.")
    );

    void Promise.all([
      getClassById(activeCenterId, classId),
      getCenterPersonOptions(activeCenterId),
    ])
      .then(([classItem, people]) => {
        setItem(classItem);
        setTrainers(people);
      })
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudo cargar la clase.");
      });

    return () => unsubscribe();
  }, [activeCenterId, classId]);

  const arenaMap = useMemo(() => new Map(arenas.map((arena) => [arena.id, arena.name] as const)), [arenas]);
  const trainerMap = useMemo(
    () => new Map(trainers.map((trainer) => [trainer.id, trainer.label] as const)),
    [trainers]
  );

  const handleCancel = async () => {
    if (!activeCenterId || !item) return;
    setError(null);
    try {
      await cancelClass(activeCenterId, item.id);
      setItem(await getClassById(activeCenterId, item.id));
    } catch (cancelError) {
      console.error(cancelError);
      setError(cancelError instanceof Error ? cancelError.message : "No se pudo cancelar la clase.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando clase...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={item?.title ?? "Detalle de clase"}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/clases"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{guardError}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        {!item ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            Clase no encontrada.
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">{item.discipline}</p>
                  <h1 className="mt-2 text-3xl font-semibold">{item.title}</h1>
                  <p className="mt-2 text-sm text-brand-secondary">
                    {item.date.toDate().toLocaleDateString("es-ES")} · {item.startTime} - {item.endTime}
                  </p>
                </div>
                <ClassSpotsBadge item={item} />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                  <p className="text-sm text-brand-secondary">Pista asignada</p>
                  <p className="mt-1 font-semibold">{item.arenaId ? arenaMap.get(item.arenaId) ?? item.arenaId : "Sin pista"}</p>
                </div>
                <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                  <p className="text-sm text-brand-secondary">Profesor asignado</p>
                  <p className="mt-1 font-semibold">{item.trainerId ? trainerMap.get(item.trainerId) ?? item.trainerId : "Sin profesor"}</p>
                </div>
                <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                  <p className="text-sm text-brand-secondary">Visibilidad</p>
                  <p className="mt-1 font-semibold">{item.visibility}</p>
                </div>
                <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                  <p className="text-sm text-brand-secondary">Booking mode</p>
                  <p className="mt-1 font-semibold">{item.bookingMode}</p>
                </div>
              </div>

              {item.notes ? <p className="mt-6 text-sm text-brand-secondary">{item.notes}</p> : null}
            </section>

            <section className="flex flex-wrap gap-3">
              <Link
                href={`/dashboard/clases/${item.id}/edit`}
                className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
              >
                Editar clase
              </Link>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={item.status === "cancelled" || item.status === "completed"}
                className="inline-flex h-11 items-center rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
              >
                Cancelar clase
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/clases")}
                className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white"
              >
                Volver al listado
              </button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

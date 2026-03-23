"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { ClassForm, ClassFormValues } from "@/components/dashboard/classes/ClassForm";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import { createClass } from "@/lib/services";

export default function NewDashboardClassPage() {
  const router = useRouter();
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    userId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [arenas, setArenas] = useState<Arena[]>([]);
  const [trainers, setTrainers] = useState<CenterPersonOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) return;

    const unsubscribe = listArenas(activeCenterId, setArenas, () =>
      setError("No se pudieron cargar las pistas.")
    );

    void getCenterPersonOptions(activeCenterId)
      .then(setTrainers)
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudieron cargar los profesores.");
      });

    return () => unsubscribe();
  }, [activeCenterId]);

  const handleSubmit = async (values: ClassFormValues) => {
    if (!activeCenterId || !userId) return;
    setSaving(true);
    setError(null);
    try {
      const classId = await createClass(activeCenterId, {
        title: values.title,
        discipline: values.discipline,
        level: values.level,
        date: new Date(`${values.date}T00:00:00`),
        startTime: values.startTime,
        endTime: values.endTime,
        arenaId: values.arenaId || undefined,
        trainerId: values.trainerId || undefined,
        capacity: values.capacity,
        price: typeof values.price === "number" && Number.isFinite(values.price) ? values.price : undefined,
        notes: values.notes || undefined,
        visibility: values.visibility,
        bookingMode: values.bookingMode,
        status: values.status,
        createdBy: userId,
      });
      router.push(`/dashboard/clases/${classId}`);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear la clase.");
    } finally {
      setSaving(false);
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando formulario...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Nueva clase"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/clases"
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{guardError}</p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>
        ) : null}

        <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
          <ClassForm
            arenas={arenas}
            trainers={trainers}
            submitting={saving}
            submitLabel="Crear clase"
            onSubmit={handleSubmit}
          />
        </section>
      </div>
    </main>
  );
}

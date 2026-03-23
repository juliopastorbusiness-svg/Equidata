"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { ClassForm, ClassFormValues } from "@/components/dashboard/classes/ClassForm";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { CenterPersonOption, getCenterPersonOptions } from "@/lib/horses";
import { getClassById, updateClass, Class } from "@/lib/services";

export default function EditDashboardClassPage() {
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
  const [saving, setSaving] = useState(false);
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

  const handleSubmit = async (values: ClassFormValues) => {
    if (!activeCenterId || !item) return;
    setSaving(true);
    setError(null);
    try {
      await updateClass(activeCenterId, item.id, {
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
      });
      router.push(`/dashboard/clases/${item.id}`);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la clase.");
    } finally {
      setSaving(false);
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
        title="Editar clase"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref={item ? `/dashboard/clases/${item.id}` : "/dashboard/clases"}
      />

      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 md:px-6">
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
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            <ClassForm
              defaultValues={{
                title: item.title,
                discipline: item.discipline,
                level: item.level,
                date: item.date.toDate().toISOString().slice(0, 10),
                startTime: item.startTime,
                endTime: item.endTime,
                arenaId: item.arenaId ?? "",
                trainerId: item.trainerId ?? "",
                capacity: item.capacity,
                price: typeof item.price === "number" ? item.price : Number.NaN,
                notes: item.notes ?? "",
                visibility: item.visibility,
                bookingMode: item.bookingMode,
                status: item.status,
              }}
              arenas={arenas}
              trainers={trainers}
              submitting={saving}
              submitLabel="Guardar cambios"
              onSubmit={handleSubmit}
            />
          </section>
        )}
      </div>
    </main>
  );
}

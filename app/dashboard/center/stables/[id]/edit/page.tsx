"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { HorseForm } from "@/components/stables/forms";
import {
  CenterPersonOption,
  deleteHorse,
  getCenterPersonOptions,
  getHorseById,
  horseFormValuesToPayload,
  Horse,
  updateHorse,
  uploadHorsePhoto,
} from "@/lib/horses";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrors";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

export default function EditStableHorsePage() {
  const params = useParams();
  const router = useRouter();
  const horseId = params?.id as string;
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [ownerOptions, setOwnerOptions] = useState<CenterPersonOption[]>([]);
  const [horse, setHorse] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId || !horseId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [horseData, people] = await Promise.all([
          getHorseById(activeCenterId, horseId),
          getCenterPersonOptions(activeCenterId),
        ]);

        if (cancelled) return;

        if (!horseData) {
          setError("No se encontro el caballo.");
        }

        setHorse(horseData);
        setOwnerOptions(people);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("No se pudo cargar la ficha para editar.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [activeCenterId, horseId]);

  if (guardLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando caballo...</p>
      </main>
    );
  }

  if (!isAllowed || !activeCenterId || !horse) {
    return null;
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={`Editar ${horse.name}`}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref={`/dashboard/center/stables/${horse.id}`}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6">
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

        <HorseForm
          mode="edit"
          defaultHorse={horse}
          ownerOptions={ownerOptions}
          submitting={saving}
          onDelete={async () => {
            if (!window.confirm(`Eliminar a ${horse.name}?`)) return;
            setSaving(true);
            try {
              await deleteHorse(activeCenterId, horse.id);
              router.push("/dashboard/center/stables");
            } catch (deleteError) {
              console.error(deleteError);
              setError(getFirebaseErrorMessage(deleteError, "No se pudo eliminar el caballo."));
            } finally {
              setSaving(false);
            }
          }}
          onSubmit={async (values, photoFile) => {
            setSaving(true);
            setError(null);
            try {
              const payload = horseFormValuesToPayload(values);
              await updateHorse(activeCenterId, horse.id, payload);
              if (photoFile) {
                await uploadHorsePhoto(activeCenterId, horse.id, photoFile);
              }
              router.push(`/dashboard/center/stables/${horse.id}`);
            } catch (saveError) {
              console.error(saveError);
              setError(getFirebaseErrorMessage(saveError, "No se pudo guardar el caballo."));
            } finally {
              setSaving(false);
            }
          }}
        />
      </div>
    </main>
  );
}

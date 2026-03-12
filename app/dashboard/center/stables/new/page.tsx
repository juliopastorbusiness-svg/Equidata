"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { HorseForm } from "@/components/stables/forms";
import {
  CenterPersonOption,
  CreateHorseInput,
  createHorse,
  getCenterPersonOptions,
  horseFormValuesToPayload,
  uploadHorsePhoto,
} from "@/lib/horses";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrors";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

export default function NewStableHorsePage() {
  const router = useRouter();
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [ownerOptions, setOwnerOptions] = useState<CenterPersonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      setOwnerOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadOptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const people = await getCenterPersonOptions(activeCenterId);
        if (!cancelled) setOwnerOptions(people);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("No se pudieron cargar los propietarios del centro.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [activeCenterId]);

  if (guardLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando formulario del caballo...</p>
      </main>
    );
  }

  if (!isAllowed || !activeCenterId) {
    return null;
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Nuevo caballo"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center/stables"
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
          mode="create"
          ownerOptions={ownerOptions}
          submitting={saving}
          onSubmit={async (values, photoFile) => {
            setSaving(true);
            setError(null);
            try {
              const payload = horseFormValuesToPayload(values) as CreateHorseInput;
              const horseId = await createHorse(activeCenterId, payload);
              if (photoFile) {
                await uploadHorsePhoto(activeCenterId, horseId, photoFile);
              }
              router.push(`/dashboard/center/stables/${horseId}`);
            } catch (saveError) {
              console.error(saveError);
              setError(getFirebaseErrorMessage(saveError, "No se pudo crear el caballo."));
            } finally {
              setSaving(false);
            }
          }}
        />
      </div>
    </main>
  );
}

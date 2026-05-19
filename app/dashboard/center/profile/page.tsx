"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { CenterHeader } from "@/components/center/CenterHeader";
import { auth, db, storage } from "@/lib/firebase";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

type CenterProfileForm = {
  name: string;
  contactEmail: string;
  phone: string;
  address: string;
  description: string;
  profileImageUrl: string;
};

type CenterProfileDoc = Partial<CenterProfileForm>;

const emptyForm: CenterProfileForm = {
  name: "",
  contactEmail: "",
  phone: "",
  address: "",
  description: "",
  profileImageUrl: "",
};

export default function CenterProfilePage() {
  const { user, profile } = useAuthUser();
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    isDevBypass,
    activeCenterId,
    activeCenterName,
    activeCenterRole,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [form, setForm] = useState<CenterProfileForm>(emptyForm);
  const [loadingCenter, setLoadingCenter] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = isDevBypass || activeCenterRole === "CENTER_OWNER" || activeCenterRole === "CENTER_ADMIN";

  const userDisplayName = useMemo(
    () =>
      profile?.displayName ||
      profile?.fullName ||
      profile?.name ||
      auth.currentUser?.displayName ||
      "Usuario del centro",
    [profile?.displayName, profile?.fullName, profile?.name]
  );

  const userEmail = profile?.email || user?.email || auth.currentUser?.email || "";
  const userPhotoUrl =
    profile?.avatarUrl || auth.currentUser?.photoURL || form.profileImageUrl || "";

  useEffect(() => {
    if (!activeCenterId) {
      setForm(emptyForm);
      setLoadingCenter(false);
      return;
    }

    let cancelled = false;

    const loadCenter = async () => {
      setLoadingCenter(true);
      setError(null);

      try {
        const centerSnap = await getDoc(doc(db, "centers", activeCenterId));
        if (cancelled) return;

        const data = centerSnap.exists() ? (centerSnap.data() as CenterProfileDoc) : {};
        setForm({
          name: data.name?.trim() || activeCenterName || "",
          contactEmail: data.contactEmail?.trim() || "",
          phone: data.phone?.trim() || "",
          address: data.address?.trim() || "",
          description: data.description?.trim() || "",
          profileImageUrl: data.profileImageUrl?.trim() || "",
        });
      } catch (loadError) {
        console.error("No se pudo cargar el perfil del centro:", loadError);
        if (!cancelled) {
          setError("No se pudo cargar el perfil del centro.");
        }
      } finally {
        if (!cancelled) {
          setLoadingCenter(false);
        }
      }
    };

    void loadCenter();

    return () => {
      cancelled = true;
    };
  }, [activeCenterId, activeCenterName]);

  const updateField = (field: keyof CenterProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onUploadImage = async (file: File) => {
    if (!activeCenterId || !canEdit) return;

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const extension = file.name.split(".").pop() || "jpg";
      const imageRef = ref(
        storage,
        `centers/${activeCenterId}/profile/profile-${Date.now()}.${extension}`
      );
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      setForm((current) => ({ ...current, profileImageUrl: url }));
      setMessage("Imagen subida. Guarda los cambios para confirmar el perfil.");
    } catch (uploadError) {
      console.error("No se pudo subir la imagen del centro:", uploadError);
      setError("No se pudo subir la imagen. La estructura queda preparada para Storage.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId || !canEdit) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await setDoc(
        doc(db, "centers", activeCenterId),
        {
          name: form.name.trim(),
          nameLower: form.name.trim().toLowerCase(),
          contactEmail: form.contactEmail.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          description: form.description.trim(),
          profileImageUrl: form.profileImageUrl.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMessage("Perfil actualizado correctamente.");
    } catch (saveError) {
      console.error("No se pudo guardar el perfil del centro:", saveError);
      setError("No se pudo guardar el perfil del centro.");
    } finally {
      setSaving(false);
    }
  };

  if (guardLoading || loadingCenter) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando perfil del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso al perfil del centro.</p>
          <Link
            href="/dashboard/center"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Mi perfil"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
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
        {message && (
          <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            {message}
          </p>
        )}

        <section className="grid gap-5 lg:grid-cols-[20rem_1fr]">
          <aside className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
              Datos del usuario
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="relative h-20 w-20 overflow-hidden rounded-2xl border border-brand-border bg-brand-background bg-cover bg-center"
                style={userPhotoUrl ? { backgroundImage: `url(${userPhotoUrl})` } : undefined}
              >
                {userPhotoUrl ? (
                  <span className="sr-only">{userDisplayName}</span>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-brand-primary">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-brand-text">
                  {userDisplayName}
                </h2>
                <p className="truncate text-sm text-brand-secondary">{userEmail || "-"}</p>
                <p className="mt-1 text-xs font-semibold uppercase text-brand-secondary">
                  {activeCenterRole ?? "Centro"}
                </p>
              </div>
            </div>
          </aside>

          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                  Datos del centro hípico
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-brand-text">
                  {form.name || "Centro sin nombre"}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="relative h-20 w-20 overflow-hidden rounded-2xl border border-brand-border bg-brand-background bg-cover bg-center"
                  style={
                    form.profileImageUrl
                      ? { backgroundImage: `url(${form.profileImageUrl})` }
                      : undefined
                  }
                >
                  {form.profileImageUrl ? (
                    <span className="sr-only">{form.name || "Centro"}</span>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-brand-secondary">
                      Logo
                    </div>
                  )}
                </div>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white">
                  {uploading ? "Subiendo..." : "Subir imagen"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={!canEdit || uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void onUploadImage(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-brand-text">Nombre del centro</span>
                <input
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  disabled={!canEdit}
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-70"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-brand-text">Email de contacto</span>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => updateField("contactEmail", event.target.value)}
                  disabled={!canEdit}
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-70"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-brand-text">Teléfono</span>
                <input
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  disabled={!canEdit}
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-70"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-brand-text">Dirección</span>
                <input
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  disabled={!canEdit}
                  className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background/60 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-70"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-brand-text">Descripción breve</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  disabled={!canEdit}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-brand-border bg-brand-background/60 px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:opacity-70"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={!canEdit || saving}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
              >
                {saving ? "Guardando cambios..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

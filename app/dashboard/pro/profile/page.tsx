"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

type ProfessionalProfileForm = {
  speciality: string;
  description: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  province: string;
  city: string;
  travelRadius: string;
  company: string;
  selfEmployed: boolean;
  registrationNumber: string;
  experienceYears: string;
  servicesDescription: string;
};

type ProfessionalUserDoc = {
  name?: string;
  fullName?: string;
  displayName?: string;
  email?: string;
  role?: string;
  proType?: string | null;
  profession?: string | null;
  avatarUrl?: string;
  photoURL?: string;
  professionalCategory?: string | null;
  professionalProfile?: Partial<ProfessionalProfileForm> & {
    travelRadius?: number | string;
    experienceYears?: number | string;
    profileCompletion?: number;
  };
};

const emptyForm: ProfessionalProfileForm = {
  speciality: "",
  description: "",
  phone: "",
  website: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  province: "",
  city: "",
  travelRadius: "",
  company: "",
  selfEmployed: false,
  registrationNumber: "",
  experienceYears: "",
  servicesDescription: "",
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-brand-background px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

const toNumberOrNull = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function ProfessionalProfilePage() {
  const { user, profile, loading: authLoading, error: authError } = useAuthUser();
  const [userDoc, setUserDoc] = useState<ProfessionalUserDoc | null>(null);
  const [form, setForm] = useState<ProfessionalProfileForm>(emptyForm);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setError(null);

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (cancelled) return;

        const data = snap.exists() ? (snap.data() as ProfessionalUserDoc) : {};
        const professionalProfile = data.professionalProfile ?? {};
        setUserDoc(data);
        setForm({
          speciality: professionalProfile.speciality?.toString() ?? "",
          description: professionalProfile.description?.toString() ?? "",
          phone: professionalProfile.phone?.toString() ?? "",
          website: professionalProfile.website?.toString() ?? "",
          instagram: professionalProfile.instagram?.toString() ?? "",
          facebook: professionalProfile.facebook?.toString() ?? "",
          linkedin: professionalProfile.linkedin?.toString() ?? "",
          province: professionalProfile.province?.toString() ?? "",
          city: professionalProfile.city?.toString() ?? "",
          travelRadius: professionalProfile.travelRadius?.toString() ?? "",
          company: professionalProfile.company?.toString() ?? "",
          selfEmployed: Boolean(professionalProfile.selfEmployed),
          registrationNumber: professionalProfile.registrationNumber?.toString() ?? "",
          experienceYears: professionalProfile.experienceYears?.toString() ?? "",
          servicesDescription: professionalProfile.servicesDescription?.toString() ?? "",
        });
      } catch (loadError) {
        console.error("No se pudo cargar el perfil profesional:", loadError);
        if (!cancelled) setError("No se pudo cargar tu perfil profesional.");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const displayName =
    userDoc?.fullName?.trim() ||
    userDoc?.displayName?.trim() ||
    userDoc?.name?.trim() ||
    profile?.fullName?.trim() ||
    profile?.displayName?.trim() ||
    profile?.name?.trim() ||
    user?.displayName ||
    "Profesional";

  const email = userDoc?.email || profile?.email || user?.email || "";
  const profession = userDoc?.profession || userDoc?.proType || "Profesional ecuestre";
  const category = userDoc?.professionalCategory || userDoc?.proType || "Sin categoria definida";
  const photoUrl = userDoc?.avatarUrl || userDoc?.photoURL || profile?.avatarUrl || user?.photoURL || "";
  const initial = displayName.charAt(0).toUpperCase() || "P";

  const completionItems = useMemo(
    () => [
      { label: "Foto subida", done: Boolean(photoUrl) },
      { label: "Descripcion completada", done: Boolean(form.description.trim()) },
      { label: "Datos de contacto", done: Boolean(form.phone.trim() || email.trim()) },
      { label: "Provincia", done: Boolean(form.province.trim()) },
      { label: "Especialidad", done: Boolean(form.speciality.trim()) },
    ],
    [email, form.description, form.phone, form.province, form.speciality, photoUrl]
  );

  const profileCompletion = Math.round(
    (completionItems.filter((item) => item.done).length / completionItems.length) * 100
  );

  const updateField = <Field extends keyof ProfessionalProfileForm>(
    field: Field,
    value: ProfessionalProfileForm[Field]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          professionalProfile: {
            speciality: form.speciality.trim(),
            description: form.description.trim(),
            phone: form.phone.trim(),
            website: form.website.trim(),
            instagram: form.instagram.trim(),
            facebook: form.facebook.trim(),
            linkedin: form.linkedin.trim(),
            province: form.province.trim(),
            city: form.city.trim(),
            travelRadius: toNumberOrNull(form.travelRadius),
            company: form.company.trim(),
            selfEmployed: form.selfEmployed,
            registrationNumber: form.registrationNumber.trim(),
            experienceYears: toNumberOrNull(form.experienceYears),
            servicesDescription: form.servicesDescription.trim(),
            profileCompletion,
            updatedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );
      setMessage("Perfil profesional actualizado correctamente.");
    } catch (saveError) {
      console.error("No se pudo guardar el perfil profesional:", saveError);
      setError("No se pudo guardar tu perfil profesional.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando perfil profesional...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No hay sesion activa.</p>
          <Link
            href="/login"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Iniciar sesion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <header className="border-b border-brand-border/80 bg-white/35 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <Link
            href="/dashboard/pro"
            className="inline-flex w-fit items-center rounded-xl border border-brand-border bg-white/80 px-3 py-2 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
          >
            Volver
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-text">Mi Perfil Profesional</h1>
            <p className="mt-1 text-sm text-brand-secondary">
              Completa la informacion que veran los centros hipicos cuando reciban tus solicitudes.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
        <form onSubmit={onSubmit} className="space-y-5">
          {authError ? (
            <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {authError}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">
              {message}
            </p>
          ) : null}

          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-text">Informacion personal</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-[10rem_1fr_1fr]">
              <div className="md:row-span-3">
                <p className="mb-2 text-sm font-medium text-brand-secondary">Foto de perfil</p>
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-brand-background">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-semibold text-brand-primary">{initial}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-brand-secondary">
                  Se usa la foto actual de tu usuario.
                </p>
              </div>
              <ReadonlyField label="Nombre completo" value={displayName} />
              <ReadonlyField label="Profesion" value={profession} />
              <ReadonlyField label="Categoria profesional" value={category} />
              <label className="text-sm font-medium text-brand-secondary">
                Especialidad
                <input
                  value={form.speciality}
                  onChange={(event) => updateField("speciality", event.target.value)}
                  className={inputClassName}
                  placeholder="Ej: veterinaria deportiva, herrador ortopedico..."
                />
              </label>
              <label className="text-sm font-medium text-brand-secondary md:col-span-2">
                Descripcion profesional
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  className={textareaClassName}
                  rows={5}
                  placeholder="Resume tu trayectoria, enfoque de trabajo y experiencia con centros hipicos."
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-text">Informacion de contacto</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormInput label="Telefono" value={form.phone} onChange={(value) => updateField("phone", value)} />
              <ReadonlyField label="Email" value={email || "-"} />
              <FormInput label="Pagina web" value={form.website} onChange={(value) => updateField("website", value)} />
              <FormInput label="Instagram" value={form.instagram} onChange={(value) => updateField("instagram", value)} />
              <FormInput label="Facebook" value={form.facebook} onChange={(value) => updateField("facebook", value)} />
              <FormInput label="LinkedIn" value={form.linkedin} onChange={(value) => updateField("linkedin", value)} />
            </div>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-text">Ubicacion</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <FormInput label="Provincia" value={form.province} onChange={(value) => updateField("province", value)} />
              <FormInput label="Ciudad" value={form.city} onChange={(value) => updateField("city", value)} />
              <FormInput
                label="Radio de desplazamiento (km)"
                type="number"
                value={form.travelRadius}
                onChange={(value) => updateField("travelRadius", value)}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-text">Informacion profesional</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormInput label="Empresa" value={form.company} onChange={(value) => updateField("company", value)} />
              <label className="text-sm font-medium text-brand-secondary">
                Autonomo
                <select
                  value={form.selfEmployed ? "yes" : "no"}
                  onChange={(event) => updateField("selfEmployed", event.target.value === "yes")}
                  className={inputClassName}
                >
                  <option value="no">No</option>
                  <option value="yes">Si</option>
                </select>
              </label>
              <FormInput
                label="Numero de colegiado"
                value={form.registrationNumber}
                onChange={(value) => updateField("registrationNumber", value)}
              />
              <FormInput
                label="Anios de experiencia"
                type="number"
                value={form.experienceYears}
                onChange={(value) => updateField("experienceYears", value)}
              />
              <label className="text-sm font-medium text-brand-secondary md:col-span-2">
                Servicios ofrecidos
                <textarea
                  value={form.servicesDescription}
                  onChange={(event) => updateField("servicesDescription", event.target.value)}
                  className={textareaClassName}
                  rows={5}
                  placeholder="Describe los servicios que ofreces a centros, propietarios y caballos."
                />
              </label>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm sm:flex-row sm:justify-end">
            <Link
              href="/dashboard/pro"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-brand-background"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        <aside className="h-fit rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm lg:sticky lg:top-5">
          <p className="text-sm font-medium text-brand-secondary">Perfil completado</p>
          <p className="mt-2 text-4xl font-bold text-brand-text">{profileCompletion}%</p>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-brand-background">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>
          <ul className="mt-5 space-y-3">
            {completionItems.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                    item.done
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-brand-border bg-brand-background text-brand-secondary"
                  }`}
                >
                  {item.done ? "✓" : "-"}
                </span>
                <span className={item.done ? "text-brand-text" : "text-brand-secondary"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-brand-secondary">{label}</p>
      <p className="mt-1 flex min-h-11 items-center rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text">
        {value}
      </p>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm font-medium text-brand-secondary">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    </label>
  );
}

"use client";

import type { ReactNode } from "react";
import { ProfessionalProfileSummary } from "@/lib/services/professionalRequestService";

type ProfessionalProfileDrawerProps = {
  profile: ProfessionalProfileSummary | null;
  open: boolean;
  onClose: () => void;
};

const value = (input?: string | number | null) =>
  input === undefined || input === null || input === "" ? "-" : String(input);

export function ProfessionalProfileDrawer({
  profile,
  open,
  onClose,
}: ProfessionalProfileDrawerProps) {
  if (!open || !profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-brand-border bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-brand-border bg-brand-background">
              {profile.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoUrl} alt={profile.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-brand-primary">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-brand-text">{profile.name}</h2>
              <p className="text-sm text-brand-secondary">{profile.profession}</p>
              <p className="mt-1 text-sm font-semibold text-brand-primary">
                Perfil completado {profile.profileCompletion ?? 0}%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border text-brand-text transition hover:border-brand-primary"
            aria-label="Cerrar perfil"
          >
            x
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <InfoSection title="Informacion profesional">
            <InfoItem label="Especialidad" value={value(profile.speciality)} />
            <InfoItem label="Descripcion" value={value(profile.description)} wide />
            <InfoItem label="Empresa" value={value(profile.company)} />
            <InfoItem label="Anios experiencia" value={value(profile.experienceYears)} />
            <InfoItem label="Servicios" value={value(profile.servicesDescription)} wide />
          </InfoSection>

          <InfoSection title="Ubicacion">
            <InfoItem label="Provincia" value={value(profile.province)} />
            <InfoItem label="Ciudad" value={value(profile.city)} />
          </InfoSection>

          <InfoSection title="Contacto y redes">
            <InfoItem label="Telefono" value={value(profile.phone)} />
            <InfoItem label="Email" value={value(profile.email)} />
            <InfoItem label="Pagina web" value={value(profile.website)} />
            <InfoItem label="Instagram" value={value(profile.instagram)} />
            <InfoItem label="Facebook" value={value(profile.facebook)} />
            <InfoItem label="LinkedIn" value={value(profile.linkedin)} />
          </InfoSection>

          <InfoSection title="Estado">
            <InfoItem label="Verificacion" value={value(profile.verificationStatus)} />
            <InfoItem label="Perfil completado" value={`${profile.profileCompletion ?? 0}%`} />
          </InfoSection>
        </div>
      </aside>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
      <h3 className="text-base font-semibold text-brand-text">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function InfoItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-secondary">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-brand-text">{value}</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { CenterLinkRequestButton } from "@/components/centers/CenterLinkRequestButton";
import { Center, CenterMember, RiderProfile } from "@/lib/services/types";

type CenterCardProps = {
  center: Center;
  member: CenterMember | null;
  riderProfile: RiderProfile | null;
  activeCenterId?: string;
  onMemberChange?: (member: CenterMember) => void;
  onActiveCenterChange?: (centerId: string) => void;
};

const statusLabel: Record<"none" | NonNullable<CenterMember["status"]>, string> = {
  none: "No vinculado",
  pending: "Pendiente",
  active: "Aceptado",
  rejected: "Rechazado",
};

const statusClassName: Record<keyof typeof statusLabel, string> = {
  none: "border-slate-300 bg-slate-100 text-slate-700",
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  active: "border-emerald-300 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-300 bg-rose-50 text-rose-700",
};

export function CenterCard({
  center,
  member,
  riderProfile,
  activeCenterId,
  onMemberChange,
  onActiveCenterChange,
}: CenterCardProps) {
  const status = member?.status ?? "none";

  return (
    <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/centros/${center.id}`} className="text-lg font-semibold text-brand-text hover:underline">
            {center.name}
          </Link>
          <p className="mt-1 text-sm text-brand-secondary">
            {[center.city, center.province].filter(Boolean).join(", ") || "Ubicacion sin completar"}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClassName[status]}`}>
          {statusLabel[status]}
        </span>
      </div>

      {center.address ? (
        <p className="mt-4 text-sm text-brand-secondary">{center.address}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <CenterLinkRequestButton
          center={center}
          currentMember={member}
          riderProfile={riderProfile}
          activeCenterId={activeCenterId}
          onStatusChange={onMemberChange}
          onActiveCenterChange={onActiveCenterChange}
        />
        <Link
          href={`/centros/${center.id}`}
          className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-brand-background"
        >
          Ver centro
        </Link>
      </div>
    </article>
  );
}

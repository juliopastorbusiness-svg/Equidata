"use client";

import { CenterCard } from "@/components/centers/CenterCard";
import { Center, CenterMember, RiderProfile } from "@/lib/services/types";

type CenterSearchListProps = {
  centers: Center[];
  loading?: boolean;
  error?: string | null;
  hasSearched?: boolean;
  memberships: CenterMember[];
  riderProfile: RiderProfile | null;
  activeCenterId?: string;
  onMemberChange?: (member: CenterMember) => void;
  onActiveCenterChange?: (centerId: string) => void;
};

export function CenterSearchList({
  centers,
  loading = false,
  error = null,
  hasSearched = false,
  memberships,
  riderProfile,
  activeCenterId,
  onMemberChange,
  onActiveCenterChange,
}: CenterSearchListProps) {
  const membershipMap = new Map(
    memberships.map((membership) => [membership.centerId, membership] as const)
  );

  if (loading) {
    return (
      <section className="rounded-3xl border border-brand-border bg-white/70 p-6 text-sm text-brand-secondary shadow-sm">
        Buscando centros...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-800 bg-red-950/40 p-6 text-sm text-red-300 shadow-sm">
        {error}
      </section>
    );
  }

  if (!hasSearched) {
    return (
      <section className="rounded-3xl border border-brand-border bg-white/70 p-6 text-sm text-brand-secondary shadow-sm">
        Escribe el nombre de un centro para ver resultados.
      </section>
    );
  }

  if (!centers.length) {
    return (
      <section className="rounded-3xl border border-brand-border bg-white/70 p-6 text-sm text-brand-secondary shadow-sm">
        No hay centros que coincidan con la busqueda actual.
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {centers.map((center) => (
        <CenterCard
          key={center.id}
          center={center}
          member={membershipMap.get(center.id) ?? null}
          riderProfile={riderProfile}
          activeCenterId={activeCenterId}
          onMemberChange={onMemberChange}
          onActiveCenterChange={onActiveCenterChange}
        />
      ))}
    </section>
  );
}

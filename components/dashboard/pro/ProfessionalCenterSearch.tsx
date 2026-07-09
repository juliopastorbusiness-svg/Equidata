"use client";

import { ProfessionalCenterSearchCard } from "@/components/dashboard/pro/ProfessionalCenterSearchCard";
import { ProCenterRequestState, ProCenterSearchResult } from "@/components/dashboard/pro/types";

type ProfessionalCenterSearchProps = {
  searchTerm: string;
  centers: ProCenterSearchResult[];
  getRequestState: (centerId: string) => ProCenterRequestState;
  onSearchTermChange: (value: string) => void;
  onRequest: (center: ProCenterSearchResult) => void;
};

export function ProfessionalCenterSearch({
  searchTerm,
  centers,
  getRequestState,
  onSearchTermChange,
  onRequest,
}: ProfessionalCenterSearchProps) {
  const hasSearch = Boolean(searchTerm.trim());

  return (
    <section id="pro-center-search" className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-brand-text">Buscador de centros</h2>
        <p className="mt-1 text-sm text-brand-secondary">
          Busca centros hipicos y envia solicitudes de colaboracion.
        </p>
      </div>
      <input
        type="text"
        placeholder="Buscar por nombre, ciudad o provincia..."
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        className="h-14 w-full rounded-2xl border border-brand-border bg-brand-background px-4 text-base text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
      />

      {hasSearch ? (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {centers.length ? (
            centers.map((center) => (
              <ProfessionalCenterSearchCard
                key={center.id}
                center={center}
                state={getRequestState(center.id)}
                onRequest={onRequest}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
              No se han encontrado centros con esa busqueda.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

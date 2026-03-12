"use client";

import { MedicationInventoryItem } from "@/lib/services";
import { MedicationCard } from "@/components/center/medications/MedicationCard";

type MedicationListProps = {
  items: MedicationInventoryItem[];
  horseId?: string | null;
};

export function MedicationList({ items, horseId }: MedicationListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-brand-border bg-white/75 px-6 py-12 text-center shadow-sm">
        <p className="text-sm text-brand-secondary">Aún no hay medicamentos registrados.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <MedicationCard key={item.medication.id} item={item} horseId={horseId} />
      ))}
    </section>
  );
}

"use client";

import { Paddock } from "@/lib/services";
import { PaddockCard } from "@/components/center/paddocks/PaddockCard";

type PaddockListItem = {
  paddock: Paddock;
  occupied: number;
  horseNames: string[];
};

type PaddockListProps = {
  items: PaddockListItem[];
};

export function PaddockList({ items }: PaddockListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-brand-border bg-white/75 px-6 py-12 text-center shadow-sm">
        <p className="text-sm text-brand-secondary">Aún no hay paddocks registrados.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <PaddockCard
          key={item.paddock.id}
          paddock={item.paddock}
          occupied={item.occupied}
          horseNames={item.horseNames}
        />
      ))}
    </section>
  );
}


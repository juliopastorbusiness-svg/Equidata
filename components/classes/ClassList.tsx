"use client";

import { ClassCard } from "@/components/classes/ClassCard";
import { Class, ClassReservation } from "@/lib/services/types";

type ClassListProps = {
  centerId: string;
  items: Class[];
  riderId: string;
  trainerLabels: Map<string, string>;
  arenaLabels: Map<string, string>;
  reservations: Map<string, ClassReservation>;
  onReserved: (reservation: ClassReservation) => void;
};

export function ClassList({
  centerId,
  items,
  riderId,
  trainerLabels,
  arenaLabels,
  reservations,
  onReserved,
}: ClassListProps) {
  if (!items.length) {
    return (
      <section className="rounded-3xl border border-brand-border bg-white/80 p-6 text-sm text-brand-secondary shadow-sm">
        No hay clases publicadas que coincidan con tus filtros.
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {items.map((classItem) => (
        <ClassCard
          key={classItem.id}
          centerId={centerId}
          classItem={classItem}
          riderId={riderId}
          trainerLabel={classItem.trainerId ? trainerLabels.get(classItem.trainerId) : undefined}
          arenaLabel={classItem.arenaId ? arenaLabels.get(classItem.arenaId) : undefined}
          reservation={reservations.get(classItem.id) ?? null}
          onReserved={onReserved}
        />
      ))}
    </section>
  );
}

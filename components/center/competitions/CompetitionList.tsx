"use client";

import { CenterPersonOption, HorseListItem } from "@/lib/horses";
import { Arena } from "@/lib/firestore/arenas";
import { Competition } from "@/lib/services";
import { CompetitionCard } from "@/components/center/competitions/CompetitionCard";

type CompetitionListProps = {
  items: Competition[];
  riders: CenterPersonOption[];
  horses: HorseListItem[];
  arenas: Arena[];
  onEdit: (item: Competition) => void;
  onDelete: (item: Competition) => Promise<void>;
};

export function CompetitionList({
  items,
  riders,
  horses,
  arenas,
  onEdit,
  onDelete,
}: CompetitionListProps) {
  const riderMap = new Map(riders.map((item) => [item.id, item.label]));
  const horseMap = new Map(horses.map((item) => [item.horse.id, item.horse.name]));
  const arenaMap = new Map(arenas.map((item) => [item.id, item.name]));

  if (items.length === 0) {
    return <p className="text-sm text-brand-secondary">No hay competiciones registradas.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <CompetitionCard
          key={item.id}
          item={item}
          horseLabels={item.horseIds.map((id) => horseMap.get(id) ?? id)}
          riderLabels={item.riderIds.map((id) => riderMap.get(id) ?? id)}
          arenaLabel={item.arenaId ? arenaMap.get(item.arenaId) : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

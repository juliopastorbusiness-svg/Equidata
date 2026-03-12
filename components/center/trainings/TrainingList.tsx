"use client";

import { CenterPersonOption, HorseListItem } from "@/lib/horses";
import { Arena } from "@/lib/firestore/arenas";
import { Training } from "@/lib/services";
import { TrainingCard } from "@/components/center/trainings/TrainingCard";

type TrainingListProps = {
  items: Training[];
  trainers: CenterPersonOption[];
  horses: HorseListItem[];
  arenas: Arena[];
  onEdit: (item: Training) => void;
  onDelete: (item: Training) => Promise<void>;
};

export function TrainingList({
  items,
  trainers,
  horses,
  arenas,
  onEdit,
  onDelete,
}: TrainingListProps) {
  const trainerMap = new Map(trainers.map((item) => [item.id, item.label]));
  const horseMap = new Map(horses.map((item) => [item.horse.id, item.horse.name]));
  const arenaMap = new Map(arenas.map((item) => [item.id, item.name]));

  if (items.length === 0) {
    return <p className="text-sm text-brand-secondary">No hay entrenamientos registrados.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <TrainingCard
          key={item.id}
          item={item}
          trainerLabel={trainerMap.get(item.trainerId)}
          horseLabel={horseMap.get(item.horseId)}
          arenaLabel={item.arenaId ? arenaMap.get(item.arenaId) : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

"use client";

import { CenterPersonOption, HorseListItem } from "@/lib/horses";
import { Arena } from "@/lib/firestore/arenas";
import { Class } from "@/lib/services";
import { ClassCard } from "@/components/center/classes/ClassCard";

type ClassListProps = {
  items: Class[];
  trainers: CenterPersonOption[];
  students: CenterPersonOption[];
  horses: HorseListItem[];
  arenas: Arena[];
  onEdit: (item: Class) => void;
  onDelete: (item: Class) => Promise<void>;
};

export function ClassList({
  items,
  trainers,
  students,
  horses,
  arenas,
  onEdit,
  onDelete,
}: ClassListProps) {
  const trainerMap = new Map(trainers.map((item) => [item.id, item.label]));
  const studentMap = new Map(students.map((item) => [item.id, item.label]));
  const horseMap = new Map(horses.map((item) => [item.horse.id, item.horse.name]));
  const arenaMap = new Map(arenas.map((item) => [item.id, item.name]));

  if (items.length === 0) {
    return <p className="text-sm text-brand-secondary">No hay clases registradas.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ClassCard
          key={item.id}
          item={item}
          trainerLabel={item.trainerId ? trainerMap.get(item.trainerId) : undefined}
          arenaLabel={item.arenaId ? arenaMap.get(item.arenaId) : undefined}
          horseLabels={item.horseIds.map((id) => horseMap.get(id) ?? id)}
          studentLabels={item.studentIds.map((id) => studentMap.get(id) ?? id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

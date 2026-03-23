"use client";

import { Class } from "@/lib/services";

type ClassSpotsBadgeProps = {
  item: Class;
};

export function ClassSpotsBadge({ item }: ClassSpotsBadgeProps) {
  const tone =
    item.status === "cancelled"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : item.status === "completed"
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : item.availableSpots === 0 || item.status === "full"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tone}`}>
      {item.availableSpots}/{item.capacity} plazas
    </span>
  );
}

"use client";

type PaddockOccupancyBadgeProps = {
  occupied: number;
  maxCapacity: number;
};

export function PaddockOccupancyBadge({
  occupied,
  maxCapacity,
}: PaddockOccupancyBadgeProps) {
  const ratio = maxCapacity <= 0 ? 0 : occupied / maxCapacity;
  const tone =
    ratio >= 1
      ? "bg-red-100 text-red-800"
      : ratio >= 0.75
        ? "bg-amber-100 text-amber-800"
        : "bg-emerald-100 text-emerald-800";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {occupied}/{maxCapacity}
    </span>
  );
}


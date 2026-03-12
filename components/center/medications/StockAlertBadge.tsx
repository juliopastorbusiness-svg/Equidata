"use client";

import { MedicationInventoryItem } from "@/lib/services";

type StockAlertBadgeProps = {
  item: MedicationInventoryItem;
};

export function StockAlertBadge({ item }: StockAlertBadgeProps) {
  if (item.alertLevel === "NONE") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        OK
      </span>
    );
  }

  const className =
    item.alertLevel === "CRITICAL"
      ? "bg-red-100 text-red-800"
      : item.alertLevel === "LOW_STOCK"
        ? "bg-amber-100 text-amber-800"
        : "bg-sky-100 text-sky-800";

  const label =
    item.alertLevel === "CRITICAL"
      ? "Crítica"
      : item.alertLevel === "LOW_STOCK"
        ? "Stock bajo"
        : "Caduca pronto";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}


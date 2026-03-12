"use client";

import Link from "next/link";
import { MedicationInventoryItem } from "@/lib/services";
import { StockAlertBadge } from "@/components/center/medications/StockAlertBadge";

type MedicationCardProps = {
  item: MedicationInventoryItem;
  horseId?: string | null;
};

const formatDate = (value?: { toDate: () => Date }) =>
  value ? value.toDate().toLocaleDateString("es-ES") : "Sin fecha";

export function MedicationCard({ item, horseId }: MedicationCardProps) {
  const { medication } = item;
  const href = horseId
    ? `/dashboard/center/medications/${medication.id}?horseId=${horseId}`
    : `/dashboard/center/medications/${medication.id}`;

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-brand-text">{medication.name}</h3>
          <p className="text-sm text-brand-secondary">
            {medication.category || "Sin categoría"} · Lote {medication.batch || "-"}
          </p>
        </div>
        <StockAlertBadge item={item} />
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-brand-secondary">Stock</p>
          <p className="font-medium text-brand-text">
            {medication.stock} {medication.unit}
          </p>
        </div>
        <div>
          <p className="text-brand-secondary">Caducidad</p>
          <p className="font-medium text-brand-text">{formatDate(medication.expiryDate)}</p>
        </div>
        <div>
          <p className="text-brand-secondary">Ubicación</p>
          <p className="font-medium text-brand-text">{medication.storageLocation || "-"}</p>
        </div>
        <div>
          <p className="text-brand-secondary">Proveedor</p>
          <p className="font-medium text-brand-text">{medication.supplier || "-"}</p>
        </div>
      </div>
    </Link>
  );
}

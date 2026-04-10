"use client";

import { BillingCustomerFinancialStatus } from "@/lib/services";

const styles: Record<BillingCustomerFinancialStatus, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  credit: "border-sky-200 bg-sky-50 text-sky-700",
};

const labels: Record<BillingCustomerFinancialStatus, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  credit: "A favor",
};

export function BillingCustomerStatusBadge({
  status,
}: {
  status: BillingCustomerFinancialStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

"use client";

import { StudentPayment } from "@/lib/services";

type PaymentStatusBadgeProps = {
  status: StudentPayment["status"];
};

const styles: Record<StudentPayment["status"], string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  PARTIAL: "border-blue-200 bg-blue-50 text-blue-700",
  PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-700",
  OVERDUE: "border-red-200 bg-red-50 text-red-700",
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

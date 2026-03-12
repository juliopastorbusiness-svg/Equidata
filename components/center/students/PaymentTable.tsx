"use client";

import { StudentPayment } from "@/lib/services";
import { PaymentStatusBadge } from "@/components/center/students/PaymentStatusBadge";

type PaymentTableProps = {
  items: StudentPayment[];
  onEdit: (payment: StudentPayment) => void;
  onDelete: (payment: StudentPayment) => Promise<void>;
};

export function PaymentTable({ items, onEdit, onDelete }: PaymentTableProps) {
  if (items.length === 0) {
    return <p className="text-sm text-brand-secondary">No hay pagos registrados.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-border">
      <table className="min-w-full divide-y divide-brand-border text-sm">
        <thead className="bg-brand-background/60 text-left text-brand-secondary">
          <tr>
            <th className="px-4 py-3 font-medium">Concepto</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Importe</th>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Metodo</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border bg-white/80">
          {items.map((payment) => (
            <tr key={payment.id}>
              <td className="px-4 py-3 text-brand-text">{payment.concept}</td>
              <td className="px-4 py-3 text-brand-secondary">{payment.type}</td>
              <td className="px-4 py-3 text-brand-secondary">{payment.amount.toFixed(2)} EUR</td>
              <td className="px-4 py-3 text-brand-secondary">
                {payment.date.toDate().toLocaleDateString("es-ES")}
              </td>
              <td className="px-4 py-3 text-brand-secondary">{payment.paymentMethod}</td>
              <td className="px-4 py-3">
                <PaymentStatusBadge status={payment.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(payment)}
                    className="inline-flex h-9 items-center rounded-xl border border-brand-border px-3"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDelete(payment)}
                    className="inline-flex h-9 items-center rounded-xl border border-red-200 px-3 text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

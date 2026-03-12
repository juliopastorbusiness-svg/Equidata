"use client";

import { StudentPayment } from "@/lib/services";
import { PaymentForm, PaymentFormValues } from "@/components/center/students/PaymentForm";
import { PaymentTable } from "@/components/center/students/PaymentTable";

type StudentPaymentsTabProps = {
  payments: StudentPayment[];
  editingPayment: StudentPayment | null;
  saving: boolean;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  onEdit: (payment: StudentPayment) => void;
  onDelete: (payment: StudentPayment) => Promise<void>;
  onCancelEdit: () => void;
};

export function StudentPaymentsTab({
  payments,
  editingPayment,
  saving,
  onSubmit,
  onEdit,
  onDelete,
  onCancelEdit,
}: StudentPaymentsTabProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-brand-text">Pagos</h3>
          <p className="text-sm text-brand-secondary">Historico y estado de cobros del alumno.</p>
        </div>
        <PaymentTable items={payments} onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-brand-text">
              {editingPayment ? "Editar pago" : "Nuevo pago"}
            </h3>
            <p className="text-sm text-brand-secondary">Registra pagos puntuales o pendientes.</p>
          </div>
          {editingPayment && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
        <PaymentForm
          defaultValues={editingPayment ?? undefined}
          submitting={saving}
          submitLabel={editingPayment ? "Guardar cambios" : "Crear pago"}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}

"use client";

import { BillingMovement } from "@/lib/services";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const typeStyles = {
  expense: "border-red-200 bg-red-50 text-red-700",
  payment: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const;

const typeLabels = {
  expense: "Gasto",
  payment: "Pago",
} as const;

export function BillingMovementHistory({
  movements,
  onEdit,
  onDelete,
  deletingId,
}: {
  movements: BillingMovement[];
  onEdit: (movement: BillingMovement) => void;
  onDelete: (movement: BillingMovement) => Promise<void>;
  deletingId?: string | null;
}) {
  if (movements.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-brand-border bg-brand-background/60 px-5 py-10 text-center text-sm text-brand-secondary">
        Todavia no hay movimientos para este cliente.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movements.map((movement) => (
        <article
          key={movement.id}
          className="rounded-[1.5rem] border border-brand-border bg-white/80 p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${typeStyles[movement.type]}`}
                >
                  {typeLabels[movement.type]}
                </span>
                <p className="text-sm text-brand-secondary">
                  {movement.date.toDate().toLocaleDateString("es-ES")}
                </p>
              </div>
              <h3 className="mt-2 text-base font-semibold text-brand-text">
                {movement.description}
              </h3>
              <p className="mt-1 text-sm font-semibold text-brand-text">
                {currency.format(movement.amount)}
              </p>
              {movement.paymentMethod ? (
                <p className="mt-1 text-sm text-brand-secondary">
                  Metodo: {movement.paymentMethod}
                  {movement.reference ? ` · Ref. ${movement.reference}` : ""}
                </p>
              ) : null}
              {movement.notes ? (
                <p className="mt-2 text-sm text-brand-secondary">{movement.notes}</p>
              ) : null}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(movement)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text"
              >
                Editar
              </button>
              <button
                type="button"
                disabled={deletingId === movement.id}
                onClick={() => onDelete(movement)}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-60"
              >
                {deletingId === movement.id ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

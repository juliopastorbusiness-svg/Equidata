"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { BillingCustomerForm } from "@/components/dashboard/billing/BillingCustomerForm";
import { BillingCustomerStatusBadge } from "@/components/dashboard/billing/BillingCustomerStatusBadge";
import { BillingMovementForm } from "@/components/dashboard/billing/BillingMovementForm";
import { BillingMovementHistory } from "@/components/dashboard/billing/BillingMovementHistory";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  BillingCustomer,
  BillingMovement,
  createBillingMovement,
  deleteBillingMovement,
  getBillingCustomerById,
  listBillingMovements,
  UpdateBillingMovementInput,
  updateBillingCustomer,
  updateBillingMovement,
  UpsertBillingCustomerInput,
} from "@/lib/services";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

type CustomerModalState =
  | { type: "customer" }
  | { type: "expense" }
  | { type: "payment" }
  | { type: "movement"; movement: BillingMovement }
  | null;

export default function BillingCustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = typeof params.customerId === "string" ? params.customerId : "";
  const { user } = useAuthUser();
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [movements, setMovements] = useState<BillingMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [modalState, setModalState] = useState<CustomerModalState>(null);

  useEffect(() => {
    if (!activeCenterId || !customerId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [customerRow, movementRows] = await Promise.all([
          getBillingCustomerById(activeCenterId, customerId),
          listBillingMovements(activeCenterId, customerId),
        ]);

        if (!isMounted) return;
        setCustomer(customerRow);
        setMovements(movementRows);
      } catch (loadError) {
        console.error(loadError);
        if (!isMounted) return;
        setError("No se pudo cargar el detalle del cliente.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [activeCenterId, customerId]);

  const movementKpis = useMemo(
    () => ({
      expenses: movements
        .filter((movement) => movement.type === "expense")
        .reduce((sum, movement) => sum + movement.amount, 0),
      payments: movements
        .filter((movement) => movement.type === "payment")
        .reduce((sum, movement) => sum + movement.amount, 0),
    }),
    [movements]
  );

  const refresh = async () => {
    if (!activeCenterId || !customerId) return;

    const [customerRow, movementRows] = await Promise.all([
      getBillingCustomerById(activeCenterId, customerId),
      listBillingMovements(activeCenterId, customerId),
    ]);

    setCustomer(customerRow);
    setMovements(movementRows);
  };

  const ensureActorUid = () => {
    if (!user?.uid) {
      throw new Error("No se pudo identificar al usuario autenticado.");
    }
    return user.uid;
  };

  const handleUpdateCustomer = async (values: UpsertBillingCustomerInput) => {
    if (!activeCenterId || !customer) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const nextCustomer = await updateBillingCustomer(
        activeCenterId,
        customer.id,
        values,
        ensureActorUid()
      );
      setCustomer(nextCustomer);
      setModalState(null);
      setInfo("Cliente actualizado correctamente.");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar el cliente."
      );
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const handleCreateMovement = async (
    values: UpdateBillingMovementInput & {
      type: "expense" | "payment";
      date: Date;
      description: string;
      amount: number;
    }
  ) => {
    if (!activeCenterId || !customer) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      await createBillingMovement(activeCenterId, customer.id, values, ensureActorUid());
      await refresh();
      setModalState(null);
      setInfo(
        values.type === "expense"
          ? "Gasto registrado correctamente."
          : "Pago registrado correctamente."
      );
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el movimiento."
      );
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMovement = async (
    movement: BillingMovement,
    values: UpdateBillingMovementInput & {
      type: "expense" | "payment";
      date: Date;
      description: string;
      amount: number;
    }
  ) => {
    if (!activeCenterId || !customer) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      await updateBillingMovement(
        activeCenterId,
        customer.id,
        movement.id,
        values,
        ensureActorUid()
      );
      await refresh();
      setModalState(null);
      setInfo("Movimiento actualizado correctamente.");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo actualizar el movimiento."
      );
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMovement = async (movement: BillingMovement) => {
    if (!activeCenterId || !customer) return;
    if (!window.confirm("Se eliminara el movimiento y se recalculara el saldo. Deseas continuar?")) {
      return;
    }

    setDeletingId(movement.id);
    setError(null);
    setInfo(null);

    try {
      await deleteBillingMovement(
        activeCenterId,
        customer.id,
        movement.id,
        ensureActorUid()
      );
      await refresh();
      setInfo("Movimiento eliminado correctamente.");
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el movimiento."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (guardLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando detalle financiero...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso a Facturacion.</p>
          <Link
            href="/dashboard/center/billing"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Volver
          </Link>
        </div>
      </main>
    );
  }

  if (!activeCenterId || !customer) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text">
        <CenterHeader
          title="Detalle de cliente"
          subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
          backHref="/dashboard/center/billing"
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-6">
          {guardError ? (
            <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
              {guardError}
            </p>
          ) : null}
          <section className="rounded-[2rem] border border-brand-border bg-white/80 p-6 shadow-sm">
            <p className="text-sm text-brand-secondary">
              No se ha encontrado el cliente solicitado dentro del centro activo.
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={customer.fullName}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center/billing"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:px-6">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            {info}
          </p>
        ) : null}

        <section className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-brand-text">
                  Perfil financiero del cliente
                </h2>
                <BillingCustomerStatusBadge status={customer.financialStatus} />
              </div>
              <div className="mt-3 grid gap-1 text-sm text-brand-secondary">
                <p>{customer.email || "Sin email"}</p>
                <p>{customer.phone || "Sin telefono"}</p>
                <p>{customer.address || "Sin direccion"}</p>
                {customer.notes ? <p>Notas: {customer.notes}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setModalState({ type: "customer" })}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
              >
                Editar cliente
              </button>
              <button
                type="button"
                onClick={() => setModalState({ type: "expense" })}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white"
              >
                Anadir gasto
              </button>
              <button
                type="button"
                onClick={() => setModalState({ type: "payment" })}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700"
              >
                Registrar pago
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <article className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Total gastado</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text">
                {currency.format(customer.totalSpent)}
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Total pagado</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text">
                {currency.format(customer.totalPaid)}
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Saldo</p>
              <p className="mt-2 text-2xl font-semibold text-brand-text">
                {currency.format(customer.balance)}
              </p>
            </article>
            <article className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Ultimo movimiento</p>
              <p className="mt-2 text-base font-semibold text-brand-text">
                {customer.lastMovementAt
                  ? customer.lastMovementAt.toDate().toLocaleDateString("es-ES")
                  : "Sin movimientos"}
              </p>
            </article>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">
              Resumen de actividad
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
                <p className="text-sm text-brand-secondary">Gastos registrados</p>
                <p className="mt-2 text-2xl font-semibold text-brand-text">
                  {currency.format(movementKpis.expenses)}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
                <p className="text-sm text-brand-secondary">Pagos registrados</p>
                <p className="mt-2 text-2xl font-semibold text-brand-text">
                  {currency.format(movementKpis.payments)}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-secondary">
              Flujo administrativo
            </p>
            <ol className="mt-4 space-y-3 text-sm text-brand-secondary">
              <li>1. Da de alta el cliente desde Facturacion.</li>
              <li>2. Anade gastos conforme se prestan servicios.</li>
              <li>3. Registra pagos y el saldo se actualiza al instante.</li>
              <li>4. Edita o elimina movimientos sin descuadrar totales.</li>
            </ol>
          </article>
        </section>

        <section className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-brand-text">Historial financiero</h2>
            <p className="mt-1 text-sm text-brand-secondary">
              Cronologia completa de gastos y pagos del cliente.
            </p>
          </div>
          <BillingMovementHistory
            movements={movements}
            deletingId={deletingId}
            onEdit={(movement) => setModalState({ type: "movement", movement })}
            onDelete={handleDeleteMovement}
          />
        </section>
      </div>

      {modalState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-background/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-brand-border bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-brand-text">
                {modalState.type === "customer"
                  ? "Editar cliente"
                  : modalState.type === "expense"
                    ? "Anadir gasto"
                    : modalState.type === "payment"
                      ? "Registrar pago"
                      : "Editar movimiento"}
              </h3>
              <p className="mt-1 text-sm text-brand-secondary">
                {modalState.type === "customer"
                  ? "Actualiza los datos de contacto y observaciones del cliente."
                  : "Todos los importes se recalculan en la capa de servicio para mantener el saldo consistente."}
              </p>
            </div>

            {modalState.type === "customer" ? (
              <BillingCustomerForm
                initialValues={{
                  fullName: customer.fullName,
                  phone: customer.phone,
                  email: customer.email,
                  address: customer.address,
                  notes: customer.notes,
                }}
                submitting={saving}
                onCancel={() => setModalState(null)}
                onSubmit={handleUpdateCustomer}
              />
            ) : modalState.type === "movement" ? (
              <BillingMovementForm
                initialValues={{
                  type: modalState.movement.type,
                  date: modalState.movement.date.toDate(),
                  description: modalState.movement.description,
                  amount: modalState.movement.amount,
                  notes: modalState.movement.notes,
                  paymentMethod: modalState.movement.paymentMethod,
                  reference: modalState.movement.reference,
                }}
                submitting={saving}
                onCancel={() => setModalState(null)}
                onSubmit={(values) =>
                  handleUpdateMovement(modalState.movement, values)
                }
              />
            ) : (
              <BillingMovementForm
                forcedType={modalState.type}
                submitting={saving}
                onCancel={() => setModalState(null)}
                onSubmit={handleCreateMovement}
              />
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}

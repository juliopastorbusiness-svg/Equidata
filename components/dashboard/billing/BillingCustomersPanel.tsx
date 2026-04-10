"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BillingCustomerForm } from "@/components/dashboard/billing/BillingCustomerForm";
import { BillingCustomerStatusBadge } from "@/components/dashboard/billing/BillingCustomerStatusBadge";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import {
  BillingCustomer,
  createBillingCustomer,
  listBillingCustomers,
  UpsertBillingCustomerInput,
} from "@/lib/services";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

export function BillingCustomersPanel({ centerId }: { centerId: string }) {
  const { user } = useAuthUser();
  const [customers, setCustomers] = useState<BillingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const totals = useMemo(
    () =>
      customers.reduce(
        (accumulator, customer) => ({
          totalSpent: accumulator.totalSpent + customer.totalSpent,
          totalPaid: accumulator.totalPaid + customer.totalPaid,
          balance: accumulator.balance + customer.balance,
        }),
        { totalSpent: 0, totalPaid: 0, balance: 0 }
      ),
    [customers]
  );

  useEffect(() => {
    let isMounted = true;

    const loadCustomers = async () => {
      setLoading(true);
      setError(null);

      try {
        const rows = await listBillingCustomers(centerId);
        if (!isMounted) return;
        setCustomers(rows);
      } catch (loadError) {
        console.error(loadError);
        if (!isMounted) return;
        setError("No se pudo cargar la cartera de clientes.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadCustomers();

    return () => {
      isMounted = false;
    };
  }, [centerId]);

  const handleCreateCustomer = async (values: UpsertBillingCustomerInput) => {
    if (!user?.uid) {
      throw new Error("No se pudo identificar al usuario autenticado.");
    }

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const customer = await createBillingCustomer(centerId, values, user.uid);
      setCustomers((previous) =>
        [...previous, customer].sort((left, right) =>
          left.fullName.localeCompare(right.fullName, "es")
        )
      );
      setModalOpen(false);
      setInfo("Cliente creado correctamente.");
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo crear el cliente."
      );
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-secondary">
            Cartera de clientes
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-brand-text">
            Clientes y saldo vivo del centro
          </h2>
          <p className="mt-1 text-sm text-brand-secondary">
            Alta rapida de clientes, saldo pendiente y acceso directo al historial financiero.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white"
        >
          Anadir cliente
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="mt-4 rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">
          {info}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Total gastado</p>
          <p className="mt-2 text-2xl font-semibold text-brand-text">
            {currency.format(totals.totalSpent)}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Total pagado</p>
          <p className="mt-2 text-2xl font-semibold text-brand-text">
            {currency.format(totals.totalPaid)}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-brand-border bg-brand-background/60 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-brand-secondary">Saldo pendiente</p>
          <p className="mt-2 text-2xl font-semibold text-brand-text">
            {currency.format(totals.balance)}
          </p>
        </article>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-brand-border">
        {loading ? (
          <div className="bg-white px-5 py-10 text-center text-sm text-brand-secondary">
            Cargando clientes...
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white px-5 py-10 text-center text-sm text-brand-secondary">
            Aun no hay clientes creados en facturacion para este centro.
          </div>
        ) : (
          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-brand-border bg-brand-background/70 text-brand-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Total gastado</th>
                  <th className="px-4 py-3 font-medium">Total pagado</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-brand-border last:border-b-0">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-brand-text">{customer.fullName}</p>
                      <p className="text-xs text-brand-secondary">
                        {customer.email || customer.phone || "Sin datos adicionales"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-brand-text">
                      {currency.format(customer.totalSpent)}
                    </td>
                    <td className="px-4 py-4 text-brand-text">
                      {currency.format(customer.totalPaid)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-brand-text">
                      {currency.format(customer.balance)}
                    </td>
                    <td className="px-4 py-4">
                      <BillingCustomerStatusBadge status={customer.financialStatus} />
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/center/billing/customers/${customer.id}`}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-background/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[2rem] border border-brand-border bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-brand-text">Nuevo cliente</h3>
              <p className="mt-1 text-sm text-brand-secondary">
                Crea una ficha de cliente asociada al centro activo.
              </p>
            </div>
            <BillingCustomerForm
              submitting={saving}
              onCancel={() => setModalOpen(false)}
              onSubmit={handleCreateCustomer}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

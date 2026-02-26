"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  addOneOffCharge,
  BillingPeriod,
  BillingServiceDoc,
  ChargeDoc,
  createExpense,
  deleteExpense,
  ExpenseDoc,
  generateMonthlyCharges,
  getCurrentPeriod,
  getMonthlyClientBreakdown,
  getMonthlySummary,
  LedgerEntryDoc,
  LedgerEntryType,
  listClientBillingServices,
  listClientCharges,
  listClientLedgerEntriesByPeriod,
  listClientPayments,
  listExpensesByPeriod,
  listLedgerEntriesByPeriod,
  MonthlyClientBreakdownRow,
  MonthlySummaryRow,
  PaymentDoc,
  periodToKey,
  registerPayment,
  updateExpense,
} from "@/lib/firestore/billing";

type BillingTab = "CLIENTS" | "SUMMARY" | "EXPENSES";
type DetailTab = "CHARGES" | "PAYMENTS" | "ACTIVITY";
type LedgerFilter = "ALL" | LedgerEntryType;

type PaymentFormState = {
  chargeId: string;
  amount: string;
  method: string;
  notes: string;
};

type OneOffFormState = {
  description: string;
  amount: string;
  dueDate: string;
};

type ExpenseFormState = {
  expenseId: string | null;
  category: string;
  description: string;
  amount: string;
  date: string;
  method: string;
  notes: string;
};

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const currentPeriod = getCurrentPeriod();

const defaultExpenseCategories = [
  "Piensos y forrajes",
  "Material / suministros",
  "Sueldos",
  "Mantenimiento / arreglos",
  "Agua",
  "Luz",
  "Veterinario (centro)",
  "Herrador (centro)",
  "Seguros",
  "Impuestos / tasas",
  "Marketing",
  "Otros",
] as const;

const toMonthInput = (period: BillingPeriod): string =>
  `${period.year}-${String(period.month).padStart(2, "0")}`;

const fromMonthInput = (value: string): BillingPeriod => {
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return getCurrentPeriod();
  }

  return { year, month };
};

const statusStyles: Record<string, string> = {
  PAID: "bg-emerald-900/70 text-emerald-200",
  PENDING: "bg-brand-primary/70 text-brand-secondary",
  PARTIAL: "bg-brand-primary/15 text-brand-primary",
  OVERDUE: "bg-red-900/70 text-red-200",
  NO_CHARGES: "bg-brand-background text-brand-text",
};

const ledgerTypeStyles: Record<LedgerEntryType, string> = {
  PAYMENT: "bg-emerald-900/70 text-emerald-200",
  EXPENSE: "bg-red-900/70 text-red-200",
  CHARGE: "bg-brand-primary/15 text-brand-primary",
};

const paymentInit: PaymentFormState = {
  chargeId: "",
  amount: "",
  method: "manual",
  notes: "",
};

const oneOffInit: OneOffFormState = {
  description: "",
  amount: "",
  dueDate: "",
};

const expenseInit: ExpenseFormState = {
  expenseId: null,
  category: defaultExpenseCategories[0],
  description: "",
  amount: "",
  date: "",
  method: "",
  notes: "",
};

const toDateLabel = (value: Date | null): string => {
  if (!value) return "-";
  return value.toLocaleDateString("es-ES");
};

const toDateTimeLabel = (value: Date | null): string => {
  if (!value) return "-";
  return value.toLocaleString("es-ES");
};

const chargeDueDate = (charge: ChargeDoc): Date | null => {
  if (!charge.dueDate) return null;
  return charge.dueDate.toDate();
};

const chargeRemaining = (charge: ChargeDoc): number => {
  const amount = Number(charge.amount) || 0;
  const remainingAmount = Number(charge.remainingAmount);
  if (Number.isFinite(remainingAmount) && remainingAmount > 0) {
    return Math.max(0, remainingAmount);
  }
  const paid = Number(charge.paidAmount) || 0;
  return Math.max(0, amount - paid);
};

const paymentDate = (payment: PaymentDoc): Date | null =>
  payment.paidAt?.toDate() ?? payment.createdAt?.toDate() ?? null;

const ledgerDate = (entry: LedgerEntryDoc): Date | null => entry.createdAt?.toDate() ?? null;

const expenseDate = (expense: ExpenseDoc): Date | null =>
  expense.date?.toDate() ?? expense.createdAt?.toDate() ?? null;

const toDateInput = (value: Date | null): string => {
  if (!value) return "";
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const ledgerAmountClass = (amountSigned: number): string => {
  if (amountSigned > 0) return "text-emerald-700";
  if (amountSigned < 0) return "text-red-700";
  return "text-brand-secondary";
};

export default function CenterBillingPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [tab, setTab] = useState<BillingTab>("CLIENTS");
  const [periodInput, setPeriodInput] = useState<string>(toMonthInput(currentPeriod));
  const [summaryRange, setSummaryRange] = useState<6 | 12 | 24>(6);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [clientRows, setClientRows] = useState<MonthlyClientBreakdownRow[]>([]);
  const [summaryRows, setSummaryRows] = useState<MonthlySummaryRow[]>([]);
  const [expensesRows, setExpensesRows] = useState<ExpenseDoc[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerEntryDoc[]>([]);

  const [selectedClient, setSelectedClient] =
    useState<MonthlyClientBreakdownRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("CHARGES");
  const [detailServices, setDetailServices] = useState<BillingServiceDoc[]>([]);
  const [detailCharges, setDetailCharges] = useState<ChargeDoc[]>([]);
  const [detailPayments, setDetailPayments] = useState<PaymentDoc[]>([]);
  const [detailActivity, setDetailActivity] = useState<LedgerEntryDoc[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(paymentInit);
  const [oneOffForm, setOneOffForm] = useState<OneOffFormState>(oneOffInit);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>(expenseInit);
  const [movementsOpen, setMovementsOpen] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>("ALL");

  const selectedPeriod = useMemo(() => fromMonthInput(periodInput), [periodInput]);
  const selectedPeriodKey = useMemo(() => periodToKey(selectedPeriod), [selectedPeriod]);
  const currentPeriodKey = useMemo(() => periodToKey(getCurrentPeriod()), []);

  const riderLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    clientRows.forEach((row) => map.set(row.riderUid, row.riderLabel));
    return map;
  }, [clientRows]);

  const kpis = useMemo(() => {
    const fromRows = summaryRows.find((row) => row.periodKey === currentPeriodKey);

    if (fromRows) {
      return fromRows;
    }

    return {
      periodKey: currentPeriodKey,
      periodLabel: "Mes actual",
      billed: 0,
      collected: 0,
      expenses: 0,
      net: 0,
      pending: 0,
      overdue: 0,
      clientCount: 0,
    } satisfies MonthlySummaryRow;
  }, [currentPeriodKey, summaryRows]);

  const selectedPeriodSummary = useMemo(
    () =>
      summaryRows.find((row) => row.periodKey === selectedPeriodKey) ?? {
        periodKey: selectedPeriodKey,
        periodLabel: selectedPeriodKey,
        billed: 0,
        collected: 0,
        expenses: 0,
        net: 0,
        pending: 0,
        overdue: 0,
        clientCount: 0,
      },
    [selectedPeriodKey, summaryRows]
  );

  const pendingClientCharges = useMemo(
    () => detailCharges.filter((charge) => chargeRemaining(charge) > 0),
    [detailCharges]
  );

  const detailPaymentsTotal = useMemo(
    () => detailPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
    [detailPayments]
  );

  const movementsKpis = useMemo(() => {
    const ingresos = ledgerRows
      .filter((entry) => entry.type === "PAYMENT")
      .reduce((sum, entry) => sum + (Number(entry.amountSigned) || 0), 0);
    const gastos = ledgerRows
      .filter((entry) => entry.type === "EXPENSE")
      .reduce((sum, entry) => sum + Math.abs(Number(entry.amountSigned) || 0), 0);
    return { ingresos, gastos, neto: ingresos - gastos };
  }, [ledgerRows]);

  const filteredLedgerRows = useMemo(() => {
    if (ledgerFilter === "ALL") return ledgerRows;
    return ledgerRows.filter((entry) => entry.type === ledgerFilter);
  }, [ledgerFilter, ledgerRows]);

  const refreshData = async (centerId: string, keepDetail = true) => {
    setLoading(true);
    setError(null);

    try {
      const [clients, summary, expenses, ledger] = await Promise.all([
        getMonthlyClientBreakdown(centerId, selectedPeriod),
        getMonthlySummary(centerId, Math.max(summaryRange, 6)),
        listExpensesByPeriod(centerId, selectedPeriod),
        listLedgerEntriesByPeriod(centerId, selectedPeriod),
      ]);

      setClientRows(clients);
      setSummaryRows(summary);
      setExpensesRows(expenses);
      setLedgerRows(ledger);

      if (keepDetail && selectedClient) {
        const stillExists = clients.find((row) => row.riderUid === selectedClient.riderUid);
        if (stillExists) {
          setSelectedClient(stillExists);
          await loadClientDetail(centerId, stillExists.riderUid);
        }
      }
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar la informacion de facturacion.");
    } finally {
      setLoading(false);
    }
  };

  const loadClientDetail = async (centerId: string, riderUid: string) => {
    setDetailLoading(true);
    setError(null);

    try {
      const [services, charges, payments, activity] = await Promise.all([
        listClientBillingServices(centerId, riderUid),
        listClientCharges(centerId, riderUid, selectedPeriod),
        listClientPayments(centerId, riderUid, selectedPeriod),
        listClientLedgerEntriesByPeriod(centerId, riderUid, selectedPeriod),
      ]);

      setDetailServices(services);
      setDetailCharges(charges);
      setDetailPayments(payments);
      setDetailActivity(activity);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el detalle del cliente.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId) {
      setClientRows([]);
      setSummaryRows([]);
      setExpensesRows([]);
      setLedgerRows([]);
      setLoading(false);
      return;
    }

    void refreshData(activeCenterId, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCenterId, periodInput, summaryRange]);

  const onOpenDetail = async (row: MonthlyClientBreakdownRow) => {
    if (!activeCenterId) return;
    setSelectedClient(row);
    setDetailOpen(true);
    setDetailTab("CHARGES");
    setPaymentForm(paymentInit);
    setOneOffForm(oneOffInit);
    await loadClientDetail(activeCenterId, row.riderUid);
  };

  const onGenerateMonthCharges = async () => {
    if (!activeCenterId) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const result = await generateMonthlyCharges(activeCenterId, selectedPeriod);
      setInfo(`Cargos generados: ${result.created}. Ya existentes: ${result.skipped}.`);
      await refreshData(activeCenterId);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudieron generar los cargos del mes."
      );
    } finally {
      setSaving(false);
    }
  };

  const onSubmitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId || !selectedClient) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      await registerPayment(activeCenterId, {
        riderUid: selectedClient.riderUid,
        amount: Number(paymentForm.amount),
        period: selectedPeriod,
        chargeId: paymentForm.chargeId || undefined,
        method: paymentForm.method,
        notes: paymentForm.notes,
      });

      setInfo("Pago registrado correctamente.");
      setPaymentForm(paymentInit);
      await refreshData(activeCenterId);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo registrar el pago."
      );
    } finally {
      setSaving(false);
    }
  };

  const onSubmitOneOffCharge = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId || !selectedClient) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      await addOneOffCharge(activeCenterId, {
        riderUid: selectedClient.riderUid,
        period: selectedPeriod,
        description: oneOffForm.description,
        amount: Number(oneOffForm.amount),
        dueDate: oneOffForm.dueDate ? new Date(`${oneOffForm.dueDate}T00:00:00`) : undefined,
      });

      setInfo("Cargo puntual creado correctamente.");
      setOneOffForm(oneOffInit);
      await refreshData(activeCenterId);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo crear el cargo puntual."
      );
    } finally {
      setSaving(false);
    }
  };

  const resetExpenseForm = () => setExpenseForm(expenseInit);

  const onSubmitExpense = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      const payload = {
        period: selectedPeriod,
        category: expenseForm.category,
        description: expenseForm.description,
        amount: Number(expenseForm.amount),
        date: expenseForm.date ? new Date(`${expenseForm.date}T00:00:00`) : undefined,
        method: expenseForm.method || undefined,
        notes: expenseForm.notes || undefined,
      };

      if (expenseForm.expenseId) {
        await updateExpense(activeCenterId, expenseForm.expenseId, payload);
        setInfo("Gasto actualizado correctamente.");
      } else {
        await createExpense(activeCenterId, payload);
        setInfo("Gasto creado correctamente.");
      }

      resetExpenseForm();
      await refreshData(activeCenterId);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el gasto."
      );
    } finally {
      setSaving(false);
    }
  };

  const onEditExpense = (expense: ExpenseDoc) => {
    setTab("EXPENSES");
    setExpenseForm({
      expenseId: expense.id,
      category: expense.category || defaultExpenseCategories[0],
      description: expense.description || "",
      amount: String(Number(expense.amount) || ""),
      date: toDateInput(expenseDate(expense)),
      method: expense.method || "",
      notes: expense.notes || "",
    });
  };

  const onDeleteExpense = async (expenseId: string) => {
    if (!activeCenterId) return;

    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      await deleteExpense(activeCenterId, expenseId);
      if (expenseForm.expenseId === expenseId) {
        resetExpenseForm();
      }
      setInfo("Gasto eliminado correctamente.");
      await refreshData(activeCenterId);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo eliminar el gasto."
      );
    } finally {
      setSaving(false);
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
        <p>Cargando permisos del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso a Facturación.</p>
          <Link
            href="/dashboard/center"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Volver a Centro
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Facturación"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
        primaryActionLabel="Generar cargos del mes"
        onPrimaryAction={onGenerateMonthCharges}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        {info && (
          <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            {info}
          </p>
        )}

      {memberships.length > 1 && (
        <section className="max-w-xl rounded-2xl border border-brand-border bg-white/60 p-4">
          <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
            Cambiar centro activo
          </label>
          <select
            id="center-selector"
            value={activeCenterId ?? ""}
            onChange={(event) => setActiveCenterId(event.target.value)}
            className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
          >
            {memberships.map((membership) => (
              <option key={membership.centerId} value={membership.centerId}>
                {membership.centerName} ({membership.role})
              </option>
            ))}
          </select>
        </section>
      )}

      {!activeCenterId ? (
        <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
          No tienes centro asignado.
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Periodo de trabajo</p>
                <p className="text-sm text-brand-secondary">{periodInput}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="month"
                  value={periodInput}
                  onChange={(event) => setPeriodInput(event.target.value)}
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                />
                <button
                  type="button"
                  onClick={onGenerateMonthCharges}
                  disabled={saving}
                  className="rounded bg-brand-primary text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Generar cargos del mes
                </button>
                <button
                  type="button"
                  onClick={() => setMovementsOpen(true)}
                  className="rounded border border-brand-border px-3 py-2 text-sm"
                >
                  Ver movimientos del mes
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs uppercase text-brand-secondary">Facturado</p>
                <p className="text-2xl font-semibold">{currency.format(kpis.billed)}</p>
              </article>
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs uppercase text-brand-secondary">Cobrado</p>
                <p className="text-2xl font-semibold">{currency.format(kpis.collected)}</p>
              </article>
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs uppercase text-brand-secondary">Gastos</p>
                <p className="text-2xl font-semibold">{currency.format(kpis.expenses)}</p>
              </article>
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs uppercase text-brand-secondary">Neto</p>
                <p className="text-2xl font-semibold">{currency.format(kpis.net)}</p>
              </article>
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs uppercase text-brand-secondary">Pendiente</p>
                <p className="text-2xl font-semibold">{currency.format(kpis.pending)}</p>
              </article>
            </div>
            <p className="text-xs text-brand-secondary">
              Retrasado:{" "}
              <span className="font-semibold text-brand-text">
                {currency.format(kpis.overdue)}
              </span>
            </p>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg border border-brand-border p-1">
                <button
                  type="button"
                  onClick={() => setTab("CLIENTS")}
                  className={`rounded px-3 py-1 text-sm ${
                    tab === "CLIENTS" ? "bg-brand-border text-brand-text" : "text-brand-secondary"
                  }`}
                >
                  Clientes
                </button>
                <button
                  type="button"
                  onClick={() => setTab("SUMMARY")}
                  className={`rounded px-3 py-1 text-sm ${
                    tab === "SUMMARY" ? "bg-brand-border text-brand-text" : "text-brand-secondary"
                  }`}
                >
                  Resumen mensual
                </button>
                <button
                  type="button"
                  onClick={() => setTab("EXPENSES")}
                  className={`rounded px-3 py-1 text-sm ${
                    tab === "EXPENSES" ? "bg-brand-border text-brand-text" : "text-brand-secondary"
                  }`}
                >
                  Gastos
                </button>
              </div>

              {tab === "SUMMARY" && (
                <select
                  value={summaryRange}
                  onChange={(event) => setSummaryRange(Number(event.target.value) as 6 | 12 | 24)}
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                >
                  <option value={6}>Ultimos 6 meses</option>
                  <option value={12}>Ultimos 12 meses</option>
                  <option value={24}>Ultimos 24 meses</option>
                </select>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-brand-secondary">Cargando facturacion...</p>
            ) : tab === "CLIENTS" ? (
              clientRows.length === 0 ? (
                <p className="text-sm text-brand-secondary">
                  No hay riders con horseStays activos para este periodo.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-left text-brand-secondary">
                        <th className="py-2 pr-4">Cliente</th>
                        <th className="py-2 pr-4">Horse stays activos</th>
                        <th className="py-2 pr-4">Importe mes</th>
                        <th className="py-2 pr-4">Estado global</th>
                        <th className="py-2 pr-4">Proximo vencimiento</th>
                        <th className="py-2 pr-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientRows.map((row) => (
                        <tr key={row.riderUid} className="border-b border-brand-border">
                          <td className="py-2 pr-4">
                            <p className="font-semibold">{row.riderLabel}</p>
                            <p className="text-xs text-brand-secondary">{row.riderUid}</p>
                          </td>
                          <td className="py-2 pr-4">{row.horseCount}</td>
                          <td className="py-2 pr-4">{currency.format(row.monthAmount)}</td>
                          <td className="py-2 pr-4">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                statusStyles[row.globalStatus] ?? statusStyles.NO_CHARGES
                              }`}
                            >
                              {row.globalStatus}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{toDateLabel(row.nextDueDate)}</td>
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => void onOpenDetail(row)}
                              className="rounded border border-brand-border px-2 py-1 text-xs"
                            >
                              Ver detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : tab === "SUMMARY" ? (
              summaryRows.length === 0 ? (
                <p className="text-sm text-brand-secondary">No hay datos para el resumen mensual.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-left text-brand-secondary">
                        <th className="py-2 pr-4">Mes</th>
                        <th className="py-2 pr-4">Facturado</th>
                        <th className="py-2 pr-4">Cobrado</th>
                        <th className="py-2 pr-4">Gastos</th>
                        <th className="py-2 pr-4">Neto</th>
                        <th className="py-2 pr-4">Pendiente</th>
                        <th className="py-2 pr-4">Retrasado</th>
                        <th className="py-2 pr-4"># clientes</th>
                        <th className="py-2 pr-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((row) => (
                        <tr key={row.periodKey} className="border-b border-brand-border">
                          <td className="py-2 pr-4">{row.periodLabel}</td>
                          <td className="py-2 pr-4">{currency.format(row.billed)}</td>
                          <td className="py-2 pr-4">{currency.format(row.collected)}</td>
                          <td className="py-2 pr-4">{currency.format(row.expenses)}</td>
                          <td className="py-2 pr-4">{currency.format(row.net)}</td>
                          <td className="py-2 pr-4">{currency.format(row.pending)}</td>
                          <td className="py-2 pr-4">{currency.format(row.overdue)}</td>
                          <td className="py-2 pr-4">{row.clientCount}</td>
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => {
                                setPeriodInput(row.periodKey);
                                setTab("CLIENTS");
                              }}
                              className="rounded border border-brand-border px-2 py-1 text-xs"
                            >
                              Ver desglose
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">
                      {expenseForm.expenseId ? "Editar gasto" : "Nuevo gasto"}
                    </h3>
                    {expenseForm.expenseId && (
                      <button
                        type="button"
                        onClick={resetExpenseForm}
                        className="rounded border border-brand-border px-2 py-1 text-xs"
                      >
                        Cancelar edicion
                      </button>
                    )}
                  </div>
                  <form onSubmit={onSubmitExpense} className="grid gap-2 md:grid-cols-2">
                    <select
                      value={expenseForm.category}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, category: event.target.value }))
                      }
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                    >
                      {defaultExpenseCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                      placeholder="Importe"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={expenseForm.description}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Descripcion"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
                      required
                    />
                    <input
                      type="date"
                      value={expenseForm.date}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, date: event.target.value }))
                      }
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                    />
                    <input
                      type="text"
                      value={expenseForm.method}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, method: event.target.value }))
                      }
                      placeholder="Metodo"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                    />
                    <input
                      type="text"
                      value={expenseForm.notes}
                      onChange={(event) =>
                        setExpenseForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Notas"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
                    />
                    <button
                      disabled={saving}
                      className="rounded bg-brand-primary text-white px-3 py-2 text-sm font-semibold disabled:opacity-60 md:col-span-2"
                    >
                      {expenseForm.expenseId ? "Guardar cambios" : "Crear gasto"}
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Gastos del periodo</h3>
                    <p className="text-sm text-brand-secondary">
                      Total:{" "}
                      <span className="font-semibold text-brand-text">
                        {currency.format(
                          expensesRows.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
                        )}
                      </span>
                    </p>
                  </div>
                  {expensesRows.length === 0 ? (
                    <p className="text-sm text-brand-secondary">Sin gastos en este periodo.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-brand-border text-left text-brand-secondary">
                            <th className="py-2 pr-4">Fecha</th>
                            <th className="py-2 pr-4">Categoria</th>
                            <th className="py-2 pr-4">Descripcion</th>
                            <th className="py-2 pr-4">Metodo</th>
                            <th className="py-2 pr-4">Importe</th>
                            <th className="py-2 pr-4">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesRows.map((expense) => (
                            <tr key={expense.id} className="border-b border-brand-border">
                              <td className="py-2 pr-4">{toDateLabel(expenseDate(expense))}</td>
                              <td className="py-2 pr-4">{expense.category}</td>
                              <td className="py-2 pr-4">
                                <p>{expense.description}</p>
                                {expense.notes && (
                                  <p className="text-xs text-brand-secondary">{expense.notes}</p>
                                )}
                              </td>
                              <td className="py-2 pr-4">{expense.method || "-"}</td>
                              <td className="py-2 pr-4">{currency.format(Number(expense.amount) || 0)}</td>
                              <td className="py-2 pr-4">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onEditExpense(expense)}
                                    className="rounded border border-brand-border px-2 py-1 text-xs"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void onDeleteExpense(expense.id)}
                                    className="rounded border border-red-800 px-2 py-1 text-xs text-red-300"
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
                  )}
                </section>
              </div>
            )}
          </section>
        </>
      )}

      {detailOpen && selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end bg-brand-background/60">
          <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-brand-border bg-brand-background p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Detalle cliente</h2>
                <p className="text-sm text-brand-secondary">{selectedClient.riderLabel}</p>
                <p className="text-xs text-brand-secondary">{selectedClient.riderUid}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded border border-brand-border px-2 py-1 text-xs"
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onGenerateMonthCharges}
                disabled={saving}
                className="rounded bg-brand-primary text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                Generar cargos del mes
              </button>
              <span className="text-xs text-brand-secondary">Periodo: {periodInput}</span>
            </div>

            <div className="inline-flex rounded-lg border border-brand-border p-1">
              <button
                type="button"
                onClick={() => setDetailTab("CHARGES")}
                className={`rounded px-3 py-1 text-sm ${
                  detailTab === "CHARGES" ? "bg-brand-border text-brand-text" : "text-brand-secondary"
                }`}
              >
                CARGOS
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("PAYMENTS")}
                className={`rounded px-3 py-1 text-sm ${
                  detailTab === "PAYMENTS" ? "bg-brand-border text-brand-text" : "text-brand-secondary"
                }`}
              >
                PAGOS
              </button>
              <button
                type="button"
                onClick={() => setDetailTab("ACTIVITY")}
                className={`rounded px-3 py-1 text-sm ${
                  detailTab === "ACTIVITY" ? "bg-brand-border text-brand-text" : "text-brand-secondary"
                }`}
              >
                ACTIVIDAD
              </button>
            </div>

            {detailLoading ? (
              <p className="text-sm text-brand-secondary">Cargando detalle...</p>
            ) : detailTab === "PAYMENTS" ? (
              <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Pagos del periodo</h3>
                  <p className="text-sm text-brand-secondary">
                    Total pagado este mes:{" "}
                    <span className="font-semibold text-brand-text">
                      {currency.format(detailPaymentsTotal)}
                    </span>
                  </p>
                </div>
                {detailPayments.length === 0 ? (
                  <p className="text-sm text-brand-secondary">Sin pagos para este periodo.</p>
                ) : (
                  <div className="space-y-2">
                    {detailPayments.map((payment) => (
                      <div key={payment.id} className="rounded border border-brand-border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">
                            {currency.format(Number(payment.amount) || 0)}
                          </p>
                          <p className="text-xs text-brand-secondary">
                            {toDateTimeLabel(paymentDate(payment))}
                          </p>
                        </div>
                        <p className="text-brand-secondary">Metodo: {payment.method || "manual"}</p>
                        {payment.notes && (
                          <p className="text-xs text-brand-secondary">Notas: {payment.notes}</p>
                        )}
                        {payment.chargeId && (
                          <p className="text-xs text-brand-secondary">
                            Asociado a cargo: {payment.chargeId}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : detailTab === "ACTIVITY" ? (
              <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                <h3 className="text-lg font-semibold">Actividad del periodo</h3>
                {detailActivity.length === 0 ? (
                  <p className="text-sm text-brand-secondary">Sin actividad registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {detailActivity.map((entry) => (
                      <div key={entry.id} className="rounded border border-brand-border p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-1 text-xs ${ledgerTypeStyles[entry.type]}`}
                            >
                              {entry.type}
                            </span>
                            <p className="font-semibold">{entry.summary}</p>
                          </div>
                          <p className="text-xs text-brand-secondary">
                            {toDateTimeLabel(ledgerDate(entry))}
                          </p>
                        </div>
                        {Number(entry.amountSigned) !== 0 && (
                          <p className={`mt-1 ${ledgerAmountClass(entry.amountSigned)}`}>
                            {currency.format(Number(entry.amountSigned) || 0)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Servicios activos</h3>
                  {detailServices.length === 0 ? (
                    <p className="text-sm text-brand-secondary">Sin servicios activos.</p>
                  ) : (
                    <div className="space-y-2">
                      {detailServices.map((service) => (
                        <div key={service.id} className="rounded border border-brand-border p-2 text-sm">
                          <p className="font-semibold">{service.name}</p>
                          <p className="text-brand-secondary">
                            {currency.format(service.amount)} / mes - horseId: {service.horseId}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Registrar pago</h3>
                  <form onSubmit={onSubmitPayment} className="grid gap-2 md:grid-cols-2">
                    <select
                      value={paymentForm.chargeId}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, chargeId: event.target.value }))
                      }
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
                    >
                      <option value="">Sin asociar a cargo</option>
                      {pendingClientCharges.map((charge) => (
                        <option key={charge.id} value={charge.id}>
                          {charge.description || charge.id} - restante {currency.format(chargeRemaining(charge))}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                      placeholder="Importe"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={paymentForm.method}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, method: event.target.value }))
                      }
                      placeholder="Metodo"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                    />
                    <input
                      type="text"
                      value={paymentForm.notes}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      placeholder="Notas"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
                    />
                    <button
                      disabled={saving}
                      className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold disabled:opacity-60 md:col-span-2"
                    >
                      Registrar pago
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Anadir cargo puntual</h3>
                  <form onSubmit={onSubmitOneOffCharge} className="grid gap-2 md:grid-cols-2">
                    <input
                      type="text"
                      value={oneOffForm.description}
                      onChange={(event) =>
                        setOneOffForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Descripcion"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
                      required
                    />
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={oneOffForm.amount}
                      onChange={(event) =>
                        setOneOffForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                      placeholder="Importe"
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                      required
                    />
                    <input
                      type="date"
                      value={oneOffForm.dueDate}
                      onChange={(event) =>
                        setOneOffForm((prev) => ({ ...prev, dueDate: event.target.value }))
                      }
                      className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                    />
                    <button
                      disabled={saving}
                      className="rounded bg-brand-primary text-white px-3 py-2 text-sm font-semibold disabled:opacity-60 md:col-span-2"
                    >
                      Crear cargo puntual
                    </button>
                  </form>
                </section>

                <section className="rounded-2xl border border-brand-border bg-brand-background/40 p-4 space-y-3">
                  <h3 className="text-lg font-semibold">Cargos del periodo</h3>
                  {detailCharges.length === 0 ? (
                    <p className="text-sm text-brand-secondary">Sin cargos para este periodo.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-brand-border text-left text-brand-secondary">
                            <th className="py-2 pr-4">Concepto</th>
                            <th className="py-2 pr-4">Importe</th>
                            <th className="py-2 pr-4">Pendiente</th>
                            <th className="py-2 pr-4">Estado</th>
                            <th className="py-2 pr-4">Vencimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailCharges.map((charge) => (
                            <tr key={charge.id} className="border-b border-brand-border">
                              <td className="py-2 pr-4">{charge.description || charge.id}</td>
                              <td className="py-2 pr-4">{currency.format(Number(charge.amount) || 0)}</td>
                              <td className="py-2 pr-4">{currency.format(chargeRemaining(charge))}</td>
                              <td className="py-2 pr-4">
                                <span
                                  className={`rounded px-2 py-1 text-xs ${
                                    statusStyles[charge.status || "PENDING"] ?? statusStyles.PENDING
                                  }`}
                                >
                                  {charge.status || "PENDING"}
                                </span>
                              </td>
                              <td className="py-2 pr-4">{toDateLabel(chargeDueDate(charge))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </aside>
        </div>
      )}

      {movementsOpen && activeCenterId && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-brand-background/60 p-4 md:items-center">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-brand-border bg-brand-background">
            <div className="flex items-center justify-between gap-3 border-b border-brand-border p-4">
              <div>
                <h2 className="text-xl font-semibold">Movimientos del mes</h2>
                <p className="text-sm text-brand-secondary">Periodo: {selectedPeriodKey}</p>
              </div>
              <button
                type="button"
                onClick={() => setMovementsOpen(false)}
                className="rounded border border-brand-border px-3 py-2 text-sm"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <article className="rounded-xl border border-brand-border bg-brand-background/40 p-3">
                  <p className="text-xs uppercase text-brand-secondary">Ingresos</p>
                  <p className="text-xl font-semibold">{currency.format(movementsKpis.ingresos)}</p>
                </article>
                <article className="rounded-xl border border-brand-border bg-brand-background/40 p-3">
                  <p className="text-xs uppercase text-brand-secondary">Gastos</p>
                  <p className="text-xl font-semibold">{currency.format(movementsKpis.gastos)}</p>
                </article>
                <article className="rounded-xl border border-brand-border bg-brand-background/40 p-3">
                  <p className="text-xs uppercase text-brand-secondary">Neto</p>
                  <p className="text-xl font-semibold">{currency.format(movementsKpis.neto)}</p>
                </article>
                <article className="rounded-xl border border-brand-border bg-brand-background/40 p-3">
                  <p className="text-xs uppercase text-brand-secondary">Pendiente</p>
                  <p className="text-xl font-semibold">
                    {currency.format(selectedPeriodSummary.pending)}
                  </p>
                </article>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(["ALL", "PAYMENT", "EXPENSE", "CHARGE"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setLedgerFilter(filter)}
                    className={`rounded border px-3 py-1 text-sm ${
                      ledgerFilter === filter
                        ? "border-brand-primary bg-brand-primary/10 text-brand-primary"
                        : "border-brand-border text-brand-secondary"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {filteredLedgerRows.length === 0 ? (
                <p className="text-sm text-brand-secondary">No hay movimientos para este periodo.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-brand-border text-left text-brand-secondary">
                        <th className="py-2 pr-4">Fecha</th>
                        <th className="py-2 pr-4">Tipo</th>
                        <th className="py-2 pr-4">Resumen</th>
                        <th className="py-2 pr-4">Cliente</th>
                        <th className="py-2 pr-4">Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgerRows.map((entry) => (
                        <tr key={entry.id} className="border-b border-brand-border">
                          <td className="py-2 pr-4">{toDateTimeLabel(ledgerDate(entry))}</td>
                          <td className="py-2 pr-4">
                            <span className={`rounded px-2 py-1 text-xs ${ledgerTypeStyles[entry.type]}`}>
                              {entry.type}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{entry.summary}</td>
                          <td className="py-2 pr-4">
                            {entry.riderUid ? riderLabelMap.get(entry.riderUid) ?? entry.riderUid : "-"}
                          </td>
                          <td className={`py-2 pr-4 font-semibold ${ledgerAmountClass(entry.amountSigned)}`}>
                            {currency.format(Number(entry.amountSigned) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}


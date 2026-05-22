"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { auth } from "@/lib/firebase";
import { PLAN_CONFIG, PlanId } from "@/lib/billing/plans";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

type BillingState = {
  planId: PlanId | null;
  status: string | null;
  subscriptionStatus: string | null;
  isActive: boolean;
  horseLimit: number | null;
  featureLimit: number | null;
  horseCount: number;
  enabledModules: string[];
  currentPeriodEnd: string | null;
};

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

const statusLabels: Record<string, string> = {
  active: "Activa",
  trialing: "En prueba",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  unpaid: "Impagada",
};

const limitLabel = (used: number, limit: number | null): string =>
  limit === null ? `${used} / ilimitado` : `${used} / ${limit}`;

const planLimitLabel = (limit: number | null, singular: string, plural: string): string =>
  limit === null ? `${plural} ilimitados` : `Hasta ${limit} ${limit === 1 ? singular : plural}`;

const renewalLabel = (value: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const subscriptionStatusLabel = (billingState: BillingState | null): string => {
  const status = billingState?.subscriptionStatus || billingState?.status;
  if (!status) return "-";
  return statusLabels[status] ?? status;
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

  const [billingState, setBillingState] = useState<BillingState | null>(null);
  const [billingStateLoading, setBillingStateLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>("basic");
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => PLAN_CONFIG.find((plan) => plan.id === selectedPlanId) ?? PLAN_CONFIG[0],
    [selectedPlanId]
  );

  const currentPlan = useMemo(
    () => PLAN_CONFIG.find((plan) => plan.id === billingState?.planId) ?? null,
    [billingState?.planId]
  );

  useEffect(() => {
    if (billingState?.planId) {
      setSelectedPlanId(billingState.planId);
    }
  }, [billingState?.planId]);

  useEffect(() => {
    if (!activeCenterId) {
      setBillingState(null);
      setBillingStateLoading(false);
      return;
    }

    let isMounted = true;

    const loadBillingState = async () => {
      setBillingStateLoading(true);
      setError(null);

      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          throw new Error("No hay sesion activa.");
        }

        const response = await fetch("/api/center/billing-state", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = (await response.json()) as BillingState & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "No se pudo cargar el estado del plan.");
        }

        if (isMounted) {
          setBillingState(data);
        }
      } catch (loadError) {
        console.error("No se pudo cargar el estado del plan:", loadError);
        if (isMounted) {
          setBillingState(null);
          setError("No se pudo cargar el estado del plan.");
        }
      } finally {
        if (isMounted) {
          setBillingStateLoading(false);
        }
      }
    };

    void loadBillingState();

    return () => {
      isMounted = false;
    };
  }, [activeCenterId]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No hay sesion activa.");
      }

      const response = await fetch("/api/stripe/create-customer-portal-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "No se pudo abrir la gestion de suscripcion.");
      }

      window.location.href = data.url;
    } catch (portalError) {
      console.error("No se pudo abrir la gestion de suscripcion:", portalError);
      setError("No se pudo abrir la gestion de suscripcion.");
    } finally {
      setPortalLoading(false);
    }
  };

  const startCheckout = async () => {
    if (!activeCenterId || !selectedPlan) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No hay sesion activa.");
      }

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          centerId: activeCenterId,
          planId: selectedPlan.id,
        }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "No se pudo iniciar la contratacion.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      console.error("No se pudo iniciar la contratacion:", checkoutError);
      setError("No se pudo iniciar la contratacion del plan.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando permisos del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso a la gestion del plan.</p>
          <Link
            href="/dashboard/center"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Volver al centro
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Mi plan"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 md:px-6">
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
            <section className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                    Suscripcion Equidata
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-brand-text">
                    {billingStateLoading
                      ? "Cargando suscripcion..."
                      : currentPlan
                        ? currentPlan.name
                        : "Sin plan activo"}
                  </h2>
                  <p className="mt-2 text-sm text-brand-secondary">
                    Estado: {billingStateLoading ? "-" : subscriptionStatusLabel(billingState)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={billingState?.isActive ? openCustomerPortal : startCheckout}
                  disabled={billingStateLoading || portalLoading || checkoutLoading}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
                >
                  {billingState?.isActive
                    ? portalLoading
                      ? "Abriendo gestion..."
                      : "Cambiar plan"
                    : checkoutLoading
                      ? "Redirigiendo..."
                      : "Contratar plan"}
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-brand-border bg-brand-background/60 p-4">
                  <p className="text-xs uppercase text-brand-secondary">Renovacion</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">
                    {renewalLabel(billingState?.currentPeriodEnd ?? null)}
                  </p>
                </article>
                <article className="rounded-xl border border-brand-border bg-brand-background/60 p-4">
                  <p className="text-xs uppercase text-brand-secondary">Caballos</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">
                    {billingState
                      ? limitLabel(billingState.horseCount, billingState.horseLimit)
                      : "-"}
                  </p>
                </article>
                <article className="rounded-xl border border-brand-border bg-brand-background/60 p-4">
                  <p className="text-xs uppercase text-brand-secondary">Funcionalidades</p>
                  <p className="mt-1 text-base font-semibold text-brand-text">
                    {billingState
                      ? limitLabel(billingState.enabledModules.length, billingState.featureLimit)
                      : "-"}
                  </p>
                </article>
              </div>
            </section>

            <section className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                  Planes disponibles
                </p>
                <h2 className="text-xl font-semibold text-brand-text">
                  Elige el plan de suscripcion del centro
                </h2>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {PLAN_CONFIG.map((plan) => {
                  const isCurrent = billingState?.planId === plan.id && billingState?.isActive;
                  const isSelected = selectedPlanId === plan.id;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        isSelected
                          ? "border-brand-primary bg-brand-background/80"
                          : "border-brand-border bg-white/60 hover:border-brand-primary"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-brand-secondary">
                            {plan.name}
                          </p>
                          <p className="mt-3 text-3xl font-semibold text-brand-text">
                            {currency.format(plan.price)}
                            <span className="text-sm font-medium text-brand-secondary"> / mes</span>
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white">
                            Actual
                          </span>
                        )}
                      </div>

                      <ul className="mt-5 space-y-2 text-sm text-brand-secondary">
                        <li>{planLimitLabel(plan.horseLimit, "caballo", "caballos")}</li>
                        <li>
                          {plan.featureLimit === null
                            ? "Todas las funcionalidades"
                            : `Hasta ${plan.featureLimit} funcionalidades`}
                        </li>
                        <li>Suscripcion mensual</li>
                      </ul>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={billingState?.isActive ? openCustomerPortal : startCheckout}
                  disabled={billingStateLoading || portalLoading || checkoutLoading}
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
                >
                  {billingState?.isActive
                    ? portalLoading
                      ? "Abriendo gestion..."
                      : "Cambiar plan en Stripe"
                    : checkoutLoading
                      ? "Redirigiendo..."
                      : `Contratar ${selectedPlan.name}`}
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

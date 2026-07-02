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

const planById = new Map(PLAN_CONFIG.map((plan) => [plan.id, plan]));

const limitLabel = (used: number, limit: number | null): string =>
  limit === null ? `${used} / Ilimitado` : `${used} / ${limit}`;

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

const statusLabel = (state: BillingState | null): string => {
  const status = state?.subscriptionStatus ?? state?.status;
  if (!status) return "-";

  const labels: Record<string, string> = {
    active: "Activa",
    trialing: "En prueba",
    incomplete: "Pendiente de completar",
    incomplete_expired: "Incompleta expirada",
    past_due: "Pago pendiente",
    canceled: "Cancelada",
    unpaid: "Impagada",
  };

  return labels[status] ?? status;
};

export default function CenterPlanPage() {
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const plan = useMemo(
    () => (billingState?.planId ? planById.get(billingState.planId) ?? null : null),
    [billingState]
  );

  useEffect(() => {
    const loadBillingState = async () => {
      if (!activeCenterId) {
        setBillingState(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setPortalError(null);

      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          throw new Error("No hay sesión activa.");
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

        setBillingState(data);
      } catch (loadError) {
        console.error("No se pudo cargar el estado del plan:", loadError);
        setBillingState(null);
        setError("No se pudo cargar el estado del plan.");
      } finally {
        setLoading(false);
      }
    };

    void loadBillingState();
  }, [activeCenterId]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("No hay sesión activa.");
      }

      const response = await fetch("/api/stripe/create-customer-portal-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "No se pudo abrir el portal de suscripción.");
      }

      window.location.href = data.url;
    } catch (openError) {
      console.error("No se pudo abrir el portal de suscripción:", openError);
      setPortalError("No se pudo abrir el portal de suscripción.");
    } finally {
      setPortalLoading(false);
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
          <p className="text-red-300">No tienes acceso a Mi plan.</p>
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
        title="Mi plan"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
      />

      <div className="app-shell">
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
        {portalError && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {portalError}
          </p>
        )}

        {memberships.length > 1 && (
          <section className="w-full rounded-2xl border border-brand-border bg-white/60 p-4">
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
          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                  SUSCRIPCIÓN EQUIDATA
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-brand-text">
                  {loading ? "Cargando suscripción..." : plan?.name ?? "Sin plan activo"}
                </h2>
                <p className="mt-2 text-sm text-brand-secondary">
                  Estado de la suscripción:{" "}
                  <span className="font-semibold text-brand-text">
                    {loading ? "Comprobando..." : statusLabel(billingState)}
                  </span>
                </p>
                {!loading && billingState && !billingState.isActive && (
                  <p className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                    Tu suscripción no aparece como activa. Revisa el estado del pago o gestiona la suscripción desde Stripe.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={openCustomerPortal}
                disabled={portalLoading || loading}
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
              >
                {portalLoading ? "Abriendo portal de suscripción..." : "Gestionar suscripción"}
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-4">
                <p className="text-xs uppercase text-brand-secondary">RENOVACIÓN</p>
                <p className="mt-1 text-sm font-semibold text-brand-text">
                  {loading ? "..." : renewalLabel(billingState?.currentPeriodEnd ?? null)}
                </p>
              </article>
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-4">
                <p className="text-xs uppercase text-brand-secondary">Límite de caballos</p>
                <p className="mt-1 text-sm font-semibold text-brand-text">
                  {loading || !billingState
                    ? "-"
                    : limitLabel(billingState.horseCount, billingState.horseLimit)}
                </p>
              </article>
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-4">
                <p className="text-xs uppercase text-brand-secondary">Funcionalidades incluidas</p>
                <p className="mt-1 text-sm font-semibold text-brand-text">
                  {loading || !billingState
                    ? "-"
                    : limitLabel(billingState.enabledModules.length, billingState.featureLimit)}
                </p>
              </article>
              <article className="rounded-xl border border-brand-border bg-brand-background/60 p-4">
                <p className="text-xs uppercase text-brand-secondary">Precio mensual</p>
                <p className="mt-1 text-sm font-semibold text-brand-text">
                  {plan ? `${plan.price.toLocaleString("es-ES")} EUR / mes` : "-"}
                </p>
              </article>
            </div>

            <div className="mt-6 rounded-xl border border-brand-border bg-brand-background/50 p-4">
              <h3 className="text-base font-semibold text-brand-text">Funcionalidades incluidas</h3>
              <ul className="mt-3 grid gap-2 text-sm text-brand-secondary sm:grid-cols-2 lg:grid-cols-3">
                <li>Gestión del centro</li>
                <li>Control de caballos</li>
                <li>Módulos operativos según plan</li>
                <li>Reservas y clases</li>
                <li>Panel de usuarios</li>
                <li>Portal de suscripción con Stripe</li>
              </ul>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

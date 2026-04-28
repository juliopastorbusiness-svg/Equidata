"use client";

import { useEffect, useState } from 'react';
import { useAuthUser } from '@/lib/hooks/useAuthUser';
import { PLAN_CONFIG, PlanConfig } from '@/lib/billing/plans';

export default function PricingPage() {
  const { user, profile, loading } = useAuthUser();
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  useEffect(() => {
    if (!selectedPlan) {
      setSelectedPlan(PLAN_CONFIG[0]);
    }
  }, [selectedPlan]);

  const handleCheckout = async () => {
    setError(null);

    if (!user) {
      setError('Debes iniciar sesión para elegir un plan.');
      return;
    }

    if (profile?.role !== 'center_owner') {
      setError('Solo propietarios de centro pueden contratar un plan.');
      return;
    }

    const centerId = profile.activeCenterId || profile.centerId;
    if (!centerId) {
      setError('No se encontró el centro asociado a tu cuenta.');
      return;
    }

    if (!selectedPlan) {
      setError('Selecciona un plan.');
      return;
    }

    setLoadingSession(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          centerId,
          planId: selectedPlan.id,
        }),
      });

      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'No se pudo iniciar el pago.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoadingSession(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 text-brand-text">
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">Planes Equidata</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Elige el plan para tu centro hípico</h1>
        <p className="mx-auto max-w-2xl text-sm text-brand-text/80">
          Contrata el plan adecuado y administra tu centro con Stripe Checkout. La activación final la confirma el webhook.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {PLAN_CONFIG.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelectedPlan(plan)}
            className={`rounded-3xl border p-6 text-left transition ${
              selectedPlan?.id === plan.id
                ? 'border-brand-primary bg-brand-background/80'
                : 'border-brand-border bg-white/10 hover:border-brand-primary hover:bg-white/10'
            }`}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">{plan.name}</p>
            <h2 className="mt-4 text-3xl font-bold">
              {plan.price.toFixed(2).replace('.', ',')} €<span className="text-base font-medium">/mes</span>
            </h2>
            <ul className="mt-6 space-y-2 text-sm text-brand-text/80">
              <li>{plan.horseLimit === null ? 'Caballos ilimitados' : `Hasta ${plan.horseLimit} caballos`}</li>
              <li>{plan.featureLimit === null ? 'Todas las funcionalidades' : `Hasta ${plan.featureLimit} funcionalidades`}</li>
              <li>Suscripción mensual</li>
            </ul>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-brand-border bg-brand-background/50 p-6 text-center">
        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading || loadingSession}
          className="inline-flex h-14 items-center justify-center rounded-2xl bg-brand-primary px-6 text-base font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
        >
          {loadingSession ? 'Redirigiendo al pago...' : 'Pagar plan seleccionado'}
        </button>
      </div>
    </main>
  );
}

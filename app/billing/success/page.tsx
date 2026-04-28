"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/lib/hooks/useAuthUser";

type SubscriptionStatusResponse = {
  status?: "pending" | "active" | "error";
  planId?: string;
};

type ViewState = "processing" | "activating" | "redirecting" | "error";

const ERROR_MESSAGE =
  "Estamos teniendo problemas al activar tu plan. Puedes acceder al panel manualmente.";

export default function BillingSuccessPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [viewState, setViewState] = useState<ViewState>("processing");
  const [error, setError] = useState<string | null>(null);
  const [showManualButton, setShowManualButton] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setShowManualButton(true);
    }, 20_000);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (loading) {
      setViewState("processing");
      return;
    }

    if (!user) {
      setViewState("error");
      setError(ERROR_MESSAGE);
      return;
    }

    let isMounted = true;
    let isPolling = false;
    let intervalId: number | undefined;

    const checkSubscriptionStatus = async () => {
      if (isPolling) {
        return;
      }

      isPolling = true;
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8_000);

      try {
        setViewState((current) =>
          current === "redirecting" ? current : "activating"
        );

        const token = await user.getIdToken();
        const response = await fetch("/api/center/subscription-status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        const data = (await response.json()) as SubscriptionStatusResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok || data.status === "error" || !data.status) {
          setViewState("error");
          setError(ERROR_MESSAGE);
          return;
        }

        if (data.status === "active") {
          setViewState("redirecting");
          setError(null);
          if (intervalId) {
            window.clearInterval(intervalId);
          }
          router.replace("/dashboard/center");
          return;
        }

        setViewState("activating");
        setError(null);
      } catch {
        if (!isMounted) {
          return;
        }

        setViewState("error");
        setError(ERROR_MESSAGE);
      } finally {
        isPolling = false;
        window.clearTimeout(timeoutId);
      }
    };

    void checkSubscriptionStatus();
    intervalId = window.setInterval(checkSubscriptionStatus, 2_000);

    return () => {
      isMounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [loading, router, user]);

  const title = useMemo(() => {
    if (viewState === "redirecting") {
      return "Redirigiendo al panel...";
    }

    if (viewState === "activating") {
      return "Activando tu plan...";
    }

    if (viewState === "error") {
      return "No hemos podido confirmar la activacion";
    }

    return "Procesando tu pago...";
  }, [viewState]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-16 text-brand-text">
      <section className="w-full rounded-3xl border border-brand-border bg-brand-background/80 p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-brand-border border-t-brand-primary" />

        <h1 className="text-3xl font-bold">{title}</h1>

        <p className="mt-4 text-base text-brand-text/80">
          Confirmaremos la activacion cuando Stripe haya actualizado tu centro.
        </p>

        {error && (
          <p className="mt-6 rounded-2xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
            {error}
          </p>
        )}

        {showManualButton && (
          <Link
            href="/dashboard/center"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-2xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
          >
            Ir al panel manualmente
          </Link>
        )}
      </section>
    </main>
  );
}

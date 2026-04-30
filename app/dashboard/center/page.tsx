"use client";

import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getCenterMembers } from "@/lib/services/memberService";
import { MODULE_REGISTRY, ModuleId } from "@/lib/modules/moduleConfig";
import { ModuleService } from "@/lib/services/moduleService";
import { ManageModulesModal } from "@/components/dashboard/center/ManageModulesModal";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
});

type ModuleCardProps = {
  href: string;
  title: string;
  description: string;
  icon: string;
};

type BillingState = {
  planId: "basic" | "pro" | "unlimited" | null;
  status: string | null;
  subscriptionStatus: string | null;
  isActive: boolean;
  horseLimit: number | null;
  featureLimit: number | null;
  horseCount: number;
  enabledModules: ModuleId[];
  currentPeriodEnd: string | null;
};

const planLabels: Record<"basic" | "pro" | "unlimited", string> = {
  basic: "Basic",
  pro: "Pro",
  unlimited: "Unlimited",
};

const limitLabel = (used: number, limit: number | null): string =>
  limit === null ? `${used} / Ilimitado` : `${used} / ${limit}`;

function ModuleCard({ href, title, description, icon }: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background"
    >
      <article className="flex h-full items-start gap-4 rounded-2xl border border-brand-border bg-white/70 p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-primary hover:bg-white/90 active:translate-y-0 active:scale-[0.99]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-background text-2xl">
          <span aria-hidden="true">{icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-brand-text md:text-lg">
              {title}
            </h2>
            <span
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-lg text-brand-secondary transition-transform duration-200 group-hover:translate-x-0.5"
            >
              ›
            </span>
          </div>
          <p className="mt-1 text-sm leading-5 text-brand-secondary">
            {description}
          </p>
        </div>
      </article>
    </Link>
  );
}

export default function CenterDashboardPage() {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false);
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [billingState, setBillingState] = useState<BillingState | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const {
    loading,
    error,
    isDevBypass,
    isAllowed,
    activeCenterName,
    memberships,
    activeCenterId,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    setPortalError(null);

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
        throw new Error(data.error || "No se pudo abrir el portal de facturacion.");
      }

      window.location.href = data.url;
    } catch (openError) {
      console.error("No se pudo abrir el portal de facturacion:", openError);
      setPortalError("No se pudo abrir el portal de facturación.");
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId) {
      setPendingRequests(0);
      setPendingRequestsLoading(false);
      return;
    }

    let isMounted = true;

    const loadPendingRequests = async () => {
      setPendingRequestsLoading(true);

      try {
        const members = await getCenterMembers(activeCenterId);
        if (!isMounted) return;

        setPendingRequests(
          members.filter(
            (member) => member.role === "rider" && member.status === "pending"
          ).length
        );
      } catch (loadError) {
        console.error("No se pudieron cargar las solicitudes pendientes:", loadError);
        if (!isMounted) return;
        setPendingRequests(0);
      } finally {
        if (isMounted) {
          setPendingRequestsLoading(false);
        }
      }
    };

    void loadPendingRequests();

    return () => {
      isMounted = false;
    };
  }, [activeCenterId]);

  useEffect(() => {
    if (!activeCenterId) {
      setBillingState(null);
      setBillingLoading(false);
      return;
    }

    let isMounted = true;

    const loadBillingState = async () => {
      setBillingLoading(true);
      setBillingError(null);

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
          setBillingError("No se pudo cargar el estado del plan.");
          setBillingState(null);
        }
      } finally {
        if (isMounted) {
          setBillingLoading(false);
        }
      }
    };

    void loadBillingState();

    return () => {
      isMounted = false;
    };
  }, [activeCenterId]);

  // Cargar módulos habilitados
  useEffect(() => {
    if (!activeCenterId) {
      setModulesLoading(false);
      return;
    }

    const loadModules = async () => {
      try {
        const moduleService = new ModuleService(db);
        const modules = await moduleService.getEnabledModules(activeCenterId);
        setEnabledModules(modules);
      } catch (error) {
        console.error("Error cargando módulos:", error);
        setEnabledModules([]);
      } finally {
        setModulesLoading(false);
      }
    };

    loadModules();
  }, [activeCenterId]);

  if (loading || modulesLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando dashboard del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso a este dashboard.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Volver
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <header className="border-b border-brand-border/80 bg-white/35 backdrop-blur-sm">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-[9rem_1fr_9rem] items-center gap-2 px-4 py-2 sm:grid-cols-[10rem_1fr_10rem] sm:px-6 sm:py-2.5 md:grid-cols-[11rem_1fr_11rem] md:gap-4 md:py-3">
          <div className="flex items-center">
            <Image
              src="/logo-equidata.png"
              alt="Equidata"
              width={180}
              height={180}
              priority
              className="h-auto w-36 opacity-95 sm:w-40 md:w-44"
            />
          </div>

          <div className="min-w-0 text-center">
            <h1
              className={`${cormorant.className} text-center text-[18px] font-medium leading-tight tracking-[0.04em] text-brand-text sm:text-[20px] md:text-[26px]`}
            >
              {activeCenterName ?? "Centro"}
            </h1>
            <p className="text-center text-[10px] leading-4 text-brand-secondary sm:text-[11px] md:text-sm">
              Panel del centro • {enabledModules.length} módulo{enabledModules.length === 1 ? "" : "s"} activo{enabledModules.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center justify-end self-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-white/80 text-brand-primary transition hover:border-brand-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background active:scale-[0.98] md:h-10 md:w-auto md:whitespace-nowrap md:rounded-xl md:border-transparent md:bg-brand-primary md:px-4 md:text-sm md:font-semibold md:text-white md:hover:bg-brand-primaryHover"
            >
              <span className="md:hidden">⚙️</span>
              <span className="hidden md:inline">Gestionar Módulos</span>
            </button>
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-border bg-white/80 text-brand-primary transition hover:border-brand-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background active:scale-[0.98] md:h-10 md:w-auto md:whitespace-nowrap md:rounded-xl md:border-transparent md:bg-brand-primary md:px-4 md:text-sm md:font-semibold md:text-white md:hover:bg-brand-primaryHover"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 md:mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              <span className="hidden md:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 md:py-6">
        {isDevBypass && (
          <p className="rounded-xl border border-yellow-700 bg-yellow-950/40 p-3 text-sm text-yellow-300">
            Modo DEV: acceso sin rol de centro para pruebas locales.
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!!activeCenterId && (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                  Plan actual
                </p>
                <h2 className="mt-1 text-lg font-semibold text-brand-text">
                  {billingLoading
                    ? "Cargando estado del plan..."
                    : billingState?.planId
                      ? planLabels[billingState.planId]
                      : "Sin plan activo"}
                </h2>
                <p className="mt-1 text-sm text-brand-secondary">
                  {billingError
                    ? billingError
                    : billingState?.isActive
                      ? "Estado: activo"
                      : "Estado: pendiente o inactivo"}
                </p>
                {portalError && (
                  <p className="mt-2 text-sm text-red-700">{portalError}</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-border bg-brand-background/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-brand-secondary">
                      Caballos
                    </p>
                    <p className="mt-1 text-base font-semibold text-brand-text">
                      {billingState
                        ? limitLabel(billingState.horseCount, billingState.horseLimit)
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-brand-border bg-brand-background/70 px-4 py-3">
                    <p className="text-xs font-semibold uppercase text-brand-secondary">
                      Funcionalidades
                    </p>
                    <p className="mt-1 text-base font-semibold text-brand-text">
                      {billingState
                        ? limitLabel(
                            billingState.enabledModules.length,
                            billingState.featureLimit
                          )
                        : "-"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
                >
                  {portalLoading ? "Abriendo portal de facturación..." : "Gestionar suscripción"}
                </button>
              </div>
            </div>
          </section>
        )}

        {!!activeCenterId && (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-secondary">
                  Solicitudes de acceso
                </p>
                <h2 className="mt-1 text-lg font-semibold text-brand-text">
                  {pendingRequestsLoading
                    ? "Revisando solicitudes pendientes..."
                    : pendingRequests > 0
                      ? `Tienes ${pendingRequests} solicitud${pendingRequests === 1 ? "" : "es"} pendiente${pendingRequests === 1 ? "" : "s"}`
                      : "No hay solicitudes pendientes ahora mismo"}
                </h2>
                <p className="mt-1 text-sm text-brand-secondary">
                  Revisa aqui las peticiones de riders y decide si quieres
                  aceptarlas o denegarlas desde la ficha del centro.
                </p>
              </div>

              <Link
                href={`/centros/${activeCenterId}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background"
              >
                Revisar solicitudes
              </Link>
            </div>
          </section>
        )}

        {memberships.length > 1 && (
          <section className="max-w-xl rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
            <label
              htmlFor="center-selector"
              className="mb-2 block text-sm font-medium text-brand-secondary"
            >
              Cambiar centro activo
            </label>
            <select
              id="center-selector"
              value={activeCenterId ?? ""}
              onChange={(event) => setActiveCenterId(event.target.value)}
              className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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
            <section className="rounded-2xl border border-brand-border bg-white/50 p-4 sm:p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-brand-text">Módulos</h2>
                <p className="text-sm text-brand-secondary">
                  Accesos rápidos a la gestión operativa del centro.
                </p>
              </div>

              {enabledModules.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
                  <p className="text-yellow-800 font-semibold mb-2">
                    No hay módulos activados
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Haz clic en "Gestionar Módulos" para activar funcionalidades
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {Object.values(MODULE_REGISTRY)
                    .filter((module) => enabledModules.includes(module.id))
                    .map((module) => (
                      <ModuleCard
                        key={module.id}
                        href={module.href}
                        title={module.title}
                        description={module.description}
                        icon={module.icon}
                      />
                    ))}
                </div>
              )}
            </section>

            <details className="rounded-2xl border border-brand-border bg-white/70 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-inset sm:px-5">
                <div>
                  <h3 className="text-sm font-semibold text-brand-text sm:text-base">
                    Quick Actions
                  </h3>
                  <p className="text-xs text-brand-secondary sm:text-sm">
                    Atajos frecuentes del día (placeholder).
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="rounded-lg border border-brand-border px-2 py-1 text-xs text-brand-secondary"
                >
                  Desplegar
                </span>
              </summary>

              <div className="border-t border-brand-border px-4 py-4 sm:px-5">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {[
                    "Registrar incidencia de pista (placeholder)",
                    "Añadir compra de pienso (placeholder)",
                    "Crear tarea rápida para hoy (placeholder)",
                    "Revisar cobros pendientes (placeholder)",
                  ].map((action) => (
                    <button
                      key={action}
                      type="button"
                      className="flex h-11 items-center justify-between rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text transition hover:border-brand-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-[0.99]"
                    >
                      <span className="truncate text-left">{action}</span>
                      <span aria-hidden="true" className="ml-3 text-brand-secondary">
                        +
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </details>
          </>
        )}
      </div>

      {/* Modal de gestión de módulos */}
      <ManageModulesModal
        centerId={activeCenterId!}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(modules) => {
          setEnabledModules(modules);
          setBillingState((current) =>
            current ? { ...current, enabledModules: modules } : current
          );
        }}
      />
    </main>
  );
}

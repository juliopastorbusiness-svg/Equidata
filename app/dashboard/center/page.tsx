"use client";

import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

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

  if (loading) {
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
      <header className="border-b border-brand-border/70 bg-white/40">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-3 px-4 py-4 sm:px-6 md:grid-cols-[auto_1fr_auto] md:gap-4 md:py-5">
          <div className="flex items-center justify-center md:justify-start">
            <Image
              src="/logo-equidata.png"
              alt="Equidata"
              width={180}
              height={180}
              priority
              className="h-auto w-28 opacity-95 sm:w-32 md:w-36"
            />
          </div>

          <div className="min-w-0 text-center md:px-4">
            <h1
              className={`${cormorant.className} truncate text-[28px] font-medium tracking-[0.08em] text-brand-text sm:text-[32px] md:text-[36px]`}
            >
              {activeCenterName ?? "Centro"}
            </h1>
            <p className="mt-1 text-sm text-brand-secondary">Panel del centro</p>
          </div>

          <div className="flex justify-center md:justify-end">
            <button
              onClick={handleLogout}
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background active:scale-[0.99]"
            >
              Cerrar sesión
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

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    href: "/dashboard/center/billing",
                    title: "Facturación",
                    description: "Clientes, cobros y resumen mensual del centro.",
                    icon: "💳",
                  },
                  {
                    href: "/dashboard/center/feed",
                    title: "Piensos",
                    description: "Stock, consumos y control de alimento.",
                    icon: "🌾",
                  },
                  {
                    href: "/dashboard/center/arenas",
                    title: "Pistas",
                    description: "Reservas, estado y disponibilidad de pistas.",
                    icon: "🏇",
                  },
                  {
                    href: "/dashboard/center/stables",
                    title: "Cuadras",
                    description: "Ocupación, estancias y gestión de boxes.",
                    icon: "🐴",
                  },
                  {
                    href: "/dashboard/center/tasks",
                    title: "Tareas",
                    description: "Plan diario y seguimiento del equipo.",
                    icon: "✅",
                  },
                ].map((module) => (
                  <ModuleCard
                    key={module.href}
                    href={module.href}
                    title={module.title}
                    description={module.description}
                    icon={module.icon}
                  />
                ))}
              </div>
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
    </main>
  );
}

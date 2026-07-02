"use client";

import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getVisibleModules, ModuleId } from "@/lib/modules/moduleConfig";
import { ModuleService } from "@/lib/services/moduleService";
import { ManageModulesModal } from "@/components/dashboard/center/ManageModulesModal";
import { CenterSidebar } from "@/components/dashboard/CenterSidebar";

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
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        <div className="grid w-full grid-cols-[2.5rem_1fr_8rem] items-center gap-2 px-4 py-1.5 sm:grid-cols-[2.5rem_1fr_9rem] sm:px-6 md:grid-cols-[2.5rem_1fr_10rem] md:gap-4">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú del centro"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand-border bg-white/80 text-brand-primary transition hover:border-brand-primary hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-brand-background"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>
          </div>

          <div className="min-w-0 text-center">
            <h1
              className={`${cormorant.className} text-center text-[16px] font-medium leading-none tracking-[0.04em] text-brand-text sm:text-[18px] md:text-[20px]`}
            >
              {activeCenterName ?? "Centro"}
            </h1>
            <p className="text-center text-[10px] leading-4 text-brand-secondary sm:text-[11px]">
              Panel del centro • {enabledModules.length} módulo{enabledModules.length === 1 ? "" : "s"} activo{enabledModules.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex items-center justify-end overflow-visible">
            <Image
              src="/logo-equidata.png"
              alt="Equidata"
              width={180}
              height={180}
              priority
              className="h-auto w-32 opacity-95 sm:w-36 md:w-40"
            />
          </div>
        </div>
      </header>

      <CenterSidebar
        isOpen={isSidebarOpen}
        centerName={activeCenterName}
        activeCenterId={activeCenterId}
        onClose={() => setIsSidebarOpen(false)}
        onManageModules={() => setIsModalOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex w-full flex-col gap-5 px-4 py-5 sm:px-6 md:py-6">
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
          <section className="w-full rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
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
                    Abre el menú lateral y entra en Gestionar módulos para activar funcionalidades
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {getVisibleModules()
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
        }}
      />
    </main>
  );
}

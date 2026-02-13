"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { CenterHeader } from "@/components/center/CenterHeader";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

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
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
        <p>Cargando dashboard del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
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
      <CenterHeader
        title="Centro"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro seleccionado"}`}
        primaryActionLabel="Cerrar sesion"
        onPrimaryAction={handleLogout}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
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
          <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {[
              { href: "/dashboard/center/stables", title: "Cuadras", subtitle: "Gestiona ocupacion y estancias" },
              { href: "/dashboard/center/arenas", title: "Pistas", subtitle: "Controla pistas y reservas" },
              { href: "/dashboard/center/feed", title: "Piensos", subtitle: "Revisa stock de alimento" },
              { href: "/dashboard/center/tasks", title: "Tareas", subtitle: "Plan diario del equipo" },
              { href: "/dashboard/center/billing", title: "Facturacion", subtitle: "Clientes, cobros y resumen mensual" },
            ].map((module) => (
              <Link key={module.href} href={module.href} className="block">
                <article className="cursor-pointer rounded-2xl border border-brand-border bg-white/60 p-6 transition hover:border-brand-primary">
                  <h2 className="text-xl font-semibold">{module.title}</h2>
                  <p className="mt-1 text-sm text-brand-secondary">{module.subtitle}</p>
                </article>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}


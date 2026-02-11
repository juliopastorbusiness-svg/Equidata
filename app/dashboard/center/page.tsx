"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

export default function CenterDashboardPage() {
  const router = useRouter();
  const {
    loading,
    error,
    isDevBypass,
    isAllowed,
    activeCenterName,
    activeCenterRole,
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
      <main className="min-h-screen bg-black text-white p-6">
        <p>Cargando dashboard del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">No tienes acceso a este dashboard.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Dashboard centro hipico</h1>
        <p className="text-zinc-300">
          Centro activo:{" "}
          <span className="font-semibold">
            {activeCenterName ?? "Sin centro seleccionado"}
          </span>
          {activeCenterRole && (
            <span className="ml-2 rounded bg-zinc-800 px-2 py-1 text-xs">
              {activeCenterRole}
            </span>
          )}
        </p>
        {isDevBypass && (
          <p className="rounded border border-yellow-700 bg-yellow-950/40 p-2 text-sm text-yellow-300">
            Modo DEV: acceso sin rol de centro para pruebas locales.
          </p>
        )}
        {error && (
          <p className="rounded border border-red-800 bg-red-950/40 p-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </header>

      {memberships.length > 1 && (
        <section className="max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <label htmlFor="center-selector" className="mb-2 block text-sm text-zinc-300">
            Cambiar centro activo
          </label>
          <select
            id="center-selector"
            value={activeCenterId ?? ""}
            onChange={(event) => setActiveCenterId(event.target.value)}
            className="w-full rounded border border-zinc-700 bg-black/60 p-2 text-sm"
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
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-300">
          No tienes centro asignado.
          <br />
          Estrategia aplicada: `users/{'{uid}'}.centerId` y, si no existe, primer
          centro donde seas `CENTER_OWNER` o `CENTER_ADMIN`.
        </section>
      ) : (
        <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/center/stables"
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 font-semibold hover:border-zinc-600"
          >
            Cuadras
          </Link>
          <Link
            href="/dashboard/center/arenas"
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 font-semibold hover:border-zinc-600"
          >
            Pistas
          </Link>
          <Link
            href="/dashboard/center/feed"
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 font-semibold hover:border-zinc-600"
          >
            Piensos
          </Link>
          <Link
            href="/dashboard/center/tasks"
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 font-semibold hover:border-zinc-600"
          >
            Tareas
          </Link>
          <Link
            href="/dashboard/center/billing"
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 font-semibold hover:border-zinc-600"
          >
            Facturacion
          </Link>
        </section>
      )}

      <button onClick={handleLogout} className="bg-gray-700 px-3 py-2 rounded text-sm">
        Cerrar sesion
      </button>
    </main>
  );
}

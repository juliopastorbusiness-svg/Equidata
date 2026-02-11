"use client";

import Link from "next/link";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

export default function CenterTasksPage() {
  const { loading, isAllowed, activeCenterName } = useRequireCenterRole([
    "CENTER_OWNER",
    "CENTER_ADMIN",
  ]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p>Cargando permisos del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">No tienes acceso a Tareas.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-3">
      <Link href="/dashboard/center" className="text-blue-400 underline text-sm">
        Volver al dashboard de centro
      </Link>
      <h1 className="text-3xl font-bold">Tareas</h1>
      <p className="text-sm text-zinc-300">Centro activo: {activeCenterName ?? "-"}</p>
      <p className="text-zinc-400">Modulo en construccion (siguiente fase).</p>
    </main>
  );
}


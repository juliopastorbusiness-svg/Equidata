"use client";

import Link from "next/link";
import { Class } from "@/lib/services";
import { ClassSpotsBadge } from "@/components/dashboard/classes/ClassSpotsBadge";

type DashboardClassTableProps = {
  items: Class[];
  trainerLabels: Map<string, string>;
  arenaLabels: Map<string, string>;
  onCancel: (item: Class) => Promise<void>;
};

const statusLabel: Record<Class["status"], string> = {
  draft: "Borrador",
  published: "Publicada",
  full: "Completa",
  cancelled: "Cancelada",
  completed: "Completada",
};

export function DashboardClassTable({
  items,
  trainerLabels,
  arenaLabels,
  onCancel,
}: DashboardClassTableProps) {
  if (!items.length) {
    return (
      <section className="rounded-3xl border border-brand-border bg-white/80 p-6 text-sm text-brand-secondary shadow-sm">
        No hay clases creadas en este centro.
      </section>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-brand-border bg-white/80 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-border text-sm">
          <thead className="bg-brand-background/70 text-left text-brand-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Clase</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Pista</th>
              <th className="px-4 py-3 font-medium">Profesor</th>
              <th className="px-4 py-3 font-medium">Plazas</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/70">
            {items.map((item) => (
              <tr key={item.id} className="align-top">
                <td className="px-4 py-4">
                  <div>
                    <Link href={`/dashboard/clases/${item.id}`} className="font-semibold text-brand-text hover:underline">
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs text-brand-secondary">
                      {item.discipline} · {item.level}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-4 text-brand-secondary">
                  {item.date.toDate().toLocaleDateString("es-ES")}
                  <div>{item.startTime} - {item.endTime}</div>
                </td>
                <td className="px-4 py-4 text-brand-secondary">
                  {item.arenaId ? arenaLabels.get(item.arenaId) ?? item.arenaId : "Sin pista"}
                </td>
                <td className="px-4 py-4 text-brand-secondary">
                  {item.trainerId ? trainerLabels.get(item.trainerId) ?? item.trainerId : "Sin profesor"}
                </td>
                <td className="px-4 py-4">
                  <ClassSpotsBadge item={item} />
                </td>
                <td className="px-4 py-4 text-brand-secondary">{statusLabel[item.status]}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/clases/${item.id}`}
                      className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-medium text-brand-text"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/dashboard/clases/${item.id}/edit`}
                      className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-medium text-brand-text"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => void onCancel(item)}
                      disabled={item.status === "cancelled" || item.status === "completed"}
                      className="inline-flex h-10 items-center rounded-xl border border-rose-200 px-3 text-sm font-medium text-rose-700 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

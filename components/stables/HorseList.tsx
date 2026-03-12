"use client";

import { useRouter } from "next/navigation";
import { AlertBadge } from "@/components/stables/AlertBadge";
import { HorseCard } from "@/components/stables/HorseCard";
import { HorseListItem } from "@/lib/horses";

type HorseListProps = {
  items: HorseListItem[];
  getHref: (horseId: string) => string;
};

const statusClassName: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  RESTING: "bg-sky-100 text-sky-800",
  RECOVERING: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-slate-200 text-slate-700",
  ARCHIVED: "bg-stone-200 text-stone-700",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Activo",
  RESTING: "Descanso",
  RECOVERING: "Recuperacion",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
};

const formatDate = (value?: number) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("es-ES");
};

export function HorseList({ items, getHref }: HorseListProps) {
  const router = useRouter();

  return (
    <>
      <div className="grid gap-4 lg:hidden">
        {items.map((item) => (
          <HorseCard key={item.horse.id} item={item} href={getHref(item.horse.id)} />
        ))}
      </div>

      <section className="hidden overflow-hidden rounded-2xl border border-brand-border bg-white/80 shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-brand-background/70 text-left text-brand-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Caballo</th>
                <th className="px-4 py-3 font-medium">Raza</th>
                <th className="px-4 py-3 font-medium">Edad</th>
                <th className="px-4 py-3 font-medium">Box</th>
                <th className="px-4 py-3 font-medium">Propietario</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Alertas</th>
                <th className="px-4 py-3 font-medium">Llegada</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.horse.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => router.push(getHref(item.horse.id))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(getHref(item.horse.id));
                    }
                  }}
                  className="cursor-pointer border-t border-brand-border transition hover:bg-brand-background/45"
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold text-brand-text">{item.horse.name}</div>
                  </td>
                  <td className="px-4 py-4 text-brand-secondary">
                    {item.horse.breed || "-"}
                  </td>
                  <td className="px-4 py-4 text-brand-secondary">
                    {typeof item.horse.age === "number" ? item.horse.age : "-"}
                  </td>
                  <td className="px-4 py-4 text-brand-text">
                    {item.assignedBox || "Sin asignar"}
                  </td>
                  <td className="px-4 py-4 text-brand-text">{item.ownerLabel}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName[item.horse.status] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {statusLabel[item.horse.status] ?? item.horse.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {item.activeAlerts.length === 0 ? (
                      <span className="text-brand-secondary">Sin alertas</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {item.activeAlerts.slice(0, 2).map((alert) => (
                          <AlertBadge key={alert.id} alert={alert} />
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-brand-secondary">
                    {formatDate(item.arrivalAt?.toMillis())}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

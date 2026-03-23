"use client";

import Link from "next/link";

type RiderQuickActionsProps = {
  hasActiveCenter: boolean;
};

const actions = [
  {
    href: "/clases",
    title: "Clases",
    description: "Explora las clases publicadas y reserva en segundos.",
  },
  {
    href: "/mis-reservas",
    title: "Mis reservas",
    description: "Consulta proximas, pasadas y canceladas en un solo panel.",
  },
  {
    href: "/centros",
    title: "Mi centro",
    description: "Gestiona tus centros vinculados y cambia el centro activo.",
  },
];

export function RiderQuickActions({ hasActiveCenter }: RiderQuickActionsProps) {
  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-brand-text">Accesos rápidos</h2>
        <p className="mt-1 text-sm text-brand-secondary">
          Acciones directas sobre lo ya disponible en tu experiencia rider.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-[1.5rem] border p-4 transition ${
              hasActiveCenter || action.href === "/centros"
                ? "border-brand-border bg-brand-background/60 hover:border-brand-primary hover:bg-white"
                : "pointer-events-none border-brand-border/60 bg-brand-background/40 opacity-70"
            }`}
          >
            <p className="text-base font-semibold text-brand-text">{action.title}</p>
            <p className="mt-2 text-sm text-brand-secondary">{action.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

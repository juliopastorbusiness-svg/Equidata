"use client";

import Link from "next/link";

export function EmptyLinkedCenterState() {
  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/85 p-8 text-center shadow-sm">
      <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">Sin centro vinculado</p>
      <h2 className="mt-3 text-2xl font-semibold text-brand-text">
        Todavía no tienes un centro activo
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-brand-secondary">
        Vincúlate a un centro o activa uno existente para acceder a clases, reservas y al resto del flujo rider.
      </p>
      <Link
        href="/centros"
        className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white"
      >
        Ir a centros
      </Link>
    </section>
  );
}

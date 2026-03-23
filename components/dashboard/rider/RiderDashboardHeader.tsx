"use client";

type RiderDashboardHeaderProps = {
  riderName: string;
  centerName: string | null;
  reservationsCount: number;
  classesCount: number;
};

export function RiderDashboardHeader({
  riderName,
  centerName,
  reservationsCount,
  classesCount,
}: RiderDashboardHeaderProps) {
  return (
    <section className="rounded-[2rem] border border-brand-border bg-white/85 p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-brand-secondary">Rider area</p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-text">Hola, {riderName}</h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-secondary">
            {centerName
              ? `Tu centro activo es ${centerName}. Desde aqui puedes seguir clases, reservas y la actividad del centro.`
              : "Activa un centro para empezar a reservar y gestionar tu operativa diaria."}
          </p>
        </div>
        <div className="grid min-w-[220px] gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-brand-border bg-brand-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-brand-secondary">Clases proximas</p>
            <p className="mt-2 text-2xl font-semibold text-brand-text">{classesCount}</p>
          </article>
          <article className="rounded-2xl border border-brand-border bg-brand-background/60 p-4">
            <p className="text-xs uppercase tracking-wide text-brand-secondary">Mis reservas</p>
            <p className="mt-2 text-2xl font-semibold text-brand-text">{reservationsCount}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

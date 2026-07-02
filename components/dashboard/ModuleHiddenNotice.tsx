import Link from "next/link";

type ModuleHiddenNoticeProps = {
  title?: string;
  dashboardHref?: string;
};

export function ModuleHiddenNotice({
  title = "Módulo temporalmente oculto",
  dashboardHref = "/dashboard/center",
}: ModuleHiddenNoticeProps) {
  return (
    <main className="min-h-screen bg-brand-background p-6 text-brand-text">
      <section className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
        <div className="w-full rounded-3xl border border-brand-border bg-white/80 p-6 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-secondary">
            Equidata
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-brand-text">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-secondary">
            Esta seccion esta oculta temporalmente durante la transicion al nuevo modulo Clientes.
          </p>
          <Link
            href={dashboardHref}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
          >
            Volver al dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

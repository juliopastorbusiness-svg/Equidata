import Link from "next/link";

export default function Home() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-brand-background bg-cover bg-center bg-no-repeat text-brand-text"
      style={{ backgroundImage: "url('/fondo1.jpg')" }}
    >
      <div className="absolute inset-0 bg-brand-background/65" />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-background/20 via-brand-background/40 to-brand-background/75" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-3xl border border-brand-border bg-brand-background/40 p-7 shadow-2xl backdrop-blur-md sm:p-10">
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-secondary">
              Equidata
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              Gestion simple para tu centro hipico
            </h1>
            <p className="mt-4 text-base text-brand-text sm:text-lg">
              Entra rapido y ve directo a las tareas del dia.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <Link
              href="/login"
              className="inline-flex h-14 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-lg font-semibold text-white transition hover:bg-brand-primaryHover"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="inline-flex h-14 w-full items-center justify-center rounded-xl border border-brand-border bg-white/5 px-4 text-lg font-semibold text-brand-text transition hover:bg-brand-background/60"
            >
              Registrarme
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}




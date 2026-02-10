import Link from "next/link";

export default function Home() {
  return (
    <main
      className="relative min-h-screen bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/fondo1.jpg')" }}
    >
      {/* Overlay oscuro */}
      <div className="w-full max-w-md rounded-2xl p-8 space-y-6 backdrop-blur-lg bg-black/20" />

      {/* Contenido */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 space-y-6 backdrop-blur">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Equidata
            </h1>
            <p className="text-sm text-zinc-300">
              Gestión inteligente para centros hípicos, jinetes y profesionales
            </p>
          </div>

          <div className="grid gap-3">
            <Link
              href="/login"
              className="w-full rounded bg-blue-600 py-2 text-center text-sm font-semibold hover:bg-blue-500 transition"
            >
              Iniciar sesión
            </Link>

            <Link
              href="/register"
              className="w-full rounded border border-zinc-600 py-2 text-center text-sm font-semibold hover:border-zinc-400 transition"
            >
              Registrarme
            </Link>
          </div>

          <p className="text-xs text-zinc-400 text-center">
            Modo desarrollo · accesos directos:
            <br />
            <span className="font-mono">
              /dashboard/rider · /dashboard/center · /dashboard/pro
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}


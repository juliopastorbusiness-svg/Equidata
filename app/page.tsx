import Link from "next/link";

export default function Home() {
  return (
    <main
      className="relative min-h-screen bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/fondo1.jpg')" }}
    >
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-8 space-y-6 backdrop-blur">
          <div className="space-y-2 text-center">
            <h1 className="text-4xl font-bold tracking-tight">Equidata</h1>
            <p className="text-sm text-zinc-300">
              Gestion para centros hipicos, jinetes y profesionales
            </p>
          </div>

          <div className="grid gap-3">
            <Link
              href="/login"
              className="w-full rounded bg-blue-600 py-2 text-center text-sm font-semibold hover:bg-blue-500 transition"
            >
              Iniciar sesion
            </Link>
            <Link
              href="/register"
              className="w-full rounded border border-zinc-600 py-2 text-center text-sm font-semibold hover:border-zinc-400 transition"
            >
              Registrarme
            </Link>
          </div>

          <div className="text-xs text-zinc-400 text-center space-y-2">
            <p>Modo desarrollo: accesos directos</p>
            <div className="grid gap-1">
              <Link href="/dashboard/rider" className="underline">
                /dashboard/rider
              </Link>
              <Link href="/dashboard/center" className="underline">
                /dashboard/center
              </Link>
              <Link href="/dashboard/center/feed" className="underline">
                /dashboard/center/feed
              </Link>
              <Link href="/dashboard/pro" className="underline">
                /dashboard/pro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Role = "rider" | "centerOwner" | "pro";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectByRole = (role?: string | null) => {
    if (role === "rider") {
      router.push("/dashboard/rider");
    } else if (role === "centerOwner") {
      router.push("/dashboard/center");
    } else if (role === "pro") {
      router.push("/dashboard/pro");
    } else {
      router.push("/dashboard");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      const snap = await getDoc(doc(db, "users", uid));
      const role = snap.exists()
        ? (snap.data().role as string | undefined)
        : undefined;

      redirectByRole(role);
    } catch (err: any) {
      console.error(err);
      setError("Correo o contrasena incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-brand-background bg-cover bg-center bg-no-repeat text-brand-text"
      style={{ backgroundImage: "url('/fondo1.jpg')" }}
    >
      <div className="absolute inset-0 bg-brand-background/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-brand-background/20 via-brand-background/45 to-brand-background/80" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-background/40 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="mb-6 space-y-3 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-secondary">
              Equidata
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Iniciar sesion
            </h1>
            <p className="text-sm text-brand-text">Accede a tu cuenta en segundos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Correo electronico
              </label>
              <input
                type="email"
                className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text placeholder:text-brand-secondary focus:border-brand-primary focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-text">
                Contrasena
              </label>
              <input
                type="password"
                className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text placeholder:text-brand-secondary focus:border-brand-primary focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-500/40 bg-red-950/45 p-3 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-brand-primary px-4 text-base font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Iniciar sesion"}
            </button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm text-brand-text">
            <p>
              No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="font-semibold text-brand-primary hover:underline"
              >
                Registrate
              </button>
            </p>
            <p>
              <Link href="/" className="font-semibold text-brand-secondary hover:underline">
                Volver a inicio
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}



"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type Role = "rider" | "centerOwner" | "pro";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 👇 función que decide a qué dashboard mandar según rol
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

  // 👇 SOLO redirigir si YA hay sesión
  // Ojo: si NO hay usuario, NO hacemos nada (no vamos a /register)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // No hay usuario: dejamos al usuario en /login tranquilamente
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.exists()
          ? (userDoc.data().role as string | undefined)
          : undefined;
        redirectByRole(role);
      } catch (err) {
        console.error("Error leyendo datos de usuario:", err);
      }
    });

    return () => unsub();
  }, []);

  // 👇 Envío del formulario de login
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
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md border border-zinc-700 rounded-2xl p-6 bg-zinc-950/80 space-y-4">
        <h1 className="text-2xl font-bold text-center">Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Correo electrónico</label>
            <input
              type="email"
              className="w-full rounded border border-zinc-700 bg-black/60 p-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full rounded border border-zinc-700 bg-black/60 p-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded p-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-2 text-center text-xs text-zinc-400">
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-blue-400 hover:underline"
          >
            Regístrate
          </button>
        </p>
      </div>
    </main>
  );
}

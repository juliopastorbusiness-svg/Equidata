"use client";

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
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md border border-zinc-700 rounded-2xl p-6 bg-zinc-950/80 space-y-4">
        <h1 className="text-2xl font-bold text-center">Iniciar sesion</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Correo electronico</label>
            <input
              type="email"
              className="w-full rounded border border-zinc-700 bg-black/60 p-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Contrasena</label>
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
          No tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => router.push("/register")}
            className="text-blue-400 hover:underline"
          >
            Registrate
          </button>
        </p>
      </div>
    </main>
  );
}

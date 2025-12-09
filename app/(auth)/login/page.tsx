"use client";

import { FormEvent, useState, useEffect } from "react";
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

  // 🔹 Función para decidir a qué dashboard mandar según el rol
  const redirectByRole = (role?: string | null) => {
    if (role === "rider") {
      router.push("/dashboard/rider");
    } else if (role === "centerOwner") {
      router.push("/dashboard/center");
    } else if (role === "pro") {
      router.push("/dashboard/pro");
    } else {
      // Si por lo que sea no hay rol, lo mandamos al dashboard genérico
      router.push("/dashboard");
    }
  };

  // 🔹 Si ya hay sesión iniciada, redirigimos directamente
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role = userDoc.exists() ? (userDoc.data().role as string) : null;
      redirectByRole(role);
    });

    return () => unsub();
  }, []);

  // 🔹 Enviar formulario de login
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      const snap = await getDoc(doc(db, "users", uid));
      const role = snap.exists() ? (snap.data().role as string) : null;

      redirectByRole(role);
    } catch (err: any) {
      console.error(err);
      setError("Correo o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md border border-gray-700 rounded-xl p-6 bg-black/60 space-y-4">
        <h1 className="text-2xl font-bold text-center">Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40"
            required
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40"
            required
          />

          {error && (
            <p className="text-red-400 text-sm text-center whitespace-pre-line">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p
          className="text-center text-sm text-gray-400 cursor-pointer hover:underline"
          onClick={() => router.push("/register")}
        >
          ¿No tienes cuenta? Regístrate
        </p>
      </div>
    </main>
  );
}

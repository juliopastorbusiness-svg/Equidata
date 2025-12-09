"use client";

import { useState, FormEvent } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Crea el usuario en Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // Guarda info extra en Firestore (colección users)
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        role: "owner", // de momento solo propietario
        createdAt: new Date(),
      });

      // Después de registrar, lo mandamos a login
      router.push("/login");
    } catch (err: any) {
      console.error(err);
      setError("Error al registrar la cuenta");
    }

    setLoading(false);
  };

  return (
    <main className="flex justify-center items-center h-screen">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-6 border rounded-xl flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-center">Registro EquiData</h1>

        <input
          type="text"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />

        {error && <p className="text-red-500 text-center">{error}</p>}

        <button
          type="submit"
          className="bg-black text-white p-2 rounded"
          disabled={loading}
        >
          {loading ? "Registrando..." : "Crear cuenta"}
        </button>
      </form>
    </main>
  );
}

"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

type Role = "rider" | "centerOwner" | "pro";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("rider");

  // solo para propietario de centro
  const [newCenterName, setNewCenterName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validación específica de propietario de centro
      if (role === "centerOwner" && !newCenterName.trim()) {
        throw new Error("Debes indicar el nombre de tu centro hípico.");
      }

      // 1) Crear usuario en Authentication
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      let centerId: string | null = null;

      // 2) Si es propietario de centro, crear el centro en la colección "centers"
      if (role === "centerOwner") {
        const centerRef = await addDoc(collection(db, "centers"), {
          name: newCenterName.trim(),
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
        centerId = centerRef.id;
      }

      // 3) Guardar el documento de usuario en "users"
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        role,
        centerId, // null para jinetes y profesionales, id del centro para propietarios
        createdAt: serverTimestamp(),
      });

      // 4) Enviar al login tras registrarse
      router.push("/login");
    } catch (err: any) {
      console.error(err);
      if (err?.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado.");
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Ha ocurrido un error al crear la cuenta.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-brand-background text-brand-text">
      <div className="w-full max-w-md border border-brand-border rounded-2xl p-6 bg-brand-background/80">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Crear cuenta EquiData
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm mb-1">Nombre</label>
            <input
              type="text"
              className="w-full rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {/* Tipo de cuenta */}
          <div>
            <span className="block text-sm mb-1">Tipo de cuenta</span>
            <div className="space-y-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="rider"
                  checked={role === "rider"}
                  onChange={() => setRole("rider")}
                />
                Jinete
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="centerOwner"
                  checked={role === "centerOwner"}
                  onChange={() => setRole("centerOwner")}
                />
                Propietario de centro hípico
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="pro"
                  checked={role === "pro"}
                  onChange={() => setRole("pro")}
                />
                Profesional (veterinario, herrador…)
              </label>
            </div>
          </div>

          {/* Nombre del centro solo para propietario */}
          {role === "centerOwner" && (
            <div>
              <label className="block text-sm mb-1">
                Nombre de tu centro hípico
              </label>
              <input
                type="text"
                className="w-full rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                value={newCenterName}
                onChange={(e) => setNewCenterName(e.target.value)}
                placeholder="Ej: Centro Hípico Sevilla"
                required
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded p-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-brand-primary text-white py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-brand-secondary">
          ¿Ya tienes cuenta?{" "}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-brand-primary hover:underline"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </main>
  );
}


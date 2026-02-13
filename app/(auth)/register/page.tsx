"use client";

import Link from "next/link";
import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type Role = "rider" | "centerOwner" | "pro";
type ProType = "vet" | "farrier" | "other";

type Center = {
  id: string;
  name: string;
};

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [role, setRole] = useState<Role>("rider");
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");
  const [newCenterName, setNewCenterName] = useState("");
  const [proType, setProType] = useState<ProType>("vet");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCenters = async () => {
      try {
        const snap = await getDocs(collection(db, "centers"));
        const list: Center[] = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as { name?: string }).name ?? "Centro sin nombre",
        }));
        setCenters(list);
      } catch (err) {
        console.error("Error cargando centros", err);
      }
    };

    loadCenters();
  }, []);

  useEffect(() => {
    if (role === "rider" && centers.length > 0 && !selectedCenterId) {
      setSelectedCenterId(centers[0].id);
    }
  }, [role, centers, selectedCenterId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (role === "rider" && centers.length > 0 && !selectedCenterId) {
        throw new Error("Debes seleccionar un centro hipico.");
      }

      if (role === "centerOwner" && !newCenterName.trim()) {
        throw new Error("Debes indicar el nombre de tu centro hipico.");
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      let centerId: string | null = null;

      if (role === "centerOwner") {
        const centerRef = await addDoc(collection(db, "centers"), {
          name: newCenterName.trim(),
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
        centerId = centerRef.id;
      }

      if (role === "rider") {
        if (centers.length > 0) {
          centerId = selectedCenterId;
        } else {
          centerId = null;
        }
      }

      if (role === "pro") {
        centerId = null;
      }

      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName: name,
        role,
        proType: role === "pro" ? proType : null,
        centerId,
        createdAt: serverTimestamp(),
      });

      router.push("/login");
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message || "Error al registrar el usuario");
      } else {
        setError("Error al registrar el usuario");
      }
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
        <div className="w-full max-w-lg rounded-3xl border border-brand-border bg-brand-background/40 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="mb-6 space-y-3 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-brand-secondary">
              Equidata
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Crear cuenta
            </h1>
            <p className="text-sm text-brand-text">
              Completa solo lo necesario y empieza rapido.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text placeholder:text-brand-secondary focus:border-brand-primary focus:outline-none"
              required
            />

            <input
              type="email"
              placeholder="Correo electronico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text placeholder:text-brand-secondary focus:border-brand-primary focus:outline-none"
              required
            />

            <input
              type="password"
              placeholder="Contrasena"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text placeholder:text-brand-secondary focus:border-brand-primary focus:outline-none"
              required
            />

            <div className="space-y-2 rounded-xl border border-brand-border bg-white/60 p-3">
              <p className="text-sm font-semibold text-brand-text">Tipo de cuenta</p>
              <div className="grid gap-2 text-sm text-brand-text">
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
                  Propietario de centro hipico
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="pro"
                    checked={role === "pro"}
                    onChange={() => setRole("pro")}
                  />
                  Profesional
                </label>
              </div>
            </div>

            {role === "rider" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-text">
                  Centro hipico donde montas
                </p>
                {centers.length === 0 ? (
                  <p className="rounded-xl border border-brand-primary/30 bg-brand-primary/10 p-3 text-sm text-brand-secondary">
                    No hay centros disponibles todavia.
                  </p>
                ) : (
                  <select
                    value={selectedCenterId}
                    onChange={(e) => setSelectedCenterId(e.target.value)}
                    className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text focus:border-brand-primary focus:outline-none"
                  >
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {role === "centerOwner" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-text">
                  Nombre de tu centro hipico
                </p>
                <input
                  type="text"
                  placeholder="Ej: Centro Hipico Los Olivos"
                  value={newCenterName}
                  onChange={(e) => setNewCenterName(e.target.value)}
                  className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text placeholder:text-brand-secondary focus:border-brand-primary focus:outline-none"
                />
              </div>
            )}

            {role === "pro" && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-brand-text">Tipo de profesional</p>
                <select
                  value={proType}
                  onChange={(e) => setProType(e.target.value as ProType)}
                  className="h-12 w-full rounded-xl border border-brand-border bg-white/90 px-3 text-base text-brand-text focus:border-brand-primary focus:outline-none"
                >
                  <option value="vet">Veterinario</option>
                  <option value="farrier">Herrador</option>
                  <option value="other">Otro</option>
                </select>
              </div>
            )}

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
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="h-12 w-full rounded-xl border border-brand-border bg-white/5 px-4 text-base font-semibold text-brand-text transition hover:bg-brand-background/60"
            >
              Ya tengo cuenta
            </button>
          </form>

          <p className="mt-4 text-center text-sm">
            <Link href="/" className="font-semibold text-brand-secondary hover:underline">
              Volver a inicio
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}



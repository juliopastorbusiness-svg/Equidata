"use client";

import Link from "next/link";
import React, { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithGoogle } from "@/lib/auth/googleSignIn";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const authErrorCode = (err: unknown): string | undefined => {
    if (typeof err === "object" && err !== null && "code" in err) {
      const code = (err as { code?: unknown }).code;
      return typeof code === "string" ? code : undefined;
    }
    return undefined;
  };

  const redirectByRole = (nextRole?: string | null) => {
    if (nextRole === "rider") {
      router.push("/dashboard/rider");
    } else if (nextRole === "centerOwner") {
      router.push("/dashboard/center");
    } else if (nextRole === "pro") {
      router.push("/dashboard/pro");
    } else {
      router.push("/dashboard");
    }
  };

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

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const cred = await signInWithGoogle();
      const { user } = cred;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email ?? "",
          name: user.displayName ?? "",
          photoURL: user.photoURL ?? null,
          createdAt: serverTimestamp(),
          role: null,
        });
      }

      const role = snap.exists()
        ? (snap.data().role as string | undefined)
        : undefined;

      redirectByRole(role);
    } catch (err: unknown) {
      console.error(err);
      const code = authErrorCode(err);
      if (
        code === "auth/popup-blocked" ||
        code === "auth/cancelled-popup-request"
      ) {
        setError("El navegador bloqueo la ventana emergente de Google.");
      } else if (code === "auth/popup-closed-by-user") {
        setError("Cerraste la ventana de Google antes de completar el acceso.");
      } else if (code === "auth/account-exists-with-different-credential") {
        setError("Ya existe una cuenta con este correo usando otro metodo de acceso.");
      } else {
        setError("No se pudo continuar con Google.");
      }
    } finally {
      setGoogleLoading(false);
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

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="mb-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-brand-border bg-white/90 px-4 text-base font-semibold text-brand-text transition hover:bg-white disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
            >
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C17 3.4 14.7 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.4 0-.6-.1-1.1-.2-1.9H12z"
              />
            </svg>
            {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
          </button>

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



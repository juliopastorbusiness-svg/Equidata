"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

type Role = "rider" | "centerOwner" | "pro";
type ProType = "vet" | "farrier" | "other";

type Center = {
  id: string;
  name: string;
};

export default function RegisterPage() {
  const router = useRouter();

  // Campos básicos
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Rol elegido
  const [role, setRole] = useState<Role>("rider");

  // Centros
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>("");

  // Datos para PROPIETARIO
  const [newCenterName, setNewCenterName] = useState("");

  // Datos para PROFESIONAL
  const [proType, setProType] = useState<ProType>("vet");

  // Estado general
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1️⃣ Cargar centros desde Firestore
  useEffect(() => {
    const loadCenters = async () => {
      try {
        const snap = await getDocs(collection(db, "centers"));
        const list: Center[] = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name ?? "Centro sin nombre",
        }));
        setCenters(list);
      } catch (err) {
        console.error("Error cargando centros", err);
      }
    };

    loadCenters();
  }, []);

  // 2️⃣ Cuando haya centros y el rol sea jinete, asegurarnos de que haya uno seleccionado
  useEffect(() => {
    if (role === "rider" && centers.length > 0 && !selectedCenterId) {
      setSelectedCenterId(centers[0].id); // por defecto el primero
    }
  }, [role, centers, selectedCenterId]);

  // 3️⃣ Enviar formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // ✅ Validaciones según el rol

      // Si hay centros y es jinete, obligamos a elegir uno
      if (role === "rider" && centers.length > 0 && !selectedCenterId) {
        throw new Error("Debes seleccionar un centro hípico.");
      }

      if (role === "centerOwner" && !newCenterName.trim()) {
        throw new Error("Debes indicar el nombre de tu centro hípico.");
      }

      // 1. Crear usuario en Auth
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      let centerId: string | null = null;

      // 2. Si es propietario, crear centro y guardar su id
      if (role === "centerOwner") {
        const centerRef = await addDoc(collection(db, "centers"), {
          name: newCenterName.trim(),
          ownerId: user.uid,
          createdAt: serverTimestamp(),
        });
        centerId = centerRef.id;
      }

      // 3. Si es jinete, usar el centro seleccionado (cuando haya)
      if (role === "rider") {
        // Si no hay centros en la BD, centerId se queda en null (ya lo gestionaremos después)
        if (centers.length > 0) {
          centerId = selectedCenterId;
        } else {
          centerId = null;
        }
      }

      // 4. Si es profesional, de momento no tiene centro
      if (role === "pro") {
        centerId = null;
      }

      // 5. Guardar usuario en colección "users" con id = uid
      await setDoc(doc(db, "users", user.uid), {
        email,
        displayName: name,
        role,
        proType: role === "pro" ? proType : null,
        centerId,
        createdAt: serverTimestamp(),
      });

      // 6. Redirigir a login
      router.push("/login");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al registrar el usuario");
    } finally {
      setLoading(false);
    }
  };

  // 4️⃣ UI
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md border border-gray-700 rounded-xl p-6 bg-black/60 space-y-4">
        <h1 className="text-2xl font-bold text-center">Crear cuenta EquiData</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <input
            type="text"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40"
            required
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40"
            required
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40"
            required
          />

          {/* Tipo de cuenta */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">Tipo de cuenta</p>
            <div className="flex flex-col gap-1 text-sm">
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

          {/* Campos específicos según el rol */}

          {/* JINETE: elegir centro */}
          {role === "rider" && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">
                Centro hípico donde montas
              </p>
              {centers.length === 0 ? (
                <p className="text-xs text-yellow-400">
                  De momento no hay centros creados. Pídele a tu centro que se
                  registre como propietario, o crea primero un centro como
                  propietario.
                </p>
              ) : (
                <select
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40 text-sm"
                >
                  {/* Ya que en useEffect ponemos por defecto centers[0].id,
                      aquí simplemente mostramos la lista */}
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* PROPIETARIO: nombre del centro */}
          {role === "centerOwner" && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">Nombre de tu centro hípico</p>
              <input
                type="text"
                placeholder="Ej: Centro Hípico Los Olivos"
                value={newCenterName}
                onChange={(e) => setNewCenterName(e.target.value)}
                className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40 text-sm"
              />
            </div>
          )}

          {/* PROFESIONAL: tipo */}
          {role === "pro" && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">Tipo de profesional</p>
              <select
                value={proType}
                onChange={(e) => setProType(e.target.value as ProType)}
                className="w-full border border-gray-600 rounded px-3 py-2 bg-black/40 text-sm"
              >
                <option value="vet">Veterinario</option>
                <option value="farrier">Herrador</option>
                <option value="other">Otro</option>
              </select>
            </div>
          )}

          {/* Errores */}
          {error && (
            <p className="text-red-400 text-sm text-center whitespace-pre-line">
              {error}
            </p>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        <p
          className="text-center text-sm text-gray-400 cursor-pointer hover:underline"
          onClick={() => router.push("/login")}
        >
          ¿Ya tienes cuenta? Inicia sesión
        </p>
      </div>
    </main>
  );
}

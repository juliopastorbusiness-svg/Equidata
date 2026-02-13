"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  Timestamp,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { isDev } from "@/lib/env";

type Horse = {
  id: string;
  name: string;
  age: number;
  breed: string;
  ownerId: string;
  centerId: string;
  photoUrl?: string;
  createdAt?: Timestamp;
};

type Center = {
  id: string;
  name: string;
};

type UserInfo = {
  name?: string;
  email?: string;
  role?: string;
};

const RiderDashboardPage: React.FC = () => {
  const router = useRouter();
  const devMode = isDev();

  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Centros
  const [centers, setCenters] = useState<Center[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);

  // Caballos
  const [horses, setHorses] = useState<Horse[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [breed, setBreed] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Estado general
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingHorse, setLoadingHorse] = useState(false);
  const [error, setError] = useState("");

  // 1️⃣ Autenticación + datos del usuario + centros
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      try {
        // Cargar info del usuario
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserInfo;
          setUserInfo(data);

          // En PROD, si NO es jinete lo redirigimos por rol.
          // En DEV permitimos entrar para pruebas manuales.
          if (!devMode && data.role && data.role !== "rider") {
            if (data.role === "centerOwner") {
              router.push("/dashboard/center");
            } else if (data.role === "pro") {
              router.push("/dashboard/pro");
            }
            return;
          }
        }

        // Cargar todos los centros
        const centersSnap = await getDocs(collection(db, "centers"));
        const centersData: Center[] = centersSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as { name: string }),
        }));
        setCenters(centersData);
      } catch (err) {
        console.error("Error cargando usuario/centros:", err);
        setError("No se pudieron cargar tus datos.");
      } finally {
        setLoadingInitial(false);
      }
    });

    return () => unsub();
  }, [devMode, router]);

  // 2️⃣ Suscripción a TODOS los caballos de este jinete
  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, "horses"), where("ownerId", "==", userId));

    const unsub = onSnapshot(q, (snapshot) => {
      const data: Horse[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Horse, "id">),
      }));
      setHorses(data);
    });

    return () => unsub();
  }, [userId]);

  // 3️⃣ Mapas derivados
  const centersById = useMemo(() => {
    const map: Record<string, Center> = {};
    centers.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [centers]);

  // Centros donde este jinete YA tiene caballos
  const riderCenters: Center[] = useMemo(() => {
    const ids = new Set<string>();
    horses.forEach((h) => {
      if (h.centerId) ids.add(h.centerId);
    });
    return Array.from(ids)
      .map((id) => centersById[id])
      .filter(Boolean) as Center[];
  }, [horses, centersById]);

  // Resultados de búsqueda (solo por nombre, en memoria)
  const filteredCenters: Center[] = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return centers;
    return centers.filter((c) =>
      c.name.toLowerCase().includes(term)
    );
  }, [centers, searchTerm]);

  // Caballos del centro actualmente seleccionado
  const horsesInActiveCenter: Horse[] = useMemo(() => {
    if (!activeCenterId) return [];
    return horses.filter((h) => h.centerId === activeCenterId);
  }, [horses, activeCenterId]);

  // 4️⃣ Subir foto a Storage
  const uploadHorsePhoto = async (file: File, userId: string) => {
    const filePath = `horses/${userId}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  };

  // 5️⃣ Guardar caballo nuevo en el centro activo
  const handleSubmitHorse = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!activeCenterId) {
      setError("Primero selecciona un centro hípico.");
      return;
    }

    setError("");
    setLoadingHorse(true);

    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadHorsePhoto(photoFile, userId);
      }

      await addDoc(collection(db, "horses"), {
        name,
        age: Number(age),
        breed,
        ownerId: userId,
        centerId: activeCenterId,
        photoUrl,
        createdAt: Timestamp.now(),
      });

      // Limpiar formulario
      setName("");
      setAge("");
      setBreed("");
      setPhotoFile(null);
      const input = document.getElementById(
        "horse-photo"
      ) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      console.error("Error guardando caballo:", err);
      setError("No se pudo guardar el caballo.");
    } finally {
      setLoadingHorse(false);
    }
  };

  // 6️⃣ Render
  if (loadingInitial) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-background text-brand-text">
        <p>Comprobando sesión...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-background text-brand-text">
        <p>No hay sesión activa.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text p-6 space-y-8">
      {/* Información del jinete */}
      <section className="border border-brand-border rounded-2xl p-4 bg-brand-background/70">
        <h1 className="text-2xl font-bold mb-2">Hola, {userInfo?.name}</h1>
        <p className="text-sm text-brand-secondary">
          Sesión iniciada como <span className="font-mono">{userInfo?.email}</span>
        </p>
      </section>

      {/* Buscador de centros */}
      <section className="border border-brand-border rounded-2xl p-4 bg-brand-background/70 space-y-4">
        <h2 className="text-xl font-semibold">Buscar centro hípico</h2>

        <input
          type="text"
          placeholder="Busca un centro por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded border border-brand-border bg-brand-background/70 p-2 text-sm"
        />

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
          {filteredCenters.map((center) => (
            <button
              key={center.id}
              type="button"
              onClick={() => setActiveCenterId(center.id)}
              className={`text-left border rounded-lg px-3 py-2 text-sm bg-brand-background/60 hover:border-brand-primary transition ${
                activeCenterId === center.id
                  ? "border-brand-primary"
                  : "border-brand-border"
              }`}
            >
              {center.name}
            </button>
          ))}
          {filteredCenters.length === 0 && (
            <p className="text-sm text-brand-secondary">
              No se han encontrado centros con ese nombre.
            </p>
          )}
        </div>
      </section>

      {/* Tus centros (donde ya tienes caballos) */}
      <section className="border border-brand-border rounded-2xl p-4 bg-brand-background/70 space-y-3">
        <h2 className="text-xl font-semibold">Tus centros</h2>
        {riderCenters.length === 0 ? (
          <p className="text-sm text-brand-secondary">
            Aún no tienes ningún caballo registrado.  
            Busca un centro arriba, selecciónalo y añade tu primer caballo.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {riderCenters.map((center) => (
              <button
                key={center.id}
                type="button"
                onClick={() => setActiveCenterId(center.id)}
                className={`px-3 py-1 rounded-full text-sm border transition ${
                  activeCenterId === center.id
                    ? "bg-brand-primary border-brand-primary text-white"
                    : "bg-brand-background/60 border-brand-border hover:border-brand-primary"
                }`}
              >
                {center.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Detalle del centro activo: caballos + formulario */}
      {activeCenterId && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              Caballos en{" "}
              <span className="text-brand-primary">
                {centersById[activeCenterId]?.name ?? "Centro seleccionado"}
              </span>
            </h2>
          </div>

          {/* Formulario para añadir caballo */}
          <section className="max-w-xl border border-brand-border rounded-2xl p-4 bg-brand-background/70 space-y-3">
            <h3 className="text-lg font-semibold">Añadir caballo</h3>
            <form onSubmit={handleSubmitHorse} className="space-y-3">
              <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-brand-border bg-brand-background/70 p-2 text-sm"
                required
              />

              <input
                type="number"
                placeholder="Edad"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded border border-brand-border bg-brand-background/70 p-2 text-sm"
                required
              />

              <input
                type="text"
                placeholder="Raza (opcional)"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full rounded border border-brand-border bg-brand-background/70 p-2 text-sm"
              />

              <input
                id="horse-photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPhotoFile(file);
                }}
                className="w-full rounded border border-brand-border bg-brand-background/70 p-2 text-sm"
              />

              {error && (
                <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded p-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loadingHorse}
                className="w-full rounded bg-brand-primary text-white py-2 text-sm font-semibold disabled:opacity-60"
              >
                {loadingHorse ? "Guardando..." : "Guardar caballo"}
              </button>
            </form>
          </section>

          {/* Lista de caballos del centro */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Tus caballos aquí</h3>
            {horsesInActiveCenter.length === 0 ? (
              <p className="text-sm text-brand-secondary">
                Aún no tienes caballos registrados en este centro.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {horsesInActiveCenter.map((horse) => (
                    <Link
                      key={horse.id}
                      href={`/dashboard/horses/${horse.id}`}
                      className="block border border-brand-border rounded-2xl p-4 bg-brand-background/70 space-y-2 hover:bg-white/60 transition cursor-pointer"
                   > 
                    {horse.photoUrl && (
                      <img
                        src={horse.photoUrl}
                        alt={horse.name}
                        className="w-full h-40 object-cover rounded-xl"
                      />
                    )}
                    <h4 className="font-bold text-lg">{horse.name}</h4>
                    <p className="text-sm text-brand-secondary">
                      Edad: {horse.age}
                    </p>
                    {horse.breed && (
                      <p className="text-sm text-brand-secondary">
                        Raza: {horse.breed}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
};

export default RiderDashboardPage;


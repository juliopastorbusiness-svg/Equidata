"use client";

import React, { useEffect, useState, FormEvent } from "react";
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
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Horse = {
  id: string;
  name: string;
  age: number;
  breed: string;
  ownerId: string;
  photoUrl?: string;
  createdAt?: Timestamp;
};

type Center = {
  id: string;
  name: string;
};

const HorsesPage: React.FC = () => {
  const router = useRouter();

  // usuario
  const [userId, setUserId] = useState<string | null>(null);
  const [userCenterId, setUserCenterId] = useState<string | null>(null);

  // centros
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [savingCenter, setSavingCenter] = useState(false);

  // caballos
  const [horses, setHorses] = useState<Horse[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [breed, setBreed] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1️⃣ Auth + cargar usuario + centro + centros
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data() as { centerId?: string | null };
          if (data.centerId) {
            // Ya tiene centro asignado
            setUserCenterId(data.centerId);
          } else {
            // No tiene centro: cargamos lista de centros para que elija
            const centersSnap = await getDocs(collection(db, "centers"));
            const centersData: Center[] = centersSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as { name: string }),
            }));
            setCenters(centersData);
          }
        }
      } catch (err) {
        console.error("Error cargando usuario/centros:", err);
        setError("No se pudieron cargar tus datos.");
      } finally {
        setLoadingUser(false);
      }
    });

    return () => unsub();
  }, [router]);

  // 2️⃣ Suscripción a caballos del jinete
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

  // 3️⃣ Subir foto a Storage
  const uploadHorsePhoto = async (file: File, userId: string) => {
    console.log("📤 Empezando subida de foto...");

    const filePath = `horses/${userId}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);

    console.log("➡️ Llamando a uploadBytes...");
    const snapshot = await uploadBytes(storageRef, file);
    console.log("✅ uploadBytes OK, obteniendo URL...");
    const url = await getDownloadURL(snapshot.ref);
    console.log("✅ URL obtenida:", url);

    return url;
  };

  // 4️⃣ Guardar caballo
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!userCenterId) {
      setError("Antes de añadir caballos debes elegir tu centro hípico.");
      return;
    }

    setError("");
    setLoading(true);
    console.log("🚀 handleSubmit iniciado");

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        console.log("🖼 Hay foto, subiendo...");
        photoUrl = await uploadHorsePhoto(photoFile, userId);
        console.log("🖼 Foto subida, URL:", photoUrl);
      } else {
        console.log("❕ No hay foto, solo guardo datos");
      }

      await addDoc(collection(db, "horses"), {
        name,
        age: Number(age),
        breed,
        ownerId: userId,
        centerId: userCenterId, // por si luego quieres filtrar por centro
        photoUrl,
        createdAt: Timestamp.now(),
      });
      console.log("✅ Caballo guardado en Firestore");

      // Limpiar formulario
      setName("");
      setAge("");
      setBreed("");
      setPhotoFile(null);
      (document.getElementById("horse-photo") as HTMLInputElement).value = "";
    } catch (err) {
      console.error("❌ ERROR en handleSubmit:", err);
      setError("Error al guardar el caballo");
    } finally {
      console.log("🏁 handleSubmit terminado, setLoading(false)");
      setLoading(false);
    }
  };

  // 5️⃣ Guardar centro elegido por el jinete
  const handleSaveCenter = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !selectedCenterId) return;

    setError("");
    setSavingCenter(true);

    try {
      await updateDoc(doc(db, "users", userId), {
        centerId: selectedCenterId,
      });
      setUserCenterId(selectedCenterId);
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar el centro. Inténtalo de nuevo.");
    } finally {
      setSavingCenter(false);
    }
  };

  return (
    <main className="p-6 space-y-6 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Caballos</h1>

      {/* Bloque para elegir centro si el jinete aún no tiene uno */}
      {loadingUser ? (
        <p className="text-sm text-gray-300">Comprobando tus datos...</p>
      ) : !userCenterId ? (
        <section className="max-w-md border rounded-xl p-4 mb-8 bg-black/20">
          <h2 className="text-xl font-semibold mb-2">Elige tu centro hípico</h2>

          {centers.length === 0 ? (
            <p className="text-sm text-gray-300">
              De momento no hay centros creados. Pídele a tu centro que se
              registre como propietario en EquiData.
            </p>
          ) : (
            <form onSubmit={handleSaveCenter} className="space-y-3">
              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                className="border p-2 rounded w-full bg-black/30"
                required
              >
                <option value="">Selecciona un centro</option>
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={savingCenter || !selectedCenterId}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {savingCenter ? "Guardando..." : "Guardar centro"}
              </button>
            </form>
          )}
        </section>
      ) : null}

      {/* Solo mostramos el formulario/listado de caballos cuando ya tiene centro */}
      {userCenterId && (
        <>
          {/* Formulario */}
          <section className="max-w-md border rounded-xl p-4 space-y-3 bg-black/20">
            <h2 className="text-xl font-semibold">Añadir caballo</h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border p-2 rounded w-full"
                required
              />

              <input
                type="number"
                placeholder="Edad"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="border p-2 rounded w-full"
                required
              />

              <input
                type="text"
                placeholder="Raza (opcional)"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="border p-2 rounded w-full"
              />

              <input
                id="horse-photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPhotoFile(file);
                }}
                className="border p-2 rounded w-full bg-black/30"
              />

              {error && (
                <p className="text-red-500 text-sm bg-red-950/40 border border-red-900 rounded p-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? "Guardando..." : "Guardar caballo"}
              </button>
            </form>
          </section>

          {/* Listado */}
          <section>
            <h2 className="text-xl font-semibold mb-3">Mis caballos</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {horses.map((horse) => (
                <div
                  key={horse.id}
                  className="border rounded-xl p-4 bg-black/30 space-y-2"
                >
                  {horse.photoUrl && (
                    <img
                      src={horse.photoUrl}
                      alt={horse.name}
                      className="w-full h-40 object-cover rounded"
                    />
                  )}

                  <h3 className="font-bold text-lg">{horse.name}</h3>
                  <p className="text-sm text-gray-300">Edad: {horse.age}</p>
                  {horse.breed && (
                    <p className="text-sm text-gray-300">Raza: {horse.breed}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
};

export default HorsesPage;

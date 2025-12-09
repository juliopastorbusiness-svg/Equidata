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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";

type Horse = {
  id: string;
  name: string;
  age: number;
  breed: string;
  ownerId: string;        // 🔹 ID del jinete
  photoUrl?: string;
  createdAt?: Timestamp;
};

const HorsesPage: React.FC = () => {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  const [horses, setHorses] = useState<Horse[]>([]);
  const [name, setName] = useState("");
  const [age, setAge] = useState<string>("");
  const [breed, setBreed] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 1️⃣ Proteger ruta y guardar uid del jinete
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUserId(user.uid);
      }
    });

    return () => unsub();
  }, [router]);

  // 2️⃣ Traer SOLO caballos del jinete logueado
  useEffect(() => {
    if (!userId) return;

    // 🔴 ESTA LÍNEA ES LA CLAVE:
    // Solo traemos docs donde ownerId == userId
    const q = query(
      collection(db, "horses"),
      where("ownerId", "==", userId)
    );

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
    const filePath = `horses/${userId}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  };

  // 4️⃣ Guardar caballo
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setError("");
    setLoading(true);

    try {
      let photoUrl: string | null = null;

      if (photoFile) {
        photoUrl = await uploadHorsePhoto(photoFile, userId);
      }

      await addDoc(collection(db, "horses"), {
        name,
        age: Number(age),
        breed,
        ownerId: userId,          // 🔹 AQUÍ GUARDAMOS EL JINETE
        photoUrl,
        createdAt: Timestamp.now(),
      });

      setName("");
      setAge("");
      setBreed("");
      setPhotoFile(null);
      (document.getElementById("horse-photo") as HTMLInputElement).value = "";
    } catch (err) {
      console.error(err);
      setError("Error al guardar el caballo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold mb-4">Mis caballos</h1>
        <Link
          href="/dashboard/rider"
          className="text-sm text-blue-400 underline"
        >
          ← Volver al dashboard de jinete
        </Link>
      </div>

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

          {error && <p className="text-red-500 text-sm">{error}</p>}

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
        <h2 className="text-xl font-semibold mb-3">Caballos registrados</h2>

        {horses.length === 0 ? (
          <p className="text-sm text-gray-300">
            Todavía no tienes caballos. Añade el primero con el formulario de
            arriba.
          </p>
        ) : (
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
        )}
      </section>
    </main>
  );
};

export default HorsesPage;

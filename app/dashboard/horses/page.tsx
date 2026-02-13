
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  Timestamp,
  deleteDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import Link from "next/link";
import { ref as storageRef, deleteObject, uploadBytes, getDownloadURL } from "firebase/storage";

type Horse = {
  id: string;
  name: string;
  age: number;
  breed: string;
  ownerId: string;
  photoUrl?: string;
  createdAt?: Timestamp;
};

type HealthLog = {
  id: string;
  horseId: string;
  ownerId: string;
  createdAt: Timestamp;
  temperature?: number;
  heartRate?: number;
  weight?: number;
  notes?: string;
};

export default function HorseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const horseId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [horse, setHorse] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Estado para edición
  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState<string>("");
  const [editBreed, setEditBreed] = useState("");
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Estado para registros de salud
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [temp, setTemp] = useState<string>("");
  const [heartRate, setHeartRate] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [savingLog, setSavingLog] = useState(false);

  // Proteger ruta
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

  // Cargar datos del caballo
  useEffect(() => {
    const fetchHorse = async () => {
      if (!userId || !horseId) return;

      try {
        const ref = doc(db, "horses", horseId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("El caballo no existe");
          setLoading(false);
          return;
        }

        const data = snap.data() as Omit<Horse, "id">;

        if (data.ownerId !== userId) {
          setError("No tienes permiso para ver este caballo");
          setLoading(false);
          return;
        }

        const fullHorse: Horse = { id: horseId, ...data };
        setHorse(fullHorse);

        // Rellenar campos de edición
        setEditName(fullHorse.name);
        setEditAge(String(fullHorse.age));
        setEditBreed(fullHorse.breed || "");
      } catch (err) {
        console.error(err);
        setError("Error al cargar el caballo");
      } finally {
        setLoading(false);
      }
    };

    fetchHorse();
  }, [userId, horseId]);

  // Cargar registros de salud
  useEffect(() => {
    if (!userId || !horseId) return;

    const q = query(
      collection(db, "healthLogs"),
      where("horseId", "==", horseId),
      where("ownerId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: HealthLog[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HealthLog, "id">),
      }));
      setLogs(data);
    });

    return () => unsub();
  }, [userId, horseId]);

  const handleDelete = async () => {
    if (!userId || !horse) return;

    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar a ${horse.name}? Esta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    setDeleting(true);
    setError("");

    try {
      // Borrar foto si existe
      if (horse.photoUrl) {
        const fileRef = storageRef(storage, horse.photoUrl);
        await deleteObject(fileRef);
      }

      // Borrar documento
      await deleteDoc(doc(db, "horses", horse.id));

      router.push("/dashboard/horses");
    } catch (err) {
      console.error(err);
      setError("No se ha podido eliminar el caballo");
      setDeleting(false);
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !horse) return;

    setSavingEdit(true);
    setError("");

    try {
      let updatedPhotoUrl = horse.photoUrl || null;

      // Si hay nueva foto, subirla y (opcional) borrar la antigua
      if (newPhotoFile) {
        const filePath = `horses/${userId}/${Date.now()}-${newPhotoFile.name}`;
        const sRef = storageRef(storage, filePath);
        const snapshot = await uploadBytes(sRef, newPhotoFile);
        const url = await getDownloadURL(snapshot.ref);

        // borrar antigua si existía
        if (horse.photoUrl) {
          const oldRef = storageRef(storage, horse.photoUrl);
          await deleteObject(oldRef).catch(() => {});
        }

        updatedPhotoUrl = url;
      }

      await updateDoc(doc(db, "horses", horse.id), {
        name: editName,
        age: Number(editAge),
        breed: editBreed,
        photoUrl: updatedPhotoUrl,
      });

      // Actualizar estado local
      setHorse((prev) =>
        prev
          ? {
              ...prev,
              name: editName,
              age: Number(editAge),
              breed: editBreed,
              photoUrl: updatedPhotoUrl || undefined,
            }
          : prev
      );

      setNewPhotoFile(null);
      (document.getElementById("new-horse-photo") as HTMLInputElement).value =
        "";
    } catch (err) {
      console.error(err);
      setError("No se han podido guardar los cambios");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !horse) return;

    setSavingLog(true);
    setError("");

    try {
      await addDoc(collection(db, "healthLogs"), {
        horseId: horse.id,
        ownerId: userId,
        createdAt: Timestamp.now(),
        temperature: temp ? Number(temp) : null,
        heartRate: heartRate ? Number(heartRate) : null,
        weight: weight ? Number(weight) : null,
        notes: notes || null,
      });

      setTemp("");
      setHeartRate("");
      setWeight("");
      setNotes("");
    } catch (err) {
      console.error(err);
      setError("No se ha podido guardar el registro de salud");
    } finally {
      setSavingLog(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <p>Cargando caballo...</p>
      </main>
    );
  }

  if (error || !horse) {
    return (
      <main className="p-6 space-y-4">
        <p className="text-red-400">{error || "Caballo no encontrado"}</p>
        <Link
          href="/dashboard/horses"
          className="text-brand-primary underline text-sm"
        >
          ← Volver a mis caballos
        </Link>
      </main>
    );
  }

  const createdDate = horse.createdAt
    ? horse.createdAt.toDate().toLocaleString()
    : null;

  return (
    <main className="p-6 space-y-6">
      <Link
        href="/dashboard/horses"
        className="text-brand-primary underline text-sm"
      >
        ← Volver a mis caballos
      </Link>

      <section className="max-w-3xl border rounded-xl p-4 bg-brand-background/20 space-y-6">
        {/* Cabecera + eliminar */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{horse.name}</h1>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            {deleting ? "Eliminando..." : "Eliminar caballo"}
          </button>
        </div>

        {/* Foto */}
        {horse.photoUrl && (
          <img
            src={horse.photoUrl}
            alt={horse.name}
            className="w-full max-h-80 object-cover rounded"
          />
        )}

        {/* Info básica */}
        <div className="space-y-1">
          <p>
            <span className="font-semibold">Edad:</span> {horse.age} años
          </p>
          {horse.breed && (
            <p>
              <span className="font-semibold">Raza:</span> {horse.breed}
            </p>
          )}
          {createdDate && (
            <p className="text-sm text-gray-300">
              Registrado el: {createdDate}
            </p>
          )}
        </div>

        {/* Editar caballo */}
        <div className="pt-4 border-t border-brand-border">
          <h2 className="text-xl font-semibold mb-2">Editar datos</h2>

          <form onSubmit={handleEdit} className="space-y-3 max-w-md">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="Nombre"
              required
            />

            <input
              type="number"
              value={editAge}
              onChange={(e) => setEditAge(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="Edad"
              required
            />

            <input
              type="text"
              value={editBreed}
              onChange={(e) => setEditBreed(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="Raza (opcional)"
            />

            <input
              id="new-horse-photo"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setNewPhotoFile(file);
              }}
              className="border p-2 rounded w-full bg-brand-background/30"
            />

            <button
              type="submit"
              disabled={savingEdit}
              className="bg-brand-primary text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>

        {/* Salud y seguimiento */}
        <div className="pt-4 border-t border-brand-border space-y-4">
          <h2 className="text-xl font-semibold">Salud y seguimiento</h2>

          {/* Formulario nuevo registro */}
          <form
            onSubmit={handleAddLog}
            className="space-y-3 max-w-md border rounded-xl p-3 bg-brand-background/30"
          >
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Temp (ºC)"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="border p-2 rounded w-full text-sm"
              />
              <input
                type="number"
                placeholder="Pulso (lpm)"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="border p-2 rounded w-full text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Peso (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="border p-2 rounded w-full text-sm"
              />
            </div>

            <textarea
              placeholder="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border p-2 rounded w-full text-sm"
              rows={2}
            />

            <button
              type="submit"
              disabled={savingLog}
              className="bg-brand-primary text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {savingLog ? "Guardando registro..." : "Añadir registro de salud"}
            </button>
          </form>

          {/* Lista de registros */}
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-300">
                Aún no hay registros de salud para este caballo.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {logs.map((log) => (
                  <li
                    key={log.id}
                    className="border rounded-lg p-2 bg-brand-background/30"
                  >
                    <p className="font-semibold">
                      {log.createdAt.toDate().toLocaleString()}
                    </p>
                    <p>
                      Temp: {log.temperature ?? "-"} ºC · Pulso:{" "}
                      {log.heartRate ?? "-"} lpm · Peso: {log.weight ?? "-"} kg
                    </p>
                    {log.notes && (
                      <p className="text-gray-300 mt-1">
                        Notas: {log.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </section>
    </main>
  );
}





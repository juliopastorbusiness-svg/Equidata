"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Horse = {
  id: string;
  name: string;
  age: number;
  breed?: string;
  centerId: string;
  ownerId: string;
  photoUrl?: string;
  createdAt?: Timestamp;
};

type MedicalAttachment = {
  url: string;
  name: string;
  type: string;
};

type MedicalNote = {
  id: string;
  horseId: string;
  proId: string;
  createdAt: Timestamp;
  note: string;
  attachments?: MedicalAttachment[];
};

export default function ProHorseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const horseId = params?.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [horse, setHorse] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editName, setEditName] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editBreed, setEditBreed] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [notes, setNotes] = useState<MedicalNote[]>([]);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.uid);
    });

    return () => unsub();
  }, [router]);

  useEffect(() => {
    const fetchHorse = async () => {
      if (!horseId) return;

      try {
        const ref = doc(db, "horses", horseId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setError("El caballo no existe");
          setLoading(false);
          return;
        }

        const data = snap.data() as Omit<Horse, "id">;
        const fullHorse: Horse = { id: horseId, ...data };
        setHorse(fullHorse);
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
  }, [horseId]);

  useEffect(() => {
    if (!horseId) {
      setNotes([]);
      return;
    }

    const q = query(
      collection(db, "medicalNotes"),
      where("horseId", "==", horseId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: MedicalNote[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MedicalNote, "id">),
      }));
      setNotes(data);
    });

    return () => unsub();
  }, [horseId]);

  const uploadAttachments = async (filesToUpload: File[], proId: string) => {
    const uploads = filesToUpload.map(async (file) => {
      const filePath = `medical/${proId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return {
        url,
        name: file.name,
        type: file.type || "application/octet-stream",
      } as MedicalAttachment;
    });

    return Promise.all(uploads);
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!horse) return;

    setSavingEdit(true);
    setError("");

    try {
      await updateDoc(doc(db, "horses", horse.id), {
        name: editName,
        age: Number(editAge),
        breed: editBreed,
      });

      setHorse((prev) =>
        prev
          ? {
              ...prev,
              name: editName,
              age: Number(editAge),
              breed: editBreed,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      setError("No se pudieron guardar los cambios");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !horse) return;
    if (!note.trim()) {
      setError("La anotacion medica no puede estar vacia.");
      return;
    }

    setSavingNote(true);
    setError("");

    try {
      const attachments = files.length
        ? await uploadAttachments(files, userId)
        : [];

      await addDoc(collection(db, "medicalNotes"), {
        horseId: horse.id,
        proId: userId,
        createdAt: Timestamp.now(),
        note: note.trim(),
        attachments,
      });

      setNote("");
      setFiles([]);
      const input = document.getElementById(
        "medical-files"
      ) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      console.error("Error guardando anotacion medica:", err);
      setError("No se pudo guardar la anotacion medica.");
    } finally {
      setSavingNote(false);
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
        <Link href="/dashboard/pro" className="text-blue-400 underline text-sm">
          Volver a dashboard profesional
        </Link>
      </main>
    );
  }

  const createdDate = horse.createdAt
    ? horse.createdAt.toDate().toLocaleString()
    : null;

  return (
    <main className="p-6 space-y-6">
      <Link href="/dashboard/pro" className="text-blue-400 underline text-sm">
        Volver a dashboard profesional
      </Link>

      <section className="max-w-4xl border rounded-xl p-4 bg-black/20 space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{horse.name}</h1>
          {createdDate && (
            <p className="text-sm text-gray-300">Registrado el: {createdDate}</p>
          )}
        </div>

        {horse.photoUrl && (
          <img
            src={horse.photoUrl}
            alt={horse.name}
            className="w-full max-h-80 object-cover rounded"
          />
        )}

        <div className="space-y-1">
          <p>
            <span className="font-semibold">Edad:</span> {horse.age} anos
          </p>
          {horse.breed && (
            <p>
              <span className="font-semibold">Raza:</span> {horse.breed}
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-white/10">
          <h2 className="text-xl font-semibold mb-2">Editar datos basicos</h2>
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

            <button
              type="submit"
              disabled={savingEdit}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        </div>

        <div className="pt-4 border-t border-white/10 space-y-4">
          <h2 className="text-xl font-semibold">Anotaciones medicas</h2>

          <form onSubmit={handleAddNote} className="space-y-3 max-w-2xl">
            <textarea
              placeholder="Describe la observacion, tratamiento, recomendaciones..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border p-2 rounded w-full text-sm"
              rows={3}
              required
            />

            <input
              id="medical-files"
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.odt"
              onChange={(e) => {
                const fileList = Array.from(e.target.files || []);
                setFiles(fileList);
              }}
              className="border p-2 rounded w-full text-sm"
            />

            {files.length > 0 && (
              <p className="text-xs text-gray-400">
                Archivos seleccionados: {files.map((f) => f.name).join(", ")}
              </p>
            )}

            <button
              type="submit"
              disabled={savingNote}
              className="bg-green-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
            >
              {savingNote ? "Guardando..." : "Guardar anotacion"}
            </button>
          </form>

          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-sm text-gray-300">
                Aun no hay anotaciones medicas para este caballo.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notes.map((n) => (
                  <li key={n.id} className="border rounded-lg p-3 bg-black/30">
                    <p className="font-semibold">
                      {n.createdAt.toDate().toLocaleString()}
                    </p>
                    <p className="text-gray-200">{n.note}</p>
                    {n.attachments && n.attachments.length > 0 && (
                      <div className="pt-2 space-y-1">
                        {n.attachments.map((a, idx) => (
                          <a
                            key={`${n.id}-${idx}`}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-blue-400 underline text-xs"
                          >
                            {a.name}
                          </a>
                        ))}
                      </div>
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

"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { isDev } from "@/lib/env";

type Center = {
  id: string;
  name: string;
};

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

type UserInfo = {
  name?: string;
  email?: string;
  role?: string;
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

export default function ProDashboardPage() {
  const router = useRouter();
  const devMode = isDev();

  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [centers, setCenters] = useState<Center[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);

  const [horses, setHorses] = useState<Horse[]>([]);
  const [activeHorseId, setActiveHorseId] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [notes, setNotes] = useState<MedicalNote[]>([]);
  const [proNotes, setProNotes] = useState<MedicalNote[]>([]);
  const [historyHorses, setHistoryHorses] = useState<Horse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cachedHistoryHorses, setCachedHistoryHorses] = useState<Horse[]>([]);
  const [cachedLastNotes, setCachedLastNotes] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserInfo;
          setUserInfo(data);

          // En PROD, si NO es pro lo redirigimos por rol.
          // En DEV permitimos entrar para pruebas manuales.
          if (!devMode && data.role && data.role !== "pro") {
            if (data.role === "rider") {
              router.push("/dashboard/rider");
            } else if (data.role === "centerOwner") {
              router.push("/dashboard/center");
            }
            return;
          }
        }

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

  useEffect(() => {
    if (!activeCenterId) {
      setHorses([]);
      setActiveHorseId(null);
      return;
    }

    const q = query(
      collection(db, "horses"),
      where("centerId", "==", activeCenterId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: Horse[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Horse, "id">),
      }));
      setHorses(data);
      if (!activeHorseId && data.length > 0) {
        setActiveHorseId(data[0].id);
      }
    });

    return () => unsub();
  }, [activeCenterId, activeHorseId]);

  useEffect(() => {
    if (!activeHorseId) {
      setNotes([]);
      return;
    }

    const q = query(
      collection(db, "medicalNotes"),
      where("horseId", "==", activeHorseId),
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
  }, [activeHorseId]);

  useEffect(() => {
    if (!userId) {
      setProNotes([]);
      return;
    }

    const q = query(
      collection(db, "medicalNotes"),
      where("proId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: MedicalNote[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MedicalNote, "id">),
      }));
      setProNotes(data);
    });

    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    try {
      const raw = localStorage.getItem(`pro-history-${userId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        horses?: Horse[];
        lastNotes?: Record<string, number>;
      };
      if (parsed.horses) {
        setCachedHistoryHorses(parsed.horses);
      }
      if (parsed.lastNotes) {
        setCachedLastNotes(parsed.lastNotes);
      }
    } catch (err) {
      console.error("Error leyendo cache del historial:", err);
    }
  }, [userId]);

  useEffect(() => {
    const loadHistoryHorses = async () => {
      if (proNotes.length === 0) {
        setHistoryHorses([]);
        return;
      }

      setLoadingHistory(true);
      try {
        const uniqueIds: string[] = [];
        for (const n of proNotes) {
          if (!uniqueIds.includes(n.horseId)) {
            uniqueIds.push(n.horseId);
          }
        }

        const chunks: string[][] = [];
        for (let i = 0; i < uniqueIds.length; i += 10) {
          chunks.push(uniqueIds.slice(i, i + 10));
        }

        const results: Horse[] = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, "horses"),
            where(documentId(), "in", chunk)
          );
          const snap = await getDocs(q);
          snap.docs.forEach((d) => {
            results.push({ id: d.id, ...(d.data() as Omit<Horse, "id">) });
          });
        }

        const byId = new Map(results.map((h) => [h.id, h]));
        const ordered = uniqueIds
          .map((id) => byId.get(id))
          .filter(Boolean) as Horse[];
        setHistoryHorses(ordered);
      } catch (err) {
        console.error("Error cargando historial de caballos:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistoryHorses();
  }, [proNotes]);

  useEffect(() => {
    if (!userId) return;
    if (historyHorses.length === 0 && proNotes.length === 0) return;

    try {
      const lastNotes: Record<string, number> = {};
      for (const n of proNotes) {
        if (!lastNotes[n.horseId]) {
          lastNotes[n.horseId] = n.createdAt.toDate().getTime();
        }
      }

      const payload = {
        horses: historyHorses,
        lastNotes,
      };
      localStorage.setItem(`pro-history-${userId}`, JSON.stringify(payload));
    } catch (err) {
      console.error("Error guardando cache del historial:", err);
    }
  }, [userId, historyHorses, proNotes]);

  const filteredCenters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return centers;
    return centers.filter((c) => c.name.toLowerCase().includes(term));
  }, [centers, searchTerm]);

  const lastNoteByHorseId = useMemo(() => {
    const map = new Map<string, Timestamp>();
    if (proNotes.length > 0) {
      for (const n of proNotes) {
        if (!map.has(n.horseId)) {
          map.set(n.horseId, n.createdAt);
        }
      }
    } else {
      Object.entries(cachedLastNotes).forEach(([horseId, ms]) => {
        map.set(horseId, Timestamp.fromDate(new Date(ms)));
      });
    }
    return map;
  }, [proNotes, cachedLastNotes]);

  const activeHorse = useMemo(
    () => horses.find((h) => h.id === activeHorseId) || null,
    [horses, activeHorseId]
  );

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

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !activeHorseId) return;
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
        horseId: activeHorseId,
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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loadingInitial) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Comprobando sesion...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>No hay sesion activa.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-8">
      <section className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/70">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard profesional</h1>
            <p className="text-sm text-zinc-300">
              Sesion iniciada como{" "}
              <span className="font-mono">{userInfo?.email}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-700 px-3 py-2 rounded text-sm"
          >
            Cerrar sesion
          </button>
        </div>
      </section>

      <section className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/70 space-y-3">
        <h2 className="text-xl font-semibold">
          Historial de caballos atendidos
        </h2>
        {loadingHistory ? (
          <p className="text-sm text-zinc-400">Cargando historial...</p>
        ) : historyHorses.length === 0 && cachedHistoryHorses.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Aun no has registrado anotaciones medicas.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(historyHorses.length > 0 ? historyHorses : cachedHistoryHorses).map(
              (horse) => {
                const lastNote = lastNoteByHorseId.get(horse.id);
                return (
                  <button
                    key={horse.id}
                    type="button"
                    onClick={() => {
                      setActiveCenterId(horse.centerId);
                      setActiveHorseId(horse.id);
                    }}
                    className="text-left border rounded-xl p-3 bg-black/60 hover:border-blue-500 transition"
                  >
                    <p className="font-semibold">{horse.name}</p>
                    <p className="text-xs text-zinc-400">
                      Ultima anotacion: {" "}
                      {lastNote ? lastNote.toDate().toLocaleString() : "-"}
                    </p>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      <section className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/70 space-y-4">
        <h2 className="text-xl font-semibold">Buscar centro hipico</h2>
        <input
          type="text"
          placeholder="Busca un centro por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded border border-zinc-700 bg-black/70 p-2 text-sm"
        />

        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
          {filteredCenters.map((center) => (
            <button
              key={center.id}
              type="button"
              onClick={() => {
                setActiveCenterId(center.id);
                setActiveHorseId(null);
              }}
              className={`text-left border rounded-lg px-3 py-2 text-sm bg-black/60 hover:border-blue-500 transition ${
                activeCenterId === center.id
                  ? "border-blue-500"
                  : "border-zinc-700"
              }`}
            >
              {center.name}
            </button>
          ))}
          {filteredCenters.length === 0 && (
            <p className="text-sm text-zinc-400">
              No se han encontrado centros con ese nombre.
            </p>
          )}
        </div>
      </section>

      {activeCenterId && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">
              Caballos en{" "}
              <span className="text-blue-400">
                {centers.find((c) => c.id === activeCenterId)?.name ??
                  "Centro seleccionado"}
              </span>
            </h2>
            <Link
              href="/dashboard/horses"
              className="text-blue-400 underline text-sm"
            >
              Ver mis caballos
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {horses.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Este centro aun no tiene caballos registrados.
              </p>
            ) : (
              horses.map((horse) => (
                <div
                  key={horse.id}
                  className={`text-left border rounded-2xl p-4 bg-zinc-950/70 space-y-2 ${
                    activeHorseId === horse.id
                      ? "border-blue-500"
                      : "border-zinc-800"
                  }`}
                >
                  {horse.photoUrl && (
                    <img
                      src={horse.photoUrl}
                      alt={horse.name}
                      className="w-full h-40 object-cover rounded-xl"
                    />
                  )}
                  <h3 className="font-bold text-lg">{horse.name}</h3>
                  <p className="text-sm text-zinc-300">Edad: {horse.age}</p>
                  {horse.breed && (
                    <p className="text-sm text-zinc-300">
                      Raza: {horse.breed}
                    </p>
                  )}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveHorseId(horse.id)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                    >
                      Seleccionar
                    </button>
                    <Link
                      href={`/dashboard/pro/horses/${horse.id}`}
                      className="text-xs text-blue-400 underline"
                    >
                      Abrir ficha del caballo
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {activeHorse && (
        <section className="border border-zinc-800 rounded-2xl p-4 bg-zinc-950/70 space-y-4">
          <h2 className="text-xl font-semibold">
            Anotacion medica para{" "}
            <span className="text-blue-400">{activeHorse.name}</span>
          </h2>

          <form onSubmit={handleAddNote} className="space-y-3 max-w-2xl">
            <textarea
              placeholder="Describe la observacion, tratamiento, recomendaciones..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded border border-zinc-700 bg-black/70 p-2 text-sm"
              rows={4}
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
              className="w-full rounded border border-zinc-700 bg-black/70 p-2 text-sm"
            />

            {files.length > 0 && (
              <p className="text-xs text-zinc-400">
                Archivos seleccionados: {files.map((f) => f.name).join(", ")}
              </p>
            )}

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded p-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={savingNote}
              className="rounded bg-green-600 px-4 py-2 text-sm font-semibold disabled:opacity-60"
            >
              {savingNote ? "Guardando..." : "Guardar anotacion medica"}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <h3 className="text-lg font-semibold">Historial medico</h3>
            {notes.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Aun no hay anotaciones medicas para este caballo.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="border rounded-lg p-3 bg-black/30"
                  >
                    <p className="font-semibold">
                      {n.createdAt.toDate().toLocaleString()}
                    </p>
                    <p className="text-zinc-200">{n.note}</p>
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
        </section>
      )}
    </main>
  );
}

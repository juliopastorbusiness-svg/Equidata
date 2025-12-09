"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import Link from "next/link";

type Horse = {
  id: string;
  name: string;
  age: number;
  breed?: string;
  photoUrl?: string;
};

type Center = {
  id: string;
  name: string;
};

export default function RiderDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [center, setCenter] = useState<Center | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Escuchamos la sesión de Firebase Auth
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // 1. Cargamos el documento del usuario en Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setError("No se han encontrado tus datos de usuario.");
          setLoading(false);
          return;
        }

        const userData = userSnap.data() as any;

        // Comprobamos el rol
        if (userData.role !== "rider") {
          // Si no es jinete, lo mandamos al /dashboard genérico
          router.push("/dashboard");
          return;
        }

        setUserName(userData.displayName || null);
        setUserEmail(userData.email || user.email);

        // 2. Si tiene centerId, cargamos el centro
        if (userData.centerId) {
          const centerRef = doc(db, "centers", userData.centerId);
          const centerSnap = await getDoc(centerRef);
          if (centerSnap.exists()) {
            setCenter({
              id: centerSnap.id,
              name: (centerSnap.data() as any).name,
            });
          }
        }

        // 3. Escuchamos los caballos del jinete en la colección "horses"
        const q = query(
          collection(db, "horses"),
          where("ownerId", "==", user.uid)
        );

        const unsubHorses = onSnapshot(q, (snap) => {
          const list: Horse[] = snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              name: data.name,
              age: data.age,
              breed: data.breed,
              photoUrl: data.photoUrl,
            };
          });
          setHorses(list);
        });

        setLoading(false);

        // Limpieza
        return () => {
          unsubHorses();
        };
      } catch (err) {
        console.error(err);
        setError("Error cargando el dashboard. Inténtalo de nuevo.");
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-300">Cargando tu panel de jinete...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-blue-600 px-4 py-2 rounded"
          >
            Volver a iniciar sesión
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      {/* Cabecera */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de jinete</h1>
          <p className="text-gray-300 text-sm mt-1">
            Has iniciado sesión como{" "}
            <span className="font-semibold">
              {userName || userEmail || "Jinete"}
            </span>
            .
          </p>
          {center ? (
            <p className="text-gray-300 text-sm">
              Centro hípico:{" "}
              <span className="font-semibold">{center.name}</span>
            </p>
          ) : (
            <p className="text-yellow-400 text-sm">
              Aún no tienes centro hípico asignado.
            </p>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="self-start md:self-auto bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
        >
          Cerrar sesión
        </button>
      </header>

      {/* Resumen rápido */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-700 rounded-xl p-4 bg-black/40">
          <p className="text-xs text-gray-400 uppercase">Tus caballos</p>
          <p className="text-3xl font-bold mt-1">{horses.length}</p>
          <p className="text-xs text-gray-400 mt-1">
            Caballos registrados a tu nombre.
          </p>
        </div>

        <div className="border border-gray-700 rounded-xl p-4 bg-black/40">
          <p className="text-xs text-gray-400 uppercase">Centro</p>
          <p className="text-lg font-semibold mt-1">
            {center ? center.name : "Sin centro"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Más adelante podrás cambiar de centro desde aquí.
          </p>
        </div>

        <div className="border border-gray-700 rounded-xl p-4 bg-black/40 flex flex-col justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase">
              Gestión de caballos
            </p>
            <p className="text-sm text-gray-300 mt-1">
              Añade, edita y gestiona la ficha de cada caballo.
            </p>
          </div>
          <Link
            href="/dashboard/horses"
            className="mt-3 inline-block bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm text-center"
          >
            Ir a gestionar caballos
          </Link>
        </div>
      </section>

      {/* Listado rápido de caballos */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Tus caballos</h2>

        {horses.length === 0 ? (
          <p className="text-gray-400 text-sm">
            Todavía no tienes caballos registrados. Empieza desde{" "}
            <Link href="/dashboard/horses" className="text-blue-400 underline">
              Gestionar caballos
            </Link>
            .
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {horses.map((horse) => (
              <div
                key={horse.id}
                className="border border-gray-700 rounded-xl p-3 bg-black/40 space-y-2"
              >
                {horse.photoUrl && (
                  <img
                    src={horse.photoUrl}
                    alt={horse.name}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">{horse.name}</h3>
                  <p className="text-xs text-gray-300">
                    Edad: <span className="font-medium">{horse.age}</span>
                  </p>
                  {horse.breed && (
                    <p className="text-xs text-gray-300">
                      Raza: <span className="font-medium">{horse.breed}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

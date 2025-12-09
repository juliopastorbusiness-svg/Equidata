"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
      } else {
        setUserEmail(user.email || "");
      }
    });

    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">Dashboard EquiData</h1>
      <p>Has iniciado sesión como: {userEmail}</p>

      <div className="flex gap-3 mt-4">
        <Link
          href="/dashboard/horses"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Gestionar caballos
        </Link>

        <button
          onClick={handleLogout}
          className="bg-gray-800 text-white px-4 py-2 rounded"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}


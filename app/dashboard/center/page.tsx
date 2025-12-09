"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function CenterDashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-4">
      <h1 className="text-3xl font-bold">Dashboard centro hípico</h1>
      <p>
        Aquí verás tus jinetes, sus caballos y podrás gestionar tu centro
        (lo construiremos en los siguientes pasos).
      </p>

      <button
        onClick={handleLogout}
        className="mt-4 bg-gray-600 px-3 py-2 rounded"
      >
        Cerrar sesión
      </button>
    </main>
  );
}

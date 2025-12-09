"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function ProDashboardPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-4">
      <h1 className="text-3xl font-bold">Dashboard profesional</h1>
      <p>
        Aquí mostraremos los caballos/clientes que atiendes y tus herramientas
        como profesional.
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

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Comprobando sesión...");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMessage("No has iniciado sesión. Redirigiendo a login...");
        router.push("/login");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.exists() ? (snap.data().role as string) : null;

        if (role === "rider") {
          router.push("/dashboard/rider");
        } else if (role === "centerOwner") {
          router.push("/dashboard/center");
        } else if (role === "pro") {
          router.push("/dashboard/pro");
        } else {
          setMessage("No se encontró tu tipo de cuenta. Contacta con soporte.");
        }
      } catch (err) {
        console.error(err);
        setMessage("Error al obtener tus datos. Intenta volver a entrar.");
      }
    });

    return () => unsub();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <p className="text-sm text-gray-300">{message}</p>
    </main>
  );
}

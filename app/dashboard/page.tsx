"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

type UserRole = "rider" | "centerOwner" | "pro";

export default function DashboardRouter() {
  const router = useRouter();
  const [message, setMessage] = useState("Comprobando sesión...");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // 1) Si NO hay usuario, volvemos al login
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        // 2) Leemos su documento en Firestore
        const snap = await getDoc(doc(db, "users", user.uid));

        if (!snap.exists()) {
          setMessage(
            "No se encontró tu cuenta en la base de datos. Vuelve a registrarte o contacta con soporte."
          );
          return;
        }

        const data = snap.data() as { role?: UserRole };

        // 3) Si no hay rol, mostramos mensaje claro
        if (!data.role) {
          setMessage(
            "No se encontró tu tipo de cuenta. Vuelve a registrarte o contacta con soporte."
          );
          return;
        }

        // 4) Redirigimos según rol
        if (data.role === "rider") {
          router.push("/dashboard/rider");
        } else if (data.role === "centerOwner") {
          router.push("/dashboard/center");
        } else if (data.role === "pro") {
          router.push("/dashboard/pro");
        } else {
          setMessage(
            "Tu tipo de cuenta no es válido. Contacta con soporte."
          );
        }
      } catch (err) {
        console.error(err);
        setMessage(
          "Error al comprobar tu cuenta. Inténtalo de nuevo más tarde."
        );
      }
    });

    return () => unsub();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p>{message}</p>
    </main>
  );
}

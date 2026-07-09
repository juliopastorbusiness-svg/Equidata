"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { auth, db } from "@/lib/firebase";

type ProfessionalModulePlaceholderProps = {
  centerId: string;
  moduleName: string;
  permissionModule: string;
  permissionAction: string | string[];
};

type CenterSummary = {
  name?: string;
};

export function ProfessionalModulePlaceholder({
  centerId,
  moduleName,
  permissionModule,
  permissionAction,
}: ProfessionalModulePlaceholderProps) {
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [centerName, setCenterName] = useState("");
  const [loadingCenter, setLoadingCenter] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setProfessionalId(user?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCenter = async () => {
      setLoadingCenter(true);
      try {
        const centerSnap = await getDoc(doc(db, "centers", centerId));
        if (!cancelled && centerSnap.exists()) {
          const data = centerSnap.data() as CenterSummary;
          setCenterName(data.name ?? "");
        }
      } catch (error) {
        console.error("Error cargando centro profesional:", error);
      } finally {
        if (!cancelled) {
          setLoadingCenter(false);
        }
      }
    };

    void loadCenter();

    return () => {
      cancelled = true;
    };
  }, [centerId]);

  return (
    <PermissionGuard
      centerId={centerId}
      professionalId={professionalId}
      module={permissionModule}
      action={permissionAction}
    >
      <main className="min-h-screen bg-brand-background text-brand-text">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            <p className="text-sm font-medium text-brand-secondary">
              {loadingCenter
                ? "Cargando centro..."
                : centerName || "Centro no disponible"}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-text">{moduleName}</h1>
            <p className="mt-3 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
              Este módulo estará disponible próximamente.
            </p>
            <Link
              href={`/dashboard/pro/centers/${centerId}`}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
            >
              Volver al centro
            </Link>
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}

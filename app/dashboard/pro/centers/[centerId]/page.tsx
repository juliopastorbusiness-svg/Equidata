"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import {
  ActiveCenter,
  ActiveCenterProvider,
  useActiveCenter,
} from "@/contexts/ActiveCenterContext";
import { useProfessionalPermissions } from "@/hooks/useProfessionalPermissions";
import { auth, db } from "@/lib/firebase";

type Center = {
  id: string;
  name: string;
  city?: string;
  province?: string;
  type?: string;
  centerType?: string;
};

type ConnectionStatus = "accepted" | "pending" | "rejected" | "cancelled" | "none";

const statusLabel: Record<ConnectionStatus, string> = {
  accepted: "Conexion activa",
  pending: "Solicitud pendiente",
  rejected: "Solicitud rechazada",
  cancelled: "Acceso cancelado",
  none: "Sin conexion",
};

const moduleConfig = [
  {
    key: "horses",
    icon: "Ca",
    title: "Caballos",
    description: "Consulta listados y fichas de caballos autorizados.",
    route: "horses",
    permissions: [
      ["horses", "viewList"],
      ["horses", "viewProfile"],
      ["horses", "list"],
      ["horses", "detail"],
    ],
  },
  {
    key: "agenda",
    icon: "Ag",
    title: "Agenda",
    description: "Revisa eventos y actividad programada del centro.",
    route: "agenda",
    permissions: [["agenda", "view"]],
  },
  {
    key: "veterinary",
    icon: "Ve",
    title: "Veterinaria",
    description: "Accede al historial y seguimiento veterinario permitido.",
    route: "veterinary",
    permissions: [["veterinary", "viewHistory"]],
  },
  {
    key: "classes",
    icon: "Cl",
    title: "Clases",
    description: "Consulta clases, alumnos y asistencia autorizada.",
    route: "classes",
    permissions: [["classes", "viewClasses"]],
  },
  {
    key: "clients",
    icon: "Ct",
    title: "Clientes",
    description: "Consulta propietarios y alumnos permitidos.",
    route: "clients",
    permissions: [
      ["clients", "viewOwners"],
      ["clients", "viewStudents"],
    ],
  },
] as const;

export default function ProfessionalCenterPage() {
  const params = useParams<{ centerId: string }>();
  const centerId = params.centerId;

  const [center, setCenter] = useState<Center | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.uid);
      setLoading(true);
      setError("");

      try {
        const centerSnap = await getDoc(doc(db, "centers", centerId));
        if (!centerSnap.exists()) {
          setCenter(null);
          setConnectionStatus("none");
          setError("No se encontro el centro solicitado.");
          return;
        }

        const centerData = centerSnap.data() as Omit<Center, "id">;
        const nextCenter = {
          id: centerSnap.id,
          ...centerData,
        };
        setCenter(nextCenter);

        const requestsSnap = await getDocs(
          query(
            collection(db, "professional_requests"),
            where("professionalId", "==", user.uid),
            where("centerId", "==", centerId)
          )
        );

        const acceptedRequest = requestsSnap.docs.find(
          (requestDoc) => requestDoc.data().status === "accepted"
        );
        if (acceptedRequest) {
          setConnectionStatus("accepted");
        } else {
          const latestStatus = requestsSnap.docs[0]?.data().status;
          setConnectionStatus(
            latestStatus === "pending" ||
              latestStatus === "rejected" ||
              latestStatus === "cancelled"
              ? latestStatus
              : "none"
          );
        }
      } catch (loadError) {
        console.error("Error cargando centro profesional:", loadError);
        setError("No se pudo cargar el centro.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [centerId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p className="mx-auto max-w-5xl rounded-2xl border border-brand-border bg-white/80 p-5 text-sm text-brand-secondary shadow-sm">
          Cargando centro...
        </p>
      </main>
    );
  }

  const activeCenterOptions: ActiveCenter[] = center
    ? [{ id: center.id, name: center.name }]
    : [];

  return (
    <ActiveCenterProvider centers={activeCenterOptions}>
      <ProfessionalCenterContent
        center={center}
        centerId={centerId}
        connectionStatus={connectionStatus}
        error={error}
        userId={userId}
      />
    </ActiveCenterProvider>
  );
}

type ProfessionalCenterContentProps = {
  center: Center | null;
  centerId: string;
  connectionStatus: ConnectionStatus;
  error: string;
  userId: string | null;
};

function ProfessionalCenterContent({
  center,
  centerId,
  connectionStatus,
  error,
  userId,
}: ProfessionalCenterContentProps) {
  const router = useRouter();
  const { setActiveCenter } = useActiveCenter();
  const { loading: permissionsLoading, hasPermission } = useProfessionalPermissions(
    centerId,
    userId
  );

  useEffect(() => {
    if (center) {
      setActiveCenter({ id: center.id, name: center.name });
    }
  }, [center, setActiveCenter]);

  const moduleCards = useMemo(
    () =>
      moduleConfig.map((module) => ({
        ...module,
        hasAccess: module.permissions.some(([moduleKey, action]) =>
          hasPermission(moduleKey, action)
        ),
      })),
    [hasPermission]
  );

  const hasAvailableModules = moduleCards.some((module) => module.hasAccess);

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-secondary">Centro activo</p>
              <h1 className="mt-1 text-3xl font-bold text-brand-text">
                {center?.name ?? "Centro no disponible"}
              </h1>
              <p className="mt-2 text-sm text-brand-secondary">
                {[center?.city, center?.province].filter(Boolean).join(" / ") ||
                  "Ubicacion sin completar"}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span
                className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold ${
                  connectionStatus === "accepted"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-amber-300 bg-amber-50 text-amber-700"
                }`}
              >
                {statusLabel[connectionStatus]}
              </span>
              <button
                type="button"
                onClick={() => router.push("/dashboard/pro")}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
              >
                Cambiar centro
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-brand-text">Modulos disponibles</h2>
            <p className="mt-1 text-sm text-brand-secondary">
              Accesos habilitados por el propietario del centro.
            </p>
          </div>

          {permissionsLoading ? (
            <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
              Cargando permisos...
            </p>
          ) : (
            <>
              {!hasAvailableModules ? (
                <p className="mb-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                  No tienes permisos activos en este centro.
                </p>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {moduleCards.map((module) => (
                  <article
                    key={module.key}
                    className="flex min-h-56 flex-col rounded-2xl border border-brand-border bg-brand-background/50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-white text-sm font-bold text-brand-primary">
                          {module.icon}
                        </span>
                        <h3 className="text-lg font-semibold text-brand-text">
                          {module.title}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          module.hasAccess
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {module.hasAccess ? "Disponible" : "Sin acceso"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-brand-secondary">
                      {module.description}
                    </p>

                    <div className="mt-auto pt-5">
                      <button
                        type="button"
                        disabled={!module.hasAccess}
                        onClick={() =>
                          router.push(`/dashboard/pro/centers/${centerId}/${module.route}`)
                        }
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:border disabled:border-brand-border disabled:bg-white/70 disabled:text-brand-secondary disabled:opacity-70"
                      >
                        Abrir
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        <Link
          href="/dashboard/pro"
          className="inline-flex h-11 w-fit items-center justify-center rounded-xl border border-brand-border bg-white/80 px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
        >
          Volver al dashboard profesional
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useProfessionalPermissions } from "@/hooks/useProfessionalPermissions";
import { auth } from "@/lib/firebase";
import { getHorseListItemsByCenter } from "@/lib/horses";
import { HorseListItem, HorseSex, HorseStatus } from "@/lib/horses/types";

const statusLabel: Record<HorseStatus, string> = {
  ACTIVE: "Activo",
  RESTING: "Descanso",
  RECOVERING: "Recuperacion",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
};

const sexLabel: Record<HorseSex, string> = {
  STALLION: "Semental",
  MARE: "Yegua",
  GELDING: "Castrado",
  UNKNOWN: "Sin especificar",
};

export default function ProfessionalCenterHorsesPage() {
  const params = useParams<{ centerId: string }>();
  const centerId = params.centerId;
  const router = useRouter();

  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sexFilter, setSexFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setProfessionalId(user?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHorses = async () => {
      setLoading(true);
      setError("");

      try {
        const items = await getHorseListItemsByCenter(centerId);
        if (!cancelled) {
          setHorses(items);
        }
      } catch (loadError) {
        console.error("Error cargando caballos del centro:", loadError);
        if (!cancelled) {
          setError("No se pudieron cargar los caballos del centro.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadHorses();

    return () => {
      cancelled = true;
    };
  }, [centerId]);

  const { hasPermission: canOpenHorseProfile } = useProfessionalPermissions(
    centerId,
    professionalId
  );

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(horses.map((item) => item.horse.status))).filter(Boolean),
    [horses]
  );

  const sexOptions = useMemo(
    () => Array.from(new Set(horses.map((item) => item.horse.sex))).filter(Boolean),
    [horses]
  );

  const filteredHorses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return horses.filter((item) => {
      const horse = item.horse;
      const matchesSearch = normalizedSearch
        ? horse.name.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesStatus =
        statusFilter === "all" ? true : horse.status === statusFilter;
      const matchesSex = sexFilter === "all" ? true : horse.sex === sexFilter;

      return matchesSearch && matchesStatus && matchesSex;
    });
  }, [horses, searchTerm, sexFilter, statusFilter]);

  const handleOpenHorse = (horseId: string) => {
    router.push(`/dashboard/pro/centers/${centerId}/horses/${horseId}`);
  };

  return (
    <PermissionGuard
      centerId={centerId}
      professionalId={professionalId}
      module="horses"
      action="viewList"
    >
      <main className="min-h-screen bg-brand-background text-brand-text">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-medium text-brand-secondary">
                  Centro profesional
                </p>
                <h1 className="mt-1 text-3xl font-bold text-brand-text">Caballos</h1>
                <p className="mt-2 text-sm text-brand-secondary">
                  Consulta los caballos del centro a los que tienes acceso.
                </p>
              </div>
              <Link
                href={`/dashboard/pro/centers/${centerId}`}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
              >
                Volver al centro
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_14rem_14rem]">
              <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
                Buscar caballo
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nombre del caballo"
                  className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
                Estado
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                >
                  <option value="all">Todos</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
                Sexo
                <select
                  value={sexFilter}
                  onChange={(event) => setSexFilter(event.target.value)}
                  className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                >
                  <option value="all">Todos</option>
                  {sexOptions.map((sex) => (
                    <option key={sex} value={sex}>
                      {sexLabel[sex]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-brand-text">Listado</h2>
              <p className="text-sm text-brand-secondary">
                {filteredHorses.length} de {horses.length} caballos
              </p>
            </div>

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            ) : loading ? (
              <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                Cargando caballos...
              </p>
            ) : filteredHorses.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredHorses.map((item) => {
                  const horse = item.horse;
                  const canOpen = canOpenHorseProfile("horses", "viewProfile");

                  return (
                    <button
                      key={horse.id}
                      type="button"
                      onClick={() => handleOpenHorse(horse.id)}
                      className="overflow-hidden rounded-2xl border border-brand-border bg-brand-background/50 text-left transition hover:border-brand-primary hover:bg-white"
                    >
                      {horse.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={horse.photoUrl}
                          alt={horse.name}
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-full items-center justify-center bg-white/70 text-3xl font-bold text-brand-primary">
                          {horse.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-semibold text-brand-text">
                            {horse.name}
                          </h3>
                          <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {statusLabel[horse.status]}
                          </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <HorseMeta label="Raza" value={horse.breed} />
                          <HorseMeta label="Sexo" value={sexLabel[horse.sex]} />
                          <HorseMeta
                            label="Edad"
                            value={
                              typeof horse.age === "number" ? `${horse.age} anos` : undefined
                            }
                          />
                          <HorseMeta label="Propietario" value={item.ownerLabel} />
                        </dl>

                        {!canOpen ? (
                          <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
                            No tienes permiso para abrir la ficha.
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                No hay caballos que coincidan con la busqueda.
              </p>
            )}
          </section>
        </div>
      </main>
    </PermissionGuard>
  );
}

function HorseMeta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-brand-secondary">{label}</dt>
      <dd className="mt-1 font-semibold text-brand-text">{value || "-"}</dd>
    </div>
  );
}

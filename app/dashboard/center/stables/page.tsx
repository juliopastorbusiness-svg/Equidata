"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CenterHeader } from "@/components/center/CenterHeader";
import {
  HorseFilters,
  HorseFiltersValue,
} from "@/components/stables/HorseFilters";
import { HorseList } from "@/components/stables/HorseList";
import {
  getHorseListItemsByCenter,
  HorseListItem,
} from "@/lib/horses";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

const initialFilters: HorseFiltersValue = {
  search: "",
  box: "ALL",
  owner: "ALL",
  status: "ALL",
  breed: "ALL",
  sort: "NAME",
};

const byLabel = (values: string[]) =>
  values
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((value) => ({ value, label: value }));

const kpiCardClassName =
  "rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm";

export default function CenterStablesPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [items, setItems] = useState<HorseListItem[]>([]);
  const [filters, setFilters] = useState<HorseFiltersValue>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshHorses = async (centerId: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getHorseListItemsByCenter(centerId);
      setItems(data);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el listado de caballos del centro.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId) {
      setItems([]);
      setLoading(false);
      return;
    }

    void refreshHorses(activeCenterId);
  }, [activeCenterId]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    const nextItems = items.filter((item) => {
      if (
        normalizedSearch &&
        !item.horse.name.toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }
      if (filters.box !== "ALL" && (item.assignedBox || "Sin asignar") !== filters.box) {
        return false;
      }
      if (filters.owner !== "ALL" && item.ownerLabel !== filters.owner) {
        return false;
      }
      if (filters.status !== "ALL" && item.horse.status !== filters.status) {
        return false;
      }
      if (filters.breed !== "ALL" && (item.horse.breed || "Sin raza") !== filters.breed) {
        return false;
      }

      return true;
    });

    return nextItems.sort((left, right) => {
      if (filters.sort === "AGE") {
        return (left.horse.age ?? Number.MAX_SAFE_INTEGER) - (right.horse.age ?? Number.MAX_SAFE_INTEGER);
      }
      if (filters.sort === "ARRIVAL") {
        return (right.arrivalAt?.toMillis() ?? 0) - (left.arrivalAt?.toMillis() ?? 0);
      }
      return left.horse.name.localeCompare(right.horse.name, "es");
    });
  }, [filters, items]);

  const boxOptions = useMemo(
    () =>
      [{ value: "ALL", label: "Todos los boxes" }].concat(
        byLabel(
          Array.from(
            new Set(items.map((item) => item.assignedBox || "Sin asignar"))
          )
        )
      ),
    [items]
  );

  const ownerOptions = useMemo(
    () =>
      [{ value: "ALL", label: "Todos los propietarios" }].concat(
        byLabel(Array.from(new Set(items.map((item) => item.ownerLabel))))
      ),
    [items]
  );

  const statusOptions = useMemo(
    () =>
      [{ value: "ALL", label: "Todos los estados" }].concat(
        byLabel(Array.from(new Set(items.map((item) => item.horse.status))))
      ),
    [items]
  );

  const breedOptions = useMemo(
    () =>
      [{ value: "ALL", label: "Todas las razas" }].concat(
        byLabel(Array.from(new Set(items.map((item) => item.horse.breed || "Sin raza"))))
      ),
    [items]
  );

  const totalAlerts = useMemo(
    () => items.reduce((sum, item) => sum + item.activeAlerts.length, 0),
    [items]
  );

  const occupiedBoxes = useMemo(
    () => items.filter((item) => Boolean(item.assignedBox)).length,
    [items]
  );

  const ownersCount = useMemo(
    () => new Set(items.map((item) => item.ownerLabel)).size,
    [items]
  );

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando permisos del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso al modulo de cuadras.</p>
          <Link
            href="/dashboard/center"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Volver a Centro
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Cuadras"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
        primaryActionLabel="Anadir caballo"
        primaryActionHref="/dashboard/center/stables/new"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {memberships.length > 1 && (
          <section className="max-w-xl rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
            <label
              htmlFor="center-selector"
              className="mb-2 block text-sm font-medium text-brand-secondary"
            >
              Cambiar centro activo
            </label>
            <select
              id="center-selector"
              value={activeCenterId ?? ""}
              onChange={(event) => setActiveCenterId(event.target.value)}
              className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm text-brand-text"
            >
              {memberships.map((membership) => (
                <option key={membership.centerId} value={membership.centerId}>
                  {membership.centerName} ({membership.role})
                </option>
              ))}
            </select>
          </section>
        )}

        {!activeCenterId ? (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-5 text-sm text-brand-secondary">
            No tienes centro activo para gestionar caballos.
          </section>
        ) : loading ? (
          <section className="rounded-2xl border border-brand-border bg-white/70 p-8 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-2xl bg-brand-background/70"
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-brand-secondary">
              Cargando caballos y alertas del centro...
            </p>
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-brand-border bg-white/75 px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-secondary">
              Cuadras
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-brand-text">
              Aun no hay caballos registrados
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-brand-secondary">
              Empieza con el primer caballo del centro para llevar control de box,
              propietario, estado general y alertas de salud desde un mismo sitio.
            </p>
            <Link
              href="/dashboard/center/stables/new"
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
            >
              Anadir primer caballo
            </Link>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className={kpiCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Caballos alojados
                </p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{items.length}</p>
              </article>
              <article className={kpiCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Boxes asignados
                </p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">
                  {occupiedBoxes}
                </p>
              </article>
              <article className={kpiCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Propietarios activos
                </p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">
                  {ownersCount}
                </p>
              </article>
              <article className={kpiCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Alertas abiertas
                </p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">
                  {totalAlerts}
                </p>
              </article>
            </section>

            <HorseFilters
              value={filters}
              boxOptions={boxOptions}
              ownerOptions={ownerOptions}
              statusOptions={statusOptions}
              breedOptions={breedOptions}
              resultsCount={filteredItems.length}
              onChange={setFilters}
              onReset={() => setFilters(initialFilters)}
            />

            {filteredItems.length === 0 ? (
              <section className="rounded-2xl border border-brand-border bg-white/75 p-8 text-center shadow-sm">
                <h2 className="text-xl font-semibold text-brand-text">
                  No hay resultados con esos filtros
                </h2>
                <p className="mt-2 text-sm text-brand-secondary">
                  Ajusta la busqueda o limpia los filtros para volver a ver todos
                  los caballos del centro.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(initialFilters)}
                  className="mt-5 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
                >
                  Limpiar filtros
                </button>
              </section>
            ) : (
              <HorseList
                items={filteredItems}
                getHref={(horseId) => `/dashboard/center/stables/${horseId}`}
              />
            )}
          </>
        )}
      </div>

    </main>
  );
}

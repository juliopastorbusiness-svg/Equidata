"use client";

import { FormEvent, useEffect, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { CompetitionList } from "@/components/center/competitions/CompetitionList";
import { IdMultiSelect } from "@/components/center/shared/IdMultiSelect";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getCenterPersonOptions, getHorseListItemsByCenter, CenterPersonOption, HorseListItem } from "@/lib/horses";
import {
  Competition,
  createCompetition,
  deleteCompetition,
  getCompetitions,
  updateCompetition,
} from "@/lib/services";

type FormValues = {
  name: string;
  discipline: string;
  location: string;
  startDate: string;
  endDate: string;
  horseIds: string[];
  riderIds: string[];
  status: Competition["status"];
  arenaId: string;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";

const emptyValues: FormValues = {
  name: "",
  discipline: "",
  location: "",
  startDate: "",
  endDate: "",
  horseIds: [],
  riderIds: [],
  status: "PLANNED",
  arenaId: "",
};

export default function CenterCompetitionsPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [items, setItems] = useState<Competition[]>([]);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [people, setPeople] = useState<CenterPersonOption[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [editingItem, setEditingItem] = useState<Competition | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string) => {
    const [nextItems, nextHorses, nextPeople] = await Promise.all([
      getCompetitions(centerId),
      getHorseListItemsByCenter(centerId),
      getCenterPersonOptions(centerId),
    ]);
    setItems(nextItems);
    setHorses(nextHorses);
    setPeople(nextPeople);
  };

  useEffect(() => {
    if (!activeCenterId) {
      setItems([]);
      setHorses([]);
      setPeople([]);
      setArenas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsub = listArenas(
      activeCenterId,
      (rows) => setArenas(rows),
      () => setError("No se pudieron cargar las pistas.")
    );

    loadData(activeCenterId)
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudieron cargar las competiciones.");
      })
      .finally(() => setLoading(false));

    return () => unsub();
  }, [activeCenterId]);

  useEffect(() => {
    if (!editingItem) {
      setValues(emptyValues);
      return;
    }

    setValues({
      name: editingItem.name,
      discipline: editingItem.discipline ?? "",
      location: editingItem.location ?? "",
      startDate: editingItem.startDate.toDate().toISOString().slice(0, 10),
      endDate: editingItem.endDate ? editingItem.endDate.toDate().toISOString().slice(0, 10) : "",
      horseIds: editingItem.horseIds,
      riderIds: editingItem.riderIds,
      status: editingItem.status,
      arenaId: editingItem.arenaId ?? "",
    });
  }, [editingItem]);

  const resetEditor = () => {
    setEditingItem(null);
    setValues(emptyValues);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCenterId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        discipline: values.discipline,
        location: values.location,
        startDate: new Date(`${values.startDate}T09:00:00`),
        endDate: values.endDate ? new Date(`${values.endDate}T18:00:00`) : undefined,
        horseIds: values.horseIds,
        riderIds: values.riderIds,
        status: values.status,
        arenaId: values.arenaId || undefined,
      };
      if (editingItem) {
        await updateCompetition(activeCenterId, editingItem.id, payload);
      } else {
        await createCompetition(activeCenterId, payload);
      }
      await loadData(activeCenterId);
      resetEditor();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la competicion.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Competition) => {
    if (!activeCenterId) return;
    setError(null);
    try {
      await deleteCompetition(activeCenterId, item.id);
      await loadData(activeCenterId);
      if (editingItem?.id === item.id) {
        resetEditor();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la competicion.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando competiciones...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Competiciones"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
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
            <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
              Cambiar centro activo
            </label>
            <select
              id="center-selector"
              value={activeCenterId ?? ""}
              onChange={(event) => setActiveCenterId(event.target.value)}
              className={inputClassName}
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
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
            No tienes centro asignado.
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-brand-text">Listado</h2>
                <p className="text-sm text-brand-secondary">
                  {loading ? "Cargando..." : `${items.length} competiciones registradas.`}
                </p>
              </div>
              {loading ? (
                <p className="text-sm text-brand-secondary">Cargando...</p>
              ) : (
                <CompetitionList
                  items={items}
                  riders={people}
                  horses={horses}
                  arenas={arenas}
                  onEdit={setEditingItem}
                  onDelete={handleDelete}
                />
              )}
            </article>

            <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">
                    {editingItem ? "Editar competicion" : "Nueva competicion"}
                  </h2>
                  <p className="text-sm text-brand-secondary">
                    La agenda detecta solapes de caballos y pista para este rango.
                  </p>
                </div>
                {editingItem && (
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-brand-secondary">Nombre</label>
                  <input
                    value={values.name}
                    onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                    className={inputClassName}
                    required
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Disciplina</label>
                    <input
                      value={values.discipline}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, discipline: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Ubicacion</label>
                    <input
                      value={values.location}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, location: event.target.value }))
                      }
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Inicio</label>
                    <input
                      type="date"
                      value={values.startDate}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, startDate: event.target.value }))
                      }
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Fin</label>
                    <input
                      type="date"
                      value={values.endDate}
                      onChange={(event) => setValues((prev) => ({ ...prev, endDate: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-secondary">Pista</label>
                  <select
                    value={values.arenaId}
                    onChange={(event) => setValues((prev) => ({ ...prev, arenaId: event.target.value }))}
                    className={inputClassName}
                  >
                    <option value="">Sin pista</option>
                    {arenas.map((arena) => (
                      <option key={arena.id} value={arena.id}>
                        {arena.name}
                      </option>
                    ))}
                  </select>
                </div>
                <IdMultiSelect
                  label="Caballos"
                  value={values.horseIds}
                  options={horses.map((item) => ({ id: item.horse.id, label: item.horse.name }))}
                  onChange={(horseIds) => setValues((prev) => ({ ...prev, horseIds }))}
                />
                <IdMultiSelect
                  label="Jinetes"
                  value={values.riderIds}
                  options={people.map((person) => ({ id: person.id, label: person.label }))}
                  onChange={(riderIds) => setValues((prev) => ({ ...prev, riderIds }))}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Estado</label>
                    <select
                      value={values.status}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          status: event.target.value as Competition["status"],
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="PLANNED">Planned</option>
                      <option value="OPEN">Open</option>
                      <option value="CLOSED">Closed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : editingItem ? "Guardar cambios" : "Crear competicion"}
                  </button>
                </div>
              </form>
            </article>
          </section>
        )}
      </div>
    </main>
  );
}

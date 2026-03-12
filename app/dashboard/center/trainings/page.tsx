"use client";

import { FormEvent, useEffect, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { TrainingList } from "@/components/center/trainings/TrainingList";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getCenterPersonOptions, getHorseListItemsByCenter, CenterPersonOption, HorseListItem } from "@/lib/horses";
import {
  createTraining,
  deleteTraining,
  getTrainings,
  Training,
  updateTraining,
} from "@/lib/services";

type FormValues = {
  horseId: string;
  trainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  intensity: Training["intensity"];
  objective: string;
  arenaId: string;
  status: Training["status"];
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

const emptyValues: FormValues = {
  horseId: "",
  trainerId: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  type: "",
  intensity: "MEDIUM",
  objective: "",
  arenaId: "",
  status: "PLANNED",
};

export default function CenterTrainingsPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [items, setItems] = useState<Training[]>([]);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [people, setPeople] = useState<CenterPersonOption[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [editingItem, setEditingItem] = useState<Training | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string) => {
    const [nextItems, nextHorses, nextPeople] = await Promise.all([
      getTrainings(centerId),
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
        setError("No se pudieron cargar los entrenamientos.");
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
      horseId: editingItem.horseId,
      trainerId: editingItem.trainerId,
      date: editingItem.date.toDate().toISOString().slice(0, 10),
      startTime: editingItem.startTime,
      endTime: editingItem.endTime,
      type: editingItem.type,
      intensity: editingItem.intensity,
      objective: editingItem.objective ?? "",
      arenaId: editingItem.arenaId ?? "",
      status: editingItem.status,
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
        horseId: values.horseId,
        trainerId: values.trainerId,
        date: new Date(`${values.date}T00:00:00`),
        startTime: values.startTime,
        endTime: values.endTime,
        type: values.type,
        intensity: values.intensity,
        objective: values.objective,
        arenaId: values.arenaId || undefined,
        status: values.status,
      };
      if (editingItem) {
        await updateTraining(activeCenterId, editingItem.id, payload);
      } else {
        await createTraining(activeCenterId, payload);
      }
      await loadData(activeCenterId);
      resetEditor();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el entrenamiento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Training) => {
    if (!activeCenterId) return;
    setError(null);
    try {
      await deleteTraining(activeCenterId, item.id);
      await loadData(activeCenterId);
      if (editingItem?.id === item.id) {
        resetEditor();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el entrenamiento.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando entrenamientos...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Entrenamientos"
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
                  {loading ? "Cargando..." : `${items.length} entrenamientos registrados.`}
                </p>
              </div>
              {loading ? (
                <p className="text-sm text-brand-secondary">Cargando...</p>
              ) : (
                <TrainingList
                  items={items}
                  trainers={people}
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
                    {editingItem ? "Editar entrenamiento" : "Nuevo entrenamiento"}
                  </h2>
                  <p className="text-sm text-brand-secondary">
                    Valida dobles reservas de caballo, entrenador y pista.
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
                  <label className="text-sm font-medium text-brand-secondary">Caballo</label>
                  <select
                    value={values.horseId}
                    onChange={(event) => setValues((prev) => ({ ...prev, horseId: event.target.value }))}
                    className={inputClassName}
                    required
                  >
                    <option value="">Selecciona un caballo</option>
                    {horses.map((item) => (
                      <option key={item.horse.id} value={item.horse.id}>
                        {item.horse.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-secondary">Entrenador</label>
                  <select
                    value={values.trainerId}
                    onChange={(event) => setValues((prev) => ({ ...prev, trainerId: event.target.value }))}
                    className={inputClassName}
                    required
                  >
                    <option value="">Selecciona un entrenador</option>
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Fecha</label>
                    <input
                      type="date"
                      value={values.date}
                      onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value }))}
                      className={inputClassName}
                      required
                    />
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
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Inicio</label>
                    <input
                      type="time"
                      value={values.startTime}
                      onChange={(event) => setValues((prev) => ({ ...prev, startTime: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Fin</label>
                    <input
                      type="time"
                      value={values.endTime}
                      onChange={(event) => setValues((prev) => ({ ...prev, endTime: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Tipo</label>
                    <input
                      value={values.type}
                      onChange={(event) => setValues((prev) => ({ ...prev, type: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Intensidad</label>
                    <select
                      value={values.intensity}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          intensity: event.target.value as Training["intensity"],
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-secondary">Estado</label>
                  <select
                    value={values.status}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        status: event.target.value as Training["status"],
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-secondary">Objetivo</label>
                  <textarea
                    rows={3}
                    value={values.objective}
                    onChange={(event) => setValues((prev) => ({ ...prev, objective: event.target.value }))}
                    className={textareaClassName}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : editingItem ? "Guardar cambios" : "Crear entrenamiento"}
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

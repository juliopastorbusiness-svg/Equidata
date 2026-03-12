"use client";

import { FormEvent, useEffect, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { ClassList } from "@/components/center/classes/ClassList";
import { IdMultiSelect } from "@/components/center/shared/IdMultiSelect";
import { listArenas, Arena } from "@/lib/firestore/arenas";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import { getCenterPersonOptions, getHorseListItemsByCenter, CenterPersonOption, HorseListItem } from "@/lib/horses";
import {
  Class as CenterClass,
  createClass,
  deleteClass,
  getClasses,
  updateClass,
} from "@/lib/services";

type FormValues = {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  trainerId: string;
  studentIds: string[];
  horseIds: string[];
  arenaId: string;
  requiredLevel: CenterClass["requiredLevel"];
  capacity: string;
  status: CenterClass["status"];
  price: string;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";
const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

const emptyValues: FormValues = {
  title: "",
  description: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  trainerId: "",
  studentIds: [],
  horseIds: [],
  arenaId: "",
  requiredLevel: "MIXED",
  capacity: "1",
  status: "DRAFT",
  price: "",
};

export default function CenterClassesPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [items, setItems] = useState<CenterClass[]>([]);
  const [horses, setHorses] = useState<HorseListItem[]>([]);
  const [people, setPeople] = useState<CenterPersonOption[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [editingItem, setEditingItem] = useState<CenterClass | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string) => {
    const [nextItems, nextHorses, nextPeople] = await Promise.all([
      getClasses(centerId),
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
        setError("No se pudieron cargar las clases.");
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
      title: editingItem.title,
      description: editingItem.description ?? "",
      date: editingItem.date.toDate().toISOString().slice(0, 10),
      startTime: editingItem.startTime,
      endTime: editingItem.endTime,
      trainerId: editingItem.trainerId ?? "",
      studentIds: editingItem.studentIds,
      horseIds: editingItem.horseIds,
      arenaId: editingItem.arenaId ?? "",
      requiredLevel: editingItem.requiredLevel,
      capacity: String(editingItem.capacity),
      status: editingItem.status,
      price: typeof editingItem.price === "number" ? String(editingItem.price) : "",
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
        title: values.title,
        description: values.description,
        date: new Date(`${values.date}T00:00:00`),
        startTime: values.startTime,
        endTime: values.endTime,
        trainerId: values.trainerId || undefined,
        studentIds: values.studentIds,
        horseIds: values.horseIds,
        arenaId: values.arenaId || undefined,
        requiredLevel: values.requiredLevel,
        capacity: Number(values.capacity),
        status: values.status,
        price: values.price ? Number(values.price) : undefined,
      };

      if (editingItem) {
        await updateClass(activeCenterId, editingItem.id, payload);
      } else {
        await createClass(activeCenterId, payload);
      }

      await loadData(activeCenterId);
      resetEditor();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar la clase.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CenterClass) => {
    if (!activeCenterId) return;
    setError(null);
    try {
      await deleteClass(activeCenterId, item.id);
      await loadData(activeCenterId);
      if (editingItem?.id === item.id) {
        resetEditor();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la clase.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando clases...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Clases"
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
                  {loading ? "Cargando..." : `${items.length} clases registradas.`}
                </p>
              </div>
              {loading ? (
                <p className="text-sm text-brand-secondary">Cargando...</p>
              ) : (
                <ClassList
                  items={items}
                  trainers={people}
                  students={people}
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
                    {editingItem ? "Editar clase" : "Nueva clase"}
                  </h2>
                  <p className="text-sm text-brand-secondary">
                    La agenda se actualiza automaticamente y valida conflictos.
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
                  <label className="text-sm font-medium text-brand-secondary">Titulo</label>
                  <input
                    value={values.title}
                    onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
                    className={inputClassName}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-brand-secondary">Descripcion</label>
                  <textarea
                    rows={3}
                    value={values.description}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, description: event.target.value }))
                    }
                    className={textareaClassName}
                  />
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
                    <label className="text-sm font-medium text-brand-secondary">Entrenador</label>
                    <select
                      value={values.trainerId}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, trainerId: event.target.value }))
                      }
                      className={inputClassName}
                    >
                      <option value="">Sin entrenador</option>
                      {people.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.label}
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
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, startTime: event.target.value }))
                      }
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Fin</label>
                    <input
                      type="time"
                      value={values.endTime}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, endTime: event.target.value }))
                      }
                      className={inputClassName}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
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
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Nivel</label>
                    <select
                      value={values.requiredLevel}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          requiredLevel: event.target.value as CenterClass["requiredLevel"],
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                      <option value="MIXED">Mixed</option>
                    </select>
                  </div>
                </div>
                <IdMultiSelect
                  label="Caballos"
                  value={values.horseIds}
                  options={horses.map((item) => ({ id: item.horse.id, label: item.horse.name }))}
                  onChange={(horseIds) => setValues((prev) => ({ ...prev, horseIds }))}
                />
                <IdMultiSelect
                  label="Alumnos"
                  value={values.studentIds}
                  options={people.map((person) => ({ id: person.id, label: person.label }))}
                  onChange={(studentIds) => setValues((prev) => ({ ...prev, studentIds }))}
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Capacidad</label>
                    <input
                      type="number"
                      min="1"
                      value={values.capacity}
                      onChange={(event) => setValues((prev) => ({ ...prev, capacity: event.target.value }))}
                      className={inputClassName}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Estado</label>
                    <select
                      value={values.status}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          status: event.target.value as CenterClass["status"],
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-brand-secondary">Precio</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={values.price}
                      onChange={(event) => setValues((prev) => ({ ...prev, price: event.target.value }))}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Guardando..." : editingItem ? "Guardar cambios" : "Crear clase"}
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

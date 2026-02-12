"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  CenterTask,
  createTask,
  deleteTask,
  listTasks,
  TaskPriority,
  TaskStatus,
  updateTask,
  updateTaskStatus,
} from "@/lib/firestore/tasks";

type TaskTab = "TODO" | "IN_PROGRESS" | "DONE";

type TaskFormState = {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
};

const formInit: TaskFormState = {
  title: "",
  description: "",
  dueDate: "",
  priority: "MEDIUM",
  status: "TODO",
};

const tabLabel: Record<TaskTab, string> = {
  TODO: "Pendientes",
  IN_PROGRESS: "En curso",
  DONE: "Hechas",
};

const priorityLabel: Record<TaskPriority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

const priorityStyle: Record<TaskPriority, string> = {
  LOW: "bg-zinc-800 text-zinc-200",
  MEDIUM: "bg-blue-900/70 text-blue-200",
  HIGH: "bg-red-900/70 text-red-200",
};

const statusStyle: Record<TaskStatus, string> = {
  TODO: "bg-amber-900/70 text-amber-200",
  IN_PROGRESS: "bg-blue-900/70 text-blue-200",
  DONE: "bg-emerald-900/70 text-emerald-200",
};

const dateAtStart = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const isOverdue = (task: CenterTask): boolean => {
  if (!task.dueDate || task.status === "DONE") return false;
  const today = dateAtStart(new Date()).getTime();
  const due = dateAtStart(task.dueDate.toDate()).getTime();
  return due < today;
};

export default function CenterTasksPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [tab, setTab] = useState<TaskTab>("TODO");
  const [tasks, setTasks] = useState<CenterTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TaskFormState>(formInit);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }

    setLoadingTasks(true);
    setError(null);

    const unsubscribe = listTasks(
      activeCenterId,
      (rows) => {
        setTasks(rows);
        setLoadingTasks(false);
      },
      (listError) => {
        console.error(listError);
        setError("No se pudieron cargar las tareas.");
        setLoadingTasks(false);
      }
    );

    return () => unsubscribe();
  }, [activeCenterId]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => task.status === tab),
    [tab, tasks]
  );

  const resetForm = () => {
    setForm((prev) => ({ ...formInit, status: prev.status }));
    setEditingTaskId(null);
  };

  const onCreateOrUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        dueDate: form.dueDate ? new Date(`${form.dueDate}T00:00:00`) : undefined,
        priority: form.priority,
        status: form.status,
      };

      if (editingTaskId) {
        await updateTask(activeCenterId, editingTaskId, {
          ...payload,
          dueDate: payload.dueDate ?? null,
        });
      } else {
        await createTask(activeCenterId, payload);
      }

      resetForm();
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la tarea."
      );
    } finally {
      setSaving(false);
    }
  };

  const onEditTask = (task: CenterTask) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate ? task.dueDate.toDate().toISOString().slice(0, 10) : "",
      priority: task.priority ?? "MEDIUM",
      status: task.status,
    });
  };

  const onDeleteTask = async (taskId: string, title: string) => {
    if (!activeCenterId) return;
    const confirmed = window.confirm(
      `Vas a eliminar la tarea "${title}". Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingTaskId(taskId);
    setError(null);

    try {
      await deleteTask(activeCenterId, taskId);
      if (editingTaskId === taskId) {
        resetForm();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar la tarea.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const onStatusChange = async (taskId: string, status: TaskStatus) => {
    if (!activeCenterId) return;
    setError(null);

    try {
      await updateTaskStatus(activeCenterId, taskId, status);
    } catch (statusError) {
      console.error(statusError);
      setError("No se pudo actualizar el estado de la tarea.");
    }
  };

  useEffect(() => {
    setForm((prev) => ({ ...prev, status: tab }));
  }, [tab]);

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p>Cargando permisos del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-black text-white p-6">
        <p className="text-red-400">No tienes acceso a Tareas.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="space-y-2">
        <Link href="/dashboard/center" className="text-blue-400 underline text-sm">
          Volver al dashboard de centro
        </Link>
        <h1 className="text-3xl font-bold">Tareas</h1>
        <p className="text-sm text-zinc-300">
          Centro activo: {activeCenterName ?? "Sin centro activo"}
        </p>
        {guardError && (
          <p className="rounded border border-red-800 bg-red-950/40 p-2 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded border border-red-800 bg-red-950/40 p-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </header>

      {memberships.length > 1 && (
        <section className="max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <label htmlFor="center-selector" className="mb-2 block text-sm text-zinc-300">
            Cambiar centro activo
          </label>
          <select
            id="center-selector"
            value={activeCenterId ?? ""}
            onChange={(event) => setActiveCenterId(event.target.value)}
            className="w-full rounded border border-zinc-700 bg-black/60 p-2 text-sm"
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
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-300">
          No tienes centro asignado.
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
            <div className="inline-flex rounded-lg border border-zinc-700 p-1">
              {(Object.keys(tabLabel) as TaskTab[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTab(status)}
                  className={`rounded px-3 py-1 text-sm ${
                    tab === status ? "bg-zinc-200 text-zinc-900" : "text-zinc-300"
                  }`}
                >
                  {tabLabel[status]}
                </button>
              ))}
            </div>

            <form onSubmit={onCreateOrUpdate} className="grid gap-2 md:grid-cols-2">
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Titulo"
                className="rounded border border-zinc-700 bg-black/60 p-2 text-sm md:col-span-2"
                required
              />
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Descripcion (opcional)"
                rows={3}
                className="rounded border border-zinc-700 bg-black/60 p-2 text-sm md:col-span-2"
              />
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                className="rounded border border-zinc-700 bg-black/60 p-2 text-sm"
              />
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    priority: event.target.value as TaskPriority,
                  }))
                }
                className="rounded border border-zinc-700 bg-black/60 p-2 text-sm"
              >
                <option value="LOW">Prioridad baja</option>
                <option value="MEDIUM">Prioridad media</option>
                <option value="HIGH">Prioridad alta</option>
              </select>
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as TaskStatus,
                  }))
                }
                className="rounded border border-zinc-700 bg-black/60 p-2 text-sm"
              >
                <option value="TODO">Pendiente</option>
                <option value="IN_PROGRESS">En curso</option>
                <option value="DONE">Hecha</option>
              </select>
              <div className="flex gap-2 md:items-center">
                <button
                  disabled={saving}
                  className="rounded bg-blue-600 px-3 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {editingTaskId ? "Guardar cambios" : "Crear tarea"}
                </button>
                {editingTaskId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded border border-zinc-700 px-3 py-2 text-sm"
                  >
                    Cancelar edicion
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
            <h2 className="text-lg font-semibold">{tabLabel[tab]}</h2>
            {loadingTasks ? (
              <p className="text-sm text-zinc-400">Cargando tareas...</p>
            ) : filteredTasks.length === 0 ? (
              <p className="text-sm text-zinc-400">No hay tareas en este estado.</p>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <article
                      key={task.id}
                      className={`rounded-xl border p-3 ${
                        overdue
                          ? "border-red-700 bg-red-950/20"
                          : "border-zinc-800 bg-black/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="font-semibold">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-zinc-300">{task.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              statusStyle[task.status]
                            }`}
                          >
                            {tabLabel[task.status]}
                          </span>
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              priorityStyle[task.priority ?? "MEDIUM"]
                            }`}
                          >
                            {priorityLabel[task.priority ?? "MEDIUM"]}
                          </span>
                          {overdue && (
                            <span className="rounded bg-red-800/80 px-2 py-1 text-xs text-red-100">
                              Vencida
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span>
                          Vence: {task.dueDate ? task.dueDate.toDate().toLocaleDateString("es-ES") : "-"}
                        </span>
                        <span>�</span>
                        <span>
                          Actualizada: {task.updatedAt ? task.updatedAt.toDate().toLocaleString("es-ES") : "-"}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(event) =>
                            void onStatusChange(task.id, event.target.value as TaskStatus)
                          }
                          className="rounded border border-zinc-700 bg-black/60 p-1.5 text-xs"
                        >
                          <option value="TODO">Pendiente</option>
                          <option value="IN_PROGRESS">En curso</option>
                          <option value="DONE">Hecha</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteTask(task.id, task.title)}
                          disabled={deletingTaskId === task.id}
                          className="rounded bg-red-700 px-2 py-1 text-xs disabled:opacity-60"
                        >
                          {deletingTaskId === task.id ? "Eliminando..." : "Eliminar"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

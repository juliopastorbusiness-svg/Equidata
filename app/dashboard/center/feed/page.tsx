"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  adjustFeedStock,
  createFeedItem,
  deleteFeedItem,
  FeedItem,
  FeedUnit,
  listFeedItems,
  updateFeedItem,
} from "@/lib/firestore/feed";

type FeedFormState = {
  name: string;
  unit: FeedUnit;
  maxStock: string;
  currentStock: string;
  minStock: string;
  supplier: string;
};

type StockModalState = {
  open: boolean;
  mode: "add" | "consume";
  item: FeedItem | null;
  amount: string;
};

const defaultFormState: FeedFormState = {
  name: "",
  unit: "kg",
  maxStock: "",
  currentStock: "",
  minStock: "",
  supplier: "",
};

const unitOptions: FeedUnit[] = ["kg", "bale", "sack", "liter", "unit"];

const toProgress = (current: number, max: number) => {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
};

const validateFeedForm = (
  values: FeedFormState
): {
  data: {
    name: string;
    unit: FeedUnit;
    maxStock: number;
    currentStock: number;
    minStock?: number;
    supplier?: string;
  } | null;
  error: string | null;
} => {
  const name = values.name.trim();
  const supplier = values.supplier.trim();
  const maxStock = Number(values.maxStock);
  const currentStock = Number(values.currentStock);
  const minStock = values.minStock.trim() ? Number(values.minStock) : undefined;

  if (name.length < 2) {
    return { data: null, error: "El nombre debe tener al menos 2 caracteres." };
  }
  if (!Number.isFinite(maxStock) || maxStock <= 0) {
    return { data: null, error: "maxStock debe ser mayor que 0." };
  }
  if (!Number.isFinite(currentStock) || currentStock < 0) {
    return { data: null, error: "currentStock no puede ser negativo." };
  }
  if (currentStock > maxStock) {
    return { data: null, error: "currentStock no puede superar maxStock." };
  }
  if (typeof minStock === "number") {
    if (!Number.isFinite(minStock) || minStock < 0) {
      return { data: null, error: "minStock no puede ser negativo." };
    }
    if (minStock > maxStock) {
      return { data: null, error: "minStock no puede superar maxStock." };
    }
  }

  return {
    data: {
      name,
      unit: values.unit,
      maxStock: Number(maxStock.toFixed(2)),
      currentStock: Number(currentStock.toFixed(2)),
      minStock: typeof minStock === "number" ? Number(minStock.toFixed(2)) : undefined,
      supplier: supplier || undefined,
    },
    error: null,
  };
};

function FeedModal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-background/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-brand-border bg-brand-background p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-brand-border px-2 py-1 text-xs"
          >
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CenterFeedPage() {
  const {
    loading: loadingGuard,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FeedFormState>(defaultFormState);

  const [stockModal, setStockModal] = useState<StockModalState>({
    open: false,
    mode: "add",
    item: null,
    amount: "",
  });

  const [saving, setSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      setItems([]);
      setLoadingItems(false);
      return;
    }

    setLoadingItems(true);
    setError(null);

    const unsubscribe = listFeedItems(
      activeCenterId,
      (nextItems) => {
        setItems(nextItems);
        setLoadingItems(false);
      },
      (listError) => {
        console.error("Error cargando feedItems:", listError);
        setError("No se pudieron cargar los piensos.");
        setLoadingItems(false);
      }
    );

    return () => unsubscribe();
  }, [activeCenterId]);

  const lowStockCount = useMemo(
    () =>
      items.filter(
        (item) =>
          typeof item.minStock === "number" && item.currentStock <= item.minStock
      ).length,
    [items]
  );

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingItemId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setError(null);
    setAddModalOpen(true);
  };

  const openEditModal = (item: FeedItem) => {
    setEditingItemId(item.id);
    setFormState({
      name: item.name,
      unit: item.unit,
      maxStock: String(item.maxStock),
      currentStock: String(item.currentStock),
      minStock: typeof item.minStock === "number" ? String(item.minStock) : "",
      supplier: item.supplier ?? "",
    });
    setError(null);
    setEditModalOpen(true);
  };

  const closeAllModals = () => {
    setAddModalOpen(false);
    setEditModalOpen(false);
    setStockModal({ open: false, mode: "add", item: null, amount: "" });
    setSaving(false);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId) return;

    const parsed = validateFeedForm(formState);
    if (!parsed.data) {
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createFeedItem(activeCenterId, parsed.data);
      closeAllModals();
      resetForm();
    } catch (createError) {
      console.error(createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "No se pudo crear el pienso."
      );
      setSaving(false);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId || !editingItemId) return;

    const parsed = validateFeedForm(formState);
    if (!parsed.data) {
      setError(parsed.error);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateFeedItem(activeCenterId, editingItemId, parsed.data);
      closeAllModals();
      resetForm();
    } catch (updateError) {
      console.error(updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "No se pudo editar el pienso."
      );
      setSaving(false);
    }
  };

  const handleDelete = async (item: FeedItem) => {
    if (!activeCenterId) return;
    const confirmed = window.confirm(
      `Vas a eliminar "${item.name}". Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingItemId(item.id);
    setError(null);
    try {
      await deleteFeedItem(activeCenterId, item.id);
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar el pienso.");
    } finally {
      setDeletingItemId(null);
    }
  };

  const openAdjustModal = (item: FeedItem, mode: "add" | "consume") => {
    setStockModal({
      open: true,
      mode,
      item,
      amount: "",
    });
    setError(null);
  };

  const handleAdjustStock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId || !stockModal.item) return;

    const amount = Number(stockModal.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Introduce una cantidad valida mayor que 0.");
      return;
    }

    const delta = stockModal.mode === "add" ? amount : -amount;

    setSaving(true);
    setError(null);
    try {
      await adjustFeedStock(activeCenterId, stockModal.item.id, Number(delta.toFixed(2)));
      closeAllModals();
    } catch (adjustError) {
      console.error(adjustError);
      setError(
        adjustError instanceof Error
          ? adjustError.message
          : "No se pudo ajustar el stock."
      );
      setSaving(false);
    }
  };

  if (loadingGuard) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
        <p>Cargando permisos del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso al dashboard de piensos.</p>
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
        title="Piensos"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
        primaryActionLabel="Anadir pienso"
        onPrimaryAction={openCreateModal}
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
        <section className="max-w-xl rounded-2xl border border-brand-border bg-white/60 p-4">
          <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
            Cambiar centro activo
          </label>
          <select
            id="center-selector"
            value={activeCenterId ?? ""}
            onChange={(event) => setActiveCenterId(event.target.value)}
            className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
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
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-2xl border border-brand-border bg-white/60 p-4">
              <p className="text-sm text-brand-secondary">Total de piensos</p>
              <p className="mt-1 text-3xl font-bold">{items.length}</p>
            </article>
            <article className="rounded-2xl border border-brand-border bg-white/60 p-4">
              <p className="text-sm text-brand-secondary">En nivel minimo</p>
              <p className="mt-1 text-3xl font-bold">{lowStockCount}</p>
            </article>
            <article className="rounded-2xl border border-brand-border bg-white/60 p-4">
              <p className="text-sm text-brand-secondary">Con stock correcto</p>
              <p className="mt-1 text-3xl font-bold">{Math.max(0, items.length - lowStockCount)}</p>
            </article>
          </section>

          <section className="space-y-3">
            {loadingItems ? (
              <p className="text-sm text-brand-secondary">Cargando piensos...</p>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
                <p>Aun no hay piensos registrados.</p>
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="mt-3 inline-flex h-11 items-center rounded-xl bg-brand-primary text-white px-4 text-sm font-semibold hover:bg-brand-primaryHover"
                >
                  Crear pienso
                </button>
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((item) => {
                  const progress = toProgress(item.currentStock, item.maxStock);
                  const lowStock =
                    typeof item.minStock === "number" &&
                    item.currentStock <= item.minStock;

                  return (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">
                          {item.name} ({item.unit})
                        </h3>
                        <span className="text-sm font-semibold">{progress}%</span>
                      </div>

                      <p className="text-sm text-brand-secondary">
                        {item.currentStock} / {item.maxStock} {item.unit}
                      </p>
                      {typeof item.minStock === "number" && (
                        <p
                          className={`text-xs font-semibold ${
                            lowStock ? "text-red-400" : "text-brand-secondary"
                          }`}
                        >
                          Minimo: {item.minStock} {item.unit}
                        </p>
                      )}
                      {item.supplier && (
                        <p className="text-xs text-brand-secondary">Proveedor: {item.supplier}</p>
                      )}

                      <div className="h-3 w-full rounded-full bg-brand-background">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            lowStock ? "bg-red-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openAdjustModal(item, "add")}
                          className="rounded border border-emerald-600 px-3 py-1 text-xs text-emerald-300"
                        >
                          Anadir stock
                        </button>
                        <button
                          type="button"
                          onClick={() => openAdjustModal(item, "consume")}
                          className="rounded border border-brand-primary px-3 py-1 text-xs text-brand-secondary"
                        >
                          Consumir stock
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded border border-brand-border px-3 py-1 text-xs"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingItemId === item.id}
                          className="rounded bg-red-600 px-3 py-1 text-xs disabled:opacity-60"
                        >
                          {deletingItemId === item.id ? "Eliminando..." : "Eliminar"}
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

      <FeedModal open={addModalOpen} title="Anadir pienso" onClose={closeAllModals}>
        <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={formState.name}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Nombre"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
            required
          />
          <select
            value={formState.unit}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, unit: event.target.value as FeedUnit }))
            }
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          >
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={formState.maxStock}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, maxStock: event.target.value }))
            }
            placeholder="maxStock"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.currentStock}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, currentStock: event.target.value }))
            }
            placeholder="currentStock"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.minStock}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, minStock: event.target.value }))
            }
            placeholder="minStock (opcional)"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          />
          <input
            type="text"
            value={formState.supplier}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, supplier: event.target.value }))
            }
            placeholder="Proveedor (opcional)"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-60 md:col-span-2"
          >
            {saving ? "Guardando..." : "Guardar pienso"}
          </button>
        </form>
      </FeedModal>

      <FeedModal open={editModalOpen} title="Editar pienso" onClose={closeAllModals}>
        <form onSubmit={handleUpdate} className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={formState.name}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Nombre"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
            required
          />
          <select
            value={formState.unit}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, unit: event.target.value as FeedUnit }))
            }
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          >
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={formState.maxStock}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, maxStock: event.target.value }))
            }
            placeholder="maxStock"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.currentStock}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, currentStock: event.target.value }))
            }
            placeholder="currentStock"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={formState.minStock}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, minStock: event.target.value }))
            }
            placeholder="minStock (opcional)"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          />
          <input
            type="text"
            value={formState.supplier}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, supplier: event.target.value }))
            }
            placeholder="Proveedor (opcional)"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-60 md:col-span-2"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </FeedModal>

      <FeedModal
        open={stockModal.open}
        title={stockModal.mode === "add" ? "Anadir stock" : "Consumir stock"}
        onClose={closeAllModals}
      >
        <form onSubmit={handleAdjustStock} className="space-y-3">
          <p className="text-sm text-brand-secondary">
            {stockModal.item?.name} ({stockModal.item?.unit})
          </p>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={stockModal.amount}
            onChange={(event) =>
              setStockModal((prev) => ({ ...prev, amount: event.target.value }))
            }
            placeholder="Cantidad"
            className="w-full rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-brand-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Confirmar"}
          </button>
        </form>
      </FeedModal>
      </div>
    </main>
  );
}


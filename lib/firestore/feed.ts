import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type FeedUnit = "kg" | "bale" | "sack" | "liter" | "unit";

export type FeedItem = {
  id: string;
  name: string;
  unit: FeedUnit;
  maxStock: number;
  currentStock: number;
  minStock?: number;
  supplier?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type CreateFeedItemPayload = {
  name: string;
  unit: FeedUnit;
  maxStock: number;
  currentStock: number;
  minStock?: number;
  supplier?: string;
};

export type UpdateFeedItemPatch = Partial<CreateFeedItemPayload>;

const feedItemsCollection = (centerId: string) =>
  collection(db, "centers", centerId, "feedItems");

const feedItemDoc = (centerId: string, itemId: string) =>
  doc(db, "centers", centerId, "feedItems", itemId);

const normalizeStockNumbers = (payload: CreateFeedItemPayload): CreateFeedItemPayload => {
  const normalized: CreateFeedItemPayload = {
    ...payload,
    name: payload.name.trim(),
    supplier: payload.supplier?.trim(),
    maxStock: Number(payload.maxStock),
    currentStock: Number(payload.currentStock),
  };

  if (typeof payload.minStock === "number") {
    normalized.minStock = Number(payload.minStock);
  }

  return normalized;
};

const validateBaseStock = (
  maxStock: number,
  currentStock: number,
  minStock?: number
): string | null => {
  if (!Number.isFinite(maxStock) || maxStock <= 0) {
    return "maxStock debe ser mayor que 0.";
  }
  if (!Number.isFinite(currentStock) || currentStock < 0) {
    return "currentStock no puede ser negativo.";
  }
  if (currentStock > maxStock) {
    return "currentStock no puede superar maxStock.";
  }
  if (typeof minStock === "number") {
    if (!Number.isFinite(minStock) || minStock < 0) {
      return "minStock no puede ser negativo.";
    }
    if (minStock > maxStock) {
      return "minStock no puede superar maxStock.";
    }
  }
  return null;
};

export const listFeedItems = (
  centerId: string,
  onChange: (items: FeedItem[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(feedItemsCollection(centerId), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items: FeedItem[] = snap.docs.map((itemDocRef) => ({
        id: itemDocRef.id,
        ...(itemDocRef.data() as Omit<FeedItem, "id">),
      }));
      onChange(items);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const createFeedItem = async (
  centerId: string,
  payload: CreateFeedItemPayload
): Promise<void> => {
  const normalized = normalizeStockNumbers(payload);
  const error = validateBaseStock(
    normalized.maxStock,
    normalized.currentStock,
    normalized.minStock
  );
  if (error) {
    throw new Error(error);
  }

  await addDoc(feedItemsCollection(centerId), {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateFeedItem = async (
  centerId: string,
  itemId: string,
  patch: UpdateFeedItemPatch
): Promise<void> => {
  const docRef = feedItemDoc(centerId, itemId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists()) {
      throw new Error("El pienso no existe.");
    }

    const current = snap.data() as Omit<FeedItem, "id">;

    const nextMaxStock =
      typeof patch.maxStock === "number" ? Number(patch.maxStock) : current.maxStock;
    const nextCurrentStock =
      typeof patch.currentStock === "number"
        ? Number(patch.currentStock)
        : current.currentStock;
    const nextMinStock =
      typeof patch.minStock === "number"
        ? Number(patch.minStock)
        : patch.minStock === undefined
          ? current.minStock
          : undefined;

    const validationError = validateBaseStock(
      nextMaxStock,
      nextCurrentStock,
      nextMinStock
    );
    if (validationError) {
      throw new Error(validationError);
    }

    const nextPatch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (typeof patch.name === "string") nextPatch.name = patch.name.trim();
    if (typeof patch.unit === "string") nextPatch.unit = patch.unit;
    if (typeof patch.maxStock === "number") nextPatch.maxStock = nextMaxStock;
    if (typeof patch.currentStock === "number") nextPatch.currentStock = nextCurrentStock;
    if (typeof patch.minStock === "number") nextPatch.minStock = nextMinStock;
    if (patch.minStock === undefined && "minStock" in patch) nextPatch.minStock = null;
    if (typeof patch.supplier === "string") nextPatch.supplier = patch.supplier.trim();

    tx.update(docRef, nextPatch);
  });
};

export const deleteFeedItem = async (
  centerId: string,
  itemId: string
): Promise<void> => {
  await deleteDoc(feedItemDoc(centerId, itemId));
};

export const adjustFeedStock = async (
  centerId: string,
  itemId: string,
  delta: number
): Promise<void> => {
  const parsedDelta = Number(delta);
  if (!Number.isFinite(parsedDelta) || parsedDelta === 0) {
    throw new Error("Delta invalido.");
  }

  const docRef = feedItemDoc(centerId, itemId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists()) {
      throw new Error("El pienso no existe.");
    }

    const data = snap.data() as Omit<FeedItem, "id">;
    const nextCurrentStock = Number((data.currentStock + parsedDelta).toFixed(2));

    if (nextCurrentStock < 0) {
      throw new Error("No se puede dejar el stock por debajo de 0.");
    }
    if (nextCurrentStock > data.maxStock) {
      throw new Error("No se puede superar el maximo permitido.");
    }

    tx.update(docRef, {
      currentStock: nextCurrentStock,
      updatedAt: serverTimestamp(),
    });
  });
};

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FirestoreBillingCustomerDoc,
  FirestoreBillingMovementDoc,
} from "@/lib/services/firestoreTypes";
import {
  mapBillingCustomer,
  mapBillingMovement,
} from "@/lib/services/mappers";
import {
  BillingCustomer,
  BillingCustomerFinancialStatus,
  BillingMovement,
  BillingMovementType,
  BillingPaymentMethod,
} from "@/lib/services/types";
import { assertCenterId, assertRequiredString } from "@/lib/services/shared";

const billingCustomersCollectionName = "billingCustomers";
const billingMovementsCollectionName = "billingMovements";

export type UpsertBillingCustomerInput = {
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export type CreateBillingMovementInput = {
  type: BillingMovementType;
  date: Date;
  description: string;
  amount: number;
  notes?: string;
  paymentMethod?: BillingPaymentMethod;
  reference?: string;
};

export type UpdateBillingMovementInput = Partial<CreateBillingMovementInput>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const billingCustomersCollection = (centerId: string) =>
  collection(
    db,
    "centers",
    assertCenterId(centerId),
    billingCustomersCollectionName
  );

const billingCustomerDocument = (centerId: string, customerId: string) =>
  doc(
    db,
    "centers",
    assertCenterId(centerId),
    billingCustomersCollectionName,
    assertRequiredString("customerId", customerId)
  );

const billingMovementsCollection = (centerId: string, customerId: string) =>
  collection(
    billingCustomerDocument(centerId, customerId),
    billingMovementsCollectionName
  );

const billingMovementDocument = (
  centerId: string,
  customerId: string,
  movementId: string
) =>
  doc(
    billingCustomerDocument(centerId, customerId),
    billingMovementsCollectionName,
    assertRequiredString("movementId", movementId)
  );

const sanitizeOptionalString = (value?: string | null): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
};

const normalizeMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const ensurePositiveAmount = (amount: number): number => {
  const normalized = normalizeMoney(Number(amount));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("El monto debe ser mayor que 0.");
  }
  return normalized;
};

const ensureEmail = (email?: string | null): string | null => {
  const normalized = sanitizeOptionalString(email);
  if (!normalized) return null;
  if (!emailRegex.test(normalized)) {
    throw new Error("El email no es valido.");
  }
  return normalized.toLowerCase();
};

const ensureFullName = (fullName: string): string => {
  const normalized = assertRequiredString("nombre_completo", fullName);
  if (normalized.length < 2) {
    throw new Error("El nombre completo debe tener al menos 2 caracteres.");
  }
  return normalized;
};

const getFinancialStatus = (balance: number): BillingCustomerFinancialStatus => {
  if (balance > 0) return "pending";
  if (balance < 0) return "credit";
  return "paid";
};

const buildCustomerSummary = (totalSpent: number, totalPaid: number) => {
  const nextTotalSpent = normalizeMoney(Math.max(0, totalSpent));
  const nextTotalPaid = normalizeMoney(Math.max(0, totalPaid));
  const balance = normalizeMoney(nextTotalSpent - nextTotalPaid);

  return {
    totalSpent: nextTotalSpent,
    totalPaid: nextTotalPaid,
    balance,
    financialStatus: getFinancialStatus(balance),
  };
};

const movementDeltas = (
  type: BillingMovementType,
  amount: number
): { spentDelta: number; paidDelta: number } => {
  if (type === "expense") {
    return { spentDelta: amount, paidDelta: 0 };
  }
  return { spentDelta: 0, paidDelta: amount };
};

const validateMovementInput = (payload: CreateBillingMovementInput) => {
  const description = assertRequiredString("concepto", payload.description);
  const amount = ensurePositiveAmount(payload.amount);

  if (!(payload.date instanceof Date) || Number.isNaN(payload.date.getTime())) {
    throw new Error("La fecha es obligatoria.");
  }

  if (payload.type === "payment" && payload.paymentMethod) {
    const method = payload.paymentMethod;
    if (method !== "cash" && method !== "transfer" && method !== "card" && method !== "other") {
      throw new Error("El metodo de pago no es valido.");
    }
  }

  return {
    type: payload.type,
    date: Timestamp.fromDate(payload.date),
    description,
    amount,
    notes: sanitizeOptionalString(payload.notes),
    paymentMethod: payload.type === "payment" ? payload.paymentMethod ?? "other" : null,
    reference: payload.type === "payment" ? sanitizeOptionalString(payload.reference) : null,
  };
};

export const listBillingCustomers = async (
  centerId: string
): Promise<BillingCustomer[]> => {
  const snap = await getDocs(
    query(billingCustomersCollection(centerId), orderBy("fullNameLower", "asc"))
  );

  return snap.docs.map((row) =>
    mapBillingCustomer(row.id, row.data() as FirestoreBillingCustomerDoc, centerId)
  );
};

export const getBillingCustomerById = async (
  centerId: string,
  customerId: string
): Promise<BillingCustomer | null> => {
  const snap = await getDoc(billingCustomerDocument(centerId, customerId));
  if (!snap.exists()) return null;

  return mapBillingCustomer(
    snap.id,
    snap.data() as FirestoreBillingCustomerDoc,
    centerId
  );
};

export const createBillingCustomer = async (
  centerId: string,
  payload: UpsertBillingCustomerInput,
  actorUid: string
): Promise<BillingCustomer> => {
  const fullName = ensureFullName(payload.fullName);
  const docRef = await addDoc(billingCustomersCollection(centerId), {
    centerId: assertCenterId(centerId),
    fullName,
    fullNameLower: fullName.toLowerCase(),
    phone: sanitizeOptionalString(payload.phone),
    email: ensureEmail(payload.email),
    address: sanitizeOptionalString(payload.address),
    notes: sanitizeOptionalString(payload.notes),
    ...buildCustomerSummary(0, 0),
    lastMovementAt: null,
    createdBy: assertRequiredString("createdBy", actorUid),
    updatedBy: assertRequiredString("updatedBy", actorUid),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const nextSnap = await getDoc(docRef);
  return mapBillingCustomer(
    nextSnap.id,
    nextSnap.data() as FirestoreBillingCustomerDoc,
    centerId
  );
};

export const updateBillingCustomer = async (
  centerId: string,
  customerId: string,
  payload: UpsertBillingCustomerInput,
  actorUid: string
): Promise<BillingCustomer> => {
  const customerRef = billingCustomerDocument(centerId, customerId);
  const currentSnap = await getDoc(customerRef);
  if (!currentSnap.exists()) {
    throw new Error("El cliente no existe.");
  }

  const fullName = ensureFullName(payload.fullName);

  await updateDoc(customerRef, {
    fullName,
    fullNameLower: fullName.toLowerCase(),
    phone: sanitizeOptionalString(payload.phone),
    email: ensureEmail(payload.email),
    address: sanitizeOptionalString(payload.address),
    notes: sanitizeOptionalString(payload.notes),
    updatedBy: assertRequiredString("updatedBy", actorUid),
    updatedAt: serverTimestamp(),
  });

  const nextSnap = await getDoc(customerRef);
  return mapBillingCustomer(
    nextSnap.id,
    nextSnap.data() as FirestoreBillingCustomerDoc,
    centerId
  );
};

export const deleteBillingCustomer = async (
  centerId: string,
  customerId: string
): Promise<void> => {
  const movementsSnap = await getDocs(billingMovementsCollection(centerId, customerId));
  if (!movementsSnap.empty) {
    throw new Error("No se puede eliminar un cliente con movimientos financieros.");
  }

  await deleteDoc(billingCustomerDocument(centerId, customerId));
};

export const listBillingMovements = async (
  centerId: string,
  customerId: string
): Promise<BillingMovement[]> => {
  const snap = await getDocs(
    query(
      billingMovementsCollection(centerId, customerId),
      orderBy("date", "desc")
    )
  );

  return snap.docs.map((row) =>
    mapBillingMovement(
      row.id,
      row.data() as FirestoreBillingMovementDoc,
      centerId,
      customerId
    )
  );
};

export const createBillingMovement = async (
  centerId: string,
  customerId: string,
  payload: CreateBillingMovementInput,
  actorUid: string
): Promise<BillingMovement> => {
  const customerRef = billingCustomerDocument(centerId, customerId);
  const movementRef = doc(billingMovementsCollection(centerId, customerId));
  const nextMovement = validateMovementInput(payload);
  const actorId = assertRequiredString("actorUid", actorUid);

  await runTransaction(db, async (transaction) => {
    const customerSnap = await transaction.get(customerRef);
    if (!customerSnap.exists()) {
      throw new Error("El cliente no existe.");
    }

    const customer = mapBillingCustomer(
      customerSnap.id,
      customerSnap.data() as FirestoreBillingCustomerDoc,
      centerId
    );
    const deltas = movementDeltas(nextMovement.type, nextMovement.amount);
    const nextSummary = buildCustomerSummary(
      customer.totalSpent + deltas.spentDelta,
      customer.totalPaid + deltas.paidDelta
    );

    transaction.set(movementRef, {
      centerId,
      customerId,
      type: nextMovement.type,
      date: nextMovement.date,
      description: nextMovement.description,
      amount: nextMovement.amount,
      notes: nextMovement.notes,
      paymentMethod: nextMovement.paymentMethod,
      reference: nextMovement.reference,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.update(customerRef, {
      ...nextSummary,
      lastMovementAt: nextMovement.date,
      updatedBy: actorId,
      updatedAt: serverTimestamp(),
    });
  });

  const nextSnap = await getDoc(movementRef);
  return mapBillingMovement(
    nextSnap.id,
    nextSnap.data() as FirestoreBillingMovementDoc,
    centerId,
    customerId
  );
};

export const updateBillingMovement = async (
  centerId: string,
  customerId: string,
  movementId: string,
  payload: UpdateBillingMovementInput,
  actorUid: string
): Promise<BillingMovement> => {
  const customerRef = billingCustomerDocument(centerId, customerId);
  const movementRef = billingMovementDocument(centerId, customerId, movementId);
  const actorId = assertRequiredString("actorUid", actorUid);

  await runTransaction(db, async (transaction) => {
    const [customerSnap, movementSnap] = await Promise.all([
      transaction.get(customerRef),
      transaction.get(movementRef),
    ]);

    if (!customerSnap.exists()) {
      throw new Error("El cliente no existe.");
    }
    if (!movementSnap.exists()) {
      throw new Error("El movimiento no existe.");
    }

    const customer = mapBillingCustomer(
      customerSnap.id,
      customerSnap.data() as FirestoreBillingCustomerDoc,
      centerId
    );
    const currentMovement = mapBillingMovement(
      movementSnap.id,
      movementSnap.data() as FirestoreBillingMovementDoc,
      centerId,
      customerId
    );

    const nextMovement = validateMovementInput({
      type: payload.type ?? currentMovement.type,
      date: payload.date ?? currentMovement.date.toDate(),
      description: payload.description ?? currentMovement.description,
      amount: payload.amount ?? currentMovement.amount,
      notes: payload.notes ?? currentMovement.notes,
      paymentMethod: payload.paymentMethod ?? currentMovement.paymentMethod,
      reference: payload.reference ?? currentMovement.reference,
    });

    const currentDeltas = movementDeltas(
      currentMovement.type,
      currentMovement.amount
    );
    const nextDeltas = movementDeltas(nextMovement.type, nextMovement.amount);

    const nextSummary = buildCustomerSummary(
      customer.totalSpent - currentDeltas.spentDelta + nextDeltas.spentDelta,
      customer.totalPaid - currentDeltas.paidDelta + nextDeltas.paidDelta
    );

    transaction.update(movementRef, {
      type: nextMovement.type,
      date: nextMovement.date,
      description: nextMovement.description,
      amount: nextMovement.amount,
      notes: nextMovement.notes,
      paymentMethod: nextMovement.paymentMethod,
      reference: nextMovement.reference,
      updatedBy: actorId,
      updatedAt: serverTimestamp(),
    });

    transaction.update(customerRef, {
      ...nextSummary,
      lastMovementAt: nextMovement.date,
      updatedBy: actorId,
      updatedAt: serverTimestamp(),
    });
  });

  const nextSnap = await getDoc(movementRef);
  return mapBillingMovement(
    nextSnap.id,
    nextSnap.data() as FirestoreBillingMovementDoc,
    centerId,
    customerId
  );
};

export const deleteBillingMovement = async (
  centerId: string,
  customerId: string,
  movementId: string,
  actorUid: string
): Promise<void> => {
  const customerRef = billingCustomerDocument(centerId, customerId);
  const movementRef = billingMovementDocument(centerId, customerId, movementId);
  const actorId = assertRequiredString("actorUid", actorUid);

  await runTransaction(db, async (transaction) => {
    const [customerSnap, movementSnap] = await Promise.all([
      transaction.get(customerRef),
      transaction.get(movementRef),
    ]);

    if (!customerSnap.exists()) {
      throw new Error("El cliente no existe.");
    }
    if (!movementSnap.exists()) {
      return;
    }

    const customer = mapBillingCustomer(
      customerSnap.id,
      customerSnap.data() as FirestoreBillingCustomerDoc,
      centerId
    );
    const movement = mapBillingMovement(
      movementSnap.id,
      movementSnap.data() as FirestoreBillingMovementDoc,
      centerId,
      customerId
    );
    const deltas = movementDeltas(movement.type, movement.amount);

    const nextSummary = buildCustomerSummary(
      customer.totalSpent - deltas.spentDelta,
      customer.totalPaid - deltas.paidDelta
    );

    transaction.delete(movementRef);
    transaction.update(customerRef, {
      ...nextSummary,
      updatedBy: actorId,
      updatedAt: serverTimestamp(),
    });
  });
};

export const recalculateBillingCustomerSummary = async (
  centerId: string,
  customerId: string,
  actorUid: string
): Promise<BillingCustomer> => {
  const customerRef = billingCustomerDocument(centerId, customerId);
  const movements = await listBillingMovements(centerId, customerId);
  const totals = movements.reduce(
    (accumulator, movement) => {
      const deltas = movementDeltas(movement.type, movement.amount);
      return {
        totalSpent: accumulator.totalSpent + deltas.spentDelta,
        totalPaid: accumulator.totalPaid + deltas.paidDelta,
      };
    },
    { totalSpent: 0, totalPaid: 0 }
  );

  const nextSummary = buildCustomerSummary(totals.totalSpent, totals.totalPaid);
  const lastMovementAt =
    movements
      .map((movement) => movement.date)
      .sort((left, right) => right.toMillis() - left.toMillis())[0] ?? null;

  await updateDoc(customerRef, {
    ...nextSummary,
    lastMovementAt,
    updatedBy: assertRequiredString("actorUid", actorUid),
    updatedAt: serverTimestamp(),
  });

  const nextSnap = await getDoc(customerRef);
  if (!nextSnap.exists()) {
    throw new Error("El cliente ya no existe.");
  }

  return mapBillingCustomer(
    nextSnap.id,
    nextSnap.data() as FirestoreBillingCustomerDoc,
    centerId
  );
};

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type BillingPeriod = {
  year: number;
  month: number; // 1-12
};

export type ChargeStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";

export type BillingServiceDoc = {
  id: string;
  riderUid: string;
  horseId: string;
  name: string;
  amount: number;
  billingCycle?: "MONTHLY";
  dueDay?: number;
  active: boolean;
  createdAt?: Timestamp;
};

export type ChargeDoc = {
  id: string;
  riderUid: string;
  horseId?: string | null;
  serviceId?: string | null;
  periodKey?: string;
  description?: string;
  amount: number;
  paidAmount?: number;
  remainingAmount?: number;
  status?: ChargeStatus;
  dueDate?: Timestamp;
  issuedAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type PaymentDoc = {
  id: string;
  riderUid: string;
  horseId?: string | null;
  chargeId?: string | null;
  periodKey?: string;
  amount: number;
  paidAt?: Timestamp;
  method?: string;
  notes?: string;
  createdAt?: Timestamp;
};

export type MonthlySummaryRow = {
  periodKey: string;
  periodLabel: string;
  billed: number;
  collected: number;
  pending: number;
  overdue: number;
  clientCount: number;
};

export type MonthlyClientStatus =
  | "PAID"
  | "PENDING"
  | "PARTIAL"
  | "OVERDUE"
  | "NO_CHARGES";

export type MonthlyClientBreakdownRow = {
  riderUid: string;
  riderLabel: string;
  horseIds: string[];
  horseCount: number;
  monthAmount: number;
  monthPaid: number;
  monthPending: number;
  monthOverdue: number;
  globalStatus: MonthlyClientStatus;
  nextDueDate: Date | null;
};

export type RegisterPaymentInput = {
  riderUid: string;
  amount: number;
  period: BillingPeriod;
  horseId?: string;
  chargeId?: string;
  method?: string;
  notes?: string;
};

export type AddOneOffChargeInput = {
  riderUid: string;
  period: BillingPeriod;
  description: string;
  amount: number;
  horseId?: string;
  dueDate?: Date;
};

const chargesCollection = (centerId: string) =>
  collection(db, "centers", centerId, "charges");

const paymentsCollection = (centerId: string) =>
  collection(db, "centers", centerId, "payments");

const horseStaysCollection = (centerId: string) =>
  collection(db, "centers", centerId, "horseStays");

const billingServicesCollection = (centerId: string) =>
  collection(db, "centers", centerId, "billingServices");

const membersCollection = (centerId: string) =>
  collection(db, "centers", centerId, "members");

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const seconds = (value as { seconds?: number }).seconds;
    if (typeof seconds === "number") {
      return new Date(seconds * 1000);
    }
  }
  return null;
};

export const getCurrentPeriod = (): BillingPeriod => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};

export const periodToKey = (period: BillingPeriod): string => {
  const month = String(period.month).padStart(2, "0");
  return `${period.year}-${month}`;
};

export const keyToPeriod = (periodKey: string): BillingPeriod => {
  const [yearText, monthText] = periodKey.split("-");
  return {
    year: Number(yearText),
    month: Number(monthText),
  };
};

const keyFromDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const isSamePeriod = (date: Date, period: BillingPeriod): boolean => {
  return date.getFullYear() === period.year && date.getMonth() + 1 === period.month;
};

const deriveChargePeriodKey = (charge: ChargeDoc): string | null => {
  if (charge.periodKey) return charge.periodKey;

  const issuedAt = toDate(charge.issuedAt);
  if (issuedAt) return keyFromDate(issuedAt);

  const dueDate = toDate(charge.dueDate);
  if (dueDate) return keyFromDate(dueDate);

  return null;
};

const derivePaymentPeriodKey = (payment: PaymentDoc): string | null => {
  if (payment.periodKey) return payment.periodKey;
  const paidAt = toDate(payment.paidAt);
  return paidAt ? keyFromDate(paidAt) : null;
};

const chargeRemaining = (charge: ChargeDoc): number => {
  const amount = toNumber(charge.amount);
  const explicitRemaining = toNumber(charge.remainingAmount);
  if (explicitRemaining > 0) {
    return Math.max(0, explicitRemaining);
  }

  const paid = toNumber(charge.paidAmount);
  return Math.max(0, amount - paid);
};

const chargeOverdueAmount = (charge: ChargeDoc, now: Date): number => {
  const remaining = chargeRemaining(charge);
  if (remaining <= 0) return 0;
  if (charge.status === "OVERDUE") return remaining;

  const dueDate = toDate(charge.dueDate);
  if (!dueDate) return 0;
  return dueDate < now ? remaining : 0;
};

const monthLabel = (period: BillingPeriod): string => {
  const date = new Date(period.year, period.month - 1, 1);
  return date.toLocaleDateString("es-ES", {
    month: "short",
    year: "numeric",
  });
};

const listAllCharges = async (centerId: string): Promise<ChargeDoc[]> => {
  const snap = await getDocs(chargesCollection(centerId));
  return snap.docs.map((row) => ({
    id: row.id,
    ...(row.data() as Omit<ChargeDoc, "id">),
  }));
};

const listAllPayments = async (centerId: string): Promise<PaymentDoc[]> => {
  const snap = await getDocs(paymentsCollection(centerId));
  return snap.docs.map((row) => ({
    id: row.id,
    ...(row.data() as Omit<PaymentDoc, "id">),
  }));
};

export const listChargesByPeriod = async (
  centerId: string,
  period: BillingPeriod
): Promise<ChargeDoc[]> => {
  const key = periodToKey(period);
  const rows = await listAllCharges(centerId);
  return rows.filter((row) => deriveChargePeriodKey(row) === key);
};

export const listPaymentsByPeriod = async (
  centerId: string,
  period: BillingPeriod
): Promise<PaymentDoc[]> => {
  const key = periodToKey(period);
  const rows = await listAllPayments(centerId);
  return rows.filter((row) => derivePaymentPeriodKey(row) === key);
};

export const listClientBillingServices = async (
  centerId: string,
  riderUid: string
): Promise<BillingServiceDoc[]> => {
  const q = query(billingServicesCollection(centerId), where("active", "==", true));
  const snap = await getDocs(q);

  return snap.docs
    .map((row) => ({
      id: row.id,
      ...(row.data() as Omit<BillingServiceDoc, "id">),
    }))
    .filter((row) => row.riderUid === riderUid)
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const listClientCharges = async (
  centerId: string,
  riderUid: string,
  period?: BillingPeriod
): Promise<ChargeDoc[]> => {
  const rows = period
    ? await listChargesByPeriod(centerId, period)
    : await listAllCharges(centerId);

  return rows
    .filter((row) => row.riderUid === riderUid)
    .sort((a, b) => {
      const aMs = toDate(a.dueDate)?.getTime() ?? 0;
      const bMs = toDate(b.dueDate)?.getTime() ?? 0;
      return aMs - bMs;
    });
};

export const getMonthlySummary = async (
  centerId: string,
  months = 6
): Promise<MonthlySummaryRow[]> => {
  const parsedMonths = Math.max(1, months);
  const now = new Date();
  const monthKeys: string[] = [];

  for (let i = 0; i < parsedMonths; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(keyFromDate(date));
  }

  const [charges, payments] = await Promise.all([
    listAllCharges(centerId),
    listAllPayments(centerId),
  ]);

  const map = new Map<
    string,
    {
      billed: number;
      collected: number;
      pending: number;
      overdue: number;
      riders: Set<string>;
    }
  >();

  monthKeys.forEach((key) => {
    map.set(key, {
      billed: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
      riders: new Set<string>(),
    });
  });

  charges.forEach((charge) => {
    const key = deriveChargePeriodKey(charge);
    if (!key || !map.has(key)) return;

    const row = map.get(key);
    if (!row) return;

    const amount = toNumber(charge.amount);
    const pending = chargeRemaining(charge);
    const overdue = chargeOverdueAmount(charge, now);

    row.billed += amount;
    row.pending += pending;
    row.overdue += overdue;
    if (charge.riderUid) {
      row.riders.add(charge.riderUid);
    }
  });

  payments.forEach((payment) => {
    const key = derivePaymentPeriodKey(payment);
    if (!key || !map.has(key)) return;

    const row = map.get(key);
    if (!row) return;

    row.collected += toNumber(payment.amount);
    if (payment.riderUid) {
      row.riders.add(payment.riderUid);
    }
  });

  return monthKeys.map((key) => {
    const period = keyToPeriod(key);
    const row = map.get(key);
    return {
      periodKey: key,
      periodLabel: monthLabel(period),
      billed: row?.billed ?? 0,
      collected: row?.collected ?? 0,
      pending: row?.pending ?? 0,
      overdue: row?.overdue ?? 0,
      clientCount: row?.riders.size ?? 0,
    };
  });
};

export const getMonthlyClientBreakdown = async (
  centerId: string,
  period: BillingPeriod
): Promise<MonthlyClientBreakdownRow[]> => {
  const now = new Date();
  const [staysSnap, periodCharges, memberSnap] = await Promise.all([
    getDocs(query(horseStaysCollection(centerId), where("active", "==", true))),
    listChargesByPeriod(centerId, period),
    getDocs(membersCollection(centerId)),
  ]);

  const activeStays = staysSnap.docs.map((row) =>
    row.data() as { riderUid?: string; horseId?: string; active?: boolean }
  );

  const riderSet = new Set<string>();
  const horseMap = new Map<string, Set<string>>();

  activeStays.forEach((stay) => {
    if (!stay.active || !stay.riderUid) return;
    riderSet.add(stay.riderUid);
    if (!horseMap.has(stay.riderUid)) {
      horseMap.set(stay.riderUid, new Set<string>());
    }
    if (stay.horseId) {
      horseMap.get(stay.riderUid)?.add(stay.horseId);
    }
  });

  const riderLabelMap = new Map<string, string>();
  memberSnap.docs.forEach((row) => {
    const data = row.data() as { displayName?: string; email?: string };
    riderLabelMap.set(row.id, data.displayName || data.email || row.id);
  });

  const chargesByRider = new Map<string, ChargeDoc[]>();
  periodCharges.forEach((charge) => {
    if (!charge.riderUid || !riderSet.has(charge.riderUid)) return;
    if (!chargesByRider.has(charge.riderUid)) {
      chargesByRider.set(charge.riderUid, []);
    }
    chargesByRider.get(charge.riderUid)?.push(charge);
  });

  return Array.from(riderSet)
    .map((riderUid) => {
      const charges = chargesByRider.get(riderUid) ?? [];
      const monthAmount = charges.reduce((sum, row) => sum + toNumber(row.amount), 0);
      const monthPending = charges.reduce(
        (sum, row) => sum + chargeRemaining(row),
        0
      );
      const monthOverdue = charges.reduce(
        (sum, row) => sum + chargeOverdueAmount(row, now),
        0
      );
      const monthPaid = Math.max(0, monthAmount - monthPending);

      let globalStatus: MonthlyClientStatus = "NO_CHARGES";
      if (monthOverdue > 0) {
        globalStatus = "OVERDUE";
      } else if (monthPending > 0 && monthPaid > 0) {
        globalStatus = "PARTIAL";
      } else if (monthPending > 0) {
        globalStatus = "PENDING";
      } else if (monthAmount > 0) {
        globalStatus = "PAID";
      }

      const nextDueDate = charges
        .map((row) => ({
          date: toDate(row.dueDate),
          remaining: chargeRemaining(row),
        }))
        .filter((row): row is { date: Date; remaining: number } =>
          Boolean(row.date) && row.remaining > 0
        )
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.date ?? null;

      const horseIds = Array.from(horseMap.get(riderUid) ?? []);

      return {
        riderUid,
        riderLabel: riderLabelMap.get(riderUid) ?? riderUid,
        horseIds,
        horseCount: horseIds.length,
        monthAmount,
        monthPaid,
        monthPending,
        monthOverdue,
        globalStatus,
        nextDueDate,
      };
    })
    .sort((a, b) => a.riderLabel.localeCompare(b.riderLabel));
};

export const registerPayment = async (
  centerId: string,
  payload: RegisterPaymentInput
): Promise<string> => {
  const riderUid = payload.riderUid.trim();
  const amount = toNumber(payload.amount);
  if (!riderUid) {
    throw new Error("riderUid es obligatorio.");
  }
  if (amount <= 0) {
    throw new Error("El importe del pago debe ser mayor que 0.");
  }

  const periodKey = periodToKey(payload.period);

  const paymentRef = await addDoc(paymentsCollection(centerId), {
    riderUid,
    horseId: payload.horseId?.trim() || null,
    chargeId: payload.chargeId?.trim() || null,
    periodKey,
    amount,
    method: payload.method?.trim() || "manual",
    notes: payload.notes?.trim() || null,
    paidAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  if (payload.chargeId) {
    const chargeRef = doc(db, "centers", centerId, "charges", payload.chargeId);
    const chargeSnap = await getDoc(chargeRef);
    if (chargeSnap.exists()) {
      const charge = chargeSnap.data() as Omit<ChargeDoc, "id">;
      const chargeAmount = toNumber(charge.amount);
      const currentPaid = toNumber(charge.paidAmount);
      const nextPaid = Math.min(chargeAmount, currentPaid + amount);
      const remaining = Math.max(0, chargeAmount - nextPaid);
      const nextStatus: ChargeStatus =
        remaining <= 0 ? "PAID" : nextPaid > 0 ? "PARTIAL" : "PENDING";

      await updateDoc(chargeRef, {
        paidAmount: nextPaid,
        remainingAmount: remaining,
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    }
  }

  return paymentRef.id;
};

export const addOneOffCharge = async (
  centerId: string,
  payload: AddOneOffChargeInput
): Promise<string> => {
  const riderUid = payload.riderUid.trim();
  const description = payload.description.trim();
  const amount = toNumber(payload.amount);

  if (!riderUid) {
    throw new Error("riderUid es obligatorio.");
  }
  if (!description) {
    throw new Error("La descripcion del cargo es obligatoria.");
  }
  if (amount <= 0) {
    throw new Error("El importe del cargo debe ser mayor que 0.");
  }

  const periodKey = periodToKey(payload.period);
  const dueDate = payload.dueDate
    ? Timestamp.fromDate(payload.dueDate)
    : Timestamp.fromDate(new Date(payload.period.year, payload.period.month - 1, 10));

  const chargeRef = await addDoc(chargesCollection(centerId), {
    riderUid,
    horseId: payload.horseId?.trim() || null,
    serviceId: null,
    periodKey,
    description,
    amount,
    paidAmount: 0,
    remainingAmount: amount,
    status: "PENDING" as ChargeStatus,
    dueDate,
    issuedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return chargeRef.id;
};

export const generateMonthlyCharges = async (
  centerId: string,
  period: BillingPeriod
): Promise<{ created: number; skipped: number }> => {
  const periodKey = periodToKey(period);
  const [servicesSnap, existingCharges] = await Promise.all([
    getDocs(query(billingServicesCollection(centerId), where("active", "==", true))),
    listChargesByPeriod(centerId, period),
  ]);

  const services = servicesSnap.docs.map((row) => ({
    id: row.id,
    ...(row.data() as Omit<BillingServiceDoc, "id">),
  }));

  const existingSet = new Set(
    existingCharges.map(
      (charge) =>
        `${charge.serviceId ?? ""}|${charge.riderUid}|${charge.horseId ?? ""}|${periodKey}`
    )
  );

  const batch = writeBatch(db);
  let created = 0;
  let skipped = 0;

  services.forEach((service) => {
    const dedupeKey = `${service.id}|${service.riderUid}|${service.horseId ?? ""}|${periodKey}`;
    if (existingSet.has(dedupeKey)) {
      skipped += 1;
      return;
    }

    const dueDay = Math.min(28, Math.max(1, Number(service.dueDay ?? 10)));
    const dueDate = Timestamp.fromDate(
      new Date(period.year, period.month - 1, dueDay)
    );

    const chargeRef = doc(chargesCollection(centerId));
    const amount = toNumber(service.amount);

    batch.set(chargeRef, {
      riderUid: service.riderUid,
      horseId: service.horseId ?? null,
      serviceId: service.id,
      periodKey,
      description: service.name,
      amount,
      paidAmount: 0,
      remainingAmount: amount,
      status: "PENDING" as ChargeStatus,
      dueDate,
      issuedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    created += 1;
  });

  if (created > 0) {
    await batch.commit();
  }

  return { created, skipped };
};

export const isDateInsidePeriod = (date: Date, period: BillingPeriod): boolean =>
  isSamePeriod(date, period);

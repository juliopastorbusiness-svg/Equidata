import {
  Timestamp,
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { FirestoreStudentPaymentDoc } from "@/lib/services/firestoreTypes";
import { mapStudentPayment } from "@/lib/services/mappers";
import { StudentPayment } from "@/lib/services/types";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  ensurePositiveNumber,
  optionalStringOrNull,
  optionalTimestampOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreatePaymentInput = {
  studentId: string;
  reservationId?: string;
  concept: string;
  type: StudentPayment["type"];
  amount: number;
  date: Date;
  paymentMethod: StudentPayment["paymentMethod"];
  status?: StudentPayment["status"];
  notes?: string;
};

export type UpdatePaymentInput = Partial<CreatePaymentInput>;

const paymentsCollection = (centerId: string) =>
  centerCollection<FirestoreStudentPaymentDoc>(centerId, "studentPayments");

const paymentDoc = (centerId: string, paymentId: string) =>
  centerDocument<FirestoreStudentPaymentDoc>(centerId, "studentPayments", paymentId);

export const getPayments = async (
  centerId: string,
  studentId?: string
): Promise<StudentPayment[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const baseQuery = studentId
    ? query(
        paymentsCollection(normalizedCenterId),
        where("studentId", "==", studentId),
        orderBy("date", "desc")
      )
    : query(paymentsCollection(normalizedCenterId), orderBy("date", "desc"));

  const snapshot = await getDocs(baseQuery);
  return snapshot.docs.map((row) => mapStudentPayment(row.id, row.data(), normalizedCenterId));
};

export const getPaymentById = async (
  centerId: string,
  paymentId: string
): Promise<StudentPayment | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(paymentDoc(normalizedCenterId, paymentId));
  if (!snapshot.exists()) return null;
  return mapStudentPayment(snapshot.id, snapshot.data(), normalizedCenterId);
};

export const createPayment = async (
  centerId: string,
  input: CreatePaymentInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const ref = await addDoc(paymentsCollection(normalizedCenterId), {
    studentId: assertRequiredString("studentId", input.studentId),
    reservationId: optionalStringOrNull(input.reservationId),
    concept: assertRequiredString("El concepto", input.concept),
    type: input.type,
    amount: ensurePositiveNumber("El importe", input.amount),
    date: Timestamp.fromDate(input.date),
    paymentMethod: input.paymentMethod,
    status: input.status ?? "PENDING",
    notes: optionalStringOrNull(input.notes),
    ...withCreateAudit(),
  });

  return ref.id;
};

export const updatePayment = async (
  centerId: string,
  paymentId: string,
  input: UpdatePaymentInput
): Promise<void> => {
  const patch: Partial<FirestoreStudentPaymentDoc> = {};

  if (typeof input.studentId === "string") {
    patch.studentId = assertRequiredString("studentId", input.studentId);
  }
  if ("reservationId" in input) patch.reservationId = optionalStringOrNull(input.reservationId);
  if (typeof input.concept === "string") {
    patch.concept = assertRequiredString("El concepto", input.concept);
  }
  if (input.type) patch.type = input.type;
  if (typeof input.amount === "number") {
    patch.amount = ensurePositiveNumber("El importe", input.amount);
  }
  if (input.date) patch.date = Timestamp.fromDate(input.date);
  if (input.paymentMethod) patch.paymentMethod = input.paymentMethod;
  if (input.status) patch.status = input.status;
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);

  await updateDoc(paymentDoc(centerId, paymentId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deletePayment = async (centerId: string, paymentId: string): Promise<void> => {
  await deleteDoc(paymentDoc(centerId, paymentId));
};

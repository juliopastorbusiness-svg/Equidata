import { addDoc, deleteDoc, getDoc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { FirestoreStudentDoc } from "@/lib/services/firestoreTypes";
import { mapStudent } from "@/lib/services/mappers";
import { Student } from "@/lib/services/types";
import {
  assertCenterId,
  assertRequiredString,
  centerCollection,
  centerDocument,
  optionalStringOrNull,
  optionalTimestampOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreateStudentInput = {
  firstName: string;
  lastName: string;
  birthDate?: Date;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  level?: Student["level"];
  status?: Student["status"];
  notes?: string;
};

export type UpdateStudentInput = Partial<CreateStudentInput>;

const studentsCollection = (centerId: string) =>
  centerCollection<FirestoreStudentDoc>(centerId, "students");

const studentDoc = (centerId: string, studentId: string) =>
  centerDocument<FirestoreStudentDoc>(centerId, "students", studentId);

export const getStudents = async (centerId: string): Promise<Student[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(studentsCollection(normalizedCenterId), orderBy("lastName", "asc"))
  );

  return snapshot.docs.map((row) => mapStudent(row.id, row.data(), normalizedCenterId));
};

export const getStudentById = async (
  centerId: string,
  studentId: string
): Promise<Student | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(studentDoc(normalizedCenterId, studentId));
  if (!snapshot.exists()) return null;
  return mapStudent(snapshot.id, snapshot.data(), normalizedCenterId);
};

export const createStudent = async (
  centerId: string,
  input: CreateStudentInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const ref = await addDoc(studentsCollection(normalizedCenterId), {
    firstName: assertRequiredString("El nombre", input.firstName),
    lastName: assertRequiredString("El apellido", input.lastName),
    birthDate: optionalTimestampOrNull(input.birthDate),
    email: optionalStringOrNull(input.email),
    phone: optionalStringOrNull(input.phone),
    emergencyContact: optionalStringOrNull(input.emergencyContact),
    level: input.level ?? "INITIATION",
    status: input.status ?? "ACTIVE",
    notes: optionalStringOrNull(input.notes),
    ...withCreateAudit(),
  });

  return ref.id;
};

export const updateStudent = async (
  centerId: string,
  studentId: string,
  input: UpdateStudentInput
): Promise<void> => {
  const patch: Partial<FirestoreStudentDoc> = {};

  if (typeof input.firstName === "string") {
    patch.firstName = assertRequiredString("El nombre", input.firstName);
  }
  if (typeof input.lastName === "string") {
    patch.lastName = assertRequiredString("El apellido", input.lastName);
  }
  if ("birthDate" in input) patch.birthDate = optionalTimestampOrNull(input.birthDate);
  if ("email" in input) patch.email = optionalStringOrNull(input.email);
  if ("phone" in input) patch.phone = optionalStringOrNull(input.phone);
  if ("emergencyContact" in input) {
    patch.emergencyContact = optionalStringOrNull(input.emergencyContact);
  }
  if (input.level) patch.level = input.level;
  if (input.status) patch.status = input.status;
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);

  await updateDoc(studentDoc(centerId, studentId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deleteStudent = async (centerId: string, studentId: string): Promise<void> => {
  await deleteDoc(studentDoc(centerId, studentId));
};

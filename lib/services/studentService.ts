import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirestoreClientDoc, FirestoreStudentDoc } from "@/lib/services/firestoreTypes";
import { mapClient, mapStudent } from "@/lib/services/mappers";
import { Client, Student } from "@/lib/services/types";
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

const clientsCollection = () => collection(db, "clients");

const splitFullName = (fullName: string) => {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || fullName.trim(),
    lastName: rest.join(" "),
  };
};

const clientToStudent = (client: Client): Student => {
  const name = splitFullName(client.fullName);

  return {
    id: client.id,
    centerId: client.centerId,
    firstName: name.firstName,
    lastName: name.lastName,
    email: client.email,
    phone: client.phone,
    level: "INITIATION",
    status: client.status,
    notes: client.notes,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
};

const getStudentClients = async (centerId: string): Promise<Student[]> => {
  const snapshot = await getDocs(
    query(
      clientsCollection(),
      where("centerId", "==", centerId)
    )
  );

  return snapshot.docs
    .map((row) => mapClient(row.id, row.data() as FirestoreClientDoc))
    .filter((client) => client.isStudent)
    .map(clientToStudent)
    .sort((left, right) =>
      `${left.lastName} ${left.firstName}`.localeCompare(
        `${right.lastName} ${right.firstName}`,
        "es",
        { sensitivity: "base" }
      )
    );
};

export const getStudents = async (centerId: string): Promise<Student[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const [snapshot, clientStudents] = await Promise.all([
    getDocs(query(studentsCollection(normalizedCenterId), orderBy("lastName", "asc"))),
    getStudentClients(normalizedCenterId),
  ]);

  const legacyStudents = snapshot.docs.map((row) => mapStudent(row.id, row.data(), normalizedCenterId));
  const legacyIds = new Set(legacyStudents.map((student) => student.id));

  return [...legacyStudents, ...clientStudents.filter((student) => !legacyIds.has(student.id))].sort(
    (left, right) =>
      `${left.lastName} ${left.firstName}`.localeCompare(
        `${right.lastName} ${right.firstName}`,
        "es",
        { sensitivity: "base" }
      )
  );
};

export const getStudentById = async (
  centerId: string,
  studentId: string
): Promise<Student | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(studentDoc(normalizedCenterId, studentId));
  if (!snapshot.exists()) {
    const clientSnapshot = await getDoc(doc(clientsCollection(), assertRequiredString("studentId", studentId)));
    if (!clientSnapshot.exists()) return null;

    const client = mapClient(clientSnapshot.id, clientSnapshot.data() as FirestoreClientDoc);
    if (client.centerId !== normalizedCenterId || !client.isStudent) return null;

    return clientToStudent(client);
  }
  return mapStudent(snapshot.id, snapshot.data(), normalizedCenterId);
};

export const getStudentOptions = async (
  centerId: string
): Promise<Array<{ id: string; label: string }>> => {
  const students = await getStudents(centerId);

  return students.map((student) => ({
    id: student.id,
    label: `${student.firstName} ${student.lastName}`.trim(),
  }));
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

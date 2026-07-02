import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirestoreClientDoc } from "@/lib/services/firestoreTypes";
import { mapClient } from "@/lib/services/mappers";
import { Client } from "@/lib/services/types";
import {
  assertCenterId,
  assertRequiredString,
  optionalStringOrNull,
  withCreateAudit,
  withUpdateAudit,
} from "@/lib/services/shared";

export type CreateClientInput = {
  fullName: string;
  phone?: string;
  email?: string;
  dni?: string;
  address?: string;
  status?: Client["status"];
  isStudent?: boolean;
  isOwner?: boolean;
  notes?: string;
};

export type UpdateClientInput = Partial<CreateClientInput>;

const clientsCollection = () => collection(db, "clients");

const clientDoc = (clientId: string) =>
  doc(db, "clients", assertRequiredString("clientId", clientId));

const assertClientBelongsToCenter = async (
  centerId: string,
  clientId: string
): Promise<FirestoreClientDoc> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(clientDoc(clientId));

  if (!snapshot.exists()) {
    throw new Error("Cliente no encontrado.");
  }

  const data = snapshot.data() as FirestoreClientDoc;
  if (data.centerId !== normalizedCenterId) {
    throw new Error("El cliente no pertenece al centro activo.");
  }

  return data;
};

export const getClients = async (centerId: string): Promise<Client[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDocs(
    query(clientsCollection(), where("centerId", "==", normalizedCenterId))
  );

  return snapshot.docs
    .map((row) => mapClient(row.id, row.data() as FirestoreClientDoc))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" }));
};

export const getClientById = async (
  centerId: string,
  clientId: string
): Promise<Client | null> => {
  const normalizedCenterId = assertCenterId(centerId);
  const snapshot = await getDoc(clientDoc(clientId));

  if (!snapshot.exists()) return null;

  const client = mapClient(snapshot.id, snapshot.data() as FirestoreClientDoc);
  return client.centerId === normalizedCenterId ? client : null;
};

export const createClient = async (
  centerId: string,
  input: CreateClientInput
): Promise<string> => {
  const normalizedCenterId = assertCenterId(centerId);
  const ref = await addDoc(clientsCollection(), {
    centerId: normalizedCenterId,
    fullName: assertRequiredString("El nombre completo", input.fullName),
    phone: optionalStringOrNull(input.phone),
    email: optionalStringOrNull(input.email),
    dni: optionalStringOrNull(input.dni),
    address: optionalStringOrNull(input.address),
    status: input.status ?? "ACTIVE",
    isStudent: input.isStudent ?? false,
    isOwner: input.isOwner ?? false,
    notes: optionalStringOrNull(input.notes),
    ...withCreateAudit(),
  });

  return ref.id;
};

export const updateClient = async (
  centerId: string,
  clientId: string,
  input: UpdateClientInput
): Promise<void> => {
  await assertClientBelongsToCenter(centerId, clientId);

  const patch: Partial<FirestoreClientDoc> = {};

  if (typeof input.fullName === "string") {
    patch.fullName = assertRequiredString("El nombre completo", input.fullName);
  }
  if ("phone" in input) patch.phone = optionalStringOrNull(input.phone);
  if ("email" in input) patch.email = optionalStringOrNull(input.email);
  if ("dni" in input) patch.dni = optionalStringOrNull(input.dni);
  if ("address" in input) patch.address = optionalStringOrNull(input.address);
  if (input.status) patch.status = input.status;
  if ("isStudent" in input) patch.isStudent = input.isStudent ?? false;
  if ("isOwner" in input) patch.isOwner = input.isOwner ?? false;
  if ("notes" in input) patch.notes = optionalStringOrNull(input.notes);

  await updateDoc(clientDoc(clientId), {
    ...patch,
    ...withUpdateAudit(),
  });
};

export const deleteClient = async (centerId: string, clientId: string): Promise<void> => {
  await assertClientBelongsToCenter(centerId, clientId);
  await deleteDoc(clientDoc(clientId));
};

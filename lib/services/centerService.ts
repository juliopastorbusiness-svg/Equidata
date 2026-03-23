import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAt,
  endAt,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { mapCenter } from "@/lib/services/mappers";
import { FirestoreCenterDoc } from "@/lib/services/firestoreTypes";
import { Center } from "@/lib/services/types";

export type SearchCentersParams = {
  query?: string;
  city?: string;
  status?: Center["status"];
  limit?: number;
};

const normalize = (value?: string) =>
  value
    ?.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") ?? "";

export const searchCenters = async (params: SearchCentersParams = {}): Promise<Center[]> => {
  const city = params.city?.trim().toLowerCase();
  const requestedLimit = params.limit && params.limit > 0 ? params.limit : 24;
  const searchTerm = normalize(params.query);

  console.log("[searchCenters] texto buscado:", {
    query: searchTerm,
    city,
    status: params.status,
  });

  if (!searchTerm) {
    console.log("[searchCenters] cantidad de documentos obtenidos:", 0);
    console.log("[searchCenters] datos devueltos:", []);
    return [];
  }

  const constraints: QueryConstraint[] = [
    orderBy("nameLower", "asc"),
    startAt(searchTerm),
    endAt(`${searchTerm}\uf8ff`),
    limit(requestedLimit),
  ];

  const prefixSnap = await getDocs(query(collection(db, "centers"), ...constraints));
  console.log("[searchCenters] cantidad de documentos obtenidos:", prefixSnap.docs.length);

  const filterRows = (rows: Array<{ id: string; data: FirestoreCenterDoc }>) =>
    rows
      .map((row) => ({
        center: mapCenter(row.id, row.data),
        raw: row.data,
      }))
      .filter(({ center, raw }) => {
        const rawName = normalize(raw.nameLower ?? raw.name ?? center.name);
        const cityValue = normalize(raw.city ?? center.city ?? "");
        const matchesName = rawName.startsWith(searchTerm);
        const matchesCity = city ? !cityValue || cityValue.includes(normalize(city)) : true;
        const matchesStatus = params.status ? center.status === params.status : true;
        const matchesActiveFlag = raw.isActive === false ? false : true;
        return matchesName && matchesCity && matchesStatus && matchesActiveFlag;
      })
      .map(({ center }) => center)
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .slice(0, requestedLimit);

  let results = filterRows(
    prefixSnap.docs.map((row) => ({
      id: row.id,
      data: row.data() as FirestoreCenterDoc,
    }))
  );

  if (results.length === 0) {
    console.log("[searchCenters] sin resultados por nameLower, activando fallback legacy");
    const fallbackSnap = await getDocs(
      query(collection(db, "centers"), orderBy("name", "asc"), limit(requestedLimit * 5))
    );
    results = filterRows(
      fallbackSnap.docs.map((row) => ({
        id: row.id,
        data: row.data() as FirestoreCenterDoc,
      }))
    );
  }

  console.log("[searchCenters] datos devueltos:", results);
  return results;
};

export const getCenterById = async (centerId: string): Promise<Center | null> => {
  const snap = await getDoc(doc(db, "centers", centerId));
  if (!snap.exists()) return null;
  return mapCenter(snap.id, snap.data() as FirestoreCenterDoc);
};

import { getDocs, orderBy, query } from "firebase/firestore";
import { Arena } from "@/lib/firestore/arenas";
import { centerCollection } from "@/lib/services/shared";

type FirestoreArenaDoc = Omit<Arena, "id">;

export const getArenasByCenter = async (centerId: string): Promise<Arena[]> => {
  const snapshot = await getDocs(
    query(centerCollection<FirestoreArenaDoc>(centerId, "arenas"), orderBy("name", "asc"))
  );

  return snapshot.docs.map((row) => ({
    id: row.id,
    ...(row.data() as FirestoreArenaDoc),
  }));
};

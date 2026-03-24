"use client";

import { auth, db } from "@/lib/firebase";
import { FirestoreUserProfileDoc } from "@/lib/services/firestoreTypes";
import { mapUserProfile } from "@/lib/services/mappers";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { UserProfile } from "@/lib/auth/types";

type UseAuthUserState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
};

export const useAuthUser = (): UseAuthUserState => {
  const [state, setState] = useState<UseAuthUserState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", firebaseUser.uid));
        const profile = userSnap.exists()
          ? mapUserProfile(
              userSnap.id,
              userSnap.data() as FirestoreUserProfileDoc
            )
          : null;

        setState({
          user: firebaseUser,
          profile,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("Error leyendo users/{uid}:", err);
        setState({
          user: firebaseUser,
          profile: null,
          loading: false,
          error: "No se pudo cargar el perfil de usuario.",
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
};

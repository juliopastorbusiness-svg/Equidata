"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CenterScopedRole } from "@/lib/auth/types";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { isDev } from "@/lib/env";
import {
  CenterMembership,
  getCenterMemberships,
  pickLegacyRoleHome,
  pickPreferredCenterId,
} from "@/lib/firestore/centers";

type UseRequireCenterRoleResult = {
  loading: boolean;
  error: string | null;
  isAllowed: boolean;
  isDevBypass: boolean;
  userId: string | null;
  activeCenterId: string | null;
  activeCenterName: string | null;
  activeCenterRole: CenterScopedRole | null;
  memberships: CenterMembership[];
  setActiveCenterId: (centerId: string) => void;
};

const devMode = isDev();

export const useRequireCenterRole = (
  rolesAllowed: CenterScopedRole[]
): UseRequireCenterRoleResult => {
  const router = useRouter();
  const { user, profile, loading: loadingAuth, error: authError } = useAuthUser();
  const [memberships, setMemberships] = useState<CenterMembership[]>([]);
  const [activeCenterId, setActiveCenterIdState] = useState<string | null>(null);
  const [loadingMemberships, setLoadingMemberships] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingAuth) return;

    if (!user) {
      setMemberships([]);
      setActiveCenterIdState(null);
      setLoadingMemberships(false);
      return;
    }

    let cancelled = false;

    const loadMemberships = async () => {
      setLoadingMemberships(true);
      setError(null);
      try {
        const data = await getCenterMemberships(user.uid);
        if (cancelled) return;

        setMemberships(data);

        const localStorageKey = `equidata:active-center:${user.uid}`;
        const localPreferred =
          typeof window !== "undefined"
            ? window.localStorage.getItem(localStorageKey)
            : null;

        const preferred = pickPreferredCenterId(data, [
          profile?.centerId,
          localPreferred,
        ]);

        setActiveCenterIdState(preferred);
      } catch (err) {
        console.error("Error resolviendo centros del usuario:", err);
        if (cancelled) return;
        setError("No se pudieron cargar los centros asociados.");
      } finally {
        if (!cancelled) {
          setLoadingMemberships(false);
        }
      }
    };

    loadMemberships();

    return () => {
      cancelled = true;
    };
  }, [loadingAuth, user, profile?.centerId]);

  const setActiveCenterId = (centerId: string) => {
    if (!user) return;
    setActiveCenterIdState(centerId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`equidata:active-center:${user.uid}`, centerId);
    }
  };

  const activeMembership = useMemo(
    () =>
      activeCenterId
        ? memberships.find((membership) => membership.centerId === activeCenterId) ??
          null
        : null,
    [memberships, activeCenterId]
  );

  const roleAllowed =
    activeMembership && rolesAllowed.includes(activeMembership.role);
  const isAllowed = Boolean(roleAllowed) || devMode;

  useEffect(() => {
    if (devMode) return;
    if (loadingAuth || loadingMemberships) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!roleAllowed) {
      router.replace(pickLegacyRoleHome(profile));
    }
  }, [
    loadingAuth,
    loadingMemberships,
    profile,
    roleAllowed,
    router,
    user,
  ]);

  return {
    loading: loadingAuth || loadingMemberships,
    error: authError ?? error,
    isAllowed,
    isDevBypass: devMode && !roleAllowed,
    userId: user?.uid ?? null,
    activeCenterId,
    activeCenterName: activeMembership?.centerName ?? null,
    activeCenterRole: activeMembership?.role ?? null,
    memberships,
    setActiveCenterId,
  };
};

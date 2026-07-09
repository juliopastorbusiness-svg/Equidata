"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ActiveCenter = {
  id: string;
  name: string;
};

type ActiveCenterContextValue = {
  activeCenter: ActiveCenter | null;
  setActiveCenter: (center: ActiveCenter | null) => void;
  loading: boolean;
};

type ActiveCenterProviderProps = {
  centers?: ActiveCenter[];
  children: ReactNode;
};

const storageKey = "equidata_active_center";

export const ActiveCenterContext = createContext<ActiveCenterContextValue | null>(null);

export function ActiveCenterProvider({
  centers = [],
  children,
}: ActiveCenterProviderProps) {
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null
  );

  const centerMap = useMemo(
    () => new Map(centers.map((center) => [center.id, center] as const)),
    [centers]
  );

  const activeCenter = useMemo(() => {
    if (!centers.length) return null;
    if (centers.length === 1) return centers[0];
    return selectedCenterId ? centerMap.get(selectedCenterId) ?? centers[0] : centers[0];
  }, [centerMap, centers, selectedCenterId]);

  const setActiveCenter = useCallback((center: ActiveCenter | null) => {
    setSelectedCenterId(center?.id ?? null);

    if (typeof window === "undefined") return;
    if (center) {
      window.localStorage.setItem(storageKey, center.id);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeCenter) {
      window.localStorage.setItem(storageKey, activeCenter.id);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  }, [activeCenter]);

  const value = useMemo(
    () => ({
      activeCenter,
      setActiveCenter,
      loading: false,
    }),
    [activeCenter, setActiveCenter]
  );

  return (
    <ActiveCenterContext.Provider value={value}>
      {children}
    </ActiveCenterContext.Provider>
  );
}

export function useActiveCenter() {
  const context = useContext(ActiveCenterContext);
  if (!context) {
    throw new Error("useActiveCenter debe usarse dentro de ActiveCenterProvider.");
  }
  return context;
}

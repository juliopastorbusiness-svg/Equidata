"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db, storage } from "@/lib/firebase";
import {
  addDoc,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Link from "next/link";
import { ProfessionalCenterSearch } from "@/components/dashboard/pro/ProfessionalCenterSearch";
import { ProfessionalRequestModal } from "@/components/dashboard/pro/ProfessionalRequestModal";
import { ProfessionalRequestsList } from "@/components/dashboard/pro/ProfessionalRequestsList";
import { ProCenterRequestState, ProCenterSearchResult } from "@/components/dashboard/pro/types";
import {
  ActiveCenter,
  ActiveCenterProvider,
  useActiveCenter,
} from "@/contexts/ActiveCenterContext";
import { useProfessionalPermissions } from "@/hooks/useProfessionalPermissions";
import { isDev } from "@/lib/env";
import {
  ProfessionalRequest,
  cancelProfessionalRequest,
  createProfessionalRequest,
  subscribeProfessionalRequests,
} from "@/lib/services/professionalRequestService";
import { getUserCenterMemberships } from "@/lib/services/memberService";
import { CenterMember } from "@/lib/services/types";

type Center = {
  id: string;
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  province?: string;
  logoUrl?: string;
  profileImageUrl?: string;
  type?: string;
  centerType?: string;
  horseCount?: number;
  professionalCount?: number;
};

type Horse = {
  id: string;
  name: string;
  age: number;
  breed?: string;
  centerId: string;
  ownerId: string;
  photoUrl?: string;
  createdAt?: Timestamp;
};

type UserInfo = {
  name?: string;
  fullName?: string;
  displayName?: string;
  email?: string;
  role?: string;
  proType?: string | null;
  profession?: string | null;
  avatarUrl?: string;
  photoURL?: string;
  verified?: boolean;
  verificationStatus?: string | null;
};

type MedicalAttachment = {
  url: string;
  name: string;
  type: string;
};

type MedicalNote = {
  id: string;
  horseId: string;
  proId: string;
  createdAt: Timestamp;
  note: string;
  attachments?: MedicalAttachment[];
};

type CenterStats = {
  horses: number;
  professionals: number;
};

export default function ProDashboardPage() {
  const router = useRouter();
  const devMode = isDev();

  const [userId, setUserId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [centers, setCenters] = useState<Center[]>([]);
  const [memberships, setMemberships] = useState<CenterMember[]>([]);
  const [centerStats, setCenterStats] = useState<Record<string, CenterStats>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [professionalRequests, setProfessionalRequests] = useState<ProfessionalRequest[]>([]);
  const [selectedRequestCenter, setSelectedRequestCenter] = useState<ProCenterSearchResult | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [activeCenterId, setActiveCenterId] = useState<string | null>(null);

  const [horses, setHorses] = useState<Horse[]>([]);
  const [activeHorseId, setActiveHorseId] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState("");
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [notes, setNotes] = useState<MedicalNote[]>([]);
  const [proNotes, setProNotes] = useState<MedicalNote[]>([]);
  const [historyHorses, setHistoryHorses] = useState<Horse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cachedHistoryHorses, setCachedHistoryHorses] = useState<Horse[]>([]);
  const [cachedLastNotes, setCachedLastNotes] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as UserInfo;
          setUserInfo(data);

          // En PROD, si NO es pro lo redirigimos por rol.
          // En DEV permitimos entrar para pruebas manuales.
          if (!devMode && data.role && data.role !== "pro") {
            if (data.role === "rider") {
              router.push("/dashboard/rider");
            } else if (data.role === "centerOwner") {
              router.push("/dashboard/center");
            }
            return;
          }
        }

        const [centersSnap, membershipRows] = await Promise.all([
          getDocs(collection(db, "centers")),
          getUserCenterMemberships(user.uid),
        ]);
        const centersData: Center[] = centersSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Center, "id">),
        }));
        setCenters(centersData);
        setMemberships(membershipRows);
      } catch (err) {
        console.error("Error cargando usuario/centros:", err);
        setError("No se pudieron cargar tus datos.");
      } finally {
        setLoadingInitial(false);
      }
    });

    return () => unsub();
  }, [devMode, router]);

  useEffect(() => {
    if (centers.length === 0) {
      setCenterStats({});
      return;
    }

    const loadCenterStats = async () => {
      try {
        const entries = await Promise.all(
          centers.map(async (center) => {
            const [horsesSnap, membersSnap] = await Promise.all([
              getDocs(query(collection(db, "horses"), where("centerId", "==", center.id))),
              getDocs(collection(db, "centers", center.id, "members")),
            ]);
            const professionals = membersSnap.docs.filter((memberDoc) => {
              const data = memberDoc.data() as { role?: string; status?: string };
              return data.status === "active" && data.role === "pro";
            }).length;
            return [center.id, { horses: horsesSnap.size, professionals }] as const;
          })
        );
        setCenterStats(Object.fromEntries(entries));
      } catch (statsError) {
        console.error("Error cargando estadisticas de centros:", statsError);
      }
    };

    void loadCenterStats();
  }, [centers]);

  useEffect(() => {
    if (!activeCenterId) {
      setHorses([]);
      setActiveHorseId(null);
      return;
    }

    const q = query(
      collection(db, "horses"),
      where("centerId", "==", activeCenterId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: Horse[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Horse, "id">),
      }));
      setHorses(data);
      if (!activeHorseId && data.length > 0) {
        setActiveHorseId(data[0].id);
      }
    });

    return () => unsub();
  }, [activeCenterId, activeHorseId]);

  useEffect(() => {
    if (!activeHorseId) {
      setNotes([]);
      return;
    }

    const q = query(
      collection(db, "medicalNotes"),
      where("horseId", "==", activeHorseId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: MedicalNote[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MedicalNote, "id">),
      }));
      setNotes(data);
    });

    return () => unsub();
  }, [activeHorseId]);

  useEffect(() => {
    if (!userId) {
      setProNotes([]);
      return;
    }

    const q = query(
      collection(db, "medicalNotes"),
      where("proId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: MedicalNote[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MedicalNote, "id">),
      }));
      setProNotes(data);
    });

    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfessionalRequests([]);
      return;
    }

    return subscribeProfessionalRequests(
      userId,
      setProfessionalRequests,
      (requestError) => {
        console.error("Error cargando solicitudes profesionales:", requestError);
        setError("No se pudieron cargar tus solicitudes profesionales.");
      }
    );
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    try {
      const raw = localStorage.getItem(`pro-history-${userId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        horses?: Horse[];
        lastNotes?: Record<string, number>;
      };
      if (parsed.horses) {
        setCachedHistoryHorses(parsed.horses);
      }
      if (parsed.lastNotes) {
        setCachedLastNotes(parsed.lastNotes);
      }
    } catch (err) {
      console.error("Error leyendo cache del historial:", err);
    }
  }, [userId]);

  useEffect(() => {
    const loadHistoryHorses = async () => {
      if (proNotes.length === 0) {
        setHistoryHorses([]);
        return;
      }

      setLoadingHistory(true);
      try {
        const uniqueIds: string[] = [];
        for (const n of proNotes) {
          if (!uniqueIds.includes(n.horseId)) {
            uniqueIds.push(n.horseId);
          }
        }

        const chunks: string[][] = [];
        for (let i = 0; i < uniqueIds.length; i += 10) {
          chunks.push(uniqueIds.slice(i, i + 10));
        }

        const results: Horse[] = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, "horses"),
            where(documentId(), "in", chunk)
          );
          const snap = await getDocs(q);
          snap.docs.forEach((d) => {
            results.push({ id: d.id, ...(d.data() as Omit<Horse, "id">) });
          });
        }

        const byId = new Map(results.map((h) => [h.id, h]));
        const ordered = uniqueIds
          .map((id) => byId.get(id))
          .filter(Boolean) as Horse[];
        setHistoryHorses(ordered);
      } catch (err) {
        console.error("Error cargando historial de caballos:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistoryHorses();
  }, [proNotes]);

  useEffect(() => {
    if (!userId) return;
    if (historyHorses.length === 0 && proNotes.length === 0) return;

    try {
      const lastNotes: Record<string, number> = {};
      for (const n of proNotes) {
        if (!lastNotes[n.horseId]) {
          lastNotes[n.horseId] = n.createdAt.toDate().getTime();
        }
      }

      const payload = {
        horses: historyHorses,
        lastNotes,
      };
      localStorage.setItem(`pro-history-${userId}`, JSON.stringify(payload));
    } catch (err) {
      console.error("Error guardando cache del historial:", err);
    }
  }, [userId, historyHorses, proNotes]);

  const filteredCenters = useMemo<ProCenterSearchResult[]>(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return centers
      .filter((center) =>
        [center.name, center.city, center.province]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .map((center) => ({
        id: center.id,
        name: center.name,
        city: center.city,
        province: center.province,
        logoUrl: center.logoUrl,
        profileImageUrl: center.profileImageUrl,
        horseCount: centerStats[center.id]?.horses ?? center.horseCount ?? 0,
        professionalCount:
          centerStats[center.id]?.professionals ?? center.professionalCount ?? 0,
      }));
  }, [centerStats, centers, searchTerm]);

  const membershipByCenterId = useMemo(
    () => new Map(memberships.map((membership) => [membership.centerId, membership] as const)),
    [memberships]
  );

  const acceptedProfessionalCenters = useMemo(() => {
    const acceptedRequests = professionalRequests.filter(
      (request) => request.status === "accepted"
    );
    const uniqueCenters = new Map<string, Center>();

    acceptedRequests.forEach((request) => {
      const center = centers.find((item) => item.id === request.centerId);
      uniqueCenters.set(request.centerId, {
        id: request.centerId,
        name: center?.name ?? request.centerName,
        city: center?.city,
        province: center?.province,
        logoUrl: center?.logoUrl,
        profileImageUrl: center?.profileImageUrl,
        type: center?.type,
        centerType: center?.centerType,
        horseCount: center?.horseCount,
        professionalCount: center?.professionalCount,
      });
    });

    return Array.from(uniqueCenters.values());
  }, [centers, professionalRequests]);

  const activeCenterOptions = useMemo<ActiveCenter[]>(
    () => acceptedProfessionalCenters.map((center) => ({ id: center.id, name: center.name })),
    [acceptedProfessionalCenters]
  );

  const requestByCenterId = useMemo(() => {
    const map = new Map<string, ProfessionalRequest>();
    professionalRequests.forEach((request) => {
      const current = map.get(request.centerId);
      if (!current) {
        map.set(request.centerId, request);
        return;
      }
      if (
        (request.status === "pending" || request.status === "accepted") &&
        current.status !== "pending" &&
        current.status !== "accepted"
      ) {
        map.set(request.centerId, request);
      }
    });
    return map;
  }, [professionalRequests]);

  const todayNotes = useMemo(() => {
    const today = new Date();
    return proNotes.filter((item) => {
      const itemDate = item.createdAt.toDate();
      return (
        itemDate.getFullYear() === today.getFullYear() &&
        itemDate.getMonth() === today.getMonth() &&
        itemDate.getDate() === today.getDate()
      );
    });
  }, [proNotes]);

  const activeCenterHorseIds = useMemo(
    () => new Set(horses.map((horse) => horse.id)),
    [horses]
  );

  const activeCenterTodayNotes = useMemo(() => {
    if (!activeCenterId) return [];
    return todayNotes.filter((item) => activeCenterHorseIds.has(item.horseId));
  }, [activeCenterHorseIds, activeCenterId, todayNotes]);

  const activeCenterRecentNotes = useMemo(() => {
    if (!activeCenterId) return [];
    return proNotes.filter((item) => activeCenterHorseIds.has(item.horseId));
  }, [activeCenterHorseIds, activeCenterId, proNotes]);

  const visibleProfessionalRequests = useMemo(() => {
    if (!activeCenterId) return [];
    return professionalRequests.filter((request) => request.centerId === activeCenterId);
  }, [activeCenterId, professionalRequests]);

  const visiblePendingRequests = useMemo(
    () => visibleProfessionalRequests.filter((request) => request.status === "pending"),
    [visibleProfessionalRequests]
  );

  const lastNoteByHorseId = useMemo(() => {
    const map = new Map<string, Timestamp>();
    if (proNotes.length > 0) {
      for (const n of proNotes) {
        if (!map.has(n.horseId)) {
          map.set(n.horseId, n.createdAt);
        }
      }
    } else {
      Object.entries(cachedLastNotes).forEach(([horseId, ms]) => {
        map.set(horseId, Timestamp.fromDate(new Date(ms)));
      });
    }
    return map;
  }, [proNotes, cachedLastNotes]);

  const activeHorse = useMemo(
    () => horses.find((h) => h.id === activeHorseId) || null,
    [horses, activeHorseId]
  );

  const activeCenterName = useMemo(
    () =>
      activeCenterOptions.find((center) => center.id === activeCenterId)?.name ??
      "centro seleccionado",
    [activeCenterId, activeCenterOptions]
  );

  const {
    loading: permissionsLoading,
    hasPermission: hasProfessionalPermission,
  } = useProfessionalPermissions(activeCenterId, userId);

  const proName =
    userInfo?.fullName?.trim() ||
    userInfo?.displayName?.trim() ||
    userInfo?.name?.trim() ||
    userInfo?.email ||
    "Profesional";

  const professionLabel =
    userInfo?.profession?.trim() ||
    userInfo?.proType?.trim() ||
    "Profesional ecuestre";

  const verificationLabel =
    userInfo?.verified || userInfo?.verificationStatus === "verified"
      ? "Verificado"
      : userInfo?.verificationStatus === "pending"
        ? "Verificacion pendiente"
        : "Sin verificar";

  const userInitial = proName.trim().charAt(0).toUpperCase() || "P";
  const avatarUrl = userInfo?.avatarUrl || userInfo?.photoURL || auth.currentUser?.photoURL || "";

  const canViewHorses =
    hasProfessionalPermission("horses", "viewList") ||
    hasProfessionalPermission("horses", "viewProfile") ||
    hasProfessionalPermission("horses", "list") ||
    hasProfessionalPermission("horses", "detail");
  const canViewAgenda = hasProfessionalPermission("agenda", "view");
  const canViewVeterinary = hasProfessionalPermission("veterinary", "viewHistory");
  const canViewClasses = hasProfessionalPermission("classes", "viewClasses");
  const canViewClients =
    hasProfessionalPermission("clients", "viewOwners") ||
    hasProfessionalPermission("clients", "viewStudents");

  const permittedModules = [
    canViewHorses ? { key: "horses", title: "Caballos", description: "Listado y fichas de caballos autorizados." } : null,
    canViewAgenda ? { key: "agenda", title: "Agenda", description: "Consulta la agenda del centro." } : null,
    canViewVeterinary ? { key: "veterinary", title: "Veterinaria", description: "Historial y seguimiento veterinario." } : null,
    canViewClasses ? { key: "classes", title: "Clases", description: "Consulta de clases y asistencia." } : null,
    canViewClients ? { key: "clients", title: "Clientes", description: "Consulta de propietarios y alumnos." } : null,
  ].filter((module): module is { key: string; title: string; description: string } => Boolean(module));

  const getRequestState = (centerId: string): ProCenterRequestState => {
    if (membershipByCenterId.get(centerId)?.status === "active") return "member";
    return requestByCenterId.get(centerId)?.status ?? "none";
  };

  const handleOpenRequestModal = (center: ProCenterSearchResult) => {
    const state = getRequestState(center.id);
    if (state === "pending") {
      setError("Ya existe una solicitud pendiente para este centro.");
      return;
    }
    if (state === "accepted" || state === "member") {
      setError("Ya tienes acceso a este centro.");
      return;
    }
    setError("");
    setSelectedRequestCenter(center);
  };

  const handleSubmitRequest = async (message: string) => {
    if (!userId || !selectedRequestCenter) return;

    setSubmittingRequest(true);
    setError("");

    try {
      await createProfessionalRequest({
        professionalId: userId,
        centerId: selectedRequestCenter.id,
        professionalName: proName,
        professionalPhoto: avatarUrl || null,
        profession: professionLabel,
        centerName: selectedRequestCenter.name,
        message,
      });
      setSelectedRequestCenter(null);
    } catch (requestError) {
      console.error("Error enviando solicitud:", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo enviar la solicitud al centro."
      );
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequestId(requestId);
    setError("");

    try {
      await cancelProfessionalRequest(requestId);
    } catch (requestError) {
      console.error("Error cancelando solicitud:", requestError);
      setError("No se pudo cancelar la solicitud.");
    } finally {
      setCancellingRequestId(null);
    }
  };

  const uploadAttachments = async (filesToUpload: File[], proId: string) => {
    const uploads = filesToUpload.map(async (file) => {
      const filePath = `medical/${proId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, filePath);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return {
        url,
        name: file.name,
        type: file.type || "application/octet-stream",
      } as MedicalAttachment;
    });

    return Promise.all(uploads);
  };

  const handleAddNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !activeHorseId) return;
    if (!note.trim()) {
      setError("La anotacion medica no puede estar vacia.");
      return;
    }

    setSavingNote(true);
    setError("");

    try {
      const attachments = files.length
        ? await uploadAttachments(files, userId)
        : [];

      await addDoc(collection(db, "medicalNotes"), {
        horseId: activeHorseId,
        proId: userId,
        createdAt: Timestamp.now(),
        note: note.trim(),
        attachments,
      });

      setNote("");
      setFiles([]);
      const input = document.getElementById(
        "medical-files"
      ) as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (err) {
      console.error("Error guardando anotacion medica:", err);
      setError("No se pudo guardar la anotacion medica.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleActiveCenterChange = useCallback((center: ActiveCenter | null) => {
    setActiveCenterId(center?.id ?? null);
    setActiveHorseId(null);
  }, []);

  if (loadingInitial) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-background text-brand-text">
        <p>Comprobando sesion...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-brand-background text-brand-text">
        <p>No hay sesion activa.</p>
      </main>
    );
  }

  return (
    <ActiveCenterProvider centers={activeCenterOptions}>
      <main className="min-h-screen bg-brand-background text-brand-text">
      <ActiveCenterSync onCenterChange={handleActiveCenterChange} />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section id="agenda-hoy" className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={proName}
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-border bg-brand-background text-2xl font-semibold text-brand-primary">
                  {userInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-secondary">Dashboard profesional</p>
                <h1 className="truncate text-2xl font-bold text-brand-text">{proName}</h1>
                <p className="text-sm text-brand-secondary">{professionLabel}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[30rem]">
              <div className="rounded-2xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary">
                  Verificacion
                </p>
                <p className="mt-1 text-sm font-semibold text-brand-text">{verificationLabel}</p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary">
                  Centros
                </p>
                <p className="mt-1 text-sm font-semibold text-brand-text">{acceptedProfessionalCenters.length} conectados</p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-background/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-secondary">
                  Solicitudes
                </p>
                <p className="mt-1 text-sm font-semibold text-brand-text">{visiblePendingRequests.length} pendientes</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <ActiveCenterSelector centers={activeCenterOptions} />
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-brand-background"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </section>

        {error ? (
          <p className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        {!acceptedProfessionalCenters.length ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold text-brand-text">
                Todavía no trabajas con ningún centro hípico.
              </h2>
              <p className="mt-2 text-sm text-brand-secondary">
                Busca un centro y envía una solicitud para empezar a colaborar.
              </p>
              <a
                href="#pro-center-search"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
              >
                Buscar centro
              </a>
            </div>
          </section>
        ) : !activeCenterId ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-brand-text">
                  Selecciona un centro para continuar.
                </h2>
                <p className="mt-2 text-sm text-brand-secondary">
                  El dashboard se actualizará con los datos del centro activo.
                </p>
              </div>
              <ActiveCenterSelector centers={activeCenterOptions} />
            </div>
          </section>
        ) : null}

        {activeCenterId ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Centros conectados", acceptedProfessionalCenters.length],
              ["Caballos asignados", horses.length],
              ["Eventos de hoy", activeCenterTodayNotes.length],
              ["Solicitudes pendientes", visiblePendingRequests.length],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-brand-secondary">{label}</p>
                <p className="mt-3 text-3xl font-bold text-brand-text">{value}</p>
              </article>
            ))}
          </section>
        ) : null}

        <ProfessionalCenterSearch
          searchTerm={searchTerm}
          centers={filteredCenters}
          getRequestState={getRequestState}
          onSearchTermChange={setSearchTerm}
          onRequest={handleOpenRequestModal}
        />

        {activeCenterId ? (
          <ActiveCenterRequestsList
            requests={visibleProfessionalRequests}
            cancellingRequestId={cancellingRequestId}
            onCancel={handleCancelRequest}
          />
        ) : null}

        <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-brand-text">Mis centros</h2>
              <p className="text-sm text-brand-secondary">Centros con solicitud aceptada donde puedes trabajar.</p>
            </div>
            <Link href="/dashboard/horses" className="text-sm font-semibold text-brand-primary hover:underline">
              Ver mis caballos
            </Link>
          </div>

          {acceptedProfessionalCenters.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {acceptedProfessionalCenters.map((center) => {
                const stats = centerStats[center.id];
                const isActiveCenter = activeCenterId === center.id;
                return (
                  <article key={center.id} className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-brand-text">{center.name}</h3>
                        <p className="text-sm text-brand-secondary">{center.type || center.centerType || "Centro hipico"}</p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          isActiveCenter
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-brand-border bg-white/70 text-brand-secondary"
                        }`}
                      >
                        {isActiveCenter ? "Activo" : "No activo"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-brand-secondary">
                      {[center.city, center.province].filter(Boolean).join(", ") || "Ubicacion sin completar"}
                    </p>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div className="rounded-xl border border-brand-border bg-white/70 p-3">
                        <p className="text-brand-secondary">Ciudad</p>
                        <p className="font-semibold text-brand-text">{center.city || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-brand-border bg-white/70 p-3">
                        <p className="text-brand-secondary">Provincia</p>
                        <p className="font-semibold text-brand-text">{center.province || "-"}</p>
                      </div>
                      <div className="rounded-xl border border-brand-border bg-white/70 p-3">
                        <p className="text-brand-secondary">Caballos</p>
                        <p className="font-semibold text-brand-text">{stats?.horses ?? center.horseCount ?? 0}</p>
                      </div>
                    </div>
                    <CenterDashboardActions center={{ id: center.id, name: center.name }} />
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
              Todavía no trabajas con ningún centro hípico.
              <a
                href="#pro-center-search"
                className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
              >
                Buscar centro
              </a>
            </p>
          )}

          {activeCenterId ? (
            <div className="mt-6 border-t border-brand-border pt-5">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-brand-text">
                    Modulos disponibles en {activeCenterName}
                  </h3>
                  <p className="text-sm text-brand-secondary">Solo se muestran los modulos autorizados por el centro.</p>
                </div>
              </div>

              {permissionsLoading ? (
                <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                  Cargando permisos del centro...
                </p>
              ) : permittedModules.length ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {permittedModules.map((module) => (
                      <article key={module.key} className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                        <h4 className="text-base font-semibold text-brand-text">{module.title}</h4>
                        <p className="mt-1 text-sm text-brand-secondary">{module.description}</p>
                      </article>
                    ))}
                  </div>

                  {canViewHorses ? (
                    <div className="mt-5">
                      <h3 className="mb-4 text-lg font-semibold text-brand-text">
                        Caballos
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {horses.length ? (
                          horses.map((horse) => (
                            <article
                              key={horse.id}
                              className={`rounded-2xl border bg-brand-background/50 p-4 transition ${
                                activeHorseId === horse.id ? "border-brand-primary" : "border-brand-border"
                              }`}
                            >
                              {horse.photoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={horse.photoUrl} alt={horse.name} className="mb-3 h-36 w-full rounded-xl object-cover" />
                              ) : null}
                              <h4 className="text-base font-semibold text-brand-text">{horse.name}</h4>
                              <p className="text-sm text-brand-secondary">Edad: {horse.age ?? "-"}</p>
                              {horse.breed ? <p className="text-sm text-brand-secondary">Raza: {horse.breed}</p> : null}
                              <p className="mt-2 text-xs text-brand-secondary">
                                Ultima anotacion:{" "}
                                {lastNoteByHorseId.get(horse.id)?.toDate().toLocaleString() ?? "-"}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveHorseId(horse.id)}
                                  className="inline-flex h-10 items-center rounded-xl bg-brand-primary px-3 text-sm font-semibold text-white"
                                >
                                  Seleccionar
                                </button>
                                <Link
                                  href={`/dashboard/pro/horses/${horse.id}`}
                                  className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text hover:border-brand-primary"
                                >
                                  Abrir ficha
                                </Link>
                              </div>
                            </article>
                          ))
                        ) : (
                          <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                            Este centro aun no tiene caballos registrados.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {canViewAgenda ? (
                    <div className="mt-5 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                      <h3 className="text-lg font-semibold text-brand-text">Agenda</h3>
                      <p className="mt-1 text-sm text-brand-secondary">Modulo disponible para consulta.</p>
                    </div>
                  ) : null}

                  {canViewClasses ? (
                    <div className="mt-5 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                      <h3 className="text-lg font-semibold text-brand-text">Clases</h3>
                      <p className="mt-1 text-sm text-brand-secondary">Modulo disponible para consulta.</p>
                    </div>
                  ) : null}

                  {canViewClients ? (
                    <div className="mt-5 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                      <h3 className="text-lg font-semibold text-brand-text">Clientes</h3>
                      <p className="mt-1 text-sm text-brand-secondary">Modulo disponible para consulta.</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                  No tienes permisos activos para este centro. Contacta con el propietario.
                </p>
              )}

              {activeHorse && canViewVeterinary ? (
                <div className="mt-5 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                  <h3 className="text-lg font-semibold text-brand-text">
                    Anotacion medica para <span className="text-brand-primary">{activeHorse.name}</span>
                  </h3>

                  <form onSubmit={handleAddNote} className="mt-4 grid gap-3 lg:grid-cols-[1fr_18rem]">
                    <div className="space-y-3">
                      <textarea
                        placeholder="Describe la observacion, tratamiento, recomendaciones..."
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className="min-h-32 w-full rounded-2xl border border-brand-border bg-white/80 p-3 text-sm text-brand-text outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                        rows={4}
                        required
                      />
                      <input
                        id="medical-files"
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.odt"
                        onChange={(event) => setFiles(Array.from(event.target.files || []))}
                        className="w-full rounded-xl border border-brand-border bg-white/80 p-3 text-sm"
                      />
                      {files.length ? (
                        <p className="text-xs text-brand-secondary">
                          Archivos seleccionados: {files.map((file) => file.name).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col justify-between gap-3">
                      <p className="text-sm text-brand-secondary">
                        Las anotaciones y adjuntos se guardan con la misma logica existente.
                      </p>
                      <button
                        type="submit"
                        disabled={savingNote}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {savingNote ? "Guardando..." : "Guardar anotacion medica"}
                      </button>
                    </div>
                  </form>

                  <div className="mt-5 border-t border-brand-border pt-4">
                    <h4 className="text-base font-semibold text-brand-text">Historial medico</h4>
                    {notes.length ? (
                      <ul className="mt-3 space-y-3">
                        {notes.map((item) => (
                          <li key={item.id} className="rounded-xl border border-brand-border bg-white/70 p-3 text-sm">
                            <p className="font-semibold text-brand-text">{item.createdAt.toDate().toLocaleString()}</p>
                            <p className="mt-1 text-brand-secondary">{item.note}</p>
                            {item.attachments?.length ? (
                              <div className="mt-2 space-y-1">
                                {item.attachments.map((attachment, index) => (
                                  <a
                                    key={`${item.id}-${index}`}
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-xs font-semibold text-brand-primary hover:underline"
                                  >
                                    {attachment.name}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-brand-secondary">
                        Aun no hay anotaciones medicas para este caballo.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {activeCenterId && canViewVeterinary ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-text">Actividad reciente</h2>
            {loadingHistory ? (
              <p className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                Cargando actividad reciente...
              </p>
            ) : activeCenterRecentNotes.length ? (
              <ol className="mt-4 space-y-4 border-l border-brand-border pl-4">
                {activeCenterRecentNotes.slice(0, 6).map((item) => {
                  const horse =
                    horses.find((row) => row.id === item.horseId) ??
                    historyHorses.find((row) => row.id === item.horseId) ??
                    cachedHistoryHorses.find((row) => row.id === item.horseId);
                  return (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[1.35rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-primary" />
                      <p className="text-sm font-semibold text-brand-text">{horse?.name ?? "Caballo"}</p>
                      <p className="text-xs text-brand-secondary">{item.createdAt.toDate().toLocaleString()}</p>
                      <p className="mt-1 text-sm text-brand-secondary">{item.note}</p>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                Aun no hay actividad reciente.
              </p>
            )}
          </section>
        ) : null}

        {activeCenterId && canViewAgenda ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-brand-text">Agenda de hoy</h2>
            {activeCenterTodayNotes.length ? (
              <ul className="mt-4 space-y-3">
                {activeCenterTodayNotes.map((item) => (
                  <li key={item.id} className="rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm">
                    <p className="font-semibold text-brand-text">{item.createdAt.toDate().toLocaleTimeString("es-ES")}</p>
                    <p className="mt-1 text-brand-secondary">{item.note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
                No hay eventos programados para hoy.
              </p>
            )}
          </section>
        ) : null}

        <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-brand-text">Acciones rapidas</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <a href="#pro-center-search" className="inline-flex h-14 items-center justify-center rounded-2xl border border-brand-border bg-brand-background/60 px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white">
              Buscar centro
            </a>
            <Link href="/dashboard/pro/profile" className="inline-flex h-14 items-center justify-center rounded-2xl border border-brand-border bg-brand-background/60 px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white">
              Editar perfil
            </Link>
            {activeCenterId && canViewAgenda ? (
              <a href="#agenda-hoy" className="inline-flex h-14 items-center justify-center rounded-2xl border border-brand-border bg-brand-background/60 px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white">
                Ver agenda
              </a>
            ) : null}
            <a href="#pro-requests" className="inline-flex h-14 items-center justify-center rounded-2xl border border-brand-border bg-brand-background/60 px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white">
              Ver solicitudes
            </a>
          </div>
        </section>
      </div>
      <ProfessionalRequestModal
        center={selectedRequestCenter}
        submitting={submittingRequest}
        onClose={() => setSelectedRequestCenter(null)}
        onSubmit={handleSubmitRequest}
      />
      </main>
    </ActiveCenterProvider>
  );
}

type ActiveCenterSyncProps = {
  onCenterChange: (center: ActiveCenter | null) => void;
};

function ActiveCenterSync({ onCenterChange }: ActiveCenterSyncProps) {
  const { activeCenter, loading } = useActiveCenter();

  useEffect(() => {
    if (!loading) {
      onCenterChange(activeCenter);
    }
  }, [activeCenter, loading, onCenterChange]);

  return null;
}

function ActiveCenterSelector({ centers }: { centers: ActiveCenter[] }) {
  const { activeCenter, setActiveCenter, loading } = useActiveCenter();

  if (!centers.length) {
    return null;
  }

  return (
    <label className="flex min-w-[220px] flex-col gap-1 text-sm font-medium text-brand-secondary">
      Centro activo
      <select
        value={activeCenter?.id ?? ""}
        disabled={loading || centers.length === 1}
        onChange={(event) => {
          const selectedCenter = centers.find((center) => center.id === event.target.value);
          setActiveCenter(selectedCenter ?? null);
        }}
        className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text shadow-sm outline-none transition focus:border-brand-primary disabled:cursor-not-allowed disabled:bg-brand-background"
      >
        {centers.map((center) => (
          <option key={center.id} value={center.id}>
            {center.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function CenterDashboardActions({ center }: { center: ActiveCenter }) {
  const router = useRouter();
  const { activeCenter, setActiveCenter } = useActiveCenter();
  const isActive = activeCenter?.id === center.id;

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => setActiveCenter(center)}
        disabled={isActive}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isActive ? "Centro activo" : "Usar como centro activo"}
      </button>
      <button
        type="button"
        onClick={() => {
          setActiveCenter(center);
          router.push(`/dashboard/pro/centers/${center.id}`);
        }}
        className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border bg-white/70 px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary hover:bg-white"
      >
        Entrar
      </button>
    </div>
  );
}

type ActiveCenterRequestsListProps = {
  requests: ProfessionalRequest[];
  cancellingRequestId: string | null;
  onCancel: (requestId: string) => void;
};

function ActiveCenterRequestsList({
  requests,
  cancellingRequestId,
  onCancel,
}: ActiveCenterRequestsListProps) {
  const { setActiveCenter } = useActiveCenter();

  return (
    <ProfessionalRequestsList
      requests={requests}
      cancellingRequestId={cancellingRequestId}
      onCancel={onCancel}
      onEnterCenter={(centerId) => {
        const request = requests.find((item) => item.centerId === centerId);
        setActiveCenter({
          id: centerId,
          name: request?.centerName ?? "Centro seleccionado",
        });
      }}
    />
  );
}


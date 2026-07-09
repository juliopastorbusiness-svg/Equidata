"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import { ProfessionalProfileDrawer } from "@/components/dashboard/center/professionals/ProfessionalProfileDrawer";
import { ProfessionalRequestCard } from "@/components/dashboard/center/professionals/ProfessionalRequestCard";
import { RejectProfessionalRequestModal } from "@/components/dashboard/center/professionals/RejectProfessionalRequestModal";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  ProfessionalProfileSummary,
  ProfessionalRequest,
  ProfessionalRequestStatus,
  acceptProfessionalRequest,
  getProfessionalProfileSummary,
  rejectProfessionalRequest,
  removeProfessionalAccess,
  subscribeCenterProfessionalRequests,
} from "@/lib/services/professionalRequestService";

type TabId = "pending" | "active" | "history";

type HistoryFilters = {
  status: "ALL" | ProfessionalRequestStatus;
  profession: string;
  province: string;
  date: string;
  search: string;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "pending", label: "Pendientes" },
  { id: "active", label: "Activos" },
  { id: "history", label: "Historial" },
];

const emptyFilters: HistoryFilters = {
  status: "ALL",
  profession: "ALL",
  province: "ALL",
  date: "",
  search: "",
};

const byLabel = (values: string[]) =>
  Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "es")
  );

export default function CenterProfessionalsPage() {
  const router = useRouter();
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [requests, setRequests] = useState<ProfessionalRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfessionalProfileSummary | null>>({});
  const [activeTab, setActiveTab] = useState<TabId>("pending");
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);
  const [selectedProfile, setSelectedProfile] = useState<ProfessionalProfileSummary | null>(null);
  const [rejectRequest, setRejectRequest] = useState<ProfessionalRequest | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      setRequests([]);
      return;
    }

    return subscribeCenterProfessionalRequests(
      activeCenterId,
      setRequests,
      (requestError) => {
        console.error(requestError);
        setError("No se pudieron cargar las solicitudes profesionales.");
      }
    );
  }, [activeCenterId]);

  useEffect(() => {
    const loadProfiles = async () => {
      const missingIds = Array.from(new Set(requests.map((request) => request.professionalId))).filter(
        (professionalId) => !(professionalId in profiles)
      );
      if (!missingIds.length) return;

      const entries = await Promise.all(
        missingIds.map(async (professionalId) => [
          professionalId,
          await getProfessionalProfileSummary(professionalId),
        ] as const)
      );

      setProfiles((current) => ({ ...current, ...Object.fromEntries(entries) }));
    };

    void loadProfiles().catch((profileError) => {
      console.error(profileError);
      setError("No se pudieron cargar algunos perfiles profesionales.");
    });
  }, [profiles, requests]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const activeRequests = useMemo(
    () => requests.filter((request) => request.status === "accepted"),
    [requests]
  );

  const historyRequests = useMemo(
    () => requests.filter((request) => request.status !== "pending"),
    [requests]
  );

  const professionOptions = useMemo(
    () =>
      byLabel(
        historyRequests.map(
          (request) => profiles[request.professionalId]?.profession || request.profession
        )
      ),
    [historyRequests, profiles]
  );

  const provinceOptions = useMemo(
    () =>
      byLabel(
        historyRequests.map((request) => profiles[request.professionalId]?.province || "")
      ),
    [historyRequests, profiles]
  );

  const filteredHistory = useMemo(() => {
    const normalizedSearch = filters.search.trim().toLowerCase();

    return historyRequests.filter((request) => {
      const profile = profiles[request.professionalId];
      const name = profile?.name || request.professionalName;
      const profession = profile?.profession || request.profession;
      const province = profile?.province || "";
      const date = request.createdAt?.toDate().toISOString().slice(0, 10) ?? "";

      if (filters.status !== "ALL" && request.status !== filters.status) return false;
      if (filters.profession !== "ALL" && profession !== filters.profession) return false;
      if (filters.province !== "ALL" && province !== filters.province) return false;
      if (filters.date && date !== filters.date) return false;
      if (normalizedSearch && !name.toLowerCase().includes(normalizedSearch)) return false;
      return true;
    });
  }, [filters, historyRequests, profiles]);

  const visibleRequests =
    activeTab === "pending"
      ? pendingRequests
      : activeTab === "active"
        ? activeRequests
        : filteredHistory;

  const handleViewProfile = async (request: ProfessionalRequest) => {
    const cachedProfile = profiles[request.professionalId];
    if (cachedProfile) {
      setSelectedProfile(cachedProfile);
      return;
    }

    const profile = await getProfessionalProfileSummary(request.professionalId);
    setProfiles((current) => ({ ...current, [request.professionalId]: profile }));
    setSelectedProfile(profile);
  };

  const runAction = async (
    request: ProfessionalRequest,
    action: () => Promise<void>,
    successMessage: string
  ) => {
    setBusyRequestId(request.id);
    setError(null);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
    } catch (actionError) {
      console.error(actionError);
      setError("No se pudo completar la accion.");
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleAccept = (request: ProfessionalRequest) =>
    runAction(
      request,
      () => acceptProfessionalRequest(request),
      "Solicitud aceptada correctamente."
    );

  const handleReject = async (reason: string) => {
    if (!rejectRequest) return;
    await runAction(
      rejectRequest,
      () => rejectProfessionalRequest(rejectRequest.id, reason),
      "Solicitud rechazada correctamente."
    );
    setRejectRequest(null);
  };

  const handleRemoveAccess = (request: ProfessionalRequest) => {
    const confirmed = window.confirm("¿Eliminar el acceso de este profesional?");
    if (!confirmed) return;

    void runAction(
      request,
      () => removeProfessionalAccess(request),
      "Acceso eliminado correctamente."
    );
  };

  const handleManagePermissions = (request: ProfessionalRequest) => {
    router.push(`/dashboard/center/professionals/${request.professionalId}/permissions`);
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando profesionales...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso a profesionales del centro.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Profesionales"
        subtitle={`Gestiona solicitudes profesionales de ${activeCenterName ?? "tu centro"}.`}
        backHref="/dashboard/center"
      />

      <div className="app-shell">
        {guardError ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-xl border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            {message}
          </p>
        ) : null}

        <section className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-brand-primary text-white"
                    : "border border-brand-border bg-brand-background text-brand-text hover:border-brand-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {activeTab === "history" ? (
          <section className="grid gap-3 rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm md:grid-cols-5">
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as HistoryFilters["status"],
                }))
              }
              className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
            >
              <option value="ALL">Todos los estados</option>
              <option value="accepted">Aceptadas</option>
              <option value="rejected">Rechazadas</option>
              <option value="cancelled">Canceladas</option>
            </select>
            <select
              value={filters.profession}
              onChange={(event) => setFilters((current) => ({ ...current, profession: event.target.value }))}
              className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
            >
              <option value="ALL">Todas las profesiones</option>
              {professionOptions.map((profession) => (
                <option key={profession} value={profession}>{profession}</option>
              ))}
            </select>
            <select
              value={filters.province}
              onChange={(event) => setFilters((current) => ({ ...current, province: event.target.value }))}
              className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
            >
              <option value="ALL">Todas las provincias</option>
              {provinceOptions.map((province) => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.date}
              onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
              className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
            />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar por nombre"
              className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
            />
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-2">
          {visibleRequests.length ? (
            visibleRequests.map((request) => (
              <ProfessionalRequestCard
                key={request.id}
                request={request}
                profile={profiles[request.professionalId]}
                variant={activeTab === "pending" ? "pending" : activeTab === "active" ? "active" : "history"}
                busy={busyRequestId === request.id}
                onViewProfile={handleViewProfile}
                onAccept={handleAccept}
                onReject={setRejectRequest}
                onManagePermissions={handleManagePermissions}
                onRemoveAccess={handleRemoveAccess}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-brand-border bg-white/80 p-5 text-sm text-brand-secondary shadow-sm">
              No hay profesionales en esta pestaña.
            </p>
          )}
        </section>
      </div>

      <ProfessionalProfileDrawer
        open={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
      <RejectProfessionalRequestModal
        request={rejectRequest}
        submitting={busyRequestId === rejectRequest?.id}
        onClose={() => setRejectRequest(null)}
        onConfirm={handleReject}
      />
    </main>
  );
}

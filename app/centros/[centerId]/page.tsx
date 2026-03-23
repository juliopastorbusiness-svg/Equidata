"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CenterLinkRequestButton } from "@/components/centers/CenterLinkRequestButton";
import { useAuthUser } from "@/lib/hooks/useAuthUser";
import { getCenterById } from "@/lib/services/centerService";
import {
  approveCenterMember,
  getCenterMemberByUser,
  getCenterMembers,
  rejectCenterMember,
} from "@/lib/services/memberService";
import { Center, CenterMember, RiderProfile } from "@/lib/services/types";

export default function CenterDetailPage() {
  const params = useParams<{ centerId: string }>();
  const router = useRouter();
  const centerId = params.centerId;
  const { user, profile, loading: authLoading } = useAuthUser();

  const [center, setCenter] = useState<Center | null>(null);
  const [currentMember, setCurrentMember] = useState<CenterMember | null>(null);
  const [members, setMembers] = useState<CenterMember[]>([]);
  const [activeCenterId, setActiveCenterId] = useState<string | undefined>(profile?.activeCenterId);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const riderProfile = profile?.role === "rider" ? (profile as RiderProfile) : null;

  const canManageMembers = useMemo(() => {
    if (!user || !center) return false;
    if (center.ownerId === user.uid) return true;
    return (
      currentMember?.status === "active" &&
      (currentMember.role === "center_owner" || currentMember.role === "center_staff")
    );
  }, [center, currentMember, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    void (async () => {
      if (!centerId) return;

      setLoading(true);
      setError(null);

      try {
        const [centerRow, membersRow, memberRow] = await Promise.all([
          getCenterById(centerId),
          getCenterMembers(centerId),
          getCenterMemberByUser(centerId, user.uid),
        ]);

        setCenter(centerRow);
        setMembers(membersRow);
        setCurrentMember(memberRow);
      } catch (loadError) {
        console.error(loadError);
        setError("No se pudo cargar el centro.");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, centerId, router, user]);

  useEffect(() => {
    setActiveCenterId(profile?.activeCenterId);
  }, [profile?.activeCenterId]);

  const handleDecision = async (memberId: string, decision: "approve" | "reject") => {
    if (!centerId) return;
    setActionLoadingId(memberId);
    setError(null);
    try {
      const nextMember =
        decision === "approve"
          ? await approveCenterMember(centerId, memberId)
          : await rejectCenterMember(centerId, memberId);

      setMembers((prev) => prev.map((item) => (item.id === nextMember.id ? nextMember : item)));
    } catch (decisionError) {
      console.error(decisionError);
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "No se pudo actualizar la solicitud."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando centro...</p>
      </main>
    );
  }

  if (!center) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
          <p>No se ha encontrado el centro solicitado.</p>
        </div>
      </main>
    );
  }

  const pendingMembers = members.filter((member) => member.status === "pending");
  const acceptedMembers = members.filter((member) => member.status === "active");

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/centros" className="text-sm font-medium text-brand-primary hover:underline">
                Volver a centros
              </Link>
              <h1 className="mt-3 text-3xl font-semibold">{center.name}</h1>
              <p className="mt-2 text-sm text-brand-secondary">
                {[center.address, center.city, center.province].filter(Boolean).join(" · ") ||
                  "Centro sin direccion completada"}
              </p>
            </div>
            <div className="rounded-2xl border border-brand-border bg-brand-background px-4 py-3 text-sm">
              <p className="text-brand-secondary">Estado del centro</p>
              <p className="mt-1 font-semibold capitalize">{center.status}</p>
            </div>
          </div>
        </header>

        {error ? (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Vinculacion</h2>
            <p className="mt-2 text-sm text-brand-secondary">
              Solicita acceso como rider o activa este centro si ya estas aceptado.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-brand-border bg-brand-background px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-brand-secondary">
                {currentMember?.status ?? "no vinculado"}
              </span>
              <CenterLinkRequestButton
                center={center}
                currentMember={currentMember}
                riderProfile={riderProfile}
                activeCenterId={activeCenterId}
                onStatusChange={setCurrentMember}
                onActiveCenterChange={setActiveCenterId}
              />
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                <p className="text-sm text-brand-secondary">Miembros aceptados</p>
                <p className="mt-2 text-3xl font-semibold">{acceptedMembers.length}</p>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                <p className="text-sm text-brand-secondary">Solicitudes pendientes</p>
                <p className="mt-2 text-3xl font-semibold">{pendingMembers.length}</p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Resumen</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                <dt className="text-brand-secondary">Slug</dt>
                <dd className="mt-1 font-medium">{center.slug}</dd>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                <dt className="text-brand-secondary">Owner</dt>
                <dd className="mt-1 font-medium">{center.ownerId}</dd>
              </div>
              <div className="rounded-2xl border border-brand-border bg-brand-background p-4">
                <dt className="text-brand-secondary">Mi estado</dt>
                <dd className="mt-1 font-medium">{currentMember?.status ?? "Sin relacion"}</dd>
              </div>
            </dl>
          </article>
        </section>

        {canManageMembers ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Solicitudes de acceso</h2>
                <p className="mt-2 text-sm text-brand-secondary">
                  Gestion basica de riders y otros perfiles asociados al centro.
                </p>
              </div>
            </div>

            {!pendingMembers.length ? (
              <p className="mt-5 text-sm text-brand-secondary">No hay solicitudes pendientes.</p>
            ) : (
              <div className="mt-5 space-y-3">
                {pendingMembers.map((member) => (
                  <article
                    key={member.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-background p-4"
                  >
                    <div>
                      <p className="font-medium">{member.userId}</p>
                      <p className="text-sm text-brand-secondary">Rol solicitado: {member.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDecision(member.id, "approve")}
                        disabled={actionLoadingId === member.id}
                        className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDecision(member.id, "reject")}
                        disabled={actionLoadingId === member.id}
                        className="inline-flex h-10 items-center rounded-xl border border-rose-300 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CenterHeader } from "@/components/center/CenterHeader";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  createHorseStay,
  getCenter,
  HorseStay,
  listActiveHorseStays,
  listBillingServicesByHorse,
  updateCenterCapacity,
} from "@/lib/firestore/stables";

type StayFormState = {
  horseId: string;
  riderUid: string;
  assignedStableId: string;
};

const stayFormInit: StayFormState = {
  horseId: "",
  riderUid: "",
  assignedStableId: "",
};

type StayView = {
  stay: HorseStay;
  horseName: string;
  clientLabel: string;
  services: string[];
  paymentStatus: string;
};

export default function CenterStablesPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [stablesCapacity, setStablesCapacity] = useState<number>(0);
  const [activeStays, setActiveStays] = useState<HorseStay[]>([]);
  const [staysView, setStaysView] = useState<StayView[]>([]);
  const [loadingStays, setLoadingStays] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState<string>("0");
  const [stayForm, setStayForm] = useState<StayFormState>(stayFormInit);

  useEffect(() => {
    if (!activeCenterId) {
      setStablesCapacity(0);
      setActiveStays([]);
      setStaysView([]);
      setLoadingStays(false);
      return;
    }

    let cancelled = false;

    const loadCenter = async () => {
      try {
        const center = await getCenter(activeCenterId);
        if (!cancelled) {
          const capacity = center?.stablesCapacity ?? 0;
          setStablesCapacity(capacity);
          setCapacityDraft(String(capacity));
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(loadError);
          setError("No se pudo cargar la capacidad de cuadras.");
        }
      }
    };

    loadCenter();

    return () => {
      cancelled = true;
    };
  }, [activeCenterId]);

  useEffect(() => {
    if (!activeCenterId) return;
    setLoadingStays(true);
    const unsub = listActiveHorseStays(
      activeCenterId,
      (stays) => {
        setActiveStays(stays);
        setLoadingStays(false);
      },
      () => {
        setError("No se pudieron cargar las ocupaciones activas.");
        setLoadingStays(false);
      }
    );
    return () => unsub();
  }, [activeCenterId]);

  useEffect(() => {
    if (!activeCenterId) {
      setStaysView([]);
      return;
    }
    if (!activeStays.length) {
      setStaysView([]);
      return;
    }

    let cancelled = false;
    setLoadingDetails(true);

    const loadDetails = async () => {
      try {
        const horseNameCache = new Map<string, string>();
        const clientCache = new Map<string, string>();
        const servicesCache = new Map<string, string[]>();

        await Promise.all(
          activeStays.map(async (stay) => {
            if (!horseNameCache.has(stay.horseId)) {
              const horseSnap = await getDoc(doc(db, "horses", stay.horseId));
              horseNameCache.set(
                stay.horseId,
                horseSnap.exists()
                  ? ((horseSnap.data() as { name?: string }).name ?? stay.horseId)
                  : stay.horseId
              );
            }

            if (!clientCache.has(stay.riderUid)) {
              const memberSnap = await getDoc(
                doc(db, "centers", activeCenterId, "members", stay.riderUid)
              );
              if (memberSnap.exists()) {
                const member = memberSnap.data() as {
                  displayName?: string;
                  email?: string;
                };
                clientCache.set(
                  stay.riderUid,
                  member.displayName || member.email || stay.riderUid
                );
              } else {
                clientCache.set(stay.riderUid, stay.riderUid);
              }
            }

            if (!servicesCache.has(stay.horseId)) {
              const services = await listBillingServicesByHorse(
                activeCenterId,
                stay.horseId
              );
              servicesCache.set(
                stay.horseId,
                services.map((service) => service.name)
              );
            }
          })
        );

        if (cancelled) return;

        const nextView: StayView[] = activeStays.map((stay) => ({
          stay,
          horseName: horseNameCache.get(stay.horseId) ?? stay.horseId,
          clientLabel: clientCache.get(stay.riderUid) ?? stay.riderUid,
          services: servicesCache.get(stay.horseId) ?? [],
          paymentStatus: "PENDIENTE",
        }));

        setStaysView(nextView);
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("No se pudieron cargar los detalles de ocupacion.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDetails(false);
        }
      }
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [activeCenterId, activeStays]);

  const occupied = activeStays.length;
  const total = stablesCapacity;

  const occupancyRatio = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((occupied / total) * 100));
  }, [occupied, total]);

  const saveCapacity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId) return;

    const parsed = Number(capacityDraft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("La capacidad debe ser un numero mayor o igual a 0.");
      return;
    }
    if (parsed < occupied) {
      setError("La capacidad no puede ser menor que las cuadras ocupadas.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateCenterCapacity(activeCenterId, parsed);
      setStablesCapacity(parsed);
      setCapacityModalOpen(false);
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo actualizar la capacidad.");
    } finally {
      setSaving(false);
    }
  };

  const submitHorseStay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCenterId) return;

    setSaving(true);
    setError(null);
    try {
      await createHorseStay(activeCenterId, {
        horseId: stayForm.horseId,
        riderUid: stayForm.riderUid,
        assignedStableId: stayForm.assignedStableId || undefined,
      });
      setStayForm(stayFormInit);
    } catch (saveError) {
      console.error(saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo crear la estancia."
      );
    } finally {
      setSaving(false);
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
        <p>Cargando permisos del centro...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background text-brand-text p-6">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso al modulo de cuadras.</p>
          <Link
            href="/dashboard/center"
            className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Volver a Centro
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Cuadras"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
        primaryActionLabel="Editar capacidad"
        onPrimaryAction={() => setCapacityModalOpen(true)}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

      {memberships.length > 1 && (
        <section className="max-w-xl rounded-2xl border border-brand-border bg-white/60 p-4">
          <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
            Cambiar centro activo
          </label>
          <select
            id="center-selector"
            value={activeCenterId ?? ""}
            onChange={(event) => setActiveCenterId(event.target.value)}
            className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
          >
            {memberships.map((membership) => (
              <option key={membership.centerId} value={membership.centerId}>
                {membership.centerName} ({membership.role})
              </option>
            ))}
          </select>
        </section>
      )}

      {!activeCenterId ? (
        <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
          No tienes centro asignado.
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-brand-secondary">Ocupacion</p>
                <p className="text-2xl font-semibold">
                  {occupied} / {total}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCapacityModalOpen(true)}
                className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold"
              >
                Editar capacidad
              </button>
            </div>
            <div className="h-3 w-full rounded-full bg-brand-background">
              <div
                className="h-3 rounded-full bg-emerald-500"
                style={{ width: `${occupancyRatio}%` }}
              />
            </div>
          </section>

          <section id="nueva-estancia" className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Nueva estancia activa</h2>
            <form onSubmit={submitHorseStay} className="grid gap-2 md:grid-cols-3">
              <input
                type="text"
                value={stayForm.horseId}
                onChange={(event) =>
                  setStayForm((prev) => ({ ...prev, horseId: event.target.value }))
                }
                placeholder="horseId"
                className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
                required
              />
              <input
                type="text"
                value={stayForm.riderUid}
                onChange={(event) =>
                  setStayForm((prev) => ({ ...prev, riderUid: event.target.value }))
                }
                placeholder="riderUid"
                className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
                required
              />
              <input
                type="text"
                value={stayForm.assignedStableId}
                onChange={(event) =>
                  setStayForm((prev) => ({
                    ...prev,
                    assignedStableId: event.target.value,
                  }))
                }
                placeholder="assignedStableId (opcional)"
                className="h-11 rounded-xl border border-brand-border bg-brand-background px-3 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="h-11 rounded-xl bg-brand-primary text-white px-4 text-sm font-semibold disabled:opacity-60 md:col-span-3"
              >
                {saving ? "Guardando..." : "Crear estancia activa"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Ocupacion activa</h2>
            {loadingStays || loadingDetails ? (
              <p className="text-sm text-brand-secondary">Cargando ocupacion...</p>
            ) : staysView.length === 0 ? (
              <p className="text-sm text-brand-secondary">
                No hay estancias activas en este momento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-brand-secondary border-b border-brand-border">
                      <th className="py-2 pr-4">Caballo</th>
                      <th className="py-2 pr-4">Cliente</th>
                      <th className="py-2 pr-4">Fecha entrada</th>
                      <th className="py-2 pr-4">Servicios activos</th>
                      <th className="py-2 pr-4">Estado pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staysView.map((row) => (
                      <tr key={row.stay.id} className="border-b border-brand-border">
                        <td className="py-2 pr-4">{row.horseName}</td>
                        <td className="py-2 pr-4">{row.clientLabel}</td>
                        <td className="py-2 pr-4">
                          {row.stay.startedAt
                            ? row.stay.startedAt.toDate().toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="py-2 pr-4">
                          {row.services.length === 0 ? (
                            <span className="text-brand-secondary">Sin servicios</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.services.map((service) => (
                                <span
                                  key={`${row.stay.id}-${service}`}
                                  className="rounded-full bg-brand-background px-2 py-1 text-xs"
                                >
                                  {service}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="rounded bg-brand-primary/60 px-2 py-1 text-xs text-brand-secondary">
                            {row.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {capacityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-background/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-brand-border bg-brand-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Editar capacidad</h3>
              <button
                type="button"
                onClick={() => setCapacityModalOpen(false)}
                className="rounded border border-brand-border px-2 py-1 text-xs"
              >
                Cerrar
              </button>
            </div>
            <form onSubmit={saveCapacity} className="space-y-3">
              <input
                type="number"
                min="0"
                step="1"
                value={capacityDraft}
                onChange={(event) => setCapacityDraft(event.target.value)}
                className="w-full rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                required
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-brand-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar capacidad"}
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </main>
  );
}


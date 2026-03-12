"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  Arena,
  ArenaBooking,
  ArenaBookingRole,
  ArenaTimeSlot,
  cancelBooking,
  createArena,
  createArenaSlot,
  createBooking,
  deleteArena,
  deleteArenaSlot,
  listArenaBookingsByDate,
  listArenas,
  listArenaSlots,
  updateArena,
  updateArenaSlot,
} from "@/lib/firestore/arenas";

type ArenaForm = {
  name: string;
  type: string;
  surface: string;
  notes: string;
  isActive: boolean;
};

type SlotForm = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxHorses: string;
  isActive: boolean;
};

type BookingForm = {
  slotId: string;
  horseId: string;
  riderUid: string;
  bookedByUid: string;
  bookedByRole: ArenaBookingRole;
};

const days = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const arenaInit: ArenaForm = { name: "", type: "", surface: "", notes: "", isActive: true };
const slotInit: SlotForm = {
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "10:00",
  maxHorses: "2",
  isActive: true,
};
const bookingInit: BookingForm = {
  slotId: "",
  horseId: "",
  riderUid: "",
  bookedByUid: "",
  bookedByRole: "RIDER",
};
const today = () => new Date().toISOString().slice(0, 10);

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-brand-border bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-brand-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border text-brand-text"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function CenterArenasPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [arenas, setArenas] = useState<Arena[]>([]);
  const [arenaId, setArenaId] = useState("");
  const [arenaForm, setArenaForm] = useState<ArenaForm>(arenaInit);
  const [editingArenaId, setEditingArenaId] = useState<string | null>(null);
  const [isArenaModalOpen, setIsArenaModalOpen] = useState(false);
  const [slots, setSlots] = useState<ArenaTimeSlot[]>([]);
  const [slotForm, setSlotForm] = useState<SlotForm>(slotInit);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [day, setDay] = useState(today());
  const [bookings, setBookings] = useState<ArenaBooking[]>([]);
  const [bookingFilterArena, setBookingFilterArena] = useState("ALL");
  const [bookingForm, setBookingForm] = useState<BookingForm>(bookingInit);
  const [loadingArenas, setLoadingArenas] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCenterId) {
      setArenas([]);
      setArenaId("");
      setLoadingArenas(false);
      return;
    }
    setLoadingArenas(true);
    const unsub = listArenas(
      activeCenterId,
      (rows) => {
        setArenas(rows);
        setLoadingArenas(false);
      },
      () => {
        setError("No se pudieron cargar las pistas.");
        setLoadingArenas(false);
      }
    );
    return () => unsub();
  }, [activeCenterId]);

  useEffect(() => {
    if (!arenas.length) {
      setArenaId("");
      return;
    }
    if (!arenaId || !arenas.some((arena) => arena.id === arenaId)) {
      setArenaId(arenas[0].id);
    }
  }, [arenaId, arenas]);

  useEffect(() => {
    if (!activeCenterId || !arenaId) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }
    setLoadingSlots(true);
    const unsub = listArenaSlots(
      activeCenterId,
      arenaId,
      (rows) => {
        setSlots(rows);
        setLoadingSlots(false);
      },
      () => {
        setError("No se pudieron cargar los slots.");
        setLoadingSlots(false);
      }
    );
    return () => unsub();
  }, [activeCenterId, arenaId]);

  useEffect(() => {
    if (!activeCenterId || !day) {
      setBookings([]);
      setLoadingBookings(false);
      return;
    }
    setLoadingBookings(true);
    const unsub = listArenaBookingsByDate(
      activeCenterId,
      day,
      (rows) => {
        setBookings(rows);
        setLoadingBookings(false);
      },
      () => {
        setError("No se pudieron cargar las reservas del dia.");
        setLoadingBookings(false);
      }
    );
    return () => unsub();
  }, [activeCenterId, day]);

  useEffect(() => {
    if (!bookingForm.slotId && slots.length) {
      setBookingForm((prev) => ({ ...prev, slotId: slots[0].id }));
    }
    if (bookingForm.slotId && !slots.some((slot) => slot.id === bookingForm.slotId)) {
      setBookingForm((prev) => ({ ...prev, slotId: slots[0]?.id ?? "" }));
    }
  }, [bookingForm.slotId, slots]);

  const slotsByDay = useMemo(() => {
    const map: Record<number, ArenaTimeSlot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    slots.forEach((slot) => map[slot.dayOfWeek].push(slot));
    Object.values(map).forEach((rows) =>
      rows.sort((left, right) => left.startTime.localeCompare(right.startTime))
    );
    return map;
  }, [slots]);

  const filteredBookings = useMemo(
    () =>
      bookingFilterArena === "ALL"
        ? bookings
        : bookings.filter((booking) => booking.arenaId === bookingFilterArena),
    [bookings, bookingFilterArena]
  );

  const resetArenaEditor = () => {
    setEditingArenaId(null);
    setArenaForm(arenaInit);
    setIsArenaModalOpen(false);
  };

  const resetSlotEditor = () => {
    setEditingSlotId(null);
    setSlotForm(slotInit);
    setIsSlotModalOpen(false);
  };

  const submitArena = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCenterId) return;
    setSaving(true);
    setError(null);
    try {
      if (editingArenaId) await updateArena(activeCenterId, editingArenaId, arenaForm);
      else await createArena(activeCenterId, arenaForm);
      resetArenaEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la pista.");
    } finally {
      setSaving(false);
    }
  };

  const submitSlot = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCenterId || !arenaId) return;
    const payload = {
      dayOfWeek: Number(slotForm.dayOfWeek),
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
      maxHorses: Number(slotForm.maxHorses),
      isActive: slotForm.isActive,
    };
    setSaving(true);
    setError(null);
    try {
      if (editingSlotId) await updateArenaSlot(activeCenterId, arenaId, editingSlotId, payload);
      else await createArenaSlot(activeCenterId, arenaId, payload);
      resetSlotEditor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el slot.");
    } finally {
      setSaving(false);
    }
  };

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeCenterId || !arenaId) return;
    const slot = slots.find((item) => item.id === bookingForm.slotId);
    if (!slot) {
      setError("Selecciona un slot valido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBooking(activeCenterId, {
        arenaId,
        date: day,
        slotId: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        horseId: bookingForm.horseId.trim(),
        riderUid: bookingForm.riderUid.trim(),
        bookedByUid: bookingForm.bookedByUid.trim(),
        bookedByRole: bookingForm.bookedByRole,
      });
      setBookingForm((prev) => ({ ...prev, horseId: "", riderUid: "", bookedByUid: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la reserva.");
    } finally {
      setSaving(false);
    }
  };

  const onCancelBooking = async (bookingId: string) => {
    if (!activeCenterId) return;
    setSaving(true);
    setError(null);
    try {
      await cancelBooking(activeCenterId, bookingId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar la reserva.");
    } finally {
      setSaving(false);
    }
  };

  if (guardLoading) {
    return <main className="min-h-screen bg-brand-background p-6 text-brand-text"><p>Cargando permisos del centro...</p></main>;
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
          <p className="text-red-300">No tienes acceso al modulo de pistas.</p>
          <Link href="/dashboard/center" className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text">Volver a Centro</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Pistas"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
        primaryActionLabel="Crear pista"
        onPrimaryAction={() => {
          setEditingArenaId(null);
          setArenaForm(arenaInit);
          setIsArenaModalOpen(true);
        }}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{guardError}</p>}
        {error && <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

        {memberships.length > 1 && (
          <section className="max-w-xl rounded-2xl border border-brand-border bg-white/60 p-4">
            <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">Cambiar centro activo</label>
            <select id="center-selector" value={activeCenterId ?? ""} onChange={(event) => setActiveCenterId(event.target.value)} className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm">
              {memberships.map((membership) => <option key={membership.centerId} value={membership.centerId}>{membership.centerName} ({membership.role})</option>)}
            </select>
          </section>
        )}

        {!activeCenterId ? (
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">No tienes centro asignado.</section>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-2">
              <article className="space-y-3 rounded-2xl border border-brand-border bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Pistas</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingArenaId(null);
                      setArenaForm(arenaInit);
                      setIsArenaModalOpen(true);
                    }}
                    className="rounded bg-brand-primary px-3 py-2 text-sm font-semibold text-white"
                  >
                    Crear pista
                  </button>
                </div>
                {loadingArenas ? <p className="text-sm text-brand-secondary">Cargando...</p> : !arenas.length ? (
                  <div className="rounded-xl border border-brand-border bg-brand-background/60 p-3 text-sm text-brand-secondary">
                    Aun no hay pistas. Crea la primera para empezar.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {arenas.map((arena) => (
                      <div key={arena.id} className={`rounded border p-3 ${arenaId === arena.id ? "border-brand-primary" : "border-brand-border"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <button type="button" onClick={() => setArenaId(arena.id)} className="font-semibold">{arena.name}</button>
                          <span className="text-xs">{arena.isActive ? "Activa" : "Inactiva"}</span>
                        </div>
                        <p className="text-xs text-brand-secondary">{arena.type || "-"} · {arena.surface || "-"}</p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingArenaId(arena.id);
                              setArenaForm({ name: arena.name, type: arena.type ?? "", surface: arena.surface ?? "", notes: arena.notes ?? "", isActive: arena.isActive });
                              setIsArenaModalOpen(true);
                            }}
                            className="rounded border border-brand-border px-2 py-1 text-xs"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!activeCenterId) return;
                              if (!confirm("Eliminar pista?")) return;
                              await deleteArena(activeCenterId, arena.id);
                            }}
                            className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="space-y-3 rounded-2xl border border-brand-border bg-white/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Horarios por dia</h2>
                  <button
                    type="button"
                    disabled={!arenaId}
                    onClick={() => {
                      setEditingSlotId(null);
                      setSlotForm(slotInit);
                      setIsSlotModalOpen(true);
                    }}
                    className="rounded bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Crear slot
                  </button>
                </div>
                {!arenaId ? <p className="text-sm text-brand-secondary">Selecciona una arena.</p> : loadingSlots ? <p className="text-sm text-brand-secondary">Cargando slots...</p> : (
                  <div className="space-y-2">
                    {days.map((label, dayIndex) => (
                      <div key={label} className="rounded border border-brand-border p-2">
                        <p className="text-sm font-semibold">{label}</p>
                        {slotsByDay[dayIndex].length === 0 ? <p className="text-xs text-brand-secondary">Sin slots</p> : slotsByDay[dayIndex].map((slot) => (
                          <div key={slot.id} className="mt-1 flex items-center justify-between rounded border border-brand-border p-2 text-xs">
                            <span>{slot.startTime}-{slot.endTime} · max {slot.maxHorses}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSlotId(slot.id);
                                  setSlotForm({ dayOfWeek: String(slot.dayOfWeek), startTime: slot.startTime, endTime: slot.endTime, maxHorses: String(slot.maxHorses), isActive: slot.isActive });
                                  setIsSlotModalOpen(true);
                                }}
                                className="rounded border border-brand-border px-2 py-1"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!activeCenterId || !arenaId) return;
                                  if (!confirm("Eliminar slot?")) return;
                                  await deleteArenaSlot(activeCenterId, arenaId, slot.id);
                                }}
                                className="rounded bg-red-600 px-2 py-1 text-white"
                              >
                                Borrar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <section className="space-y-3 rounded-2xl border border-brand-border bg-white/60 p-4">
              <h2 className="text-lg font-semibold">Reservas</h2>
              <div className="grid gap-2 md:grid-cols-3">
                <input
                  type="date"
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                />
                <select
                  value={bookingFilterArena}
                  onChange={(event) => setBookingFilterArena(event.target.value)}
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                >
                  <option value="ALL">Todas las pistas</option>
                  {arenas.map((arena) => (
                    <option key={arena.id} value={arena.id}>
                      {arena.name}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={submitBooking} className="grid gap-2 rounded border border-brand-border p-3 md:grid-cols-2">
                <select
                  value={bookingForm.slotId}
                  onChange={(event) => setBookingForm((prev) => ({ ...prev, slotId: event.target.value }))}
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                >
                  {slots.length === 0 ? (
                    <option value="">Sin slots</option>
                  ) : (
                    slots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {days[slot.dayOfWeek]} {slot.startTime}-{slot.endTime} (max {slot.maxHorses})
                      </option>
                    ))
                  )}
                </select>
                <select
                  value={bookingForm.bookedByRole}
                  onChange={(event) =>
                    setBookingForm((prev) => ({
                      ...prev,
                      bookedByRole: event.target.value as ArenaBookingRole,
                    }))
                  }
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                >
                  <option value="RIDER">RIDER</option>
                  <option value="PRO">PRO</option>
                </select>
                <input
                  value={bookingForm.horseId}
                  onChange={(event) => setBookingForm((prev) => ({ ...prev, horseId: event.target.value }))}
                  placeholder="horseId"
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                  required
                />
                <input
                  value={bookingForm.riderUid}
                  onChange={(event) => setBookingForm((prev) => ({ ...prev, riderUid: event.target.value }))}
                  placeholder="riderUid"
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
                  required
                />
                <input
                  value={bookingForm.bookedByUid}
                  onChange={(event) => setBookingForm((prev) => ({ ...prev, bookedByUid: event.target.value }))}
                  placeholder="bookedByUid"
                  className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2"
                  required
                />
                <button
                  disabled={saving || !arenaId || !bookingForm.slotId}
                  className="rounded bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2"
                >
                  Crear reserva
                </button>
              </form>

              {loadingBookings ? (
                <p className="text-sm text-brand-secondary">Cargando reservas...</p>
              ) : filteredBookings.length === 0 ? (
                <p className="text-sm text-brand-secondary">No hay reservas para ese dia.</p>
              ) : (
                <div className="space-y-2">
                  {filteredBookings.map((booking) => {
                    const arenaName =
                      arenas.find((arena) => arena.id === booking.arenaId)?.name ?? booking.arenaId;
                    const slot = slots.find((item) => item.id === booking.slotId);
                    const activeCount = bookings.filter(
                      (item) =>
                        item.status === "ACTIVE" &&
                        item.arenaId === booking.arenaId &&
                        item.slotId === booking.slotId
                    ).length;

                    return (
                      <div key={booking.id} className="rounded border border-brand-border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">
                            {arenaName} · {booking.startTime}-{booking.endTime}
                          </p>
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              booking.status === "ACTIVE"
                                ? "bg-emerald-900 text-emerald-200"
                                : "bg-brand-background text-brand-secondary"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </div>
                        <p className="text-xs text-brand-secondary">
                          horseId: {booking.horseId} · riderUid: {booking.riderUid}
                        </p>
                        <p className="text-xs text-brand-secondary">
                          bookedBy: {booking.bookedByUid} ({booking.bookedByRole})
                        </p>
                        <p className="text-xs text-brand-secondary">
                          Cupo slot: {activeCount}/{slot?.maxHorses ?? "-"}
                        </p>
                        {booking.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => onCancelBooking(booking.id)}
                            className="mt-2 rounded bg-brand-primary px-2 py-1 text-xs text-white"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <Modal
        open={isArenaModalOpen}
        title={editingArenaId ? "Editar pista" : "Crear pista"}
        onClose={resetArenaEditor}
      >
        <form onSubmit={submitArena} className="grid gap-3">
          <input
            value={arenaForm.name}
            onChange={(event) => setArenaForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Nombre"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
            required
          />
          <input
            value={arenaForm.type}
            onChange={(event) => setArenaForm((prev) => ({ ...prev, type: event.target.value }))}
            placeholder="Tipo (opcional)"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          />
          <input
            value={arenaForm.surface}
            onChange={(event) => setArenaForm((prev) => ({ ...prev, surface: event.target.value }))}
            placeholder="Superficie (opcional)"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          />
          <textarea
            value={arenaForm.notes}
            onChange={(event) => setArenaForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notas (opcional)"
            rows={3}
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          />
          <label className="text-sm">
            <input
              type="checkbox"
              checked={arenaForm.isActive}
              onChange={(event) => setArenaForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              className="mr-2"
            />
            Activa
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetArenaEditor} className="rounded border border-brand-border px-3 py-2 text-sm">
              Cancelar
            </button>
            <button disabled={saving} className="rounded bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {editingArenaId ? "Guardar pista" : "Crear pista"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={isSlotModalOpen}
        title={editingSlotId ? "Editar slot" : "Crear slot"}
        onClose={resetSlotEditor}
      >
        <form onSubmit={submitSlot} className="grid gap-3">
          <select
            value={slotForm.dayOfWeek}
            onChange={(event) => setSlotForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))}
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
          >
            {days.map((label, index) => (
              <option key={label} value={index}>
                {index} - {label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={slotForm.startTime}
              onChange={(event) => setSlotForm((prev) => ({ ...prev, startTime: event.target.value }))}
              className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
              required
            />
            <input
              type="time"
              value={slotForm.endTime}
              onChange={(event) => setSlotForm((prev) => ({ ...prev, endTime: event.target.value }))}
              className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
              required
            />
          </div>
          <input
            type="number"
            min="1"
            step="1"
            value={slotForm.maxHorses}
            onChange={(event) => setSlotForm((prev) => ({ ...prev, maxHorses: event.target.value }))}
            placeholder="Maximo de caballos"
            className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"
            required
          />
          <label className="text-sm">
            <input
              type="checkbox"
              checked={slotForm.isActive}
              onChange={(event) => setSlotForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              className="mr-2"
            />
            Activo
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={resetSlotEditor} className="rounded border border-brand-border px-3 py-2 text-sm">
              Cancelar
            </button>
            <button disabled={saving || !arenaId} className="rounded bg-brand-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {editingSlotId ? "Guardar slot" : "Crear slot"}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

type ArenaForm = { name: string; type: string; surface: string; notes: string; isActive: boolean };
type SlotForm = { dayOfWeek: string; startTime: string; endTime: string; maxHorses: string; isActive: boolean };
type BookingForm = { slotId: string; horseId: string; riderUid: string; bookedByUid: string; bookedByRole: ArenaBookingRole };

const days = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const arenaInit: ArenaForm = { name: "", type: "", surface: "", notes: "", isActive: true };
const slotInit: SlotForm = { dayOfWeek: "1", startTime: "09:00", endTime: "10:00", maxHorses: "2", isActive: true };
const bookingInit: BookingForm = { slotId: "", horseId: "", riderUid: "", bookedByUid: "", bookedByRole: "RIDER" };
const today = () => new Date().toISOString().slice(0, 10);

export default function CenterArenasPage() {
  const { loading: guardLoading, error: guardError, isAllowed, activeCenterId, activeCenterName, memberships, setActiveCenterId } =
    useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [arenas, setArenas] = useState<Arena[]>([]);
  const [arenaId, setArenaId] = useState("");
  const [arenaForm, setArenaForm] = useState<ArenaForm>(arenaInit);
  const [editingArenaId, setEditingArenaId] = useState<string | null>(null);
  const [slots, setSlots] = useState<ArenaTimeSlot[]>([]);
  const [slotForm, setSlotForm] = useState<SlotForm>(slotInit);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
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
      setArenas([]); setArenaId(""); setLoadingArenas(false); return;
    }
    setLoadingArenas(true);
    const unsub = listArenas(activeCenterId, (rows) => { setArenas(rows); setLoadingArenas(false); }, () => {
      setError("No se pudieron cargar las pistas."); setLoadingArenas(false);
    });
    return () => unsub();
  }, [activeCenterId]);

  useEffect(() => {
    if (!arenas.length) { setArenaId(""); return; }
    if (!arenaId || !arenas.some((a) => a.id === arenaId)) setArenaId(arenas[0].id);
  }, [arenaId, arenas]);

  useEffect(() => {
    if (!activeCenterId || !arenaId) { setSlots([]); setLoadingSlots(false); return; }
    setLoadingSlots(true);
    const unsub = listArenaSlots(activeCenterId, arenaId, (rows) => { setSlots(rows); setLoadingSlots(false); }, () => {
      setError("No se pudieron cargar los slots."); setLoadingSlots(false);
    });
    return () => unsub();
  }, [activeCenterId, arenaId]);

  useEffect(() => {
    if (!activeCenterId || !day) { setBookings([]); setLoadingBookings(false); return; }
    setLoadingBookings(true);
    const unsub = listArenaBookingsByDate(activeCenterId, day, (rows) => { setBookings(rows); setLoadingBookings(false); }, () => {
      setError("No se pudieron cargar las reservas del dia."); setLoadingBookings(false);
    });
    return () => unsub();
  }, [activeCenterId, day]);

  useEffect(() => {
    if (!bookingForm.slotId && slots.length) setBookingForm((p) => ({ ...p, slotId: slots[0].id }));
    if (bookingForm.slotId && !slots.some((s) => s.id === bookingForm.slotId)) setBookingForm((p) => ({ ...p, slotId: slots[0]?.id ?? "" }));
  }, [bookingForm.slotId, slots]);

  const slotsByDay = useMemo(() => {
    const map: Record<number, ArenaTimeSlot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    slots.forEach((s) => map[s.dayOfWeek].push(s));
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [slots]);

  const filteredBookings = useMemo(() => bookingFilterArena === "ALL" ? bookings : bookings.filter((b) => b.arenaId === bookingFilterArena), [bookings, bookingFilterArena]);

  const submitArena = async (e: FormEvent) => {
    e.preventDefault(); if (!activeCenterId) return; setSaving(true); setError(null);
    try {
      if (editingArenaId) await updateArena(activeCenterId, editingArenaId, arenaForm);
      else await createArena(activeCenterId, arenaForm);
      setArenaForm(arenaInit); setEditingArenaId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar la pista."); } finally { setSaving(false); }
  };

  const submitSlot = async (e: FormEvent) => {
    e.preventDefault(); if (!activeCenterId || !arenaId) return;
    const payload = { dayOfWeek: Number(slotForm.dayOfWeek), startTime: slotForm.startTime, endTime: slotForm.endTime, maxHorses: Number(slotForm.maxHorses), isActive: slotForm.isActive };
    setSaving(true); setError(null);
    try {
      if (editingSlotId) await updateArenaSlot(activeCenterId, arenaId, editingSlotId, payload);
      else await createArenaSlot(activeCenterId, arenaId, payload);
      setSlotForm(slotInit); setEditingSlotId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar el slot."); } finally { setSaving(false); }
  };

  const submitBooking = async (e: FormEvent) => {
    e.preventDefault(); if (!activeCenterId || !arenaId) return;
    const slot = slots.find((s) => s.id === bookingForm.slotId); if (!slot) return setError("Selecciona un slot valido.");
    setSaving(true); setError(null);
    try {
      await createBooking(activeCenterId, {
        arenaId, date: day, slotId: slot.id, startTime: slot.startTime, endTime: slot.endTime,
        horseId: bookingForm.horseId.trim(), riderUid: bookingForm.riderUid.trim(),
        bookedByUid: bookingForm.bookedByUid.trim(), bookedByRole: bookingForm.bookedByRole,
      });
      setBookingForm((p) => ({ ...p, horseId: "", riderUid: "", bookedByUid: "" }));
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo crear la reserva."); } finally { setSaving(false); }
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

  if (guardLoading) return <main className="min-h-screen bg-brand-background text-brand-text p-6"><p>Cargando permisos del centro...</p></main>;
  if (!isAllowed) return (
    <main className="min-h-screen bg-brand-background text-brand-text p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border border-red-900 bg-red-950/30 p-5">
        <p className="text-red-300">No tienes acceso al modulo de pistas.</p>
        <Link href="/dashboard/center" className="mt-4 inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text">Volver a Centro</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Pistas"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
        primaryActionLabel="Crear pista"
        onPrimaryAction={() => document.getElementById("arena-form")?.scrollIntoView({ behavior: "smooth", block: "start" })}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{guardError}</p>}
        {error && <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}

      {memberships.length > 1 && (
        <section className="max-w-xl rounded-2xl border border-brand-border bg-white/60 p-4">
          <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">Cambiar centro activo</label>
          <select id="center-selector" value={activeCenterId ?? ""} onChange={(e) => setActiveCenterId(e.target.value)} className="h-11 w-full rounded-xl border border-brand-border bg-brand-background px-3 text-sm">
            {memberships.map((m) => <option key={m.centerId} value={m.centerId}>{m.centerName} ({m.role})</option>)}
          </select>
        </section>
      )}

      {!activeCenterId ? (
        <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">No tienes centro asignado.</section>
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-3">
              <h2 className="text-lg font-semibold">Pistas</h2>
              {loadingArenas ? <p className="text-sm text-brand-secondary">Cargando...</p> : !arenas.length ? (
                <div className="rounded-xl border border-brand-border bg-brand-background/60 p-3 text-sm text-brand-secondary">
                  Aun no hay pistas. Crea la primera para empezar.
                </div>
              ) : (
                <div className="space-y-2">{arenas.map((a) => (
                  <div key={a.id} className={`rounded border p-3 ${arenaId === a.id ? "border-brand-primary" : "border-brand-border"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => setArenaId(a.id)} className="font-semibold">{a.name}</button>
                      <span className="text-xs">{a.isActive ? "Activa" : "Inactiva"}</span>
                    </div>
                    <p className="text-xs text-brand-secondary">{a.type || "-"} · {a.surface || "-"}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => { setEditingArenaId(a.id); setArenaForm({ name: a.name, type: a.type ?? "", surface: a.surface ?? "", notes: a.notes ?? "", isActive: a.isActive }); }} className="rounded border border-brand-border px-2 py-1 text-xs">Editar</button>
                      <button type="button" onClick={async () => { if (!activeCenterId) return; if (!confirm("Eliminar pista?")) return; await deleteArena(activeCenterId, a.id); }} className="rounded bg-red-600 px-2 py-1 text-xs">Eliminar</button>
                    </div>
                  </div>
                ))}</div>
              )}
              <form id="arena-form" onSubmit={submitArena} className="grid gap-2 border-t border-brand-border pt-3">
                <input value={arenaForm.name} onChange={(e) => setArenaForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nombre" className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" required />
                <input value={arenaForm.type} onChange={(e) => setArenaForm((p) => ({ ...p, type: e.target.value }))} placeholder="Tipo (opcional)" className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" />
                <input value={arenaForm.surface} onChange={(e) => setArenaForm((p) => ({ ...p, surface: e.target.value }))} placeholder="Superficie (opcional)" className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" />
                <textarea value={arenaForm.notes} onChange={(e) => setArenaForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notas (opcional)" rows={2} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" />
                <label className="text-sm"><input type="checkbox" checked={arenaForm.isActive} onChange={(e) => setArenaForm((p) => ({ ...p, isActive: e.target.checked }))} className="mr-2" />Activa</label>
                <div className="flex gap-2">
                  <button disabled={saving} className="rounded bg-brand-primary text-white px-3 py-2 text-sm font-semibold disabled:opacity-60">{editingArenaId ? "Guardar pista" : "Crear pista"}</button>
                  {editingArenaId && <button type="button" onClick={() => { setEditingArenaId(null); setArenaForm(arenaInit); }} className="rounded border border-brand-border px-3 py-2 text-sm">Cancelar</button>}
                </div>
              </form>
            </article>

            <article className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-3">
              <h2 className="text-lg font-semibold">Horarios por dia</h2>
              {!arenaId ? <p className="text-sm text-brand-secondary">Selecciona una arena.</p> : loadingSlots ? <p className="text-sm text-brand-secondary">Cargando slots...</p> : (
                <div className="space-y-2">{days.map((label, d) => (
                  <div key={label} className="rounded border border-brand-border p-2">
                    <p className="text-sm font-semibold">{label}</p>
                    {slotsByDay[d].length === 0 ? <p className="text-xs text-brand-secondary">Sin slots</p> : slotsByDay[d].map((s) => (
                      <div key={s.id} className="mt-1 flex items-center justify-between rounded border border-brand-border p-2 text-xs">
                        <span>{s.startTime}-{s.endTime} · max {s.maxHorses}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => { setEditingSlotId(s.id); setSlotForm({ dayOfWeek: String(s.dayOfWeek), startTime: s.startTime, endTime: s.endTime, maxHorses: String(s.maxHorses), isActive: s.isActive }); }} className="rounded border border-brand-border px-2 py-1">Editar</button>
                          <button type="button" onClick={async () => { if (!activeCenterId || !arenaId) return; if (!confirm("Eliminar slot?")) return; await deleteArenaSlot(activeCenterId, arenaId, s.id); }} className="rounded bg-red-600 px-2 py-1">Borrar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}</div>
              )}
              <form onSubmit={submitSlot} className="grid gap-2 border-t border-brand-border pt-3">
                <select value={slotForm.dayOfWeek} onChange={(e) => setSlotForm((p) => ({ ...p, dayOfWeek: e.target.value }))} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm">{days.map((label, d) => <option key={label} value={d}>{d} - {label}</option>)}</select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="time" value={slotForm.startTime} onChange={(e) => setSlotForm((p) => ({ ...p, startTime: e.target.value }))} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" required />
                  <input type="time" value={slotForm.endTime} onChange={(e) => setSlotForm((p) => ({ ...p, endTime: e.target.value }))} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" required />
                </div>
                <input type="number" min="1" step="1" value={slotForm.maxHorses} onChange={(e) => setSlotForm((p) => ({ ...p, maxHorses: e.target.value }))} placeholder="maxHorses" className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" required />
                <label className="text-sm"><input type="checkbox" checked={slotForm.isActive} onChange={(e) => setSlotForm((p) => ({ ...p, isActive: e.target.checked }))} className="mr-2" />Activo</label>
                <div className="flex gap-2">
                  <button disabled={saving || !arenaId} className="rounded bg-brand-primary text-white px-3 py-2 text-sm font-semibold disabled:opacity-60">{editingSlotId ? "Guardar slot" : "Crear slot"}</button>
                  {editingSlotId && <button type="button" onClick={() => { setEditingSlotId(null); setSlotForm(slotInit); }} className="rounded border border-brand-border px-3 py-2 text-sm">Cancelar</button>}
                </div>
              </form>
            </article>
          </section>

          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Reservas</h2>
            <div className="grid gap-2 md:grid-cols-3">
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" />
              <select value={bookingFilterArena} onChange={(e) => setBookingFilterArena(e.target.value)} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm">
                <option value="ALL">Todas las pistas</option>{arenas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <form onSubmit={submitBooking} className="grid gap-2 md:grid-cols-2 rounded border border-brand-border p-3">
              <select value={bookingForm.slotId} onChange={(e) => setBookingForm((p) => ({ ...p, slotId: e.target.value }))} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm">
                {slots.length === 0 ? <option value="">Sin slots</option> : slots.map((s) => <option key={s.id} value={s.id}>{days[s.dayOfWeek]} {s.startTime}-{s.endTime} (max {s.maxHorses})</option>)}
              </select>
              <select value={bookingForm.bookedByRole} onChange={(e) => setBookingForm((p) => ({ ...p, bookedByRole: e.target.value as ArenaBookingRole }))} className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm"><option value="RIDER">RIDER</option><option value="PRO">PRO</option></select>
              <input value={bookingForm.horseId} onChange={(e) => setBookingForm((p) => ({ ...p, horseId: e.target.value }))} placeholder="horseId" className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" required />
              <input value={bookingForm.riderUid} onChange={(e) => setBookingForm((p) => ({ ...p, riderUid: e.target.value }))} placeholder="riderUid" className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm" required />
              <input value={bookingForm.bookedByUid} onChange={(e) => setBookingForm((p) => ({ ...p, bookedByUid: e.target.value }))} placeholder="bookedByUid" className="rounded border border-brand-border bg-brand-background/60 p-2 text-sm md:col-span-2" required />
              <button disabled={saving || !arenaId || !bookingForm.slotId} className="rounded bg-brand-primary text-white px-3 py-2 text-sm font-semibold disabled:opacity-60 md:col-span-2">Crear reserva</button>
            </form>
            {loadingBookings ? <p className="text-sm text-brand-secondary">Cargando reservas...</p> : filteredBookings.length === 0 ? <p className="text-sm text-brand-secondary">No hay reservas para ese dia.</p> : (
              <div className="space-y-2">{filteredBookings.map((b) => {
                const arenaName = arenas.find((a) => a.id === b.arenaId)?.name ?? b.arenaId;
                const slot = slots.find((s) => s.id === b.slotId);
                const activeCount = bookings.filter((x) => x.status === "ACTIVE" && x.arenaId === b.arenaId && x.slotId === b.slotId).length;
                return (
                  <div key={b.id} className="rounded border border-brand-border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{arenaName} · {b.startTime}-{b.endTime}</p>
                      <span className={`rounded px-2 py-1 text-xs ${b.status === "ACTIVE" ? "bg-emerald-900 text-emerald-200" : "bg-brand-background text-brand-secondary"}`}>{b.status}</span>
                    </div>
                    <p className="text-xs text-brand-secondary">horseId: {b.horseId} · riderUid: {b.riderUid}</p>
                    <p className="text-xs text-brand-secondary">bookedBy: {b.bookedByUid} ({b.bookedByRole})</p>
                    <p className="text-xs text-brand-secondary">Cupo slot: {activeCount}/{slot?.maxHorses ?? "-"}</p>
                    {b.status === "ACTIVE" && <button type="button" onClick={() => onCancelBooking(b.id)} className="mt-2 rounded bg-brand-primary text-white px-2 py-1 text-xs">Cancelar</button>}
                  </div>
                );
              })}</div>
            )}
          </section>
        </>
      )}
      </div>
    </main>
  );
}


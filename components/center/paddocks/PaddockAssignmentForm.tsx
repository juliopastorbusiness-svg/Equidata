"use client";

import { FormEvent, useState } from "react";
import { HorseListItem } from "@/lib/horses";

type PaddockAssignmentFormProps = {
  horses: HorseListItem[];
  submitting?: boolean;
  onSubmit: (values: {
    horseId: string;
    startAt: string;
    reason: string;
    notes: string;
  }) => Promise<void>;
};

const inputClassName =
  "mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";

const textareaClassName =
  "mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text";

const today = new Date().toISOString().slice(0, 10);

export function PaddockAssignmentForm({
  horses,
  submitting,
  onSubmit,
}: PaddockAssignmentFormProps) {
  const [horseId, setHorseId] = useState(horses[0]?.horse.id ?? "");
  const [startAt, setStartAt] = useState(today);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <form
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        void onSubmit({ horseId, startAt, reason, notes });
      }}
      className="grid gap-3 md:grid-cols-2"
    >
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Caballo</label>
        <select
          value={horseId}
          onChange={(event) => setHorseId(event.target.value)}
          className={inputClassName}
          required
        >
          {horses.map((item) => (
            <option key={item.horse.id} value={item.horse.id}>
              {item.horse.name} · {item.ownerLabel}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Fecha de entrada</label>
        <input
          type="date"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
          className={inputClassName}
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary">Motivo</label>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={inputClassName}
          placeholder="Rotación, descanso, rehabilitación..."
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium text-brand-secondary">Notas</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={textareaClassName}
        />
      </div>
      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting || !horseId}
          className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? "Guardando..." : "Asignar / mover caballo"}
        </button>
      </div>
    </form>
  );
}

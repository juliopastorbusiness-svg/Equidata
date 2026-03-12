"use client";

import { Class, ClassReservation } from "@/lib/services";

type StudentReservationsTabProps = {
  reservations: ClassReservation[];
  classes: Class[];
  creating: boolean;
  selectedClassId: string;
  selectedStatus: ClassReservation["status"];
  notes: string;
  onClassIdChange: (value: string) => void;
  onStatusChange: (value: ClassReservation["status"]) => void;
  onNotesChange: (value: string) => void;
  onCreate: () => Promise<void>;
  onStatusUpdate: (reservation: ClassReservation, status: ClassReservation["status"]) => Promise<void>;
  onDelete: (reservation: ClassReservation) => Promise<void>;
};

export function StudentReservationsTab({
  reservations,
  classes,
  creating,
  selectedClassId,
  selectedStatus,
  notes,
  onClassIdChange,
  onStatusChange,
  onNotesChange,
  onCreate,
  onStatusUpdate,
  onDelete,
}: StudentReservationsTabProps) {
  const classMap = new Map(classes.map((item) => [item.id, item]));

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-brand-text">Clases reservadas</h3>
          <p className="text-sm text-brand-secondary">Gestiona el estado de asistencia y reservas.</p>
        </div>
        {reservations.length === 0 ? (
          <p className="text-sm text-brand-secondary">No hay reservas registradas.</p>
        ) : (
          <div className="space-y-3">
            {reservations.map((reservation) => {
              const classItem = classMap.get(reservation.classId);
              return (
                <article key={reservation.id} className="rounded-2xl border border-brand-border bg-brand-background/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-text">
                        {classItem?.title ?? reservation.classId}
                      </p>
                      <p className="text-sm text-brand-secondary">
                        {reservation.reservationDate?.toDate().toLocaleDateString("es-ES") ?? "Sin fecha"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={reservation.status}
                        onChange={(event) =>
                          void onStatusUpdate(
                            reservation,
                            event.target.value as ClassReservation["status"]
                          )
                        }
                        className="h-10 rounded-xl border border-brand-border bg-white px-3 text-sm"
                      >
                        <option value="RESERVED">Reservada</option>
                        <option value="CONFIRMED">Confirmada</option>
                        <option value="CANCELLED">Cancelada</option>
                        <option value="COMPLETED">Completada</option>
                        <option value="NO_SHOW">No asistio</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void onDelete(reservation)}
                        className="inline-flex h-10 items-center rounded-xl border border-red-200 px-3 text-sm text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {reservation.notes && (
                    <p className="mt-3 text-sm text-brand-secondary">{reservation.notes}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-brand-text">Nueva reserva</h3>
          <p className="text-sm text-brand-secondary">Se valida capacidad y duplicados.</p>
        </div>
        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium text-brand-secondary">Clase</label>
            <select
              value={selectedClassId}
              onChange={(event) => onClassIdChange(event.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text"
            >
              <option value="">Selecciona una clase</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.date.toDate().toLocaleDateString("es-ES")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-secondary">Estado</label>
            <select
              value={selectedStatus}
              onChange={(event) => onStatusChange(event.target.value as ClassReservation["status"])}
              className="mt-1 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text"
            >
              <option value="RESERVED">Reservada</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="CANCELLED">Cancelada</option>
              <option value="COMPLETED">Completada</option>
              <option value="NO_SHOW">No asistio</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-secondary">Notas</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void onCreate()}
              disabled={creating}
              className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? "Guardando..." : "Crear reserva"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { reserveClassSpot } from "@/lib/services";
import { Class, ClassReservation } from "@/lib/services/types";

type ReserveClassButtonProps = {
  centerId: string;
  classItem: Class;
  riderId: string;
  reservation: ClassReservation | null;
  onReserved: (reservation: ClassReservation) => void;
};

const statusLabel = (status: ClassReservation["status"]) => {
  if (status === "confirmed" || status === "CONFIRMED") return "Reserva confirmada";
  if (status === "pending" || status === "RESERVED") return "Reserva pendiente";
  if (status === "cancelled" || status === "CANCELLED") return "Reserva cancelada";
  if (status === "completed" || status === "COMPLETED") return "Clase completada";
  if (status === "no_show" || status === "NO_SHOW") return "No asistio";
  return "Reservada";
};

export function ReserveClassButton({
  centerId,
  classItem,
  riderId,
  reservation,
  onReserved,
}: ReserveClassButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyReserved =
    reservation &&
    reservation.classId === classItem.id &&
    reservation.status !== "cancelled" &&
    reservation.status !== "CANCELLED";

  const disabled =
    loading ||
    alreadyReserved ||
    classItem.status === "cancelled" ||
    classItem.status === "completed" ||
    classItem.availableSpots <= 0;

  const label = alreadyReserved
    ? statusLabel(reservation.status)
    : classItem.availableSpots <= 0 || classItem.status === "full"
      ? "Clase completa"
      : "Reservar plaza";

  const handleReserve = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextReservation = await reserveClassSpot(centerId, classItem.id, riderId);
      onReserved(nextReservation);
    } catch (reserveError) {
      console.error(reserveError);
      setError(
        reserveError instanceof Error
          ? reserveError.message
          : "No se pudo completar la reserva."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleReserve()}
        disabled={disabled}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Reservando..." : label}
      </button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

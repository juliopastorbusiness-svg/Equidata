"use client";

import { HorseAlert } from "@/lib/horses";

type AlertBadgeProps = {
  alert: HorseAlert;
  onClick?: () => void;
};

const severityClassName: Record<HorseAlert["severity"], string> = {
  LOW: "border-amber-200 bg-amber-50 text-amber-800",
  MEDIUM: "border-orange-200 bg-orange-50 text-orange-800",
  HIGH: "border-red-200 bg-red-50 text-red-800",
};

const alertLabel: Record<HorseAlert["type"], string> = {
  ACTIVE_INJURY: "Lesion activa",
  WEIGHT_CHANGE: "Cambio de peso",
  MEDICAL_REVIEW: "Revision",
  UPCOMING_VACCINATION: "Vacuna",
  UPCOMING_DEWORMING: "Desparasitacion",
  UPCOMING_VET_REVIEW: "Revision vet",
  UPCOMING_FARRIER: "Herrador",
  OVERDUE_CARE: "Vencida",
  MISSING_CONFIGURATION: "Sin configurar",
  DOCUMENT_EXPIRING: "Documento",
};

export function AlertBadge({ alert, onClick }: AlertBadgeProps) {
  const className = `inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${severityClassName[alert.severity]} ${
    onClick ? "cursor-pointer transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary" : ""
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        title={alert.description}
        onClick={onClick}
        className={className}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        {alertLabel[alert.type]}
      </button>
    );
  }

  return (
    <span
      title={alert.description}
      className={className}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {alertLabel[alert.type]}
    </span>
  );
}

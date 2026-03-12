import { Event } from "@/lib/services";

export const eventTypeLabels: Record<Event["type"], string> = {
  CLASS: "Clase",
  TRAINING: "Entrenamiento",
  COMPETITION: "Competicion",
  VET_REVIEW: "Revision veterinaria",
  FARRIER: "Herrador",
  GENERAL: "Evento general",
  INTERNAL_TASK: "Tarea interna",
};

export const eventTypeDotClass: Record<Event["type"], string> = {
  CLASS: "bg-sky-500",
  TRAINING: "bg-emerald-500",
  COMPETITION: "bg-violet-500",
  VET_REVIEW: "bg-rose-500",
  FARRIER: "bg-orange-500",
  GENERAL: "bg-zinc-500",
  INTERNAL_TASK: "bg-slate-400",
};

export const eventTypeRowClass: Record<Event["type"], string> = {
  CLASS: "bg-sky-50 text-sky-700 ring-sky-100",
  TRAINING: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  COMPETITION: "bg-violet-50 text-violet-700 ring-violet-100",
  VET_REVIEW: "bg-rose-50 text-rose-700 ring-rose-100",
  FARRIER: "bg-orange-50 text-orange-700 ring-orange-100",
  GENERAL: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  INTERNAL_TASK: "bg-slate-100 text-slate-700 ring-slate-200",
};

export const eventStatusLabels: Record<Event["status"], string> = {
  SCHEDULED: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

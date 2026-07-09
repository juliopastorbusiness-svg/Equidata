import { ProfessionalRecord } from "@/lib/services/types";

export type GlobalTimelineFilter =
  | "all"
  | "veterinary"
  | "farrier"
  | "teacher"
  | "physiotherapy"
  | "dentist"
  | "nutrition"
  | "groom"
  | "other";

export type ProfessionConfig = {
  filter: GlobalTimelineFilter;
  label: string;
  shortIcon: string;
  className: string;
  permission?: { module: string; actions: string[] };
};

export const timelineFilters: { value: GlobalTimelineFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "veterinary", label: "Veterinario" },
  { value: "farrier", label: "Herrador" },
  { value: "teacher", label: "Profesor" },
  { value: "physiotherapy", label: "Fisioterapia" },
  { value: "dentist", label: "Dentista" },
  { value: "nutrition", label: "Nutricion" },
  { value: "groom", label: "Groom" },
  { value: "other", label: "Otros" },
];

export const professionConfig: Record<string, ProfessionConfig> = {
  veterinary: {
    filter: "veterinary",
    label: "Veterinario",
    shortIcon: "VET",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    permission: { module: "veterinary", actions: ["viewHistory"] },
  },
  veterinarian: {
    filter: "veterinary",
    label: "Veterinario",
    shortIcon: "VET",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    permission: { module: "veterinary", actions: ["viewHistory"] },
  },
  farrier: {
    filter: "farrier",
    label: "Herrador",
    shortIcon: "HER",
    className: "border-slate-300 bg-slate-50 text-slate-700",
    permission: { module: "farrier", actions: ["viewHistory", "view"] },
  },
  teacher: {
    filter: "teacher",
    label: "Profesor",
    shortIcon: "PRO",
    className: "border-blue-300 bg-blue-50 text-blue-700",
    permission: { module: "classes", actions: ["viewClasses"] },
  },
  class: {
    filter: "teacher",
    label: "Profesor",
    shortIcon: "PRO",
    className: "border-blue-300 bg-blue-50 text-blue-700",
    permission: { module: "classes", actions: ["viewClasses"] },
  },
  physiotherapy: {
    filter: "physiotherapy",
    label: "Fisioterapeuta",
    shortIcon: "FIS",
    className: "border-orange-300 bg-orange-50 text-orange-700",
    permission: { module: "physiotherapy", actions: ["viewHistory", "view"] },
  },
  dentist: {
    filter: "dentist",
    label: "Dentista",
    shortIcon: "DEN",
    className: "border-purple-300 bg-purple-50 text-purple-700",
    permission: { module: "dentistry", actions: ["viewHistory", "view"] },
  },
  nutrition: {
    filter: "nutrition",
    label: "Nutricionista",
    shortIcon: "NUT",
    className: "border-yellow-300 bg-yellow-50 text-yellow-800",
    permission: { module: "nutrition", actions: ["viewHistory", "view"] },
  },
  nutritionist: {
    filter: "nutrition",
    label: "Nutricionista",
    shortIcon: "NUT",
    className: "border-yellow-300 bg-yellow-50 text-yellow-800",
    permission: { module: "nutrition", actions: ["viewHistory", "view"] },
  },
  groom: {
    filter: "groom",
    label: "Groom",
    shortIcon: "GRM",
    className: "border-stone-300 bg-stone-100 text-stone-700",
    permission: { module: "groom", actions: ["viewHistory", "view"] },
  },
};

export const defaultProfessionConfig: ProfessionConfig = {
  filter: "other",
  label: "Otros",
  shortIcon: "ACT",
  className: "border-brand-border bg-brand-background text-brand-text",
  permission: { module: "horses", actions: ["viewProfile"] },
};

export function getProfessionConfig(record: ProfessionalRecord): ProfessionConfig {
  const professionKey = normalizeRecordKind(record.profession);
  const typeKey = normalizeRecordKind(String(record.recordType));
  return professionConfig[professionKey] ?? professionConfig[typeKey] ?? defaultProfessionConfig;
}

function normalizeRecordKind(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { useProfessionalPermissions } from "@/hooks/useProfessionalPermissions";
import { auth } from "@/lib/firebase";
import {
  addMedicalRecord,
  deleteMedicalRecord,
  getHorseById,
  listHorseDocuments,
  listInjuriesByHorse,
  listMedicalRecordsByHorse,
  updateMedicalRecord,
  uploadMedicalRecordAttachment,
} from "@/lib/horses";
import { getClassesByCenter } from "@/lib/services/classService";
import { getCenterById } from "@/lib/services/centerService";
import {
  createEvent,
  getEventsByDateRange,
  updateEvent,
} from "@/lib/services/calendarService";
import {
  HorseSmartAlert,
  HorseSmartAlertCategory,
  HorseSmartAlertPriority,
  HorseSmartAlertStatus,
  archiveAlert,
  generateAlerts,
  markResolved,
} from "@/lib/services/horseAlertService";
import { getHorseRecords } from "@/lib/services/professionalRecordService";
import {
  GlobalTimelineFilter,
  getProfessionConfig,
  timelineFilters,
} from "@/lib/services/professionalRecordConfig";
import {
  Center,
  Class,
  Event,
  EventStatus,
  EventType,
  ProfessionalRecord,
  ProfessionalRecordMetadataValue,
} from "@/lib/services/types";
import {
  Horse,
  HorseDocument,
  HorseSex,
  HorseStatus,
  Injury,
  MedicalAttachment,
  MedicalRecord,
  MedicalRecordType,
} from "@/lib/horses/types";

const statusLabel: Record<HorseStatus, string> = {
  ACTIVE: "Activo",
  RESTING: "Descanso",
  RECOVERING: "Recuperacion",
  INACTIVE: "Inactivo",
  ARCHIVED: "Archivado",
};

const sexLabel: Record<HorseSex, string> = {
  STALLION: "Semental",
  MARE: "Yegua",
  GELDING: "Castrado",
  UNKNOWN: "Sin especificar",
};

type HorseTab = {
  id: string;
  label: string;
};

type VeterinaryFilter = "all" | "treatments" | "vaccines" | "checkups" | "injuries" | "other";

type VeterinaryFormType = "TREATMENT" | "VACCINATION" | "CHECKUP" | "INJURY" | "OTHER";

type VeterinaryTimelineItem = {
  id: string;
  recordId?: string;
  kind: "medical" | "injury";
  filter: VeterinaryFilter;
  dateMs: number;
  dateLabel: string;
  actionType: string;
  title: string;
  diagnosis: string;
  treatment: string;
  medication: string;
  veterinarian: string;
  vaccineName?: string;
  vaccineBatch?: string;
  nextDoseLabel?: string;
  notes: string;
  attachments: MedicalAttachment[];
};

type VaccineReminderStatus = "upcoming" | "urgent" | "overdue";

type VaccineReminder = {
  id: string;
  vaccineName: string;
  nextDoseLabel: string;
  daysRemaining: number;
  status: VaccineReminderStatus;
  dueAtMs: number;
};

type VeterinarySummary = {
  hasData: boolean;
  lastAction: string;
  lastVaccine: string;
  nextVaccine: string;
  totalRecords: number;
  totalVaccines: number;
  totalTreatments: number;
};

type GroupedProfessionalRecords = {
  label: string;
  records: ProfessionalRecord[];
};

type SummaryUpcomingEvent = {
  id: string;
  label: string;
  title: string;
  dateLabel: string;
  dateMs: number;
};

type AssignedProfessionalSummary = {
  id: string;
  name: string;
  profession: string;
  photoUrl?: string;
};

type SummaryKpi = {
  label: string;
  value: number;
};

type HealthSummaryItem = {
  label: string;
  value: string;
};

type HorseAgendaFilter =
  | "all"
  | "veterinary"
  | "farrier"
  | "teacher"
  | "physiotherapy"
  | "dentist"
  | "competition"
  | "other";

type HorseAgendaViewMode = "list" | "calendar";

type HorseAgendaEvent = {
  id: string;
  source: "event" | "derived";
  sourceEvent?: Event;
  filter: HorseAgendaFilter;
  profession: string;
  professionalName: string;
  title: string;
  description: string;
  date: Date;
  endDate?: Date;
  status: EventStatus;
  notes?: string;
};

type HorseAgendaFormValues = {
  date: string;
  time: string;
  profession: HorseAgendaFilter;
  professionalId: string;
  externalProfessional: string;
  type: string;
  description: string;
  duration: string;
  notes: string;
};

type HorseAlertFilter =
  | "all"
  | "critical"
  | "veterinary"
  | "farrier"
  | "agenda"
  | "system"
  | "documentation";

const medicalTypeLabel: Record<MedicalRecordType, string> = {
  CHECKUP: "Revision",
  VACCINATION: "Vacuna",
  DEWORMING: "Desparasitacion",
  TREATMENT: "Tratamiento",
  SURGERY: "Cirugia",
  OTHER: "Otro",
};

const veterinaryFilters: { value: VeterinaryFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "treatments", label: "Tratamientos" },
  { value: "vaccines", label: "Vacunas" },
  { value: "checkups", label: "Revisiones" },
  { value: "injuries", label: "Lesiones" },
  { value: "other", label: "Otros" },
];

const DAY_MS = 1000 * 60 * 60 * 24;

const medicalTypeOptions: { value: VeterinaryFormType; label: string }[] = [
  { value: "TREATMENT", label: "Tratamiento" },
  { value: "VACCINATION", label: "Vacuna" },
  { value: "CHECKUP", label: "Revision" },
  { value: "INJURY", label: "Lesion" },
  { value: "OTHER", label: "Otro" },
];

const agendaFilters: { value: HorseAgendaFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "veterinary", label: "Veterinaria" },
  { value: "farrier", label: "Herrador" },
  { value: "teacher", label: "Profesor" },
  { value: "physiotherapy", label: "Fisioterapia" },
  { value: "dentist", label: "Dentista" },
  { value: "competition", label: "Competiciones" },
  { value: "other", label: "Otros" },
];

const alertFilters: { value: HorseAlertFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "critical", label: "Criticas" },
  { value: "veterinary", label: "Veterinarias" },
  { value: "farrier", label: "Herrador" },
  { value: "agenda", label: "Agenda" },
  { value: "system", label: "Sistema" },
  { value: "documentation", label: "Documentacion" },
];

const alertPriorityLabel: Record<HorseSmartAlertPriority, string> = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const alertStatusLabel: Record<HorseSmartAlertStatus, string> = {
  new: "Nueva",
  read: "Leida",
  resolved: "Resuelta",
  archived: "Archivada",
};

const eventStatusLabel: Record<EventStatus, string> = {
  SCHEDULED: "Programado",
  CONFIRMED: "Confirmado",
  COMPLETED: "Realizado",
  CANCELLED: "Cancelado",
};

const createEmptyAgendaForm = (): HorseAgendaFormValues => ({
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  profession: "other",
  professionalId: "",
  externalProfessional: "",
  type: "",
  description: "",
  duration: "60",
  notes: "",
});

type VeterinaryFormValues = {
  date: string;
  type: VeterinaryFormType;
  diagnosis: string;
  treatment: string;
  medicationAdministered: string;
  vaccineName: string;
  vaccineBatch: string;
  nextDoseAt: string;
  veterinarianName: string;
  attachments: MedicalAttachment[];
  notes: string;
};

const createEmptyVeterinaryForm = (): VeterinaryFormValues => ({
  date: new Date().toISOString().slice(0, 10),
  type: "TREATMENT",
  diagnosis: "",
  treatment: "",
  medicationAdministered: "",
  vaccineName: "",
  vaccineBatch: "",
  nextDoseAt: "",
  veterinarianName: "",
  attachments: [],
  notes: "",
});

export default function ProfessionalHorseDetailPage() {
  const params = useParams<{ centerId: string; horseId: string }>();
  const centerId = params.centerId;
  const horseId = params.horseId;

  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [horse, setHorse] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [professionalRecords, setProfessionalRecords] = useState<ProfessionalRecord[]>([]);
  const [loadingProfessionalRecords, setLoadingProfessionalRecords] = useState(false);
  const [professionalRecordsError, setProfessionalRecordsError] = useState("");
  const [center, setCenter] = useState<Center | null>(null);
  const [horseDocuments, setHorseDocuments] = useState<HorseDocument[]>([]);
  const [centerClasses, setCenterClasses] = useState<Class[]>([]);
  const [horseEvents, setHorseEvents] = useState<Event[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [agendaError, setAgendaError] = useState("");
  const [agendaFilter, setAgendaFilter] = useState<HorseAgendaFilter>("all");
  const [agendaSearch, setAgendaSearch] = useState("");
  const [agendaViewMode, setAgendaViewMode] = useState<HorseAgendaViewMode>("list");
  const [selectedAgendaEvent, setSelectedAgendaEvent] = useState<HorseAgendaEvent | null>(null);
  const [editingAgendaEvent, setEditingAgendaEvent] = useState<HorseAgendaEvent | null>(null);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [agendaForm, setAgendaForm] = useState<HorseAgendaFormValues>(createEmptyAgendaForm);
  const [savingAgendaEvent, setSavingAgendaEvent] = useState(false);
  const [agendaFormError, setAgendaFormError] = useState("");
  const [horseAlerts, setHorseAlerts] = useState<HorseSmartAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [alertFilter, setAlertFilter] = useState<HorseAlertFilter>("all");
  const [alertSearch, setAlertSearch] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<HorseSmartAlert | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<GlobalTimelineFilter>("all");
  const [timelineSearch, setTimelineSearch] = useState("");
  const [selectedProfessionalRecord, setSelectedProfessionalRecord] =
    useState<ProfessionalRecord | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loadingVeterinary, setLoadingVeterinary] = useState(false);
  const [veterinaryError, setVeterinaryError] = useState("");
  const [veterinarySearch, setVeterinarySearch] = useState("");
  const [veterinaryFilter, setVeterinaryFilter] = useState<VeterinaryFilter>("all");
  const [isVeterinaryModalOpen, setIsVeterinaryModalOpen] = useState(false);
  const [recordPendingDeleteId, setRecordPendingDeleteId] = useState<string | null>(null);
  const [veterinaryForm, setVeterinaryForm] = useState<VeterinaryFormValues>(
    createEmptyVeterinaryForm
  );
  const [veterinaryFiles, setVeterinaryFiles] = useState<File[]>([]);
  const [editingMedicalRecordId, setEditingMedicalRecordId] = useState<string | null>(null);
  const [savingVeterinaryRecord, setSavingVeterinaryRecord] = useState(false);
  const [veterinaryFormError, setVeterinaryFormError] = useState("");
  const { hasPermission } = useProfessionalPermissions(centerId, professionalId);
  const canCreateVeterinaryRecord = hasPermission("veterinary", "createTreatment");
  const canEditVeterinaryRecord = hasPermission("veterinary", "editTreatment");
  const canDeleteVeterinaryRecord = hasPermission("veterinary", "deleteTreatment");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setProfessionalId(user?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHorse = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getHorseById(centerId, horseId);
        if (!cancelled) {
          setHorse(result);
        }
      } catch (loadError) {
        console.error("Error cargando ficha de caballo:", loadError);
        if (!cancelled) {
          setError("No se pudo cargar la ficha del caballo.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadHorse();

    return () => {
      cancelled = true;
    };
  }, [centerId, horseId]);

  useEffect(() => {
    let cancelled = false;

    const loadCenter = async () => {
      try {
        const result = await getCenterById(centerId);
        if (!cancelled) {
          setCenter(result);
        }
      } catch (loadError) {
        console.error("Error cargando centro:", loadError);
        if (!cancelled) {
          setCenter(null);
        }
      }
    };

    void loadCenter();

    return () => {
      cancelled = true;
    };
  }, [centerId]);

  const loadProfessionalRecords = useCallback(async () => {
    setLoadingProfessionalRecords(true);
    setProfessionalRecordsError("");

    try {
      const records = await getHorseRecords(centerId, horseId);
      setProfessionalRecords(records);
    } catch (loadError) {
      console.error("Error cargando timeline profesional:", loadError);
      setProfessionalRecordsError("No se pudo cargar el timeline del caballo.");
    } finally {
      setLoadingProfessionalRecords(false);
    }
  }, [centerId, horseId]);

  useEffect(() => {
    void loadProfessionalRecords();
  }, [loadProfessionalRecords]);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async () => {
      if (!hasPermission("horses", "viewProfile")) {
        setHorseDocuments([]);
        return;
      }

      try {
        const documents = await listHorseDocuments(centerId, horseId);
        if (!cancelled) {
          setHorseDocuments(documents);
        }
      } catch (loadError) {
        console.error("Error cargando documentos del caballo:", loadError);
        if (!cancelled) {
          setHorseDocuments([]);
        }
      }
    };

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, [centerId, hasPermission, horseId]);

  useEffect(() => {
    let cancelled = false;

    const loadClasses = async () => {
      if (!hasPermission("classes", "viewClasses")) {
        setCenterClasses([]);
        return;
      }

      try {
        const classes = await getClassesByCenter(centerId);
        if (!cancelled) {
          setCenterClasses(classes.filter((item) => item.horseIds.includes(horseId)));
        }
      } catch (loadError) {
        console.error("Error cargando clases del caballo:", loadError);
        if (!cancelled) {
          setCenterClasses([]);
        }
      }
    };

    void loadClasses();

    return () => {
      cancelled = true;
    };
  }, [centerId, hasPermission, horseId]);

  const loadHorseAgendaEvents = useCallback(async () => {
    if (!hasAnyAgendaViewPermission(hasPermission)) {
      setHorseEvents([]);
      return;
    }

    setLoadingAgenda(true);
    setAgendaError("");

    try {
      const start = startOfDay(new Date());
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      const events = await getEventsByDateRange(centerId, { start, end }, { horseId });
      setHorseEvents(events);
    } catch (loadError) {
      console.error("Error cargando agenda del caballo:", loadError);
      setAgendaError("No se pudo cargar la agenda del caballo.");
    } finally {
      setLoadingAgenda(false);
    }
  }, [centerId, hasPermission, horseId]);

  useEffect(() => {
    void loadHorseAgendaEvents();
  }, [loadHorseAgendaEvents]);

  const loadHorseAlerts = useCallback(async () => {
    if (!hasAnyAlertPermission(hasPermission)) {
      setHorseAlerts([]);
      return;
    }

    setLoadingAlerts(true);
    setAlertsError("");

    try {
      const alerts = await generateAlerts(centerId, horseId);
      setHorseAlerts(alerts);
    } catch (loadError) {
      console.error("Error cargando alertas del caballo:", loadError);
      setAlertsError("No se pudieron cargar las alertas del caballo.");
    } finally {
      setLoadingAlerts(false);
    }
  }, [centerId, hasPermission, horseId]);

  useEffect(() => {
    void loadHorseAlerts();
  }, [loadHorseAlerts]);

  const loadVeterinaryHistory = useCallback(async () => {
    setLoadingVeterinary(true);
    setVeterinaryError("");

    try {
      const [records, injuryRows] = await Promise.all([
        listMedicalRecordsByHorse(centerId, horseId),
        listInjuriesByHorse(centerId, horseId),
      ]);

      setMedicalRecords(records);
      setInjuries(injuryRows);
    } catch (loadError) {
      console.error("Error cargando historial veterinario:", loadError);
      setVeterinaryError("No se pudo cargar el historial veterinario.");
    } finally {
      setLoadingVeterinary(false);
    }
  }, [centerId, horseId]);

  useEffect(() => {
    if (!hasPermission("veterinary", "viewHistory")) {
      setMedicalRecords([]);
      setInjuries([]);
      return;
    }

    void loadVeterinaryHistory();
  }, [hasPermission, loadVeterinaryHistory]);

  const tabs = useMemo<HorseTab[]>(() => {
    const nextTabs: HorseTab[] = [
      { id: "summary", label: "Resumen" },
      { id: "timeline", label: "Timeline" },
      { id: "agenda", label: "Agenda" },
      { id: "alerts", label: "Alertas" },
      { id: "general", label: "Informacion general" },
    ];

    if (hasPermission("veterinary", "viewHistory")) {
      nextTabs.push({ id: "veterinary", label: "Veterinaria" });
    }

    if (hasPermission("horses", "viewProfile")) {
      nextTabs.push(
        { id: "farrier", label: "Herrados" },
        { id: "documents", label: "Documentos" }
      );
    }

    if (hasPermission("classes", "viewClasses")) {
      nextTabs.push({ id: "classes", label: "Clases" });
    }

    return nextTabs;
  }, [hasPermission]);

  const selectedTab = tabs.some((tab) => tab.id === activeTab)
    ? activeTab
    : tabs[0]?.id ?? "general";

  const ownerLabel =
    horse?.ownerName?.trim() ||
    horse?.ownerContact?.name?.trim() ||
    "Sin propietario asignado";

  const visibleProfessionalRecords = useMemo(() => {
    const normalizedSearch = timelineSearch.trim().toLowerCase();

    return professionalRecords
      .filter((record) => canViewProfessionalRecord(record, hasPermission))
      .filter((record) => {
        const config = getProfessionConfig(record);
        return timelineFilter === "all" ? true : config.filter === timelineFilter;
      })
      .filter((record) => {
        if (!normalizedSearch) return true;
        return [
          getProfessionalName(record),
          record.title,
          record.description,
          record.profession,
          record.recordType,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => right.date.toMillis() - left.date.toMillis());
  }, [hasPermission, professionalRecords, timelineFilter, timelineSearch]);

  const groupedProfessionalRecords = useMemo(
    () => groupProfessionalRecordsByDate(visibleProfessionalRecords),
    [visibleProfessionalRecords]
  );

  const latestSummaryRecords = useMemo(
    () => visibleProfessionalRecords.slice(0, 5),
    [visibleProfessionalRecords]
  );

  const upcomingSummaryEvents = useMemo(
    () =>
      buildUpcomingSummaryEvents({
        classes: centerClasses,
        hasPermission,
        horse,
        medicalRecords,
        professionalRecords: visibleProfessionalRecords,
      }),
    [centerClasses, hasPermission, horse, medicalRecords, visibleProfessionalRecords]
  );

  const assignedProfessionals = useMemo(
    () => buildAssignedProfessionals(visibleProfessionalRecords),
    [visibleProfessionalRecords]
  );

  const summaryKpis = useMemo(
    () =>
      buildSummaryKpis({
        documents: horseDocuments,
        hasPermission,
        records: visibleProfessionalRecords,
      }),
    [hasPermission, horseDocuments, visibleProfessionalRecords]
  );

  const healthSummary = useMemo(
    () => buildHealthSummary(medicalRecords),
    [medicalRecords]
  );

  const latestDocuments = useMemo(
    () =>
      [...horseDocuments]
        .sort((left, right) => (right.createdAt?.toMillis() ?? 0) - (left.createdAt?.toMillis() ?? 0))
        .slice(0, 5),
    [horseDocuments]
  );

  const showUpcomingEvents = useMemo(
    () =>
      hasPermission("veterinary", "viewHistory") ||
      hasPermission("classes", "viewClasses") ||
      hasPermission("farrier", "view") ||
      hasPermission("farrier", "viewHistory") ||
      hasPermission("physiotherapy", "view") ||
      hasPermission("physiotherapy", "viewHistory"),
    [hasPermission]
  );

  const agendaEvents = useMemo(
    () =>
      buildHorseAgendaEvents({
        events: horseEvents,
        hasPermission,
        horse,
        medicalRecords,
        professionalRecords: visibleProfessionalRecords,
      }),
    [hasPermission, horse, horseEvents, medicalRecords, visibleProfessionalRecords]
  );

  const filteredAgendaEvents = useMemo(() => {
    const normalizedSearch = agendaSearch.trim().toLowerCase();

    return agendaEvents
      .filter((event) => (agendaFilter === "all" ? true : event.filter === agendaFilter))
      .filter((event) => {
        if (!normalizedSearch) return true;
        return [
          event.professionalName,
          event.profession,
          event.title,
          event.description,
          event.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => left.date.getTime() - right.date.getTime());
  }, [agendaEvents, agendaFilter, agendaSearch]);

  const groupedAgendaEvents = useMemo(
    () => groupAgendaEventsByDate(filteredAgendaEvents),
    [filteredAgendaEvents]
  );

  const filteredAlerts = useMemo(() => {
    const normalizedSearch = alertSearch.trim().toLowerCase();

    return horseAlerts
      .filter((alert) => canViewHorseAlert(alert, hasPermission))
      .filter((alert) => alert.status !== "archived")
      .filter((alert) => {
        if (alertFilter === "all") return true;
        if (alertFilter === "critical") return alert.priority === "critical";
        return alert.category === alertFilter;
      })
      .filter((alert) => {
        if (!normalizedSearch) return true;
        return [alert.title, alert.description, alert.type, alert.category]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        const priorityDiff = getAlertPriorityRank(right.priority) - getAlertPriorityRank(left.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return (right.updatedAt?.toMillis() ?? 0) - (left.updatedAt?.toMillis() ?? 0);
      });
  }, [alertFilter, alertSearch, hasPermission, horseAlerts]);

  const agendaProfessionalOptions = useMemo(
    () => assignedProfessionals.map((item) => ({ id: item.id, label: `${item.name} - ${item.profession}` })),
    [assignedProfessionals]
  );

  const veterinaryTimeline = useMemo(() => {
    const medicalItems: VeterinaryTimelineItem[] = medicalRecords.map((record) => ({
      id: `medical-${record.id}`,
      recordId: record.id,
      kind: "medical",
      filter: getMedicalFilterFromRecord(record),
      dateMs: record.date.toMillis(),
      dateLabel: formatDate(record.date.toDate()),
      actionType: getMedicalActionLabel(record),
      title: record.title,
      diagnosis: record.diagnosis || "Sin indicar",
      treatment: record.treatment || "Sin indicar",
      medication: record.medicationAdministered || "Sin indicar",
      veterinarian: record.veterinarianName || "Sin indicar",
      vaccineName: record.vaccineName || "Sin indicar",
      vaccineBatch: record.vaccineBatch || "Sin indicar",
      nextDoseLabel: record.nextDoseAt ? formatDate(record.nextDoseAt.toDate()) : "Sin indicar",
      notes: record.notes || "Sin observaciones",
      attachments: record.attachments,
    }));

    const injuryItems: VeterinaryTimelineItem[] = injuries.map((injury) => ({
      id: `injury-${injury.id}`,
      kind: "injury",
      filter: "injuries",
      dateMs: injury.detectedAt.toMillis(),
      dateLabel: formatDate(injury.detectedAt.toDate()),
      actionType: "Lesion",
      title: injury.title,
      diagnosis: injury.description || "Sin indicar",
      treatment: injury.treatmentPlan || "Sin indicar",
      medication: "Sin indicar",
      veterinarian: "Sin indicar",
      notes: injury.notes || "Sin observaciones",
      attachments: [],
    }));

    const normalizedSearch = veterinarySearch.trim().toLowerCase();

    return [...medicalItems, ...injuryItems]
      .filter((item) => (veterinaryFilter === "all" ? true : item.filter === veterinaryFilter))
      .filter((item) => {
        if (!normalizedSearch) return true;
        return [
          item.title,
          item.actionType,
          item.diagnosis,
          item.treatment,
          item.medication,
          item.veterinarian,
          item.notes,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => right.dateMs - left.dateMs);
  }, [injuries, medicalRecords, veterinaryFilter, veterinarySearch]);

  const vaccineReminders = useMemo<VaccineReminder[]>(() => {
    const todayMs = startOfDay(new Date()).getTime();

    return medicalRecords
      .filter((record) => record.type === "VACCINATION" && record.nextDoseAt)
      .map((record) => {
        const nextDoseDate = record.nextDoseAt!.toDate();
        const dueAtMs = startOfDay(nextDoseDate).getTime();
        const daysRemaining = Math.ceil((dueAtMs - todayMs) / DAY_MS);

        return {
          id: record.id,
          vaccineName: record.vaccineName?.trim() || record.title || "Vacuna sin nombre",
          nextDoseLabel: formatDate(nextDoseDate),
          daysRemaining,
          status: getVaccineReminderStatus(daysRemaining),
          dueAtMs,
        };
      })
      .sort((left, right) => left.dueAtMs - right.dueAtMs)
      .slice(0, 5);
  }, [medicalRecords]);

  const veterinarySummary = useMemo<VeterinarySummary>(() => {
    const sortedRecords = [...medicalRecords].sort(
      (left, right) => right.date.toMillis() - left.date.toMillis()
    );
    const vaccines = sortedRecords.filter((record) => record.type === "VACCINATION");
    const treatments = sortedRecords.filter((record) => record.type === "TREATMENT");
    const nextVaccine = [...vaccines]
      .filter((record) => record.nextDoseAt)
      .sort((left, right) => left.nextDoseAt!.toMillis() - right.nextDoseAt!.toMillis())[0];

    return {
      hasData: sortedRecords.length > 0,
      lastAction: sortedRecords[0] ? formatRecordSummary(sortedRecords[0]) : "-",
      lastVaccine: vaccines[0] ? formatRecordSummary(vaccines[0]) : "-",
      nextVaccine: nextVaccine?.nextDoseAt
        ? `${nextVaccine.vaccineName?.trim() || nextVaccine.title} - ${formatDate(
            nextVaccine.nextDoseAt.toDate()
          )}`
        : "-",
      totalRecords: sortedRecords.length,
      totalVaccines: vaccines.length,
      totalTreatments: treatments.length,
    };
  }, [medicalRecords]);

  const handleSubmitVeterinaryRecord = async () => {
    if (!professionalId) {
      setVeterinaryFormError("No hay sesion profesional activa.");
      return;
    }

    const diagnosis = veterinaryForm.diagnosis.trim();
    const treatment = veterinaryForm.treatment.trim();
    const medicationAdministered = veterinaryForm.medicationAdministered.trim();
    const vaccineName = veterinaryForm.vaccineName.trim();
    const vaccineBatch = veterinaryForm.vaccineBatch.trim();
    const veterinarianName = veterinaryForm.veterinarianName.trim();
    const notes = veterinaryForm.notes.trim();
    const isVaccination = veterinaryForm.type === "VACCINATION";

    if (
      !diagnosis &&
      !treatment &&
      !medicationAdministered &&
      !notes &&
      !veterinaryForm.attachments.length &&
      !veterinaryFiles.length &&
      (!isVaccination || (!vaccineName && !vaccineBatch && !veterinaryForm.nextDoseAt && !veterinarianName))
    ) {
      setVeterinaryFormError("Completa al menos un campo del registro.");
      return;
    }

    setSavingVeterinaryRecord(true);
    setVeterinaryFormError("");

    try {
      const recordType = resolveMedicalRecordType(veterinaryForm.type);
      const uploadedAttachments = veterinaryFiles.length
        ? await Promise.all(
            veterinaryFiles.map((file) =>
              uploadMedicalRecordAttachment(centerId, horseId, file, file.name)
            )
          )
        : [];
      const payload = {
        type: recordType,
        title: getTitleFromFormType(veterinaryForm.type),
        date: Timestamp.fromDate(new Date(`${veterinaryForm.date}T00:00:00`)),
        veterinarianName: isVaccination ? veterinarianName : "",
        vaccineName: isVaccination ? vaccineName : "",
        vaccineBatch: isVaccination ? vaccineBatch : "",
        nextDoseAt:
          isVaccination && veterinaryForm.nextDoseAt
            ? Timestamp.fromDate(new Date(`${veterinaryForm.nextDoseAt}T00:00:00`))
            : undefined,
        diagnosis,
        treatment,
        medicationAdministered,
        attachments: [...veterinaryForm.attachments, ...uploadedAttachments],
        notes,
      };

      if (editingMedicalRecordId) {
        await updateMedicalRecord(centerId, horseId, editingMedicalRecordId, {
          ...payload,
          updatedBy: professionalId,
        });
      } else {
        await addMedicalRecord(centerId, horseId, {
          ...payload,
          createdBy: professionalId,
        });
      }

      setIsVeterinaryModalOpen(false);
      setEditingMedicalRecordId(null);
      setVeterinaryForm(createEmptyVeterinaryForm());
      setVeterinaryFiles([]);
      await loadVeterinaryHistory();
    } catch (saveError) {
      console.error("Error guardando registro veterinario:", saveError);
      setVeterinaryFormError("No se pudo guardar el registro veterinario.");
    } finally {
      setSavingVeterinaryRecord(false);
    }
  };

  const handleOpenEditVeterinaryRecord = (recordId: string) => {
    const record = medicalRecords.find((item) => item.id === recordId);
    if (!record) return;

    setEditingMedicalRecordId(record.id);
    setVeterinaryForm({
      date: record.date.toDate().toISOString().slice(0, 10),
      type: getFormTypeFromRecord(record),
      diagnosis: record.diagnosis ?? "",
      treatment: record.treatment ?? "",
      medicationAdministered: record.medicationAdministered ?? "",
      vaccineName: record.vaccineName ?? "",
      vaccineBatch: record.vaccineBatch ?? "",
      nextDoseAt: record.nextDoseAt?.toDate().toISOString().slice(0, 10) ?? "",
      veterinarianName: record.veterinarianName ?? "",
      attachments: record.attachments,
      notes: record.notes ?? "",
    });
    setVeterinaryFiles([]);
    setVeterinaryFormError("");
    setIsVeterinaryModalOpen(true);
  };

  const handleDeleteVeterinaryRecord = async () => {
    if (!recordPendingDeleteId) return;

    try {
      await deleteMedicalRecord(centerId, horseId, recordPendingDeleteId);
      setRecordPendingDeleteId(null);
      await loadVeterinaryHistory();
    } catch (deleteError) {
      console.error("Error eliminando registro veterinario:", deleteError);
      setVeterinaryError("No se pudo eliminar el registro veterinario.");
    }
  };

  const handleOpenCreateAgendaEvent = () => {
    setEditingAgendaEvent(null);
    setAgendaForm(createEmptyAgendaForm());
    setAgendaFormError("");
    setIsAgendaModalOpen(true);
  };

  const handleOpenEditAgendaEvent = (event: HorseAgendaEvent) => {
    if (event.source !== "event" || !event.sourceEvent) return;

    setEditingAgendaEvent(event);
    setAgendaForm({
      date: event.date.toISOString().slice(0, 10),
      time: formatTimeInput(event.date),
      profession: event.filter === "competition" ? "other" : event.filter,
      professionalId: event.sourceEvent.trainerId ?? "",
      externalProfessional: event.professionalName,
      type: event.title,
      description: event.description,
      duration: String(
        Math.max(15, Math.round(((event.endDate?.getTime() ?? event.date.getTime() + 60 * 60 * 1000) - event.date.getTime()) / 60000))
      ),
      notes: event.notes ?? "",
    });
    setAgendaFormError("");
    setIsAgendaModalOpen(true);
  };

  const handleSaveAgendaEvent = async () => {
    const title = agendaForm.type.trim();
    const duration = Number(agendaForm.duration);

    if (!title) {
      setAgendaFormError("El tipo de actuacion es obligatorio.");
      return;
    }
    if (!agendaForm.date || !agendaForm.time) {
      setAgendaFormError("La fecha y la hora son obligatorias.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setAgendaFormError("La duracion debe ser mayor que 0.");
      return;
    }

    setSavingAgendaEvent(true);
    setAgendaFormError("");

    try {
      const startAt = new Date(`${agendaForm.date}T${agendaForm.time}:00`);
      const endAt = new Date(startAt.getTime() + duration * 60000);
      const selectedProfessional = agendaProfessionalOptions.find(
        (item) => item.id === agendaForm.professionalId
      );
      const professionalName =
        selectedProfessional?.label.split(" - ")[0] ||
        agendaForm.externalProfessional.trim() ||
        "Profesional externo";
      const description = agendaForm.description.trim();
      const notes = [
        agendaForm.notes.trim(),
        `Profesion responsable: ${getAgendaFilterLabel(agendaForm.profession)}`,
        `Profesional: ${professionalName}`,
      ]
        .filter(Boolean)
        .join("\n");
      const payload = {
        title,
        description,
        type: getAgendaEventType(agendaForm.profession),
        sourceType: "manual" as const,
        status: "SCHEDULED" as const,
        startAt,
        endAt,
        trainerId: agendaForm.professionalId || undefined,
        horseIds: [horseId],
        notes,
      };

      if (editingAgendaEvent?.sourceEvent) {
        await updateEvent(centerId, editingAgendaEvent.sourceEvent.id, payload);
      } else {
        await createEvent(centerId, payload);
      }

      setIsAgendaModalOpen(false);
      setEditingAgendaEvent(null);
      setAgendaForm(createEmptyAgendaForm());
      await loadHorseAgendaEvents();
    } catch (saveError) {
      console.error("Error guardando evento de agenda:", saveError);
      setAgendaFormError("No se pudo guardar el evento.");
    } finally {
      setSavingAgendaEvent(false);
    }
  };

  const handleCancelAgendaEvent = async (event: HorseAgendaEvent) => {
    if (event.source !== "event" || !event.sourceEvent) return;

    try {
      await updateEvent(centerId, event.sourceEvent.id, {
        status: "CANCELLED",
      });
      await loadHorseAgendaEvents();
    } catch (cancelError) {
      console.error("Error cancelando evento:", cancelError);
      setAgendaError("No se pudo cancelar el evento.");
    }
  };

  const handleResolveAlert = async (alert: HorseSmartAlert) => {
    try {
      await markResolved(centerId, horseId, alert.id);
      await loadHorseAlerts();
    } catch (resolveError) {
      console.error("Error resolviendo alerta:", resolveError);
      setAlertsError("No se pudo marcar la alerta como resuelta.");
    }
  };

  const handleArchiveAlert = async (alert: HorseSmartAlert) => {
    try {
      await archiveAlert(centerId, horseId, alert.id);
      await loadHorseAlerts();
    } catch (archiveError) {
      console.error("Error archivando alerta:", archiveError);
      setAlertsError("No se pudo archivar la alerta.");
    }
  };

  const handleGoToAlertModule = (alert: HorseSmartAlert) => {
    setSelectedAlert(null);
    setActiveTab(alert.relatedTab ?? getDefaultAlertTab(alert));
  };

  return (
    <PermissionGuard
      centerId={centerId}
      professionalId={professionalId}
      module="horses"
      action="viewProfile"
    >
      <main className="min-h-screen bg-brand-background text-brand-text">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-brand-border bg-white/80 p-6 shadow-sm">
            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </p>
            ) : loading ? (
              <p className="text-sm text-brand-secondary">Cargando ficha...</p>
            ) : horse ? (
              <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
                <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-background/50">
                  {horse.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={horse.photoUrl}
                      alt={horse.name}
                      className="h-64 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-64 w-full items-center justify-center bg-white/70 text-5xl font-bold text-brand-primary">
                      {horse.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-brand-secondary">Ficha de caballo</p>
                      <h1 className="mt-2 text-3xl font-bold text-brand-text">{horse.name}</h1>
                    </div>
                    <span className="w-fit rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {statusLabel[horse.status]}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                    <HorseDetailItem label="Raza" value={horse.breed} />
                    <HorseDetailItem label="Sexo" value={sexLabel[horse.sex]} />
                    <HorseDetailItem
                      label="Edad"
                      value={typeof horse.age === "number" ? `${horse.age} anos` : undefined}
                    />
                    <HorseDetailItem label="Propietario" value={ownerLabel} />
                    <HorseDetailItem label="Estado" value={statusLabel[horse.status]} />
                  </dl>

                  {horse.notes ? (
                    <div className="mt-5 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                      <h2 className="text-sm font-semibold text-brand-text">Observaciones</h2>
                      <p className="mt-2 text-sm text-brand-secondary">{horse.notes}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-brand-secondary">
                No se encontro el caballo solicitado.
              </p>
            )}

            <Link
              href={`/dashboard/pro/centers/${centerId}/horses`}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
            >
              Volver a caballos
            </Link>
          </section>

          {horse ? (
            <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold transition ${
                      selectedTab === tab.id
                        ? "border-brand-primary bg-brand-primary text-white"
                        : "border-brand-border bg-white text-brand-text hover:border-brand-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
                <h2 className="text-lg font-semibold text-brand-text">
                  {tabs.find((tab) => tab.id === selectedTab)?.label ?? "Informacion general"}
                </h2>
                {selectedTab === "summary" ? (
                  <HorseSummaryDashboard
                    assignedProfessionals={assignedProfessionals}
                    centerName={center?.name ?? centerId}
                    documents={latestDocuments}
                    healthItems={healthSummary}
                    horse={horse}
                    kpis={summaryKpis}
                    latestRecords={latestSummaryRecords}
                    ownerLabel={ownerLabel}
                    showDocuments={hasPermission("horses", "viewProfile")}
                    showHealth={hasPermission("veterinary", "viewHistory")}
                    showUpcomingEvents={showUpcomingEvents}
                    upcomingEvents={upcomingSummaryEvents}
                    onOpenRecord={setSelectedProfessionalRecord}
                    onSelectTab={setActiveTab}
                  />
                ) : selectedTab === "timeline" ? (
                  <GlobalHorseTimeline
                    error={professionalRecordsError}
                    filter={timelineFilter}
                    groupedRecords={groupedProfessionalRecords}
                    loading={loadingProfessionalRecords}
                    search={timelineSearch}
                    onFilterChange={setTimelineFilter}
                    onOpenDetail={setSelectedProfessionalRecord}
                    onSearchChange={setTimelineSearch}
                  />
                ) : selectedTab === "agenda" ? (
                  <HorseAgenda
                    canCreate={hasAnyAgendaCreatePermission(hasPermission)}
                    canEditRecord={(event) => canEditAgendaEvent(event, hasPermission)}
                    canCancelRecord={(event) => canCancelAgendaEvent(event, hasPermission)}
                    error={agendaError}
                    filter={agendaFilter}
                    groupedEvents={groupedAgendaEvents}
                    loading={loadingAgenda}
                    search={agendaSearch}
                    viewMode={agendaViewMode}
                    onCancel={handleCancelAgendaEvent}
                    onEdit={handleOpenEditAgendaEvent}
                    onFilterChange={setAgendaFilter}
                    onOpenCreate={handleOpenCreateAgendaEvent}
                    onOpenDetail={setSelectedAgendaEvent}
                    onSearchChange={setAgendaSearch}
                    onViewModeChange={setAgendaViewMode}
                  />
                ) : selectedTab === "alerts" ? (
                  <HorseAlertsCenter
                    alerts={filteredAlerts}
                    error={alertsError}
                    filter={alertFilter}
                    loading={loadingAlerts}
                    search={alertSearch}
                    onArchive={handleArchiveAlert}
                    onFilterChange={setAlertFilter}
                    onGoToModule={handleGoToAlertModule}
                    onOpenDetail={setSelectedAlert}
                    onResolve={handleResolveAlert}
                    onSearchChange={setAlertSearch}
                  />
                ) : selectedTab === "veterinary" ? (
                  <VeterinaryHistory
                    canCreate={canCreateVeterinaryRecord}
                    canDelete={canDeleteVeterinaryRecord}
                    canEdit={canEditVeterinaryRecord}
                    error={veterinaryError}
                    filter={veterinaryFilter}
                    items={veterinaryTimeline}
                    loading={loadingVeterinary}
                    search={veterinarySearch}
                    summary={veterinarySummary}
                    vaccineReminders={vaccineReminders}
                    onFilterChange={setVeterinaryFilter}
                    onOpenCreate={() => {
                      setEditingMedicalRecordId(null);
                      setVeterinaryForm(createEmptyVeterinaryForm());
                      setVeterinaryFiles([]);
                      setVeterinaryFormError("");
                      setIsVeterinaryModalOpen(true);
                    }}
                    onOpenEdit={handleOpenEditVeterinaryRecord}
                    onOpenDelete={setRecordPendingDeleteId}
                    onSearchChange={setVeterinarySearch}
                  />
                ) : (
                  <p className="mt-2 text-sm text-brand-secondary">
                    Este apartado estara disponible proximamente.
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </div>

        {isVeterinaryModalOpen ? (
          <VeterinaryRecordModal
            error={veterinaryFormError}
            mode={editingMedicalRecordId ? "edit" : "create"}
            selectedFiles={veterinaryFiles}
            saving={savingVeterinaryRecord}
            values={veterinaryForm}
            onChange={setVeterinaryForm}
            onClose={() => {
              if (!savingVeterinaryRecord) {
                setIsVeterinaryModalOpen(false);
                setEditingMedicalRecordId(null);
                setVeterinaryFiles([]);
              }
            }}
            onFilesChange={setVeterinaryFiles}
            onSubmit={handleSubmitVeterinaryRecord}
          />
        ) : null}

        {recordPendingDeleteId ? (
          <ConfirmDeleteModal
            onCancel={() => setRecordPendingDeleteId(null)}
            onConfirm={handleDeleteVeterinaryRecord}
          />
        ) : null}

        {selectedProfessionalRecord ? (
          <ProfessionalRecordDetailModal
            record={selectedProfessionalRecord}
            onClose={() => setSelectedProfessionalRecord(null)}
          />
        ) : null}

        {selectedAgendaEvent ? (
          <AgendaEventDetailModal
            event={selectedAgendaEvent}
            onClose={() => setSelectedAgendaEvent(null)}
          />
        ) : null}

        {isAgendaModalOpen ? (
          <AgendaEventModal
            error={agendaFormError}
            mode={editingAgendaEvent ? "edit" : "create"}
            professionalOptions={agendaProfessionalOptions}
            saving={savingAgendaEvent}
            values={agendaForm}
            onChange={setAgendaForm}
            onClose={() => {
              if (!savingAgendaEvent) {
                setIsAgendaModalOpen(false);
                setEditingAgendaEvent(null);
              }
            }}
            onSubmit={handleSaveAgendaEvent}
          />
        ) : null}

        {selectedAlert ? (
          <HorseAlertDetailModal
            alert={selectedAlert}
            onArchive={handleArchiveAlert}
            onClose={() => setSelectedAlert(null)}
            onGoToModule={handleGoToAlertModule}
            onResolve={handleResolveAlert}
          />
        ) : null}
      </main>
    </PermissionGuard>
  );
}

function HorseDetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
      <dt className="text-xs font-medium text-brand-secondary">{label}</dt>
      <dd className="mt-1 font-semibold text-brand-text">{value || "-"}</dd>
    </div>
  );
}

type HorseSummaryDashboardProps = {
  assignedProfessionals: AssignedProfessionalSummary[];
  centerName: string;
  documents: HorseDocument[];
  healthItems: HealthSummaryItem[];
  horse: Horse;
  kpis: SummaryKpi[];
  latestRecords: ProfessionalRecord[];
  ownerLabel: string;
  showDocuments: boolean;
  showHealth: boolean;
  showUpcomingEvents: boolean;
  upcomingEvents: SummaryUpcomingEvent[];
  onOpenRecord: (record: ProfessionalRecord) => void;
  onSelectTab: (tab: string) => void;
};

function HorseSummaryDashboard({
  assignedProfessionals,
  centerName,
  documents,
  healthItems,
  horse,
  kpis,
  latestRecords,
  ownerLabel,
  showDocuments,
  showHealth,
  showUpcomingEvents,
  upcomingEvents,
  onOpenRecord,
  onSelectTab,
}: HorseSummaryDashboardProps) {
  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
        <h3 className="text-base font-semibold text-brand-text">Informacion rapida</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[12rem_1fr]">
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-background/50">
            {horse.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={horse.photoUrl} alt={horse.name} className="h-48 w-full object-cover" />
            ) : (
              <div className="flex h-48 w-full items-center justify-center bg-white text-4xl font-bold text-brand-primary">
                {horse.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryField label="Nombre" value={horse.name} />
            <SummaryField label="Raza" value={horse.breed || "-"} />
            <SummaryField label="Sexo" value={sexLabel[horse.sex]} />
            <SummaryField
              label="Edad"
              value={typeof horse.age === "number" ? `${horse.age} anos` : "-"}
            />
            <SummaryField label="Propietario" value={ownerLabel} />
            <SummaryField label="Centro" value={centerName} />
            <SummaryField label="Estado" value={statusLabel[horse.status]} />
          </dl>
        </div>
      </section>

      {latestRecords.length ? (
        <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-brand-text">Ultima actividad</h3>
            <button
              type="button"
              onClick={() => onSelectTab("timeline")}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-xs font-semibold text-brand-text transition hover:border-brand-primary"
            >
              Ver timeline
            </button>
          </div>
          <div className="mt-4 grid gap-3">
            {latestRecords.map((record) => {
              const config = getProfessionConfig(record);
              return (
                <article
                  key={record.id}
                  className="grid gap-3 rounded-2xl border border-brand-border bg-brand-background/50 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <span
                    className={`inline-flex h-9 w-fit items-center rounded-full border px-3 text-xs font-semibold ${config.className}`}
                  >
                    {config.shortIcon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-brand-secondary">
                      {config.label} - {formatDate(record.date.toDate())}
                    </p>
                    <h4 className="truncate text-sm font-semibold text-brand-text">{record.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenRecord(record)}
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-xs font-semibold text-brand-text transition hover:border-brand-primary"
                  >
                    Ver
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {showUpcomingEvents && upcomingEvents.length ? (
        <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <h3 className="text-base font-semibold text-brand-text">Proximos eventos</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-brand-border bg-brand-background/50 p-3"
              >
                <p className="text-xs font-semibold text-brand-secondary">{event.label}</p>
                <p className="mt-1 text-sm font-semibold text-brand-text">{event.title}</p>
                <p className="mt-1 text-xs text-brand-secondary">{event.dateLabel}</p>
              </div>
            ))}
          </div>
        </section>
      ) : showUpcomingEvents ? (
        <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <h3 className="text-base font-semibold text-brand-text">Proximos eventos</h3>
          <p className="mt-3 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
            No existen eventos programados.
          </p>
        </section>
      ) : null}

      {assignedProfessionals.length ? (
        <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <h3 className="text-base font-semibold text-brand-text">Profesionales asignados</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {assignedProfessionals.map((professional) => (
              <article
                key={professional.id}
                className="rounded-2xl border border-brand-border bg-brand-background/50 p-3"
              >
                <div className="flex items-center gap-3">
                  {professional.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={professional.photoUrl}
                      alt={professional.name}
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-bold text-brand-primary">
                      {professional.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-brand-text">
                      {professional.name}
                    </h4>
                    <p className="text-xs text-brand-secondary">{professional.profession}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-xs font-semibold text-brand-text opacity-70"
                  disabled
                >
                  Ver perfil
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {kpis.length ? (
        <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <h3 className="text-base font-semibold text-brand-text">Indicadores</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((kpi) => (
              <SummaryField key={kpi.label} label={kpi.label} value={String(kpi.value)} />
            ))}
          </dl>
        </section>
      ) : null}

      {showHealth ? (
        <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <h3 className="text-base font-semibold text-brand-text">Estado sanitario</h3>
          <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {healthItems.map((item) => (
              <SummaryField key={item.label} label={item.label} value={item.value} />
            ))}
          </dl>
        </section>
      ) : null}

      {showDocuments ? (
        <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-brand-text">Documentacion</h3>
            <button
              type="button"
              onClick={() => onSelectTab("documents")}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-xs font-semibold text-brand-text transition hover:border-brand-primary"
            >
              Ver todos
            </button>
          </div>
          {documents.length ? (
            <div className="mt-4 grid gap-2">
              {documents.map((document) => (
                <a
                  key={document.id}
                  href={document.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col gap-1 rounded-2xl border border-brand-border bg-brand-background/50 p-3 transition hover:border-brand-primary"
                >
                  <span className="text-sm font-semibold text-brand-text">{document.name}</span>
                  <span className="text-xs text-brand-secondary">{document.fileName}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
              No hay documentos recientes.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}

type HorseAlertsCenterProps = {
  alerts: HorseSmartAlert[];
  error: string;
  filter: HorseAlertFilter;
  loading: boolean;
  search: string;
  onArchive: (alert: HorseSmartAlert) => void;
  onFilterChange: (filter: HorseAlertFilter) => void;
  onGoToModule: (alert: HorseSmartAlert) => void;
  onOpenDetail: (alert: HorseSmartAlert) => void;
  onResolve: (alert: HorseSmartAlert) => void;
  onSearchChange: (search: string) => void;
};

function HorseAlertsCenter({
  alerts,
  error,
  filter,
  loading,
  search,
  onArchive,
  onFilterChange,
  onGoToModule,
  onOpenDetail,
  onResolve,
  onSearchChange,
}: HorseAlertsCenterProps) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_14rem]">
        <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
          Buscar alerta
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Texto, modulo, descripcion..."
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
          Filtro
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as HorseAlertFilter)}
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
          >
            {alertFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : loading ? (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          Analizando alertas del caballo...
        </p>
      ) : alerts.length ? (
        <div className="grid gap-3">
          {alerts.map((alert) => (
            <HorseAlertCard
              key={alert.id}
              alert={alert}
              onArchive={onArchive}
              onGoToModule={onGoToModule}
              onOpenDetail={onOpenDetail}
              onResolve={onResolve}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          No hay alertas activas para este caballo.
        </p>
      )}
    </div>
  );
}

function HorseAlertCard({
  alert,
  onArchive,
  onGoToModule,
  onOpenDetail,
  onResolve,
}: {
  alert: HorseSmartAlert;
  onArchive: (alert: HorseSmartAlert) => void;
  onGoToModule: (alert: HorseSmartAlert) => void;
  onOpenDetail: (alert: HorseSmartAlert) => void;
  onResolve: (alert: HorseSmartAlert) => void;
}) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getAlertPriorityClass(
                alert.priority
              )}`}
            >
              {alertPriorityLabel[alert.priority]}
            </span>
            <span className="rounded-full border border-brand-border bg-brand-background/70 px-3 py-1 text-xs font-semibold text-brand-text">
              {getAlertCategoryLabel(alert.category)}
            </span>
            <span className="rounded-full border border-brand-border bg-white px-3 py-1 text-xs font-semibold text-brand-secondary">
              {alertStatusLabel[alert.status]}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold text-brand-text">{alert.title}</h3>
          <p className="mt-1 text-sm text-brand-secondary">{alert.description}</p>
          {alert.dueAt ? (
            <p className="mt-2 text-xs font-semibold text-brand-secondary">
              Fecha: {formatDate(alert.dueAt.toDate())}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenDetail(alert)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
        >
          Ver detalle
        </button>
        <button
          type="button"
          onClick={() => onGoToModule(alert)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
        >
          Ir al modulo relacionado
        </button>
        {alert.status !== "resolved" ? (
          <button
            type="button"
            onClick={() => onResolve(alert)}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-brand-primary px-3 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
          >
            Marcar como resuelta
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onArchive(alert)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-secondary transition hover:border-brand-primary"
        >
          Archivar
        </button>
      </div>
    </article>
  );
}

function HorseAlertDetailModal({
  alert,
  onArchive,
  onClose,
  onGoToModule,
  onResolve,
}: {
  alert: HorseSmartAlert;
  onArchive: (alert: HorseSmartAlert) => void;
  onClose: () => void;
  onGoToModule: (alert: HorseSmartAlert) => void;
  onResolve: (alert: HorseSmartAlert) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-xl rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${getAlertPriorityClass(
                alert.priority
              )}`}
            >
              {alertPriorityLabel[alert.priority]}
            </span>
            <h2 className="mt-3 text-xl font-semibold text-brand-text">{alert.title}</h2>
            <p className="mt-1 text-sm text-brand-secondary">{getAlertCategoryLabel(alert.category)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
          >
            Cerrar
          </button>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <TimelineField label="Prioridad" value={alertPriorityLabel[alert.priority]} />
          <TimelineField label="Estado" value={alertStatusLabel[alert.status]} />
          <TimelineField label="Modulo" value={alert.relatedModule} />
          <TimelineField label="Tipo" value={alert.type} />
          <TimelineField
            label="Fecha"
            value={alert.dueAt ? formatDate(alert.dueAt.toDate()) : "-"}
          />
          <TimelineField
            label="Actualizada"
            value={alert.updatedAt ? formatDate(alert.updatedAt.toDate()) : "-"}
          />
        </dl>
        <div className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
          <h3 className="text-sm font-semibold text-brand-text">Descripcion</h3>
          <p className="mt-2 text-sm text-brand-secondary">{alert.description}</p>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onArchive(alert)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-secondary transition hover:border-brand-primary"
          >
            Archivar
          </button>
          <button
            type="button"
            onClick={() => onGoToModule(alert)}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
          >
            Ir al modulo relacionado
          </button>
          {alert.status !== "resolved" ? (
            <button
              type="button"
              onClick={() => onResolve(alert)}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
            >
              Marcar como resuelta
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type HorseAgendaProps = {
  canCreate: boolean;
  canEditRecord: (event: HorseAgendaEvent) => boolean;
  canCancelRecord: (event: HorseAgendaEvent) => boolean;
  error: string;
  filter: HorseAgendaFilter;
  groupedEvents: { label: string; events: HorseAgendaEvent[] }[];
  loading: boolean;
  search: string;
  viewMode: HorseAgendaViewMode;
  onCancel: (event: HorseAgendaEvent) => void;
  onEdit: (event: HorseAgendaEvent) => void;
  onFilterChange: (filter: HorseAgendaFilter) => void;
  onOpenCreate: () => void;
  onOpenDetail: (event: HorseAgendaEvent) => void;
  onSearchChange: (search: string) => void;
  onViewModeChange: (mode: HorseAgendaViewMode) => void;
};

function HorseAgenda({
  canCreate,
  canEditRecord,
  canCancelRecord,
  error,
  filter,
  groupedEvents,
  loading,
  search,
  viewMode,
  onCancel,
  onEdit,
  onFilterChange,
  onOpenCreate,
  onOpenDetail,
  onSearchChange,
  onViewModeChange,
}: HorseAgendaProps) {
  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 lg:grid-cols-[1fr_14rem]">
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Buscar en agenda
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Profesional, tipo, observaciones..."
              className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Filtro
            <select
              value={filter}
              onChange={(event) => onFilterChange(event.target.value as HorseAgendaFilter)}
              className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            >
              {agendaFilters.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition ${
              viewMode === "list"
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-border bg-white text-brand-text hover:border-brand-primary"
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("calendar")}
            className={`inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition ${
              viewMode === "calendar"
                ? "border-brand-primary bg-brand-primary text-white"
                : "border-brand-border bg-white text-brand-text hover:border-brand-primary"
            }`}
          >
            Calendario
          </button>
          {canCreate ? (
            <button
              type="button"
              onClick={onOpenCreate}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
            >
              Nuevo evento
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : loading ? (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          Cargando agenda...
        </p>
      ) : groupedEvents.length ? (
        viewMode === "list" ? (
          <AgendaList
            groupedEvents={groupedEvents}
            canCancelRecord={canCancelRecord}
            canEditRecord={canEditRecord}
            onCancel={onCancel}
            onEdit={onEdit}
            onOpenDetail={onOpenDetail}
          />
        ) : (
          <AgendaCalendar
            groupedEvents={groupedEvents}
            canCancelRecord={canCancelRecord}
            canEditRecord={canEditRecord}
            onCancel={onCancel}
            onEdit={onEdit}
            onOpenDetail={onOpenDetail}
          />
        )
      ) : (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          No existen eventos futuros para este caballo.
        </p>
      )}
    </div>
  );
}

function AgendaList({
  groupedEvents,
  canCancelRecord,
  canEditRecord,
  onCancel,
  onEdit,
  onOpenDetail,
}: {
  groupedEvents: { label: string; events: HorseAgendaEvent[] }[];
  canCancelRecord: (event: HorseAgendaEvent) => boolean;
  canEditRecord: (event: HorseAgendaEvent) => boolean;
  onCancel: (event: HorseAgendaEvent) => void;
  onEdit: (event: HorseAgendaEvent) => void;
  onOpenDetail: (event: HorseAgendaEvent) => void;
}) {
  return (
    <div className="space-y-5">
      {groupedEvents.map((group) => (
        <section key={group.label} className="space-y-3">
          <h3 className="text-sm font-semibold text-brand-secondary">{group.label}</h3>
          <div className="grid gap-3">
            {group.events.map((event) => (
              <AgendaEventCard
                key={event.id}
                event={event}
                canCancel={canCancelRecord(event)}
                canEdit={canEditRecord(event)}
                onCancel={onCancel}
                onEdit={onEdit}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AgendaCalendar(props: {
  groupedEvents: { label: string; events: HorseAgendaEvent[] }[];
  canCancelRecord: (event: HorseAgendaEvent) => boolean;
  canEditRecord: (event: HorseAgendaEvent) => boolean;
  onCancel: (event: HorseAgendaEvent) => void;
  onEdit: (event: HorseAgendaEvent) => void;
  onOpenDetail: (event: HorseAgendaEvent) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {props.groupedEvents.map((group) => (
        <section key={group.label} className="rounded-2xl border border-brand-border bg-white/80 p-4">
          <h3 className="text-sm font-semibold text-brand-text">{group.label}</h3>
          <div className="mt-3 space-y-3">
            {group.events.map((event) => (
              <AgendaEventCard
                key={event.id}
                event={event}
                compact
                canCancel={props.canCancelRecord(event)}
                canEdit={props.canEditRecord(event)}
                onCancel={props.onCancel}
                onEdit={props.onEdit}
                onOpenDetail={props.onOpenDetail}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function AgendaEventCard({
  canCancel,
  canEdit,
  compact = false,
  event,
  onCancel,
  onEdit,
  onOpenDetail,
}: {
  canCancel: boolean;
  canEdit: boolean;
  compact?: boolean;
  event: HorseAgendaEvent;
  onCancel: (event: HorseAgendaEvent) => void;
  onEdit: (event: HorseAgendaEvent) => void;
  onOpenDetail: (event: HorseAgendaEvent) => void;
}) {
  const config = getAgendaEventConfig(event);

  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-4">
      <div className={`grid gap-3 ${compact ? "" : "sm:grid-cols-[auto_1fr_auto] sm:items-start"}`}>
        <span
          className={`inline-flex h-9 w-fit items-center rounded-full border px-3 text-xs font-semibold ${config.className}`}
        >
          {config.shortIcon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand-secondary">
            {formatDate(event.date)} - {formatTimeInput(event.date)}
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-brand-text">{event.title}</h3>
          <p className="mt-1 text-sm text-brand-secondary">{event.professionalName}</p>
          <p className="mt-1 line-clamp-2 text-sm text-brand-secondary">{event.description}</p>
        </div>
        <span className="w-fit rounded-full border border-brand-border bg-brand-background/70 px-3 py-1 text-xs font-semibold text-brand-text">
          {eventStatusLabel[event.status]}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onOpenDetail(event)}
          className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
        >
          Ver
        </button>
        {canEdit ? (
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
          >
            Editar
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            onClick={() => onCancel(event)}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </article>
  );
}

function AgendaEventDetailModal({
  event,
  onClose,
}: {
  event: HorseAgendaEvent;
  onClose: () => void;
}) {
  const config = getAgendaEventConfig(event);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span
              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold ${config.className}`}
            >
              {config.shortIcon} {event.profession}
            </span>
            <h2 className="mt-3 text-xl font-semibold text-brand-text">{event.title}</h2>
            <p className="mt-1 text-sm text-brand-secondary">
              {formatDate(event.date)} - {formatTimeInput(event.date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
          >
            Cerrar
          </button>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <TimelineField label="Profesional responsable" value={event.professionalName} />
          <TimelineField label="Tipo de actuacion" value={event.title} />
          <TimelineField label="Estado" value={eventStatusLabel[event.status]} />
          <TimelineField label="Fuente" value={event.source === "event" ? "Agenda" : "Calculado"} />
        </dl>
        <div className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
          <h3 className="text-sm font-semibold text-brand-text">Descripcion</h3>
          <p className="mt-2 text-sm text-brand-secondary">{event.description || "-"}</p>
        </div>
        {event.notes ? (
          <div className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4">
            <h3 className="text-sm font-semibold text-brand-text">Observaciones</h3>
            <p className="mt-2 whitespace-pre-line text-sm text-brand-secondary">{event.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type AgendaEventModalProps = {
  error: string;
  mode: "create" | "edit";
  professionalOptions: { id: string; label: string }[];
  saving: boolean;
  values: HorseAgendaFormValues;
  onChange: (values: HorseAgendaFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
};

function AgendaEventModal({
  error,
  mode,
  professionalOptions,
  saving,
  values,
  onChange,
  onClose,
  onSubmit,
}: AgendaEventModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">
              {mode === "edit" ? "Editar evento" : "Nuevo evento"}
            </h2>
            <p className="mt-1 text-sm text-brand-secondary">
              Planificacion global del caballo.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Fecha
              <input
                type="date"
                value={values.date}
                onChange={(event) => onChange({ ...values, date: event.target.value })}
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Hora
              <input
                type="time"
                value={values.time}
                onChange={(event) => onChange({ ...values, time: event.target.value })}
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Profesion responsable
              <select
                value={values.profession}
                onChange={(event) =>
                  onChange({ ...values, profession: event.target.value as HorseAgendaFilter })
                }
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
              >
                {agendaFilters.filter((item) => item.value !== "all").map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Profesional del centro
              <select
                value={values.professionalId}
                onChange={(event) => onChange({ ...values, professionalId: event.target.value })}
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
              >
                <option value="">Profesional externo</option>
                {professionalOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!values.professionalId ? (
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Profesional externo
              <input
                value={values.externalProfessional}
                onChange={(event) =>
                  onChange({ ...values, externalProfessional: event.target.value })
                }
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
              />
            </label>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Tipo
              <input
                value={values.type}
                onChange={(event) => onChange({ ...values, type: event.target.value })}
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Duracion
              <input
                type="number"
                min="15"
                step="15"
                value={values.duration}
                onChange={(event) => onChange({ ...values, duration: event.target.value })}
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Descripcion
            <textarea
              value={values.description}
              onChange={(event) => onChange({ ...values, description: event.target.value })}
              rows={3}
              className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Observaciones
            <textarea
              value={values.notes}
              onChange={(event) => onChange({ ...values, notes: event.target.value })}
              rows={3}
              className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            />
          </label>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
            >
              {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type GlobalHorseTimelineProps = {
  error: string;
  filter: GlobalTimelineFilter;
  groupedRecords: GroupedProfessionalRecords[];
  loading: boolean;
  search: string;
  onFilterChange: (filter: GlobalTimelineFilter) => void;
  onOpenDetail: (record: ProfessionalRecord) => void;
  onSearchChange: (search: string) => void;
};

function GlobalHorseTimeline({
  error,
  filter,
  groupedRecords,
  loading,
  search,
  onFilterChange,
  onOpenDetail,
  onSearchChange,
}: GlobalHorseTimelineProps) {
  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_14rem]">
        <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
          Buscar en timeline
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Profesional, titulo, descripcion..."
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
          Filtro
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as GlobalTimelineFilter)}
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
          >
            {timelineFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : loading ? (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          Cargando timeline...
        </p>
      ) : groupedRecords.length ? (
        <div className="space-y-6">
          {groupedRecords.map((group) => (
            <section key={group.label} className="space-y-3">
              <h3 className="text-sm font-semibold text-brand-secondary">{group.label}</h3>
              <ol className="space-y-3 border-l border-brand-border pl-4">
                {group.records.map((record) => {
                  const config = getProfessionConfig(record);
                  return (
                    <li key={record.id} className="relative">
                      <span className="absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-brand-primary" />
                      <article className="rounded-2xl border border-brand-border bg-white/80 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase text-brand-secondary">
                              {formatDate(record.date.toDate())}
                            </p>
                            <h3 className="mt-1 truncate text-lg font-semibold text-brand-text">
                              {record.title}
                            </h3>
                            <p className="mt-2 line-clamp-2 text-sm text-brand-secondary">
                              {record.description || "Sin descripcion."}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <span
                              className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold ${config.className}`}
                            >
                              {config.shortIcon}
                            </span>
                            <span className="rounded-full border border-brand-border bg-brand-background/70 px-3 py-1 text-xs font-semibold text-brand-text">
                              {config.label}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm text-brand-secondary">
                            {getProfessionalName(record)}
                          </p>
                          <button
                            type="button"
                            onClick={() => onOpenDetail(record)}
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
                          >
                            Ver detalle
                          </button>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          Todavia no existen actuaciones registradas para este caballo.
        </p>
      )}
    </div>
  );
}

function ProfessionalRecordDetailModal({
  record,
  onClose,
}: {
  record: ProfessionalRecord;
  onClose: () => void;
}) {
  const config = getProfessionConfig(record);
  const metadataEntries = Object.entries(record.metadata);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold ${config.className}`}
              >
                {config.shortIcon}
              </span>
              <span className="rounded-full border border-brand-border bg-brand-background/70 px-3 py-1 text-xs font-semibold text-brand-text">
                {config.label}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-brand-text">{record.title}</h2>
            <p className="mt-1 text-sm text-brand-secondary">
              {formatDate(record.date.toDate())} - {getProfessionalName(record)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <section className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
            <h3 className="text-sm font-semibold text-brand-text">Descripcion</h3>
            <p className="mt-2 text-sm text-brand-secondary">
              {record.description || "Sin descripcion."}
            </p>
          </section>

          <dl className="grid gap-3 sm:grid-cols-2">
            <TimelineField label="Profesion" value={config.label} />
            <TimelineField label="Profesional" value={getProfessionalName(record)} />
            <TimelineField label="Tipo de registro" value={String(record.recordType)} />
            <TimelineField label="Creado por" value={record.createdBy || "-"} />
            <TimelineField
              label="Creado"
              value={record.createdAt ? formatDate(record.createdAt.toDate()) : "-"}
            />
            <TimelineField
              label="Actualizado"
              value={record.updatedAt ? formatDate(record.updatedAt.toDate()) : "-"}
            />
          </dl>

          <section className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
            <h3 className="text-sm font-semibold text-brand-text">Informacion especifica</h3>
            {metadataEntries.length ? (
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {metadataEntries.map(([key, value]) => (
                  <TimelineField
                    key={key}
                    label={formatMetadataLabel(key)}
                    value={formatMetadataValue(value)}
                  />
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-brand-secondary">
                No hay informacion especifica registrada.
              </p>
            )}
          </section>

          {record.attachments.length ? (
            <section className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
              <h3 className="text-sm font-semibold text-brand-text">Documentos</h3>
              <div className="mt-3 grid gap-2">
                {record.attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.url}-${index}`}
                    className="flex flex-col gap-2 rounded-2xl border border-brand-border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-brand-text">
                        {getAttachmentIcon(attachment.type)} {attachment.name}
                      </p>
                      <p className="text-xs text-brand-secondary">
                        {formatAttachmentSize(attachment.size)}
                      </p>
                    </div>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-xs font-semibold text-brand-text transition hover:border-brand-primary"
                    >
                      Abrir
                    </a>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type VeterinaryHistoryProps = {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  error: string;
  filter: VeterinaryFilter;
  items: VeterinaryTimelineItem[];
  loading: boolean;
  search: string;
  summary: VeterinarySummary;
  vaccineReminders: VaccineReminder[];
  onFilterChange: (filter: VeterinaryFilter) => void;
  onOpenCreate: () => void;
  onOpenDelete: (recordId: string) => void;
  onOpenEdit: (recordId: string) => void;
  onSearchChange: (search: string) => void;
};

function VeterinaryHistory({
  canCreate,
  canDelete,
  canEdit,
  error,
  filter,
  items,
  loading,
  search,
  summary,
  vaccineReminders,
  onFilterChange,
  onOpenCreate,
  onOpenDelete,
  onOpenEdit,
  onSearchChange,
}: VeterinaryHistoryProps) {
  return (
    <div className="mt-5 space-y-4">
      <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
        <div>
          <h3 className="text-base font-semibold text-brand-text">Resumen veterinario</h3>
          <p className="text-sm text-brand-secondary">
            Datos calculados desde el historial veterinario registrado.
          </p>
        </div>

        {summary.hasData ? (
          <dl className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SummaryField label="Ultima actuacion veterinaria" value={summary.lastAction} />
            <SummaryField label="Ultima vacuna" value={summary.lastVaccine} />
            <SummaryField label="Proxima vacuna" value={summary.nextVaccine} />
            <SummaryField label="Total de registros" value={String(summary.totalRecords)} />
            <SummaryField label="Total de vacunas" value={String(summary.totalVaccines)} />
            <SummaryField label="Total de tratamientos" value={String(summary.totalTreatments)} />
          </dl>
        ) : (
          <p className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
            Sin informacion veterinaria registrada.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-brand-border bg-white/80 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-brand-text">Proximas vacunas</h3>
            <p className="text-sm text-brand-secondary">
              Avisos basicos calculados desde la proxima dosis registrada.
            </p>
          </div>
        </div>

        {vaccineReminders.length ? (
          <div className="mt-4 grid gap-3">
            {vaccineReminders.map((reminder) => (
              <article
                key={reminder.id}
                className="grid gap-3 rounded-2xl border border-brand-border bg-brand-background/50 p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-brand-text">
                    {reminder.vaccineName}
                  </p>
                  <p className="text-xs text-brand-secondary">Nombre de la vacuna</p>
                </div>
                <ReminderMeta label="Proxima dosis" value={reminder.nextDoseLabel} />
                <ReminderMeta
                  label="Dias restantes"
                  value={formatDaysRemaining(reminder.daysRemaining)}
                />
                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getVaccineReminderStatusClass(
                    reminder.status
                  )}`}
                >
                  {getVaccineReminderStatusLabel(reminder.status)}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-brand-border bg-brand-background/50 p-4 text-sm text-brand-secondary">
            No hay proximas vacunas programadas.
          </p>
        )}
      </section>

      {canCreate ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
          >
            Nuevo registro veterinario
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_14rem]">
        <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
          Buscar en historial
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Diagnostico, tratamiento, veterinario..."
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
          Filtro
          <select
            value={filter}
            onChange={(event) => onFilterChange(event.target.value as VeterinaryFilter)}
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
          >
            {veterinaryFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      ) : loading ? (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          Cargando historial veterinario...
        </p>
      ) : items.length ? (
        <ol className="space-y-4 border-l border-brand-border pl-4">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span className="absolute -left-[1.35rem] top-5 h-3 w-3 rounded-full border-2 border-white bg-brand-primary" />
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-brand-secondary">
                      {item.dateLabel}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-brand-text">
                      {item.title}
                    </h3>
                  </div>
                  <span className="w-fit rounded-full border border-brand-border bg-brand-background/70 px-3 py-1 text-xs font-semibold text-brand-text">
                    {item.actionType}
                  </span>
                </div>

                {(canEdit || canDelete) && item.kind === "medical" && item.recordId ? (
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={() => onOpenEdit(item.recordId!)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
                      >
                        Editar
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => onOpenDelete(item.recordId!)}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <dl className="mt-4 grid gap-3 md:grid-cols-2">
                  <TimelineField label="Diagnostico" value={item.diagnosis} />
                  <TimelineField label="Tratamiento realizado" value={item.treatment} />
                  <TimelineField label="Medicacion administrada" value={item.medication} />
                  <TimelineField label="Veterinario responsable" value={item.veterinarian} />
                </dl>

                {item.filter === "vaccines" ? (
                  <dl className="mt-3 grid gap-3 md:grid-cols-3">
                    <TimelineField label="Nombre vacuna" value={item.vaccineName ?? "Sin indicar"} />
                    <TimelineField label="Lote" value={item.vaccineBatch ?? "Sin indicar"} />
                    <TimelineField
                      label="Proxima dosis"
                      value={item.nextDoseLabel ?? "Sin indicar"}
                    />
                  </dl>
                ) : null}

                <div className="mt-4 rounded-2xl bg-brand-background/50 p-3">
                  <p className="text-xs font-medium text-brand-secondary">Observaciones</p>
                  <p className="mt-1 text-sm text-brand-text">{item.notes}</p>
                </div>

                {item.attachments.length ? (
                  <div className="mt-4 grid gap-2">
                    {item.attachments.map((attachment, index) => (
                      <div
                        key={`${item.id}-${attachment.url}-${index}`}
                        className="flex flex-col gap-2 rounded-2xl border border-brand-border bg-brand-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-brand-text">
                            {getAttachmentIcon(attachment.type)} {attachment.name}
                          </p>
                          <p className="text-xs text-brand-secondary">
                            {formatAttachmentSize(attachment.size)}
                          </p>
                        </div>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-brand-border bg-white px-3 text-xs font-semibold text-brand-text transition hover:border-brand-primary"
                        >
                          Abrir
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl border border-brand-border bg-white/70 p-4 text-sm text-brand-secondary">
          No existen registros veterinarios para este caballo.
        </p>
      )}
    </div>
  );
}

function TimelineField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-brand-background/50 p-3">
      <dt className="text-xs font-medium text-brand-secondary">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-brand-text">{value}</dd>
    </div>
  );
}

function ReminderMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-brand-text">{value}</p>
      <p className="text-xs text-brand-secondary">{label}</p>
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-background/50 p-3">
      <dt className="text-xs font-medium text-brand-secondary">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-brand-text">{value}</dd>
    </div>
  );
}

type VeterinaryRecordModalProps = {
  error: string;
  mode: "create" | "edit";
  selectedFiles: File[];
  saving: boolean;
  values: VeterinaryFormValues;
  onChange: (values: VeterinaryFormValues) => void;
  onClose: () => void;
  onFilesChange: (files: File[]) => void;
  onSubmit: () => void;
};

function VeterinaryRecordModal({
  error,
  mode,
  selectedFiles,
  saving,
  values,
  onChange,
  onClose,
  onFilesChange,
  onSubmit,
}: VeterinaryRecordModalProps) {
  const handleFileChange = (files: FileList | null) => {
    if (!files) {
      onFilesChange([]);
      return;
    }

    onFilesChange(Array.from(files).filter(isAllowedAttachmentFile));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-text">
              {mode === "edit" ? "Editar registro veterinario" : "Nuevo registro veterinario"}
            </h2>
            <p className="mt-1 text-sm text-brand-secondary">
              {mode === "edit"
                ? "Actualiza los datos del registro veterinario."
                : "Datos clinicos del caballo en modo lectura para el historial."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text transition hover:border-brand-primary disabled:opacity-60"
          >
            Cerrar
          </button>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Fecha
              <input
                type="date"
                value={values.date}
                onChange={(event) => onChange({ ...values, date: event.target.value })}
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Tipo de actuacion
              <select
                value={values.type}
                onChange={(event) =>
                  onChange({ ...values, type: event.target.value as VeterinaryFormType })
                }
                className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
              >
                {medicalTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Diagnostico
            <textarea
              value={values.diagnosis}
              onChange={(event) => onChange({ ...values, diagnosis: event.target.value })}
              rows={3}
              className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Tratamiento realizado
            <textarea
              value={values.treatment}
              onChange={(event) => onChange({ ...values, treatment: event.target.value })}
              rows={3}
              className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Medicacion administrada
            <input
              value={values.medicationAdministered}
              onChange={(event) =>
                onChange({ ...values, medicationAdministered: event.target.value })
              }
              className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            />
          </label>

          {values.type === "VACCINATION" ? (
            <div className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
              <p className="text-sm font-semibold text-brand-text">Datos de la vacuna</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
                  Nombre de la vacuna
                  <input
                    value={values.vaccineName}
                    onChange={(event) =>
                      onChange({ ...values, vaccineName: event.target.value })
                    }
                    className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
                  Lote
                  <input
                    value={values.vaccineBatch}
                    onChange={(event) =>
                      onChange({ ...values, vaccineBatch: event.target.value })
                    }
                    className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
                  Fecha de proxima dosis
                  <input
                    type="date"
                    value={values.nextDoseAt}
                    onChange={(event) =>
                      onChange({ ...values, nextDoseAt: event.target.value })
                    }
                    className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
                  Veterinario responsable
                  <input
                    value={values.veterinarianName}
                    onChange={(event) =>
                      onChange({ ...values, veterinarianName: event.target.value })
                    }
                    className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text outline-none transition focus:border-brand-primary"
                  />
                </label>
              </div>
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
            Observaciones
            <textarea
              value={values.notes}
              onChange={(event) => onChange({ ...values, notes: event.target.value })}
              rows={3}
              className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text outline-none transition focus:border-brand-primary"
            />
          </label>

          <div className="rounded-2xl border border-brand-border bg-brand-background/50 p-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-brand-secondary">
              Documentos adjuntos
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                multiple
                onChange={(event) => handleFileChange(event.target.files)}
                className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text file:mr-3 file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </label>
            <p className="mt-2 text-xs text-brand-secondary">
              Formatos permitidos: PDF, JPG y PNG.
            </p>

            {values.attachments.length ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-brand-secondary">
                  Adjuntos guardados
                </p>
                {values.attachments.map((attachment, index) => (
                  <p
                    key={`${attachment.url}-${index}`}
                    className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text"
                  >
                    {getAttachmentIcon(attachment.type)} {attachment.name}
                  </p>
                ))}
              </div>
            ) : null}

            {selectedFiles.length ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold text-brand-secondary">
                  Nuevos adjuntos
                </p>
                {selectedFiles.map((file) => (
                  <p
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="rounded-xl border border-brand-border bg-white px-3 py-2 text-sm text-brand-text"
                  >
                    {getAttachmentIcon(file.type)} {file.name} - {formatAttachmentSize(file.size)}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:opacity-60"
            >
              {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Guardar registro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type ConfirmDeleteModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmDeleteModal({ onCancel, onConfirm }: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-white p-5 shadow-xl">
        <h2 className="text-xl font-semibold text-brand-text">Eliminar registro</h2>
        <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Esta acción eliminará el registro veterinario. No se puede deshacer.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text transition hover:border-brand-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Confirmar eliminación
          </button>
        </div>
      </div>
    </div>
  );
}

function getMedicalFilter(type: MedicalRecordType): VeterinaryFilter {
  if (type === "TREATMENT") return "treatments";
  if (type === "VACCINATION") return "vaccines";
  if (type === "CHECKUP") return "checkups";
  return "other";
}

function getMedicalFilterFromRecord(record: MedicalRecord): VeterinaryFilter {
  if (record.type === "OTHER" && record.title === "Lesion") return "injuries";
  return getMedicalFilter(record.type);
}

function getMedicalActionLabel(record: MedicalRecord): string {
  if (record.type === "OTHER" && record.title === "Lesion") return "Lesion";
  return medicalTypeLabel[record.type];
}

function resolveMedicalRecordType(type: VeterinaryFormType): MedicalRecordType {
  return type === "INJURY" ? "OTHER" : type;
}

function getTitleFromFormType(type: VeterinaryFormType): string {
  return type === "INJURY" ? "Lesion" : medicalTypeLabel[resolveMedicalRecordType(type)];
}

function getFormTypeFromRecord(record: MedicalRecord): VeterinaryFormType {
  if (record.type === "OTHER" && record.title === "Lesion") return "INJURY";
  if (record.type === "DEWORMING" || record.type === "SURGERY") return "OTHER";
  return record.type;
}

function formatRecordSummary(record: MedicalRecord): string {
  const title =
    record.type === "VACCINATION"
      ? record.vaccineName?.trim() || record.title
      : record.title || medicalTypeLabel[record.type];
  return `${title} - ${formatDate(record.date.toDate())}`;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getVaccineReminderStatus(daysRemaining: number): VaccineReminderStatus {
  if (daysRemaining < 0) return "overdue";
  if (daysRemaining <= 15) return "urgent";
  return "upcoming";
}

function getVaccineReminderStatusLabel(status: VaccineReminderStatus): string {
  if (status === "overdue") return "Vencida";
  if (status === "urgent") return "Urgente";
  return "Proxima";
}

function getVaccineReminderStatusClass(status: VaccineReminderStatus): string {
  if (status === "overdue") return "border-red-300 bg-red-50 text-red-700";
  if (status === "urgent") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-emerald-300 bg-emerald-50 text-emerald-700";
}

function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return overdueDays === 1 ? "Vencida hace 1 dia" : `Vencida hace ${overdueDays} dias`;
  }
  if (daysRemaining === 0) return "Hoy";
  if (daysRemaining === 1) return "1 dia";
  return `${daysRemaining} dias`;
}

function isAllowedAttachmentFile(file: File): boolean {
  return ["application/pdf", "image/jpeg", "image/png"].includes(file.type);
}

function getAttachmentIcon(type: string): string {
  if (type === "application/pdf") return "PDF";
  if (type === "image/jpeg" || type === "image/png") return "IMG";
  return "DOC";
}

function formatAttachmentSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "Tamano no disponible";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function canViewProfessionalRecord(
  record: ProfessionalRecord,
  hasPermission: (module: string, action: string) => boolean
): boolean {
  const config = getProfessionConfig(record);
  if (!config.permission) return false;
  return config.permission.actions.some((action) =>
    hasPermission(config.permission!.module, action)
  );
}

function getProfessionalName(record: ProfessionalRecord): string {
  const metadataName = record.metadata.professionalName;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return record.professionalId || record.createdBy || "Profesional sin identificar";
}

function groupProfessionalRecordsByDate(
  records: ProfessionalRecord[]
): GroupedProfessionalRecords[] {
  const groups = new Map<string, ProfessionalRecord[]>();

  records.forEach((record) => {
    const label = getTimelineGroupLabel(record.date.toDate());
    groups.set(label, [...(groups.get(label) ?? []), record]);
  });

  return Array.from(groups.entries()).map(([label, groupRecords]) => ({
    label,
    records: groupRecords,
  }));
}

function getTimelineGroupLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.floor((today.getTime() - target.getTime()) / DAY_MS);

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays > 1 && diffDays <= 7) return "La semana pasada";

  return target.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
}

function formatMetadataLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetadataValue(value: ProfessionalRecordMetadataValue): string {
  if (value === null) return "-";
  if (value instanceof Timestamp) return formatDate(value.toDate());
  if (Array.isArray(value)) return value.map(formatMetadataValue).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${formatMetadataLabel(key)}: ${formatMetadataValue(item)}`)
      .join(" - ");
  }
  if (typeof value === "boolean") return value ? "Si" : "No";
  return String(value);
}

function buildUpcomingSummaryEvents({
  classes,
  hasPermission,
  horse,
  medicalRecords,
  professionalRecords,
}: {
  classes: Class[];
  hasPermission: (module: string, action: string) => boolean;
  horse: Horse | null;
  medicalRecords: MedicalRecord[];
  professionalRecords: ProfessionalRecord[];
}): SummaryUpcomingEvent[] {
  const nowMs = startOfDay(new Date()).getTime();
  const events: SummaryUpcomingEvent[] = [];

  if (hasPermission("veterinary", "viewHistory")) {
    const nextVaccine = medicalRecords
      .filter((record) => record.type === "VACCINATION" && record.nextDoseAt)
      .filter((record) => record.nextDoseAt!.toMillis() >= nowMs)
      .sort((left, right) => left.nextDoseAt!.toMillis() - right.nextDoseAt!.toMillis())[0];
    if (nextVaccine?.nextDoseAt) {
      events.push({
        id: `vaccine-${nextVaccine.id}`,
        label: "Proxima vacuna",
        title: nextVaccine.vaccineName?.trim() || nextVaccine.title || "Vacuna",
        dateLabel: formatDate(nextVaccine.nextDoseAt.toDate()),
        dateMs: nextVaccine.nextDoseAt.toMillis(),
      });
    }

    const nextReview = medicalRecords
      .filter((record) => record.nextReviewAt)
      .filter((record) => record.nextReviewAt!.toMillis() >= nowMs)
      .sort((left, right) => left.nextReviewAt!.toMillis() - right.nextReviewAt!.toMillis())[0];
    if (nextReview?.nextReviewAt) {
      events.push({
        id: `vet-review-${nextReview.id}`,
        label: "Proxima revision veterinaria",
        title: nextReview.title || "Revision veterinaria",
        dateLabel: formatDate(nextReview.nextReviewAt.toDate()),
        dateMs: nextReview.nextReviewAt.toMillis(),
      });
    }
  }

  if (
    horse?.nextFarrierVisitAt &&
    horse.nextFarrierVisitAt.toMillis() >= nowMs &&
    (hasPermission("farrier", "view") || hasPermission("farrier", "viewHistory"))
  ) {
    events.push({
      id: "farrier-next",
      label: "Proximo herrado",
      title: horse.farrierName?.trim() || "Herrador",
      dateLabel: formatDate(horse.nextFarrierVisitAt.toDate()),
      dateMs: horse.nextFarrierVisitAt.toMillis(),
    });
  }

  if (hasPermission("classes", "viewClasses")) {
    const nextClass = classes
      .filter((classItem) => classItem.startAt.toMillis() >= nowMs)
      .sort((left, right) => left.startAt.toMillis() - right.startAt.toMillis())[0];
    if (nextClass) {
      events.push({
        id: `class-${nextClass.id}`,
        label: "Proxima clase",
        title: nextClass.title,
        dateLabel: formatDate(nextClass.startAt.toDate()),
        dateMs: nextClass.startAt.toMillis(),
      });
    }
  }

  if (hasPermission("physiotherapy", "view") || hasPermission("physiotherapy", "viewHistory")) {
    const nextPhysio = getNextProfessionalRecordEvent(professionalRecords, "physiotherapy", nowMs);
    if (nextPhysio) {
      events.push({
        id: `physio-${nextPhysio.id}`,
        label: "Proxima sesion fisioterapia",
        title: nextPhysio.title,
        dateLabel: formatDate(new Date(nextPhysio.dateMs)),
        dateMs: nextPhysio.dateMs,
      });
    }
  }

  return events.sort((left, right) => left.dateMs - right.dateMs);
}

function getNextProfessionalRecordEvent(
  records: ProfessionalRecord[],
  filter: GlobalTimelineFilter,
  minDateMs: number
): { id: string; title: string; dateMs: number } | null {
  return (
    records
      .map((record) => {
        const dateValue =
          getMetadataTimestamp(record, "nextSessionAt") ??
          getMetadataTimestamp(record, "nextReviewAt") ??
          getMetadataTimestamp(record, "nextDate");
        return dateValue
          ? {
              id: record.id,
              title: record.title,
              dateMs: dateValue.toMillis(),
              filter: getProfessionConfig(record).filter,
            }
          : null;
      })
      .filter((item): item is { id: string; title: string; dateMs: number; filter: GlobalTimelineFilter } =>
        Boolean(item)
      )
      .filter((item) => item.filter === filter && item.dateMs >= minDateMs)
      .sort((left, right) => left.dateMs - right.dateMs)[0] ?? null
  );
}

function buildAssignedProfessionals(
  records: ProfessionalRecord[]
): AssignedProfessionalSummary[] {
  const professionals = new Map<string, AssignedProfessionalSummary>();

  records.forEach((record) => {
    const key = record.professionalId || record.createdBy;
    if (!key || professionals.has(key)) return;
    professionals.set(key, {
      id: key,
      name: getProfessionalName(record),
      profession: getProfessionConfig(record).label,
      photoUrl: getMetadataString(record, "professionalPhoto") ?? getMetadataString(record, "photoUrl"),
    });
  });

  return Array.from(professionals.values()).slice(0, 6);
}

function buildSummaryKpis({
  documents,
  hasPermission,
  records,
}: {
  documents: HorseDocument[];
  hasPermission: (module: string, action: string) => boolean;
  records: ProfessionalRecord[];
}): SummaryKpi[] {
  const kpis: SummaryKpi[] = [{ label: "Total actuaciones", value: records.length }];
  const countByFilter = (filter: GlobalTimelineFilter) =>
    records.filter((record) => getProfessionConfig(record).filter === filter).length;

  if (hasPermission("veterinary", "viewHistory")) {
    kpis.push({ label: "Veterinarias", value: countByFilter("veterinary") });
  }
  if (hasPermission("farrier", "view") || hasPermission("farrier", "viewHistory")) {
    kpis.push({ label: "Herrados", value: countByFilter("farrier") });
  }
  if (hasPermission("classes", "viewClasses")) {
    kpis.push({ label: "Clases", value: countByFilter("teacher") });
  }
  if (hasPermission("physiotherapy", "view") || hasPermission("physiotherapy", "viewHistory")) {
    kpis.push({ label: "Fisioterapia", value: countByFilter("physiotherapy") });
  }
  if (hasPermission("horses", "viewProfile")) {
    kpis.push({ label: "Documentos", value: documents.length });
  }

  return kpis;
}

function buildHealthSummary(records: MedicalRecord[]): HealthSummaryItem[] {
  const sortedRecords = [...records].sort(
    (left, right) => right.date.toMillis() - left.date.toMillis()
  );
  const lastVaccine = sortedRecords.find((record) => record.type === "VACCINATION");
  const lastReview = sortedRecords.find((record) => record.type === "CHECKUP");
  const lastTreatment = sortedRecords.find((record) => record.type === "TREATMENT");
  const activeAlerts = records.filter(
    (record) =>
      record.nextReviewAt && record.nextReviewAt.toMillis() <= startOfDay(new Date()).getTime()
  ).length;

  return [
    {
      label: "Ultima vacuna",
      value: lastVaccine ? formatRecordSummary(lastVaccine) : "-",
    },
    {
      label: "Ultima revision",
      value: lastReview ? formatRecordSummary(lastReview) : "-",
    },
    {
      label: "Ultimo tratamiento",
      value: lastTreatment ? formatRecordSummary(lastTreatment) : "-",
    },
    {
      label: "Alertas",
      value: String(activeAlerts),
    },
  ];
}

function getMetadataString(record: ProfessionalRecord, key: string): string | undefined {
  const value = record.metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getMetadataTimestamp(record: ProfessionalRecord, key: string): Timestamp | undefined {
  const value = record.metadata[key];
  if (value instanceof Timestamp) return value;
  return undefined;
}

function buildHorseAgendaEvents({
  events,
  hasPermission,
  horse,
  medicalRecords,
  professionalRecords,
}: {
  events: Event[];
  hasPermission: (module: string, action: string) => boolean;
  horse: Horse | null;
  medicalRecords: MedicalRecord[];
  professionalRecords: ProfessionalRecord[];
}): HorseAgendaEvent[] {
  const nowMs = Date.now();
  const result: HorseAgendaEvent[] = [];

  events.forEach((event) => {
    const agendaEvent = mapCalendarEventToHorseAgenda(event);
    if (agendaEvent.date.getTime() >= nowMs && canViewAgendaEvent(agendaEvent, hasPermission)) {
      result.push(agendaEvent);
    }
  });

  if (hasPermission("veterinary", "viewHistory")) {
    medicalRecords.forEach((record) => {
      if (record.type === "VACCINATION" && record.nextDoseAt && record.nextDoseAt.toMillis() >= nowMs) {
        result.push({
          id: `derived-vaccine-${record.id}`,
          source: "derived",
          filter: "veterinary",
          profession: "Veterinaria",
          professionalName: record.veterinarianName || "Veterinario responsable",
          title: record.vaccineName?.trim() || record.title || "Vacuna",
          description: record.notes || record.treatment || "",
          date: record.nextDoseAt.toDate(),
          status: "SCHEDULED",
          notes: record.notes,
        });
      }
      if (record.nextReviewAt && record.nextReviewAt.toMillis() >= nowMs) {
        result.push({
          id: `derived-review-${record.id}`,
          source: "derived",
          filter: "veterinary",
          profession: "Veterinaria",
          professionalName: record.veterinarianName || "Veterinario responsable",
          title: record.title || "Revision veterinaria",
          description: record.notes || record.diagnosis || "",
          date: record.nextReviewAt.toDate(),
          status: "SCHEDULED",
          notes: record.notes,
        });
      }
    });
  }

  if (
    horse?.nextFarrierVisitAt &&
    horse.nextFarrierVisitAt.toMillis() >= nowMs &&
    (hasPermission("farrier", "view") || hasPermission("farrier", "viewHistory"))
  ) {
    result.push({
      id: "derived-farrier",
      source: "derived",
      filter: "farrier",
      profession: "Herrador",
      professionalName: horse.farrierName || "Herrador",
      title: "Proximo herrado",
      description: "Visita del herrador programada.",
      date: horse.nextFarrierVisitAt.toDate(),
      status: "SCHEDULED",
    });
  }

  professionalRecords.forEach((record) => {
    const nextDate =
      getMetadataTimestamp(record, "nextSessionAt") ??
      getMetadataTimestamp(record, "nextReviewAt") ??
      getMetadataTimestamp(record, "nextDate");
    if (!nextDate || nextDate.toMillis() < nowMs) return;
    const filter = mapTimelineFilterToAgendaFilter(getProfessionConfig(record).filter);
    const agendaEvent: HorseAgendaEvent = {
      id: `derived-professional-${record.id}`,
      source: "derived",
      filter,
      profession: getAgendaFilterLabel(filter),
      professionalName: getProfessionalName(record),
      title: record.title,
      description: record.description,
      date: nextDate.toDate(),
      status: "SCHEDULED",
    };
    if (canViewAgendaEvent(agendaEvent, hasPermission)) {
      result.push(agendaEvent);
    }
  });

  return result.sort((left, right) => left.date.getTime() - right.date.getTime());
}

function mapCalendarEventToHorseAgenda(event: Event): HorseAgendaEvent {
  const filter = getAgendaFilterFromEvent(event);
  const notes = event.notes ?? undefined;
  const professionalFromNotes = extractAgendaNoteValue(notes, "Profesional");

  return {
    id: `event-${event.id}`,
    source: "event",
    sourceEvent: event,
    filter,
    profession: getAgendaFilterLabel(filter),
    professionalName: professionalFromNotes || event.trainerId || "Profesional responsable",
    title: event.title,
    description: event.description || event.notes || "",
    date: event.startAt.toDate(),
    endDate: event.endAt.toDate(),
    status: event.status,
    notes,
  };
}

function getAgendaFilterFromEvent(event: Event): HorseAgendaFilter {
  if (event.type === "CLASS") return "teacher";
  if (event.type === "COMPETITION") return "competition";
  if (event.type === "VET_REVIEW") return "veterinary";
  if (event.type === "FARRIER") return "farrier";
  return "other";
}

function mapTimelineFilterToAgendaFilter(filter: GlobalTimelineFilter): HorseAgendaFilter {
  if (filter === "nutrition" || filter === "groom") return "other";
  return filter;
}

function getAgendaEventConfig(event: HorseAgendaEvent) {
  if (event.filter === "competition") {
    return {
      shortIcon: "COM",
      className: "border-indigo-300 bg-indigo-50 text-indigo-700",
    };
  }
  const syntheticRecord = {
    profession: event.filter,
    recordType: event.filter,
  } as ProfessionalRecord;
  return getProfessionConfig(syntheticRecord);
}

function getAgendaFilterLabel(filter: HorseAgendaFilter): string {
  return agendaFilters.find((item) => item.value === filter)?.label ?? "Otros";
}

function groupAgendaEventsByDate(
  events: HorseAgendaEvent[]
): { label: string; events: HorseAgendaEvent[] }[] {
  const groups = new Map<string, HorseAgendaEvent[]>();

  events.forEach((event) => {
    const label = getTimelineGroupLabel(event.date);
    groups.set(label, [...(groups.get(label) ?? []), event]);
  });

  return Array.from(groups.entries()).map(([label, groupEvents]) => ({
    label,
    events: groupEvents,
  }));
}

function hasAnyAgendaViewPermission(
  hasPermission: (module: string, action: string) => boolean
): boolean {
  return (
    hasPermission("agenda", "view") ||
    hasPermission("veterinary", "viewHistory") ||
    hasPermission("classes", "viewClasses") ||
    hasPermission("farrier", "view") ||
    hasPermission("farrier", "viewHistory") ||
    hasPermission("physiotherapy", "view") ||
    hasPermission("physiotherapy", "viewHistory") ||
    hasPermission("horses", "viewProfile")
  );
}

function hasAnyAgendaCreatePermission(
  hasPermission: (module: string, action: string) => boolean
): boolean {
  return (
    hasPermission("agenda", "createEvents") ||
    hasPermission("veterinary", "createTreatment") ||
    hasPermission("classes", "createClasses") ||
    hasPermission("farrier", "create") ||
    hasPermission("physiotherapy", "create")
  );
}

function canViewAgendaEvent(
  event: HorseAgendaEvent,
  hasPermission: (module: string, action: string) => boolean
): boolean {
  if (event.filter === "veterinary") return hasPermission("veterinary", "viewHistory");
  if (event.filter === "teacher") return hasPermission("classes", "viewClasses");
  if (event.filter === "farrier") return hasPermission("farrier", "view") || hasPermission("farrier", "viewHistory");
  if (event.filter === "physiotherapy") return hasPermission("physiotherapy", "view") || hasPermission("physiotherapy", "viewHistory");
  if (event.filter === "competition") return hasPermission("agenda", "view") || hasPermission("horses", "viewProfile");
  return hasPermission("agenda", "view") || hasPermission("horses", "viewProfile");
}

function canEditAgendaEvent(
  event: HorseAgendaEvent,
  hasPermission: (module: string, action: string) => boolean
): boolean {
  if (event.source !== "event") return false;
  if (event.filter === "veterinary") return hasPermission("veterinary", "editTreatment");
  if (event.filter === "teacher") return hasPermission("classes", "editClasses");
  if (event.filter === "farrier") return hasPermission("farrier", "edit");
  if (event.filter === "physiotherapy") return hasPermission("physiotherapy", "edit");
  return hasPermission("agenda", "editEvents");
}

function canCancelAgendaEvent(
  event: HorseAgendaEvent,
  hasPermission: (module: string, action: string) => boolean
): boolean {
  if (event.source !== "event" || event.status === "CANCELLED") return false;
  if (event.filter === "veterinary") return hasPermission("veterinary", "deleteTreatment");
  if (event.filter === "teacher") return hasPermission("classes", "deleteEvents");
  if (event.filter === "farrier") return hasPermission("farrier", "delete");
  if (event.filter === "physiotherapy") return hasPermission("physiotherapy", "delete");
  return hasPermission("agenda", "deleteEvents");
}

function getAgendaEventType(filter: HorseAgendaFilter): EventType {
  if (filter === "veterinary" || filter === "dentist") return "VET_REVIEW";
  if (filter === "farrier") return "FARRIER";
  if (filter === "teacher") return "CLASS";
  if (filter === "competition") return "COMPETITION";
  return "GENERAL";
}

function extractAgendaNoteValue(notes: string | undefined, label: string): string | undefined {
  if (!notes) return undefined;
  const line = notes
    .split("\n")
    .find((item) => item.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  return line?.split(":").slice(1).join(":").trim() || undefined;
}

function formatTimeInput(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function hasAnyAlertPermission(
  hasPermission: (module: string, action: string) => boolean
): boolean {
  return (
    hasPermission("horses", "viewProfile") ||
    hasPermission("veterinary", "viewHistory") ||
    hasPermission("classes", "viewClasses") ||
    hasPermission("agenda", "view") ||
    hasPermission("farrier", "view") ||
    hasPermission("farrier", "viewHistory")
  );
}

function canViewHorseAlert(
  alert: HorseSmartAlert,
  hasPermission: (module: string, action: string) => boolean
): boolean {
  if (alert.category === "veterinary") return hasPermission("veterinary", "viewHistory");
  if (alert.category === "classes") return hasPermission("classes", "viewClasses");
  if (alert.category === "agenda") return hasPermission("agenda", "view") || hasPermission("horses", "viewProfile");
  if (alert.category === "farrier") return hasPermission("farrier", "view") || hasPermission("farrier", "viewHistory");
  if (alert.category === "documentation") return hasPermission("horses", "viewProfile");
  if (alert.category === "system") return hasPermission("horses", "viewProfile");
  return false;
}

function getAlertPriorityRank(priority: HorseSmartAlertPriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function getAlertPriorityClass(priority: HorseSmartAlertPriority): string {
  if (priority === "critical") return "border-red-300 bg-red-50 text-red-700";
  if (priority === "high") return "border-orange-300 bg-orange-50 text-orange-700";
  if (priority === "medium") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-emerald-300 bg-emerald-50 text-emerald-700";
}

function getAlertCategoryLabel(category: HorseSmartAlertCategory): string {
  if (category === "veterinary") return "Veterinaria";
  if (category === "farrier") return "Herrador";
  if (category === "agenda") return "Agenda";
  if (category === "documentation") return "Documentacion";
  if (category === "classes") return "Clases";
  return "Sistema";
}

function getDefaultAlertTab(alert: HorseSmartAlert): string {
  if (alert.category === "veterinary") return "veterinary";
  if (alert.category === "agenda") return "agenda";
  if (alert.category === "documentation") return "documents";
  if (alert.category === "classes") return "classes";
  return "summary";
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

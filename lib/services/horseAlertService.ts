import {
  Timestamp,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  getHorseById,
  listHorseDocuments,
  listMedicalRecordsByHorse,
} from "@/lib/horses";
import { horseAlertsCollection } from "@/lib/horses/paths";
import { getEventsByDateRange } from "@/lib/services/calendarService";
import { getClassesByCenter } from "@/lib/services/classService";
import { getHorseRecords } from "@/lib/services/professionalRecordService";
import { assertCenterId, assertRequiredString } from "@/lib/services/shared";

export type HorseSmartAlertCategory =
  | "veterinary"
  | "farrier"
  | "agenda"
  | "documentation"
  | "classes"
  | "system";

export type HorseSmartAlertPriority = "critical" | "high" | "medium" | "low";

export type HorseSmartAlertStatus = "new" | "read" | "resolved" | "archived";

export type HorseSmartAlert = {
  id: string;
  centerId: string;
  horseId: string;
  category: HorseSmartAlertCategory;
  type: string;
  priority: HorseSmartAlertPriority;
  status: HorseSmartAlertStatus;
  title: string;
  description: string;
  relatedModule: string;
  relatedTab?: string;
  sourceId?: string;
  dueAt?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  resolvedAt?: Timestamp;
  archivedAt?: Timestamp;
};

type HorseSmartAlertDoc = Omit<HorseSmartAlert, "id"> & {
  generatedAt?: Timestamp;
};

const DAY_MS = 1000 * 60 * 60 * 24;

const alertDocRef = (centerId: string, horseId: string, alertId: string) =>
  doc(
    horseAlertsCollection(
      assertCenterId(centerId),
      assertRequiredString("horseId", horseId)
    ),
    assertRequiredString("alertId", alertId)
  );

const daysUntil = (date: Timestamp) =>
  Math.ceil((startOfDay(date.toDate()).getTime() - startOfDay(new Date()).getTime()) / DAY_MS);

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const makeAlertId = (category: HorseSmartAlertCategory, type: string, sourceId: string) =>
  `smart-${category}-${type}-${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, "-");

const mapPriorityFromLegacy = (severity?: string): HorseSmartAlertPriority => {
  if (severity === "HIGH") return "high";
  if (severity === "MEDIUM") return "medium";
  return "low";
};

const mapCategoryFromLegacyType = (type?: string): HorseSmartAlertCategory => {
  if (!type) return "system";
  if (type.includes("VACCINATION") || type.includes("VET") || type.includes("INJURY")) {
    return "veterinary";
  }
  if (type.includes("FARRIER")) return "farrier";
  if (type.includes("DOCUMENT")) return "documentation";
  return "system";
};

const normalizeAlert = (
  id: string,
  data: Record<string, unknown>,
  centerId: string,
  horseId: string
): HorseSmartAlert => ({
  id,
  centerId,
  horseId,
  category:
    typeof data.category === "string"
      ? (data.category as HorseSmartAlertCategory)
      : mapCategoryFromLegacyType(typeof data.type === "string" ? data.type : undefined),
  type: typeof data.type === "string" ? data.type : "system",
  priority:
    typeof data.priority === "string"
      ? (data.priority as HorseSmartAlertPriority)
      : mapPriorityFromLegacy(typeof data.severity === "string" ? data.severity : undefined),
  status:
    typeof data.status === "string"
      ? (data.status as HorseSmartAlertStatus)
      : data.isActive === false
        ? "resolved"
        : "new",
  title: typeof data.title === "string" ? data.title : "Alerta",
  description: typeof data.description === "string" ? data.description : "",
  relatedModule: typeof data.relatedModule === "string" ? data.relatedModule : "horses",
  relatedTab: typeof data.relatedTab === "string" ? data.relatedTab : undefined,
  sourceId: typeof data.sourceId === "string" ? data.sourceId : undefined,
  dueAt: data.dueAt instanceof Timestamp ? data.dueAt : undefined,
  createdAt:
    data.createdAt instanceof Timestamp
      ? data.createdAt
      : data.detectedAt instanceof Timestamp
        ? data.detectedAt
        : undefined,
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  resolvedAt: data.resolvedAt instanceof Timestamp ? data.resolvedAt : undefined,
  archivedAt: data.archivedAt instanceof Timestamp ? data.archivedAt : undefined,
});

const buildAlert = (
  input: Omit<HorseSmartAlert, "id" | "centerId" | "horseId" | "status" | "createdAt" | "updatedAt">
) => input;

export const generateAlerts = async (
  centerId: string,
  horseId: string
): Promise<HorseSmartAlert[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const normalizedHorseId = assertRequiredString("horseId", horseId);
  const [horse, medicalRecords, documents, professionalRecords, classes] = await Promise.all([
    getHorseById(normalizedCenterId, normalizedHorseId),
    listMedicalRecordsByHorse(normalizedCenterId, normalizedHorseId),
    listHorseDocuments(normalizedCenterId, normalizedHorseId),
    getHorseRecords(normalizedCenterId, normalizedHorseId),
    getClassesByCenter(normalizedCenterId),
  ]);

  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inThirtyDays = new Date(today);
  inThirtyDays.setDate(inThirtyDays.getDate() + 30);
  const pastThirtyDays = new Date(today);
  pastThirtyDays.setDate(pastThirtyDays.getDate() - 30);
  const events = await getEventsByDateRange(
    normalizedCenterId,
    { start: pastThirtyDays, end: inThirtyDays },
    { horseId: normalizedHorseId }
  );
  const nextAlerts = [];

  medicalRecords.forEach((record) => {
    if (record.type === "VACCINATION" && record.nextDoseAt) {
      const remaining = daysUntil(record.nextDoseAt);
      if (remaining < 0) {
        nextAlerts.push(
          buildAlert({
            category: "veterinary",
            type: "vaccine_overdue",
            priority: "critical",
            title: "Vacuna vencida",
            description: `${record.vaccineName?.trim() || record.title} esta vencida.`,
            relatedModule: "veterinary",
            relatedTab: "veterinary",
            sourceId: record.id,
            dueAt: record.nextDoseAt,
          })
        );
      } else if (remaining <= 15) {
        nextAlerts.push(
          buildAlert({
            category: "veterinary",
            type: "vaccine_upcoming",
            priority: remaining <= 7 ? "high" : "medium",
            title: "Vacuna proxima",
            description: `${record.vaccineName?.trim() || record.title} prevista en ${remaining} dias.`,
            relatedModule: "veterinary",
            relatedTab: "veterinary",
            sourceId: record.id,
            dueAt: record.nextDoseAt,
          })
        );
      }
    }

    if (record.nextReviewAt && daysUntil(record.nextReviewAt) <= 7) {
      nextAlerts.push(
        buildAlert({
          category: "veterinary",
          type: "vet_review_pending",
          priority: daysUntil(record.nextReviewAt) < 0 ? "high" : "medium",
          title: "Revision pendiente",
          description: `${record.title} requiere seguimiento veterinario.`,
          relatedModule: "veterinary",
          relatedTab: "veterinary",
          sourceId: record.id,
          dueAt: record.nextReviewAt,
        })
      );
    }

    if (record.type === "TREATMENT" && !record.nextReviewAt) {
      nextAlerts.push(
        buildAlert({
          category: "veterinary",
          type: "treatment_pending",
          priority: "medium",
          title: "Tratamiento pendiente",
          description: `${record.title} no tiene proxima revision registrada.`,
          relatedModule: "veterinary",
          relatedTab: "veterinary",
          sourceId: record.id,
          dueAt: record.date,
        })
      );
    }
  });

  if (horse?.nextFarrierVisitAt) {
    const remaining = daysUntil(horse.nextFarrierVisitAt);
    if (remaining < 0 || remaining <= 10) {
      nextAlerts.push(
        buildAlert({
          category: "farrier",
          type: remaining < 0 ? "farrier_overdue" : "farrier_upcoming",
          priority: remaining < 0 ? "high" : "medium",
          title: remaining < 0 ? "Herrado vencido" : "Herrado proximo",
          description: `Proxima visita del herrador ${remaining < 0 ? "vencida" : "programada"}.`,
          relatedModule: "farrier",
          relatedTab: "agenda",
          sourceId: normalizedHorseId,
          dueAt: horse.nextFarrierVisitAt,
        })
      );
    }
  }

  events.forEach((event) => {
    const eventDay = startOfDay(event.startAt.toDate()).getTime();
    const todayMs = today.getTime();
    const tomorrowMs = tomorrow.getTime();
    if (event.status === "CANCELLED") {
      nextAlerts.push(
        buildAlert({
          category: "agenda",
          type: "event_cancelled",
          priority: "medium",
          title: "Evento cancelado",
          description: event.title,
          relatedModule: "agenda",
          relatedTab: "agenda",
          sourceId: event.id,
          dueAt: event.startAt,
        })
      );
    } else if (eventDay === todayMs || eventDay === tomorrowMs) {
      nextAlerts.push(
        buildAlert({
          category: "agenda",
          type: eventDay === todayMs ? "event_today" : "event_tomorrow",
          priority: eventDay === todayMs ? "high" : "medium",
          title: eventDay === todayMs ? "Evento hoy" : "Evento manana",
          description: event.title,
          relatedModule: "agenda",
          relatedTab: "agenda",
          sourceId: event.id,
          dueAt: event.startAt,
        })
      );
    }
  });

  documents.forEach((document) => {
    if (!document.expiresAt || document.expiresAt.toMillis() >= today.getTime()) return;
    const title =
      document.type === "INSURANCE"
        ? "Seguro caducado"
        : document.type === "PASSPORT"
          ? "Licencia caducada"
          : "Documento caducado";
    nextAlerts.push(
      buildAlert({
        category: "documentation",
        type:
          document.type === "INSURANCE"
            ? "insurance_expired"
            : document.type === "PASSPORT"
              ? "license_expired"
              : "document_expired",
        priority: document.type === "INSURANCE" ? "high" : "medium",
        title,
        description: document.name,
        relatedModule: "documents",
        relatedTab: "documents",
        sourceId: document.id,
        dueAt: document.expiresAt,
      })
    );
  });

  if (horse && !horse.microchipId) {
    nextAlerts.push(
      buildAlert({
        category: "documentation",
        type: "microchip_missing",
        priority: "medium",
        title: "Microchip pendiente",
        description: "El caballo no tiene microchip registrado.",
        relatedModule: "documents",
        relatedTab: "general",
        sourceId: normalizedHorseId,
      })
    );
  }

  const horseClasses = classes.filter((item) => item.horseIds.includes(normalizedHorseId));
  const latestClass = horseClasses
    .filter((item) => item.startAt.toMillis() <= now.getTime())
    .sort((left, right) => right.startAt.toMillis() - left.startAt.toMillis())[0];
  if (!latestClass || now.getTime() - latestClass.startAt.toMillis() > 30 * DAY_MS) {
    nextAlerts.push(
      buildAlert({
        category: "classes",
        type: "no_class_30_days",
        priority: "low",
        title: "Mas de 30 dias sin clase",
        description: "No hay clases recientes registradas para este caballo.",
        relatedModule: "classes",
        relatedTab: "classes",
        sourceId: normalizedHorseId,
      })
    );
  }
  if (horseClasses.some((item) => !item.trainerId)) {
    nextAlerts.push(
      buildAlert({
        category: "classes",
        type: "student_without_teacher",
        priority: "medium",
        title: "Alumno sin profesor asignado",
        description: "Hay clases vinculadas sin profesor asignado.",
        relatedModule: "classes",
        relatedTab: "classes",
        sourceId: normalizedHorseId,
      })
    );
  }

  const professionalIds = new Set(
    professionalRecords.map((record) => record.professionalId).filter(Boolean)
  );
  if (!professionalIds.size) {
    nextAlerts.push(
      buildAlert({
        category: "system",
        type: "no_professionals_assigned",
        priority: "low",
        title: "Sin profesionales asignados",
        description: "No hay actuaciones de profesionales registradas para este caballo.",
        relatedModule: "horses",
        relatedTab: "summary",
        sourceId: normalizedHorseId,
      })
    );
  }
  if (!horse?.ownerId && !horse?.ownerName && !horse?.ownerContact?.name) {
    nextAlerts.push(
      buildAlert({
        category: "system",
        type: "missing_owner",
        priority: "high",
        title: "Sin propietario",
        description: "El caballo no tiene propietario asignado.",
        relatedModule: "horses",
        relatedTab: "general",
        sourceId: normalizedHorseId,
      })
    );
  }
  if (!horse?.breed || horse.sex === "UNKNOWN" || typeof horse.age !== "number") {
    nextAlerts.push(
      buildAlert({
        category: "system",
        type: "incomplete_data",
        priority: "low",
        title: "Datos incompletos",
        description: "Faltan datos basicos en la ficha del caballo.",
        relatedModule: "horses",
        relatedTab: "general",
        sourceId: normalizedHorseId,
      })
    );
  }

  const existingSnapshot = await getDocs(horseAlertsCollection(normalizedCenterId, normalizedHorseId));
  const existingById = new Map(
    existingSnapshot.docs.map((item) => [
      item.id,
      normalizeAlert(item.id, item.data() as Record<string, unknown>, normalizedCenterId, normalizedHorseId),
    ])
  );

  await Promise.all(
    nextAlerts.map(async (alert) => {
      const id = makeAlertId(alert.category, alert.type, alert.sourceId ?? normalizedHorseId);
      const existing = existingById.get(id);
      const status =
        existing?.status === "resolved" || existing?.status === "archived"
          ? existing.status
          : existing?.status ?? "new";
      const payload: HorseSmartAlertDoc = {
        ...alert,
        centerId: normalizedCenterId,
        horseId: normalizedHorseId,
        status,
        createdAt: existing?.createdAt ?? Timestamp.now(),
        updatedAt: Timestamp.now(),
        generatedAt: Timestamp.now(),
      };
      await setDoc(alertDocRef(normalizedCenterId, normalizedHorseId, id), payload, { merge: true });
    })
  );

  return getHorseAlerts(normalizedCenterId, normalizedHorseId);
};

export const getHorseAlerts = async (
  centerId: string,
  horseId: string
): Promise<HorseSmartAlert[]> => {
  const normalizedCenterId = assertCenterId(centerId);
  const normalizedHorseId = assertRequiredString("horseId", horseId);
  const snapshot = await getDocs(
    query(horseAlertsCollection(normalizedCenterId, normalizedHorseId), orderBy("updatedAt", "desc"))
  );

  return snapshot.docs.map((alert) =>
    normalizeAlert(alert.id, alert.data() as Record<string, unknown>, normalizedCenterId, normalizedHorseId)
  );
};

export const markResolved = async (
  centerId: string,
  horseId: string,
  alertId: string
): Promise<void> => {
  await updateDoc(alertDocRef(centerId, horseId, alertId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: false,
  });
};

export const archiveAlert = async (
  centerId: string,
  horseId: string,
  alertId: string
): Promise<void> => {
  await updateDoc(alertDocRef(centerId, horseId, alertId), {
    status: "archived",
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: false,
  });
};

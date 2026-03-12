"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CenterHeader } from "@/components/center/CenterHeader";
import {
  HorseAlertsTab,
  HorseDetailHeader,
  HorseDocumentsTab,
  HorseFeedTab,
  HorseHealthTab,
  HorseInjuriesTab,
  HorseOverviewTab,
  HorseWeightTab,
} from "@/components/stables/detail";
import {
  DocumentUploader,
  FarrierConfigForm,
  FeedForm,
  InjuryForm,
  MedicalRecordForm,
  WeightEntryForm,
} from "@/components/stables/forms";
import {
  addInjury,
  addMedicalRecord,
  addWeightEntry,
  deleteHorseDocument,
  deleteInjury,
  deleteMedicalRecord,
  deleteWeightEntry,
  documentValuesToInput,
  farrierValuesToHorsePatch,
  feedValuesToFeedInfo,
  getHorseAlerts,
  getHorseListItemsByCenter,
  Injury,
  injuryValuesToInput,
  listHorseDocuments,
  listInjuriesByHorse,
  listMedicalRecordsByHorse,
  listWeightEntriesByHorse,
  MedicalRecord,
  medicalRecordValuesToInput,
  HorseDocument,
  HorseAlert,
  HorseListItem,
  updateHorse,
  updateInjury,
  updateMedicalRecord,
  updateWeightEntry,
  uploadHorseDocument,
  WeightEntry,
  weightEntryValuesToInput,
} from "@/lib/horses";
import { formatWeight } from "@/lib/horses";
import { getFirebaseErrorMessage } from "@/lib/firebaseErrors";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";

type TabKey =
  | "RESUMEN"
  | "SALUD"
  | "ALIMENTACION"
  | "PESO"
  | "LESIONES"
  | "ALERTAS"
  | "DOCUMENTOS";

type ModalState =
  | {
      type: "MEDICAL";
      record?: MedicalRecord | null;
      presetType?: MedicalRecord["type"];
    }
  | { type: "WEIGHT"; entry?: WeightEntry | null }
  | { type: "INJURY"; injury?: Injury | null }
  | { type: "FARRIER" }
  | { type: "FEED" }
  | { type: "DOCUMENT" }
  | null;

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "RESUMEN", label: "Resumen" },
  { key: "SALUD", label: "Salud" },
  { key: "ALIMENTACION", label: "Alimentacion" },
  { key: "PESO", label: "Peso" },
  { key: "LESIONES", label: "Lesiones" },
  { key: "ALERTAS", label: "Alertas" },
  { key: "DOCUMENTOS", label: "Documentos" },
];

const summaryCardClassName =
  "rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm";

const readSummaryValue = (
  value?: { dueAt?: { toDate: () => Date } | null; title?: string | null },
  fallback = "Sin configurar"
) => {
  if (!value?.dueAt) return fallback;
  return value.dueAt.toDate().toLocaleDateString("es-ES");
};

const isMissingConfigurationAlert = (alert?: HorseAlert | null): boolean =>
  alert?.type === "MISSING_CONFIGURATION";

export default function StableHorseDetailPage() {
  const params = useParams();
  const horseId = params?.id as string;
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    userId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [tab, setTab] = useState<TabKey>("RESUMEN");
  const [item, setItem] = useState<HorseListItem | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [alerts, setAlerts] = useState<HorseAlert[]>([]);
  const [documents, setDocuments] = useState<HorseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);

  const loadHorseData = async (centerId: string, currentHorseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [items, medical, weights, injuriesData, alertsData, documentsData] =
        await Promise.all([
          getHorseListItemsByCenter(centerId),
          listMedicalRecordsByHorse(centerId, currentHorseId),
          listWeightEntriesByHorse(centerId, currentHorseId),
          listInjuriesByHorse(centerId, currentHorseId),
          getHorseAlerts(centerId, currentHorseId),
          listHorseDocuments(centerId, currentHorseId),
        ]);

      const nextItem = items.find((entry) => entry.horse.id === currentHorseId) ?? null;
      setItem(nextItem);
      setMedicalRecords(medical);
      setWeightEntries(weights);
      setInjuries(injuriesData);
      setAlerts(alertsData);
      setDocuments(documentsData);

      if (!nextItem) {
        setError("No se ha encontrado el caballo en el centro activo.");
      }
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar la ficha completa del caballo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!activeCenterId || !horseId) {
      setLoading(false);
      return;
    }

    void loadHorseData(activeCenterId, horseId);
  }, [activeCenterId, horseId]);

  const nextVaccine = useMemo(
    () => alerts.find((alert) => alert.type === "UPCOMING_VACCINATION" || (
      alert.type === "OVERDUE_CARE" && alert.metadata?.medicalType === "VACCINATION"
    )),
    [alerts]
  );
  const nextDeworming = useMemo(
    () => alerts.find((alert) => alert.type === "UPCOMING_DEWORMING" || (
      alert.type === "OVERDUE_CARE" && alert.metadata?.medicalType === "DEWORMING"
    )),
    [alerts]
  );
  const nextReview = useMemo(
    () => alerts.find((alert) => alert.type === "UPCOMING_VET_REVIEW" || (
      alert.type === "OVERDUE_CARE" && alert.metadata?.medicalType !== "VACCINATION" && alert.metadata?.medicalType !== "DEWORMING"
    )),
    [alerts]
  );
  const nextFarrier = useMemo(
    () => alerts.find((alert) => alert.type === "UPCOMING_FARRIER" || (
      alert.type === "OVERDUE_CARE" && alert.sourceCollection === "horses"
    )),
    [alerts]
  );
  const currentWeight = useMemo(() => {
    const latest = weightEntries.at(-1);
    return latest?.weightKg ?? item?.horse.weightKg ?? null;
  }, [item?.horse.weightKg, weightEntries]);

  const handleConfigureAlert = (alert: HorseAlert) => {
    const configTarget = String(alert.metadata?.config ?? "");

    if (configTarget === "vaccination") {
      setTab("SALUD");
      setModalState({ type: "MEDICAL", presetType: "VACCINATION" });
      return;
    }

    if (configTarget === "deworming") {
      setTab("SALUD");
      setModalState({ type: "MEDICAL", presetType: "DEWORMING" });
      return;
    }

    if (configTarget === "vetReview") {
      setTab("SALUD");
      setModalState({ type: "MEDICAL", presetType: "CHECKUP" });
      return;
    }

    if (configTarget === "farrier" && item) {
      setModalState({ type: "FARRIER" });
    }
  };

  if (guardLoading || loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando ficha del caballo...</p>
      </main>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={item?.horse.name ?? "Ficha del caballo"}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center/stables"
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-6">
        {guardError && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {guardError}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!item ? (
          <section className="rounded-3xl border border-brand-border bg-white/80 p-8 shadow-sm">
            <p className="text-sm text-brand-secondary">
              No se ha encontrado el caballo solicitado.
            </p>
          </section>
        ) : (
          <>
            <HorseDetailHeader
              item={item}
              editHref={`/dashboard/center/stables/${item.horse.id}/edit`}
              onAddMedicalRecord={() => setModalState({ type: "MEDICAL" })}
              onAddWeight={() => setModalState({ type: "WEIGHT" })}
              onUploadDocument={() => setModalState({ type: "DOCUMENT" })}
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className={summaryCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Proxima vacuna
                </p>
                {isMissingConfigurationAlert(nextVaccine) ? (
                  <button
                    type="button"
                    onClick={() => handleConfigureAlert(nextVaccine!)}
                    className="mt-2 text-left text-xl font-semibold text-amber-700 underline decoration-dotted underline-offset-4"
                  >
                    Sin configurar
                  </button>
                ) : (
                  <p className="mt-2 text-xl font-semibold text-brand-text">
                    {readSummaryValue(nextVaccine)}
                  </p>
                )}
              </article>
              <article className={summaryCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Proximo herrador
                </p>
                {isMissingConfigurationAlert(nextFarrier) ? (
                  <button
                    type="button"
                    onClick={() => handleConfigureAlert(nextFarrier!)}
                    className="mt-2 text-left text-xl font-semibold text-amber-700 underline decoration-dotted underline-offset-4"
                  >
                    Sin configurar
                  </button>
                ) : (
                  <p className="mt-2 text-xl font-semibold text-brand-text">
                    {readSummaryValue(nextFarrier)}
                  </p>
                )}
              </article>
              <article className={summaryCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Proxima revision
                </p>
                {isMissingConfigurationAlert(nextReview) ? (
                  <button
                    type="button"
                    onClick={() => handleConfigureAlert(nextReview!)}
                    className="mt-2 text-left text-xl font-semibold text-amber-700 underline decoration-dotted underline-offset-4"
                  >
                    Sin configurar
                  </button>
                ) : (
                  <p className="mt-2 text-xl font-semibold text-brand-text">
                    {readSummaryValue(nextReview)}
                  </p>
                )}
              </article>
              <article className={summaryCardClassName}>
                <p className="text-xs uppercase tracking-wide text-brand-secondary">
                  Peso actual
                </p>
                <p className="mt-2 text-xl font-semibold text-brand-text">
                  {formatWeight(currentWeight)}
                </p>
                <p className="mt-1 text-xs text-brand-secondary">
                  Desparasitacion:{" "}
                  {isMissingConfigurationAlert(nextDeworming) ? (
                    <button
                      type="button"
                      onClick={() => handleConfigureAlert(nextDeworming!)}
                      className="font-semibold text-amber-700 underline decoration-dotted underline-offset-2"
                    >
                      Sin configurar
                    </button>
                  ) : (
                    readSummaryValue(nextDeworming)
                  )}
                </p>
              </article>
            </section>

            <section className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-brand-text">Medicamentos</h2>
                  <p className="text-sm text-brand-secondary">
                    Gestiona tratamientos de este caballo desde el inventario central.
                  </p>
                </div>
                <Link
                  href={`/dashboard/center/medications?horseId=${horseId}`}
                  className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
                >
                  Ver tratamientos
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-brand-border bg-white/75 p-2 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tabItem) => (
                  <button
                    key={tabItem.key}
                    type="button"
                    onClick={() => setTab(tabItem.key)}
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      tab === tabItem.key
                        ? "bg-brand-primary text-white"
                        : "text-brand-secondary hover:bg-brand-background/80"
                    }`}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </div>
            </section>

            {tab === "RESUMEN" && <HorseOverviewTab item={item} />}
            {tab === "SALUD" && (
              <HorseHealthTab
                records={medicalRecords}
                onEdit={(record) => setModalState({ type: "MEDICAL", record })}
                onDelete={(recordId) => {
                  if (!activeCenterId) return;
                  void (async () => {
                    setSaving(true);
                    try {
                      await deleteMedicalRecord(activeCenterId, horseId, recordId);
                      await loadHorseData(activeCenterId, horseId);
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              />
            )}
            {tab === "ALIMENTACION" && (
              <HorseFeedTab
                feedInfo={item.horse.feedInfo}
                onEdit={() => setModalState({ type: "FEED" })}
              />
            )}
            {tab === "PESO" && (
              <HorseWeightTab
                entries={weightEntries}
                onEdit={(entry) => setModalState({ type: "WEIGHT", entry })}
                onDelete={(entryId) => {
                  if (!activeCenterId) return;
                  void (async () => {
                    setSaving(true);
                    try {
                      await deleteWeightEntry(activeCenterId, horseId, entryId);
                      await loadHorseData(activeCenterId, horseId);
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              />
            )}
            {tab === "LESIONES" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalState({ type: "INJURY" })}
                    className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
                  >
                    Anadir lesion
                  </button>
                </div>
                <HorseInjuriesTab
                  injuries={injuries}
                  onEdit={(injury) => setModalState({ type: "INJURY", injury })}
                  onDelete={(injuryId) => {
                    if (!activeCenterId) return;
                    void (async () => {
                      setSaving(true);
                      try {
                        await deleteInjury(activeCenterId, horseId, injuryId);
                        await loadHorseData(activeCenterId, horseId);
                      } finally {
                        setSaving(false);
                      }
                    })();
                  }}
                />
              </div>
            )}
            {tab === "ALERTAS" && (
              <HorseAlertsTab
                alerts={alerts}
                onConfigureAlert={handleConfigureAlert}
              />
            )}
            {tab === "DOCUMENTOS" && (
              <HorseDocumentsTab
                documents={documents}
                onDelete={(documentId) => {
                  if (!activeCenterId) return;
                  void (async () => {
                    setSaving(true);
                    try {
                      await deleteHorseDocument(activeCenterId, horseId, documentId);
                      await loadHorseData(activeCenterId, horseId);
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
              />
            )}
          </>
        )}
      </div>

      {modalState && item && activeCenterId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-background/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-brand-border bg-brand-background p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold text-brand-text">
                {modalState.type === "MEDICAL" && (modalState.record ? "Editar registro medico" : "Nuevo registro medico")}
                {modalState.type === "WEIGHT" && (modalState.entry ? "Editar peso" : "Nuevo peso")}
                {modalState.type === "INJURY" && (modalState.injury ? "Editar lesion" : "Nueva lesion")}
                {modalState.type === "FARRIER" && "Configurar herrador"}
                {modalState.type === "FEED" && "Editar alimentacion"}
                {modalState.type === "DOCUMENT" && "Subir documento"}
              </h2>
              <button
                type="button"
                onClick={() => setModalState(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-border"
              >
                x
              </button>
            </div>

            {modalState.type === "MEDICAL" && (
              <MedicalRecordForm
                defaultRecord={modalState.record}
                presetType={modalState.presetType}
                submitting={saving}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    const payload = medicalRecordValuesToInput(values, userId || "system");
                    if (modalState.record) {
                      await updateMedicalRecord(activeCenterId, horseId, modalState.record.id, payload);
                    } else {
                      await addMedicalRecord(activeCenterId, horseId, payload);
                    }
                    setModalState(null);
                    await loadHorseData(activeCenterId, horseId);
                  } catch (saveError) {
                    console.error(saveError);
                    setError(
                      getFirebaseErrorMessage(
                        saveError,
                        "No se pudo guardar el registro medico."
                      )
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}

            {modalState.type === "WEIGHT" && (
              <WeightEntryForm
                defaultEntry={modalState.entry}
                submitting={saving}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    const payload = weightEntryValuesToInput(values, userId || "system");
                    if (modalState.entry) {
                      await updateWeightEntry(activeCenterId, horseId, modalState.entry.id, payload);
                    } else {
                      await addWeightEntry(activeCenterId, horseId, payload);
                    }
                    setModalState(null);
                    await loadHorseData(activeCenterId, horseId);
                  } catch (saveError) {
                    console.error(saveError);
                    setError(
                      getFirebaseErrorMessage(
                        saveError,
                        "No se pudo guardar el peso."
                      )
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}

            {modalState.type === "INJURY" && (
              <InjuryForm
                defaultInjury={modalState.injury}
                submitting={saving}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    const payload = injuryValuesToInput(values, userId || "system");
                    if (modalState.injury) {
                      await updateInjury(activeCenterId, horseId, modalState.injury.id, payload);
                    } else {
                      await addInjury(activeCenterId, horseId, payload);
                    }
                    setModalState(null);
                    await loadHorseData(activeCenterId, horseId);
                  } catch (saveError) {
                    console.error(saveError);
                    setError(
                      getFirebaseErrorMessage(
                        saveError,
                        "No se pudo guardar la lesion."
                      )
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}

            {modalState.type === "FEED" && (
              <FeedForm
                defaultFeed={item.horse.feedInfo}
                submitting={saving}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    await updateHorse(activeCenterId, horseId, {
                      feedInfo: feedValuesToFeedInfo(values),
                    });
                    setModalState(null);
                    await loadHorseData(activeCenterId, horseId);
                  } catch (saveError) {
                    console.error(saveError);
                    setError(
                      getFirebaseErrorMessage(
                        saveError,
                        "No se pudo guardar la alimentacion."
                      )
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}

            {modalState.type === "FARRIER" && (
              <FarrierConfigForm
                defaultValues={{
                  farrierName: item.horse.farrierName ?? "",
                  nextFarrierVisitAt: item.horse.nextFarrierVisitAt
                    ? item.horse.nextFarrierVisitAt.toDate().toISOString().slice(0, 10)
                    : "",
                  farrierContactName: item.horse.farrierContact?.name ?? "",
                  farrierContactPhone: item.horse.farrierContact?.phone ?? "",
                  farrierContactEmail: item.horse.farrierContact?.email ?? "",
                }}
                submitting={saving}
                onSubmit={async (values) => {
                  setSaving(true);
                  try {
                    await updateHorse(
                      activeCenterId,
                      horseId,
                      farrierValuesToHorsePatch(values)
                    );
                    setModalState(null);
                    await loadHorseData(activeCenterId, horseId);
                  } catch (saveError) {
                    console.error(saveError);
                    setError(
                      getFirebaseErrorMessage(
                        saveError,
                        "No se pudo guardar la configuracion del herrador."
                      )
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}

            {modalState.type === "DOCUMENT" && (
              <DocumentUploader
                submitting={saving}
                onSubmit={async (values, file) => {
                  if (!file) {
                    setError("Selecciona un archivo para subir.");
                    return;
                  }
                  setSaving(true);
                  try {
                    await uploadHorseDocument(
                      activeCenterId,
                      horseId,
                      documentValuesToInput(values, file, userId || "system")
                    );
                    setModalState(null);
                    await loadHorseData(activeCenterId, horseId);
                  } catch (saveError) {
                    console.error(saveError);
                    setError(
                      getFirebaseErrorMessage(
                        saveError,
                        "No se pudo subir el documento."
                      )
                    );
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
}

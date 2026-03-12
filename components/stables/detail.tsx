"use client";

import Link from "next/link";
import { AlertBadge } from "@/components/stables/AlertBadge";
import { WeightChart } from "@/components/stables/WeightChart";
import {
  FeedInfo,
  HorseAlert,
  HorseDocument,
  HorseListItem,
  Injury,
  MedicalRecord,
  WeightEntry,
} from "@/lib/horses";
import { formatDate, formatWeight } from "@/lib/horses";

const emptyCardClassName =
  "rounded-2xl border border-dashed border-brand-border bg-white/70 p-6 text-sm text-brand-secondary";

const statusClassName: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  RESTING: "bg-sky-100 text-sky-800",
  RECOVERING: "bg-amber-100 text-amber-800",
  INACTIVE: "bg-slate-200 text-slate-700",
  ARCHIVED: "bg-stone-200 text-stone-700",
};

type HorseDetailHeaderProps = {
  item: HorseListItem;
  onAddWeight: () => void;
  onAddMedicalRecord: () => void;
  onUploadDocument: () => void;
  editHref: string;
};

export function HorseDetailHeader({
  item,
  onAddWeight,
  onAddMedicalRecord,
  onUploadDocument,
  editHref,
}: HorseDetailHeaderProps) {
  return (
    <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-brand-border bg-brand-background">
            {item.horse.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.horse.photoUrl}
                alt={item.horse.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl font-semibold text-brand-secondary">H</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold text-brand-text">{item.horse.name}</h1>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${statusClassName[item.horse.status] ?? "bg-slate-100 text-slate-700"}`}
              >
                {item.horse.status}
              </span>
              {item.activeAlerts.slice(0, 2).map((alert) => (
                <AlertBadge key={alert.id} alert={alert} />
              ))}
            </div>
            <p className="mt-2 text-sm text-brand-secondary">
              {item.horse.breed || "Raza sin indicar"} - {item.horse.age ?? "-"} anos - Box{" "}
              {item.assignedBox || "sin asignar"}
            </p>
            <p className="mt-1 text-sm text-brand-secondary">
              Propietario: <span className="font-medium text-brand-text">{item.ownerLabel}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={editHref}
            className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Editar
          </Link>
          <button
            type="button"
            onClick={onAddWeight}
            className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Anadir peso
          </button>
          <button
            type="button"
            onClick={onAddMedicalRecord}
            className="inline-flex h-11 items-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-text"
          >
            Anadir registro medico
          </button>
          <button
            type="button"
            onClick={onUploadDocument}
            className="inline-flex h-11 items-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white"
          >
            Subir documento
          </button>
        </div>
      </div>
    </section>
  );
}

type HorseOverviewTabProps = {
  item: HorseListItem;
};

export function HorseOverviewTab({ item }: HorseOverviewTabProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-text">Informacion general</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <OverviewLine label="Raza" value={item.horse.breed || "Sin indicar"} />
          <OverviewLine label="Sexo" value={item.horse.sex} />
          <OverviewLine label="Capa" value={item.horse.coat || "Sin indicar"} />
          <OverviewLine
            label="Altura"
            value={item.horse.heightCm ? `${item.horse.heightCm} cm` : "Sin indicar"}
          />
          <OverviewLine
            label="Nacimiento"
            value={formatDate(item.horse.birthDate)}
          />
          <OverviewLine
            label="Entrada al centro"
            value={formatDate(item.arrivalAt ?? item.horse.enteredCenterAt)}
          />
          <OverviewLine label="Microchip" value={item.horse.microchipId || "Sin indicar"} />
          <OverviewLine label="Box" value={item.assignedBox || "Sin asignar"} />
        </dl>
        <div className="mt-5 rounded-2xl bg-brand-background/55 p-4">
          <p className="text-sm text-brand-secondary">Observaciones</p>
          <p className="mt-2 text-sm leading-6 text-brand-text">
            {item.horse.notes || "Sin observaciones registradas."}
          </p>
        </div>
      </article>

      <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-text">Profesionales asociados</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <OverviewLine label="Propietario" value={item.ownerLabel} />
          <OverviewLine
            label="Contacto propietario"
            value={item.horse.ownerContact?.phone || item.horse.ownerContact?.email || "Sin indicar"}
          />
          <OverviewLine label="Veterinario" value={item.horse.veterinarianName || "Sin indicar"} />
          <OverviewLine
            label="Contacto veterinario"
            value={
              item.horse.veterinarianContact?.phone ||
              item.horse.veterinarianContact?.email ||
              "Sin indicar"
            }
          />
          <OverviewLine label="Herrador" value={item.horse.farrierName || "Sin indicar"} />
          <OverviewLine
            label="Contacto herrador"
            value={
              item.horse.farrierContact?.phone ||
              item.horse.farrierContact?.email ||
              "Sin indicar"
            }
          />
          <OverviewLine label="Entrenador" value={item.horse.trainerName || "Sin indicar"} />
          <OverviewLine
            label="Proximo herrador"
            value={formatDate(item.horse.nextFarrierVisitAt)}
          />
        </dl>
      </article>
    </section>
  );
}

type HorseHealthTabProps = {
  records: MedicalRecord[];
  onEdit: (record: MedicalRecord) => void;
  onDelete: (recordId: string) => void;
};

export function HorseHealthTab({ records, onEdit, onDelete }: HorseHealthTabProps) {
  if (records.length === 0) {
    return <div className={emptyCardClassName}>Aun no hay registros medicos.</div>;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <article
          key={record.id}
          className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary">
                {record.type}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-brand-text">{record.title}</h3>
              <p className="mt-1 text-sm text-brand-secondary">{formatDate(record.date)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(record)}
                className="rounded-xl border border-brand-border px-3 py-2 text-sm font-semibold text-brand-text"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(record.id)}
                className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <InfoBlock label="Veterinario" value={record.veterinarianName || "Sin indicar"} />
            <InfoBlock label="Proxima revision" value={formatDate(record.nextReviewAt)} />
            <InfoBlock label="Diagnostico" value={record.diagnosis || "Sin indicar"} />
            <InfoBlock label="Tratamiento" value={record.treatment || "Sin indicar"} />
          </div>
          {record.notes && (
            <p className="mt-4 text-sm leading-6 text-brand-secondary">{record.notes}</p>
          )}
        </article>
      ))}
    </div>
  );
}

type HorseFeedTabProps = {
  feedInfo?: FeedInfo;
  onEdit: () => void;
};

export function HorseFeedTab({ feedInfo, onEdit }: HorseFeedTabProps) {
  return (
    <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-text">Plan de alimentacion</h2>
          <p className="text-sm text-brand-secondary">
            Pienso, racion diaria, suplementos y horario.
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-xl border border-brand-border px-3 py-2 text-sm font-semibold text-brand-text"
        >
          Editar alimentacion
        </button>
      </div>

      {!feedInfo ? (
        <div className={`mt-5 ${emptyCardClassName}`}>Aun no hay informacion de alimentacion.</div>
      ) : (
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <OverviewLine label="Tipo de pienso" value={feedInfo.feedType || "Sin indicar"} />
          <OverviewLine
            label="Racion diaria"
            value={
              typeof feedInfo.dailyRationKg === "number"
                ? `${feedInfo.dailyRationKg} kg`
                : "Sin indicar"
            }
          />
          <OverviewLine label="Forraje" value={feedInfo.forage || "Sin indicar"} />
          <OverviewLine
            label="Comidas por dia"
            value={typeof feedInfo.mealsPerDay === "number" ? String(feedInfo.mealsPerDay) : "Sin indicar"}
          />
          <OverviewLine label="Horario" value={feedInfo.schedule || "Sin indicar"} />
          <OverviewLine label="Suplementos" value={feedInfo.supplements?.join(", ") || "Sin indicar"} />
          <OverviewLine label="Alergias" value={feedInfo.allergies?.join(", ") || "Sin indicar"} />
          <OverviewLine label="Plan" value={feedInfo.planName || "Sin indicar"} />
        </dl>
      )}
      {feedInfo?.notes && (
        <div className="mt-5 rounded-2xl bg-brand-background/55 p-4 text-sm text-brand-secondary">
          {feedInfo.notes}
        </div>
      )}
    </section>
  );
}

type HorseWeightTabProps = {
  entries: WeightEntry[];
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entryId: string) => void;
};

export function HorseWeightTab({ entries, onEdit, onDelete }: HorseWeightTabProps) {
  if (entries.length === 0) {
    return <div className={emptyCardClassName}>Aun no hay registros de peso.</div>;
  }

  return (
    <div className="space-y-4">
      <WeightChart entries={entries} />
      <section className="overflow-hidden rounded-3xl border border-brand-border bg-white/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-background/70 text-left text-brand-secondary">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Peso</th>
                <th className="px-4 py-3">Notas</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {entries
                .slice()
                .reverse()
                .map((entry) => (
                  <tr key={entry.id} className="border-t border-brand-border">
                    <td className="px-4 py-3">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3">{formatWeight(entry.weightKg)}</td>
                    <td className="px-4 py-3 text-brand-secondary">{entry.notes || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className="rounded-xl border border-brand-border px-3 py-2 text-xs font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(entry.id)}
                          className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type HorseInjuriesTabProps = {
  injuries: Injury[];
  onEdit: (injury: Injury) => void;
  onDelete: (injuryId: string) => void;
};

export function HorseInjuriesTab({
  injuries,
  onEdit,
  onDelete,
}: HorseInjuriesTabProps) {
  if (injuries.length === 0) {
    return <div className={emptyCardClassName}>Aun no hay lesiones registradas.</div>;
  }

  return (
    <div className="space-y-3">
      {injuries.map((injury) => (
        <article
          key={injury.id}
          className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary">
                {injury.status}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-brand-text">{injury.title}</h3>
              <p className="mt-1 text-sm text-brand-secondary">
                Detectada el {formatDate(injury.detectedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(injury)}
                className="rounded-xl border border-brand-border px-3 py-2 text-sm font-semibold text-brand-text"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(injury.id)}
                className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <InfoBlock label="Tratamiento" value={injury.treatmentPlan || "Sin indicar"} />
            <InfoBlock label="Duracion" value={injury.resolvedAt ? formatDate(injury.resolvedAt) : "En curso"} />
          </div>
          {injury.description && (
            <p className="mt-4 text-sm leading-6 text-brand-secondary">{injury.description}</p>
          )}
          {injury.notes && (
            <p className="mt-2 text-sm leading-6 text-brand-secondary">{injury.notes}</p>
          )}
        </article>
      ))}
    </div>
  );
}

type HorseAlertsTabProps = {
  alerts: HorseAlert[];
  onConfigureAlert?: (alert: HorseAlert) => void;
};

export function HorseAlertsTab({ alerts, onConfigureAlert }: HorseAlertsTabProps) {
  if (alerts.length === 0) {
    return <div className={emptyCardClassName}>Sin alertas activas.</div>;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <article
          key={alert.id}
          className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <AlertBadge
              alert={alert}
              onClick={
                alert.type === "MISSING_CONFIGURATION" && onConfigureAlert
                  ? () => onConfigureAlert(alert)
                  : undefined
              }
            />
            <h3 className="font-semibold text-brand-text">{alert.title}</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-brand-secondary">{alert.description}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-brand-secondary">
              Detectada el {formatDate(alert.detectedAt)}
            </p>
            {alert.type === "MISSING_CONFIGURATION" && onConfigureAlert && (
              <button
                type="button"
                onClick={() => onConfigureAlert(alert)}
                className="inline-flex h-9 items-center rounded-xl border border-amber-300 bg-amber-50 px-3 text-sm font-semibold text-amber-800"
              >
                Configurar ahora
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

type HorseDocumentsTabProps = {
  documents: HorseDocument[];
  onDelete: (documentId: string) => void;
};

export function HorseDocumentsTab({
  documents,
  onDelete,
}: HorseDocumentsTabProps) {
  if (documents.length === 0) {
    return <div className={emptyCardClassName}>Aun no hay documentos subidos.</div>;
  }

  return (
    <div className="space-y-3">
      {documents.map((horseDocument) => (
        <article
          key={horseDocument.id}
          className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-brand-secondary">
                {horseDocument.type}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-brand-text">{horseDocument.name}</h3>
              <p className="mt-1 text-sm text-brand-secondary">
                Subido el {formatDate(horseDocument.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDelete(horseDocument.id)}
              className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
            >
              Borrar
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={horseDocument.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm font-semibold text-brand-text"
            >
              Abrir documento
            </a>
            <span className="text-sm text-brand-secondary">
              Vence: {formatDate(horseDocument.expiresAt)}
            </span>
            <span className="text-sm text-brand-secondary">
              Tamano: {typeof horseDocument.sizeBytes === "number"
                ? `${(horseDocument.sizeBytes / 1024 / 1024).toFixed(2)} MB`
                : "Sin dato"}
            </span>
          </div>
          {horseDocument.notes && (
            <p className="mt-3 text-sm leading-6 text-brand-secondary">{horseDocument.notes}</p>
          )}
        </article>
      ))}
    </div>
  );
}

function OverviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-brand-secondary">{label}</dt>
      <dd className="mt-1 font-medium text-brand-text">{value}</dd>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-brand-background/55 p-4">
      <p className="text-xs uppercase tracking-wide text-brand-secondary">{label}</p>
      <p className="mt-2 text-sm text-brand-text">{value}</p>
    </div>
  );
}

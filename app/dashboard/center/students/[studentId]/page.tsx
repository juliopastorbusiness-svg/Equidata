"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { PaymentFormValues } from "@/components/center/students/PaymentForm";
import { StudentPaymentsTab } from "@/components/center/students/StudentPaymentsTab";
import { StudentReservationsTab } from "@/components/center/students/StudentReservationsTab";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  createPayment,
  createReservation,
  deletePayment,
  deleteReservation,
  getClassById,
  getClasses,
  getPayments,
  getReservationById,
  getReservations,
  getStudentById,
  Student,
  StudentPayment,
  updatePayment,
  updateReservation,
} from "@/lib/services";

type TabKey = "summary" | "reservations" | "attendance" | "payments" | "notes";

const tabLabels: Record<TabKey, string> = {
  summary: "Resumen",
  reservations: "Clases reservadas",
  attendance: "Asistencia",
  payments: "Pagos",
  notes: "Observaciones",
};

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>();
  const studentId = typeof params.studentId === "string" ? params.studentId : "";

  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Awaited<ReturnType<typeof getClasses>>>([]);
  const [reservations, setReservations] = useState<Awaited<ReturnType<typeof getReservations>>>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPayments>>>([]);
  const [activeTab, setActiveTab] = useState<TabKey>("summary");
  const [editingPayment, setEditingPayment] = useState<StudentPayment | null>(null);
  const [reservationClassId, setReservationClassId] = useState("");
  const [reservationStatus, setReservationStatus] = useState<"RESERVED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW">("RESERVED");
  const [reservationNotes, setReservationNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingReservation, setSavingReservation] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string, nextStudentId: string) => {
    const [studentItem, studentReservations, studentPayments, classesList] = await Promise.all([
      getStudentById(centerId, nextStudentId),
      getReservations(centerId, { studentId: nextStudentId }),
      getPayments(centerId, nextStudentId),
      getClasses(centerId),
    ]);
    setStudent(studentItem);
    setReservations(studentReservations);
    setPayments(studentPayments);
    setClasses(classesList);
  };

  useEffect(() => {
    if (!activeCenterId || !studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    loadData(activeCenterId, studentId)
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudo cargar la ficha del alumno.");
      })
      .finally(() => setLoading(false));
  }, [activeCenterId, studentId]);

  const attendanceSummary = useMemo(
    () => ({
      completed: reservations.filter((item) => item.status === "COMPLETED").length,
      noShow: reservations.filter((item) => item.status === "NO_SHOW").length,
      confirmed: reservations.filter((item) => item.status === "CONFIRMED").length,
    }),
    [reservations]
  );

  const pendingPayments = payments.filter(
    (item) => item.status === "PENDING" || item.status === "PARTIAL" || item.status === "OVERDUE"
  );

  const handleCreateReservation = async () => {
    if (!activeCenterId || !student) return;
    setSavingReservation(true);
    setError(null);
    try {
      await createReservation(activeCenterId, {
        classId: reservationClassId,
        studentId: student.id,
        status: reservationStatus,
        notes: reservationNotes,
        reservationDate: new Date(),
      });
      await loadData(activeCenterId, student.id);
      setReservationClassId("");
      setReservationStatus("RESERVED");
      setReservationNotes("");
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo crear la reserva.");
    } finally {
      setSavingReservation(false);
    }
  };

  const handleUpdateReservationStatus = async (
    reservation: Awaited<ReturnType<typeof getReservations>>[number],
    status: "RESERVED" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW"
  ) => {
    if (!activeCenterId || !student) return;
    setError(null);
    try {
      await updateReservation(activeCenterId, reservation.id, { status });
      await loadData(activeCenterId, student.id);
    } catch (updateError) {
      console.error(updateError);
      setError(updateError instanceof Error ? updateError.message : "No se pudo actualizar la reserva.");
    }
  };

  const handleDeleteReservation = async (
    reservation: Awaited<ReturnType<typeof getReservations>>[number]
  ) => {
    if (!activeCenterId || !student) return;
    setError(null);
    try {
      const current = await getReservationById(activeCenterId, reservation.id);
      if (!current) return;
      await deleteReservation(activeCenterId, reservation.id);
      await loadData(activeCenterId, student.id);
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar la reserva.");
    }
  };

  const handlePaymentSubmit = async (values: PaymentFormValues) => {
    if (!activeCenterId || !student) return;
    setSavingPayment(true);
    setError(null);
    try {
      const payload = {
        studentId: student.id,
        concept: values.concept,
        type: values.type,
        amount: Number(values.amount),
        date: new Date(`${values.date}T00:00:00`),
        paymentMethod: values.paymentMethod,
        status: values.status,
        notes: values.notes,
      };

      if (editingPayment) {
        await updatePayment(activeCenterId, editingPayment.id, payload);
      } else {
        await createPayment(activeCenterId, payload);
      }

      await loadData(activeCenterId, student.id);
      setEditingPayment(null);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el pago.");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (payment: StudentPayment) => {
    if (!activeCenterId || !student) return;
    setError(null);
    try {
      await deletePayment(activeCenterId, payment.id);
      await loadData(activeCenterId, student.id);
      if (editingPayment?.id === payment.id) {
        setEditingPayment(null);
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el pago.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando alumno...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title={student ? `${student.firstName} ${student.lastName}` : "Alumno"}
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center/students"
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

        {loading ? (
          <section className="rounded-2xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-brand-secondary">Cargando ficha...</p>
          </section>
        ) : !student ? (
          <section className="rounded-2xl border border-brand-border bg-white/80 p-5 shadow-sm">
            <p className="text-sm text-brand-secondary">El alumno no existe.</p>
            <Link
              href="/dashboard/center/students"
              className="mt-3 inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm"
            >
              Volver al listado
            </Link>
          </section>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Reservas</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{reservations.length}</p>
              </article>
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Asistencias</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{attendanceSummary.completed}</p>
              </article>
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">No asistio</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{attendanceSummary.noShow}</p>
              </article>
              <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-brand-secondary">Pagos pendientes</p>
                <p className="mt-2 text-3xl font-semibold text-brand-text">{pendingPayments.length}</p>
              </article>
            </section>

            <section className="rounded-3xl border border-brand-border bg-white/80 p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(tabLabels) as TabKey[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`inline-flex h-10 items-center rounded-xl border px-3 text-sm ${activeTab === tab ? "border-brand-primary bg-brand-primary text-white" : "border-brand-border text-brand-text"}`}
                  >
                    {tabLabels[tab]}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "summary" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-brand-text">Resumen</h2>
                  <div className="mt-4 grid gap-3 text-sm text-brand-secondary">
                    <p>Nombre: {student.firstName} {student.lastName}</p>
                    <p>Nivel: {student.level}</p>
                    <p>Email: {student.email ?? "Sin email"}</p>
                    <p>Telefono: {student.phone ?? "Sin telefono"}</p>
                    <p>Contacto de emergencia: {student.emergencyContact ?? "Sin contacto"}</p>
                    <p>
                      Nacimiento:{" "}
                      {student.birthDate ? student.birthDate.toDate().toLocaleDateString("es-ES") : "Sin fecha"}
                    </p>
                  </div>
                </article>
                <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-brand-text">Proxima actividad</h2>
                  <div className="mt-4 space-y-3 text-sm text-brand-secondary">
                    {reservations.slice(0, 3).map((reservation) => {
                      const classItem = classes.find((item) => item.id === reservation.classId);
                      return (
                        <div key={reservation.id} className="rounded-2xl border border-brand-border bg-brand-background/40 p-3">
                          <p className="font-medium text-brand-text">{classItem?.title ?? reservation.classId}</p>
                          <p>{reservation.status}</p>
                        </div>
                      );
                    })}
                    {reservations.length === 0 && <p>No hay reservas todavia.</p>}
                  </div>
                </article>
              </section>
            )}

            {activeTab === "reservations" && (
              <StudentReservationsTab
                reservations={reservations}
                classes={classes}
                creating={savingReservation}
                selectedClassId={reservationClassId}
                selectedStatus={reservationStatus}
                notes={reservationNotes}
                onClassIdChange={setReservationClassId}
                onStatusChange={setReservationStatus}
                onNotesChange={setReservationNotes}
                onCreate={handleCreateReservation}
                onStatusUpdate={handleUpdateReservationStatus}
                onDelete={handleDeleteReservation}
              />
            )}

            {activeTab === "attendance" && (
              <section className="grid gap-4 lg:grid-cols-3">
                <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-brand-text">Completadas</h2>
                  <p className="mt-2 text-4xl font-semibold text-brand-text">{attendanceSummary.completed}</p>
                </article>
                <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-brand-text">Confirmadas</h2>
                  <p className="mt-2 text-4xl font-semibold text-brand-text">{attendanceSummary.confirmed}</p>
                </article>
                <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-brand-text">No asistio</h2>
                  <p className="mt-2 text-4xl font-semibold text-brand-text">{attendanceSummary.noShow}</p>
                </article>
              </section>
            )}

            {activeTab === "payments" && (
              <StudentPaymentsTab
                payments={payments}
                editingPayment={editingPayment}
                saving={savingPayment}
                onSubmit={handlePaymentSubmit}
                onEdit={setEditingPayment}
                onDelete={handleDeletePayment}
                onCancelEdit={() => setEditingPayment(null)}
              />
            )}

            {activeTab === "notes" && (
              <section className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-brand-text">Observaciones</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-brand-secondary">
                  {student.notes ?? "No hay observaciones registradas."}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

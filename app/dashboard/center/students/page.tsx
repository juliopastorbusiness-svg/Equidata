"use client";

import { useEffect, useState } from "react";
import { CenterHeader } from "@/components/center/CenterHeader";
import { StudentForm, StudentFormValues } from "@/components/center/students/StudentForm";
import { StudentList } from "@/components/center/students/StudentList";
import { useRequireCenterRole } from "@/lib/hooks/useRequireCenterRole";
import {
  createStudent,
  deleteStudent,
  getPayments,
  getReservations,
  getStudents,
  Student,
  updateStudent,
} from "@/lib/services";

const inputClassName =
  "h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm text-brand-text";

export default function CenterStudentsPage() {
  const {
    loading: guardLoading,
    error: guardError,
    isAllowed,
    activeCenterId,
    activeCenterName,
    memberships,
    setActiveCenterId,
  } = useRequireCenterRole(["CENTER_OWNER", "CENTER_ADMIN"]);

  const [students, setStudents] = useState<Student[]>([]);
  const [reservations, setReservations] = useState<Awaited<ReturnType<typeof getReservations>>>([]);
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPayments>>>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (centerId: string) => {
    const [nextStudents, nextReservations, nextPayments] = await Promise.all([
      getStudents(centerId),
      getReservations(centerId),
      getPayments(centerId),
    ]);
    setStudents(nextStudents);
    setReservations(nextReservations);
    setPayments(nextPayments);
  };

  useEffect(() => {
    if (!activeCenterId) {
      setStudents([]);
      setReservations([]);
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    loadData(activeCenterId)
      .catch((loadError) => {
        console.error(loadError);
        setError("No se pudo cargar el modulo de alumnos.");
      })
      .finally(() => setLoading(false));
  }, [activeCenterId]);

  const resetEditor = () => {
    setEditingStudent(null);
    setError(null);
  };

  const handleSubmit = async (values: StudentFormValues) => {
    if (!activeCenterId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        birthDate: values.birthDate ? new Date(`${values.birthDate}T00:00:00`) : undefined,
        phone: values.phone,
        email: values.email,
        emergencyContact: values.emergencyContact,
        level: values.level,
        status: values.status,
        notes: values.notes,
      };

      if (editingStudent) {
        await updateStudent(activeCenterId, editingStudent.id, payload);
      } else {
        await createStudent(activeCenterId, payload);
      }

      await loadData(activeCenterId);
      resetEditor();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el alumno.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!activeCenterId) return;
    setError(null);
    try {
      await deleteStudent(activeCenterId, student.id);
      await loadData(activeCenterId);
      if (editingStudent?.id === student.id) {
        resetEditor();
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "No se pudo eliminar el alumno.");
    }
  };

  if (guardLoading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando alumnos...</p>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-brand-background text-brand-text">
      <CenterHeader
        title="Alumnos"
        subtitle={`Centro activo: ${activeCenterName ?? "Sin centro activo"}`}
        backHref="/dashboard/center"
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

        {memberships.length > 1 && (
          <section className="max-w-xl rounded-2xl border border-brand-border bg-white/70 p-4 shadow-sm">
            <label htmlFor="center-selector" className="mb-2 block text-sm text-brand-secondary">
              Cambiar centro activo
            </label>
            <select
              id="center-selector"
              value={activeCenterId ?? ""}
              onChange={(event) => setActiveCenterId(event.target.value)}
              className={inputClassName}
            >
              {memberships.map((membership) => (
                <option key={membership.centerId} value={membership.centerId}>
                  {membership.centerName} ({membership.role})
                </option>
              ))}
            </select>
          </section>
        )}

        {!activeCenterId ? (
          <section className="rounded-2xl border border-brand-border bg-white/60 p-4 text-sm text-brand-secondary">
            No tienes centro asignado.
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-brand-text">Listado</h2>
                <p className="text-sm text-brand-secondary">
                  {loading ? "Cargando..." : `${students.length} alumnos registrados.`}
                </p>
              </div>
              {loading ? (
                <p className="text-sm text-brand-secondary">Cargando...</p>
              ) : (
                <StudentList
                  items={students}
                  reservations={reservations}
                  payments={payments}
                  onEdit={setEditingStudent}
                  onDelete={handleDelete}
                />
              )}
            </article>

            <article className="rounded-3xl border border-brand-border bg-white/80 p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-brand-text">
                    {editingStudent ? "Editar alumno" : "Nuevo alumno"}
                  </h2>
                  <p className="text-sm text-brand-secondary">
                    La ficha completa se gestiona desde el detalle del alumno.
                  </p>
                </div>
                {editingStudent && (
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <StudentForm
                defaultValues={editingStudent ?? undefined}
                submitting={saving}
                submitLabel={editingStudent ? "Guardar cambios" : "Crear alumno"}
                onSubmit={handleSubmit}
              />
            </article>
          </section>
        )}
      </div>
    </main>
  );
}

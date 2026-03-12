"use client";

import Link from "next/link";
import { Student } from "@/lib/services";

type StudentCardProps = {
  student: Student;
  reservationsCount: number;
  pendingPaymentsCount: number;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => Promise<void>;
};

export function StudentCard({
  student,
  reservationsCount,
  pendingPaymentsCount,
  onEdit,
  onDelete,
}: StudentCardProps) {
  return (
    <article className="rounded-2xl border border-brand-border bg-white/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/dashboard/center/students/${student.id}`}
            className="text-base font-semibold text-brand-text hover:text-brand-primary"
          >
            {student.firstName} {student.lastName}
          </Link>
          <p className="text-sm text-brand-secondary">
            Nivel {student.level} · {student.status}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onEdit(student)}
            className="inline-flex h-10 items-center rounded-xl border border-brand-border px-3 text-sm"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => void onDelete(student)}
            className="inline-flex h-10 items-center rounded-xl border border-red-200 px-3 text-sm text-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-sm text-brand-secondary md:grid-cols-2">
        <p>Email: {student.email ?? "Sin email"}</p>
        <p>Telefono: {student.phone ?? "Sin telefono"}</p>
        <p>Reservas: {reservationsCount}</p>
        <p>Pagos pendientes: {pendingPaymentsCount}</p>
      </div>
    </article>
  );
}

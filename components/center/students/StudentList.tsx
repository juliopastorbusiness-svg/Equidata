"use client";

import { ClassReservation, Student, StudentPayment } from "@/lib/services";
import { StudentCard } from "@/components/center/students/StudentCard";

type StudentListProps = {
  items: Student[];
  reservations: ClassReservation[];
  payments: StudentPayment[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => Promise<void>;
};

export function StudentList({
  items,
  reservations,
  payments,
  onEdit,
  onDelete,
}: StudentListProps) {
  if (items.length === 0) {
    return <p className="text-sm text-brand-secondary">No hay alumnos registrados.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          reservationsCount={reservations.filter((item) => item.studentId === student.id).length}
          pendingPaymentsCount={
            payments.filter(
              (item) =>
                item.studentId === student.id &&
                (item.status === "PENDING" || item.status === "PARTIAL" || item.status === "OVERDUE")
            ).length
          }
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

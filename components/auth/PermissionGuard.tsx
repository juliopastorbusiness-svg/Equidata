"use client";

import { ReactNode } from "react";
import { useProfessionalPermissions } from "@/hooks/useProfessionalPermissions";

type PermissionGuardProps = {
  centerId?: string | null;
  professionalId?: string | null;
  module: string;
  action: string | string[];
  children: ReactNode;
};

export function PermissionGuard({
  centerId,
  professionalId,
  module,
  action,
  children,
}: PermissionGuardProps) {
  const { loading, hasPermission } = useProfessionalPermissions(centerId, professionalId);
  const actions = Array.isArray(action) ? action : [action];
  const hasAccess = actions.some((item) => hasPermission(module, item));

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <p>Cargando permisos...</p>
      </main>
    );
  }

  if (!centerId || !professionalId || !hasAccess) {
    return (
      <main className="min-h-screen bg-brand-background p-6 text-brand-text">
        <div className="mx-auto max-w-3xl rounded-2xl border border-brand-border bg-white/80 p-5 shadow-sm">
          <p className="text-sm font-semibold text-brand-text">
            No tienes permiso para acceder a este módulo.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

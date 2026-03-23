"use client";

import { useState } from "react";
import { requestCenterLink } from "@/lib/services/memberService";
import { setActiveCenter } from "@/lib/services/userService";
import { CenterMember, Center, RiderProfile } from "@/lib/services/types";

type CenterLinkRequestButtonProps = {
  center: Center;
  currentMember: CenterMember | null;
  riderProfile: RiderProfile | null;
  activeCenterId?: string;
  onStatusChange?: (member: CenterMember) => void;
  onActiveCenterChange?: (centerId: string) => void;
};

export function CenterLinkRequestButton({
  center,
  currentMember,
  riderProfile,
  activeCenterId,
  onStatusChange,
  onActiveCenterChange,
}: CenterLinkRequestButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!riderProfile) {
      setError("Solo los riders pueden vincularse a un centro.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (currentMember?.status === "active") {
        await setActiveCenter(riderProfile.uid, center.id);
        onActiveCenterChange?.(center.id);
        return;
      }

      const member = await requestCenterLink(center.id, riderProfile);
      onStatusChange?.(member);
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo actualizar la vinculacion."
      );
    } finally {
      setLoading(false);
    }
  };

  const isActiveCenter = currentMember?.status === "active" && activeCenterId === center.id;

  let label = "Vincularme";
  let disabled = false;

  if (!riderProfile) {
    label = "Solo riders";
    disabled = true;
  } else if (isActiveCenter) {
    label = "Centro activo";
    disabled = true;
  } else if (currentMember?.status === "pending") {
    label = "Solicitud pendiente";
    disabled = true;
  } else if (currentMember?.status === "rejected") {
    label = "Solicitar de nuevo";
  } else if (currentMember?.status === "active") {
    label = "Activar centro";
  } else {
    label = "Solicitar acceso";
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primaryHover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Procesando..." : label}
      </button>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

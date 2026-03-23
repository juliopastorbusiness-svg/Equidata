import type { UserProfile as DomainUserProfile, UserRole } from "@/lib/services/types";

export type LegacyRole = "rider" | "centerOwner" | "pro";
export type CenterScopedRole = "CENTER_OWNER" | "CENTER_ADMIN";

export type AppRole = LegacyRole | CenterScopedRole | UserRole;

export type UserProfile = DomainUserProfile;

export const normalizeUserRole = (role?: string | null): UserRole | null => {
  if (!role) return null;
  if (role === "center_owner" || role === "centerOwner") return "center_owner";
  if (role === "center_staff" || role === "CENTER_ADMIN") return "center_staff";
  if (role === "rider" || role === "pro") return role;
  return null;
};

export const normalizeCenterRole = (
  role?: string | null
): CenterScopedRole | null => {
  if (!role) return null;
  if (role === "CENTER_OWNER" || role === "centerOwner" || role === "center_owner") {
    return "CENTER_OWNER";
  }
  if (role === "CENTER_ADMIN" || role === "center_staff") {
    return "CENTER_ADMIN";
  }
  return null;
};

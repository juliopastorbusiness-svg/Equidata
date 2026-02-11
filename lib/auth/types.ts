export type LegacyRole = "rider" | "centerOwner" | "pro";

export type CenterScopedRole = "CENTER_OWNER" | "CENTER_ADMIN";

export type AppRole = LegacyRole | CenterScopedRole;

export type UserProfile = {
  displayName?: string;
  name?: string;
  email?: string;
  role?: AppRole | string;
  centerId?: string | null;
};

export const normalizeCenterRole = (
  role?: string | null
): CenterScopedRole | null => {
  if (!role) return null;
  if (role === "CENTER_OWNER" || role === "centerOwner") {
    return "CENTER_OWNER";
  }
  if (role === "CENTER_ADMIN") {
    return "CENTER_ADMIN";
  }
  return null;
};


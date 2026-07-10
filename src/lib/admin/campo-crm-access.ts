import type { AdminProfile, AdminRol } from "@/lib/admin/types";

/** Superadmin, gerente comercial y director (admin gerente) pueden abrir CRM de campo. */
export const canAdminOpenCampoCrm = (adminRol: AdminRol) =>
  adminRol === "superadmin" || adminRol === "gerente";

export const canAccessCampoCrmFromAdmin = (profile: AdminProfile) =>
  canAdminOpenCampoCrm(profile.rol);

/** Desarrollo preferido al saltar de admin al CRM de campo. */
export const resolvePreferredCampoDesarrolloId = (
  profile: AdminProfile,
  navDesarrolloId?: string | null,
): string | null => {
  if (navDesarrolloId) {
    if (
      profile.rol === "superadmin" ||
      !profile.desarrollosIds.length ||
      profile.desarrollosIds.includes(navDesarrolloId)
    ) {
      return navDesarrolloId;
    }
  }

  if (profile.desarrollosIds.length === 1) {
    return profile.desarrollosIds[0] ?? null;
  }

  return null;
};

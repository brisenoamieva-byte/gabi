import type { AdminModule, AdminProfile, AdminRol } from "@/lib/admin/types";

export const adminRolLabel: Record<AdminRol, string> = {
  superadmin: "Administrador gabi",
  gerente: "Gerente comercial",
  operaciones: "Operaciones",
};

export const isSuperAdmin = (profile: AdminProfile) => profile.rol === "superadmin";

export const canAccessDesarrollo = (profile: AdminProfile, desarrolloId: string) =>
  isSuperAdmin(profile) || profile.desarrollosIds.includes(desarrolloId);

export const filterDesarrollosForAdmin = <T extends { id: string }>(
  desarrollos: T[],
  profile: AdminProfile,
) => {
  if (isSuperAdmin(profile)) {
    return desarrollos;
  }
  return desarrollos.filter((item) => profile.desarrollosIds.includes(item.id));
};

export const canAccessModule = (profile: AdminProfile, module: AdminModule) => {
  if (isSuperAdmin(profile)) {
    return true;
  }

  if (module === "usuarios" || module === "catalogo") {
    return false;
  }

  if (module === "guion") {
    return profile.rol === "gerente" || isSuperAdmin(profile);
  }

  if (module === "sembrado" || module === "expedientes") {
    return profile.rol === "gerente" || profile.rol === "operaciones" || isSuperAdmin(profile);
  }

  if (module === "leads") {
    return profile.rol === "gerente" || isSuperAdmin(profile);
  }

  if (module === "compliance-coach") {
    return profile.rol === "gerente" || profile.rol === "operaciones" || isSuperAdmin(profile);
  }

  if (module === "metricas") {
    return profile.rol === "gerente" || isSuperAdmin(profile);
  }

  if (module === "guardias") {
    return profile.rol === "gerente" || isSuperAdmin(profile);
  }

  if (profile.rol === "operaciones") {
    return module === "documentos" || module === "inventario";
  }

  if (profile.rol === "gerente") {
    return true;
  }

  return false;
};

/** APIs de curación masiva (misma tabla que sembrado). */
export const canAccessInventarioApi = (profile: AdminProfile) =>
  canAccessModule(profile, "inventario") || canAccessModule(profile, "sembrado");

export const canDeleteProspectos = (profile: AdminProfile) => isSuperAdmin(profile);

/** Pausar/activar CRM de un desarrollo: solo superadmin. */
export const canManageDesarrolloOperativo = (profile: AdminProfile, _desarrolloId: string) =>
  isSuperAdmin(profile);

export const canReassignProspectos = (profile: AdminProfile) =>
  canAccessModule(profile, "leads");

/** Solo gerente o superadmin registran apartados en sembrado. */
export const canRegisterApartado = (profile: AdminProfile) =>
  profile.rol === "gerente" || isSuperAdmin(profile);

export const canAccessCrmComplianceApi = (profile: AdminProfile) =>
  canAccessModule(profile, "leads") || canAccessModule(profile, "compliance-coach");

/** Hub Salud CRM: gerentes (leads) u operaciones (auditoría). */
export const canAccessSaludCrm = (profile: AdminProfile) => canAccessCrmComplianceApi(profile);

/** Configurar pasos del playbook (solo quien administra leads). */
export const canConfigureCrmPlaybook = (profile: AdminProfile) =>
  canAccessModule(profile, "leads");

export const assertDesarrolloAccess = (profile: AdminProfile, desarrolloId: string) => {
  if (!canAccessDesarrollo(profile, desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }
};

export const assertDesarrollosSubset = (profile: AdminProfile, desarrollosIds: string[]) => {
  if (isSuperAdmin(profile)) {
    return;
  }

  const invalid = desarrollosIds.filter((id) => !profile.desarrollosIds.includes(id));
  if (invalid.length) {
    throw new Error("No puedes asignar desarrollos fuera de tu alcance.");
  }
};

export const getAdminScopeLabel = (profile: AdminProfile, desarrolloNames: Record<string, string>) => {
  if (isSuperAdmin(profile)) {
    return "Todos los desarrollos";
  }

  if (!profile.desarrollosIds.length) {
    return "Sin desarrollos asignados";
  }

  return profile.desarrollosIds
    .map((id) => desarrolloNames[id] ?? id)
    .join(" · ");
};

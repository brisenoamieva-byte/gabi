export type AsesorRol = "gerente" | "coordinador" | "director" | "asesor";

export type AsesorRecord = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: AsesorRol;
  activo: boolean;
  desarrollosIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type AsesorInput = {
  id?: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  rol: AsesorRol;
  desarrollosIds: string[];
  pin?: string;
  activo?: boolean;
  regeneratePin?: boolean;
};

export type AsesorUpdateInput = Partial<Omit<AsesorInput, "nombre" | "email" | "rol" | "desarrollosIds">> & {
  nombre?: string;
  email?: string;
  telefono?: string | null;
  rol?: AsesorRol;
  desarrollosIds?: string[];
  regeneratePin?: boolean;
  /** Re-sincroniza acceso /admin para roles con permisos amplios. */
  syncAdmin?: boolean;
};

export type AsesorSession = Pick<
  AsesorRecord,
  "id" | "nombre" | "email" | "rol" | "desarrollosIds"
>;

/** Orden de presentación en selects y formularios. */
export const ALL_ASESOR_ROLES: AsesorRol[] = ["gerente", "coordinador", "director", "asesor"];

/** Gerente, coordinador y director comparten permisos amplios en el desarrollo + acceso admin. */
export const LEADERSHIP_ASESOR_ROLES: AsesorRol[] = ["gerente", "coordinador", "director"];

export const asesorRolLabel: Record<AsesorRol, string> = {
  gerente: "Gerente",
  coordinador: "Coordinador",
  director: "Director",
  asesor: "Asesor",
};

export const normalizeAsesorRol = (rol: string): AsesorRol => {
  if (rol === "admin") {
    return "gerente";
  }

  if (ALL_ASESOR_ROLES.includes(rol as AsesorRol)) {
    return rol as AsesorRol;
  }

  return "asesor";
};

export const isLeadershipAsesorRol = (rol: AsesorRol) => LEADERSHIP_ASESOR_ROLES.includes(rol);

/** Roles a los que se puede asignar seguimiento de leads (no dirección). */
export const ASSIGNABLE_ASESOR_ROLES: AsesorRol[] = ["gerente", "coordinador", "asesor"];

export const isAssignableAsesorRol = (rol: AsesorRol) => ASSIGNABLE_ASESOR_ROLES.includes(rol);

export const getEditableAsesorRoles = (
  _isGerenteComercial: boolean,
  currentRol?: AsesorRol,
): AsesorRol[] => {
  if (currentRol && !ALL_ASESOR_ROLES.includes(currentRol)) {
    return [normalizeAsesorRol(currentRol), ...ALL_ASESOR_ROLES];
  }

  return ALL_ASESOR_ROLES;
};

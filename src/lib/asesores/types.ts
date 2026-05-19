export type AsesorRol = "asesor" | "coordinador" | "director" | "admin";

export type AsesorRecord = {
  id: string;
  nombre: string;
  email: string;
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
  rol: AsesorRol;
  desarrollosIds: string[];
  pin?: string;
  activo?: boolean;
  regeneratePin?: boolean;
};

export type AsesorUpdateInput = Partial<Omit<AsesorInput, "nombre" | "email" | "rol" | "desarrollosIds">> & {
  nombre?: string;
  email?: string;
  rol?: AsesorRol;
  desarrollosIds?: string[];
  regeneratePin?: boolean;
  /** Re-sincroniza acceso /admin para coordinador activo. */
  syncAdmin?: boolean;
};

export type AsesorSession = Pick<
  AsesorRecord,
  "id" | "nombre" | "email" | "rol" | "desarrollosIds"
>;

export const asesorRolLabel: Record<AsesorRol, string> = {
  asesor: "Asesor del desarrollo",
  coordinador: "Coordinador del desarrollo",
  director: "Director comercial",
  admin: "Administrador comercial",
};

/** Roles que un gerente comercial puede dar de alta (solo subordinados). */
export const GERENTE_CREATABLE_ASESOR_ROLES: AsesorRol[] = ["asesor", "coordinador"];

export const isGerenteCreatableAsesorRol = (rol: AsesorRol) =>
  GERENTE_CREATABLE_ASESOR_ROLES.includes(rol);

export const getEditableAsesorRoles = (
  isGerenteComercial: boolean,
  currentRol?: AsesorRol,
): AsesorRol[] => {
  if (!isGerenteComercial) {
    return Object.keys(asesorRolLabel) as AsesorRol[];
  }

  const options = [...GERENTE_CREATABLE_ASESOR_ROLES];
  if (currentRol && !options.includes(currentRol)) {
    return [currentRol, ...options];
  }

  return options;
};

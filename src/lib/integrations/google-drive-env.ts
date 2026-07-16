export const genericDriveEnvKey = (desarrolloId: string) =>
  `GOOGLE_DRIVE_${desarrolloId.replace(/-/g, "_").toUpperCase()}_FOLDER_ID`;

/** Alias históricos (antes de convención genérica). */
export const LEGACY_DRIVE_FOLDER_ENV: Record<string, string> = {
  "pasaje-alamos": "GOOGLE_DRIVE_PASAJE_ALAMOS_FOLDER_ID",
  "mision-la-gavia": "GOOGLE_DRIVE_MISION_LA_GAVIA_FOLDER_ID",
};

/**
 * Carpeta hija (dentro de la raíz del desarrollo) donde viven los expedientes de cliente.
 * Si no hay mapeo, las carpetas se crean directo en la raíz configurada.
 */
export const DEFAULT_DRIVE_EXPEDIENTES_SUBFOLDER: Record<string, string> = {
  "mision-la-gavia": "3. Expediente Clientes",
};

/** Variantes de nombre que se aceptan al buscar la carpeta de expedientes. */
export const DRIVE_EXPEDIENTES_SUBFOLDER_ALIASES = [
  "3. Expediente Clientes",
  "3. Expedientes Clientes",
] as const;

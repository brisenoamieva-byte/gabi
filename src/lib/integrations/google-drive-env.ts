export const genericDriveEnvKey = (desarrolloId: string) =>
  `GOOGLE_DRIVE_${desarrolloId.replace(/-/g, "_").toUpperCase()}_FOLDER_ID`;

/** Alias históricos (antes de convención genérica). */
export const LEGACY_DRIVE_FOLDER_ENV: Record<string, string> = {
  "pasaje-alamos": "GOOGLE_DRIVE_PASAJE_ALAMOS_FOLDER_ID",
  "mision-la-gavia": "GOOGLE_DRIVE_MISION_LA_GAVIA_FOLDER_ID",
};

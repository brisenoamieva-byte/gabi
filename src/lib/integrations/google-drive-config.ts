import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

const PASAJE_ALAMOS_ID = "pasaje-alamos";

const trimEnv = (key: string) => process.env[key]?.trim() || null;

const DRIVE_FOLDER_ENV: Record<string, string> = {
  [PASAJE_ALAMOS_ID]: "GOOGLE_DRIVE_PASAJE_ALAMOS_FOLDER_ID",
  [MISION_LA_GAVIA_DESARROLLO_ID]: "GOOGLE_DRIVE_MISION_LA_GAVIA_FOLDER_ID",
};

export const getGoogleDriveRootFolderId = (desarrolloId: string): string | null => {
  const envKey = DRIVE_FOLDER_ENV[desarrolloId];
  if (!envKey) {
    return null;
  }
  return trimEnv(envKey);
};

export const isGoogleDriveConfiguredForDesarrollo = (desarrolloId: string): boolean => {
  return Boolean(
    trimEnv("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL") &&
      trimEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") &&
      getGoogleDriveRootFolderId(desarrolloId),
  );
};

/** Expediente oficial exige Drive en desarrollos con carpeta configurada. */
export const assertGoogleDriveRequiredForDesarrollo = (desarrolloId: string): void => {
  const envKey = DRIVE_FOLDER_ENV[desarrolloId];
  if (!envKey) {
    return;
  }
  if (!isGoogleDriveConfiguredForDesarrollo(desarrolloId)) {
    throw new Error(
      `Google Drive obligatorio para este desarrollo. Configura ${envKey} y la cuenta de servicio en el servidor.`,
    );
  }
};

export const getGoogleDriveOperacionFolderUrl = (folderId: string) =>
  `https://drive.google.com/drive/folders/${folderId}`;

export const getGoogleDriveFileViewUrl = (fileId: string) =>
  `https://drive.google.com/file/d/${fileId}/view`;

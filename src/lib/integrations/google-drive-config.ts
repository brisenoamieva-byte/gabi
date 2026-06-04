const PASAJE_ALAMOS_ID = "pasaje-alamos";

const trimEnv = (key: string) => process.env[key]?.trim() || null;

export const getGoogleDriveRootFolderId = (desarrolloId: string): string | null => {
  if (desarrolloId === PASAJE_ALAMOS_ID) {
    return trimEnv("GOOGLE_DRIVE_PASAJE_ALAMOS_FOLDER_ID");
  }
  return null;
};

export const isGoogleDriveConfiguredForDesarrollo = (desarrolloId: string): boolean => {
  return Boolean(
    trimEnv("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL") &&
      trimEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY") &&
      getGoogleDriveRootFolderId(desarrolloId),
  );
};

export const getGoogleDriveOperacionFolderUrl = (folderId: string) =>
  `https://drive.google.com/drive/folders/${folderId}`;

export const getGoogleDriveFileViewUrl = (fileId: string) =>
  `https://drive.google.com/file/d/${fileId}/view`;

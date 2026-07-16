import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { normalizeCampoConfig } from "@/lib/catalog/campo-config";
import {
  DEFAULT_DRIVE_EXPEDIENTES_SUBFOLDER,
  genericDriveEnvKey,
  LEGACY_DRIVE_FOLDER_ENV,
} from "@/lib/integrations/google-drive-env";

export { genericDriveEnvKey } from "@/lib/integrations/google-drive-env";

const trimEnv = (key: string) => process.env[key]?.trim() || null;

export const getGoogleDriveRootFolderIdFromEnv = (desarrolloId: string): string | null => {
  const legacyKey = LEGACY_DRIVE_FOLDER_ENV[desarrolloId];
  if (legacyKey) {
    const legacy = trimEnv(legacyKey);
    if (legacy) {
      return legacy;
    }
  }
  return trimEnv(genericDriveEnvKey(desarrolloId));
};

/** Sync: env + override explícito (campo_config ya resuelto por el caller). */
export const getGoogleDriveRootFolderId = (
  desarrolloId: string,
  overrideFolderId?: string | null,
): string | null => {
  const override = overrideFolderId?.trim();
  if (override) {
    return override;
  }
  return getGoogleDriveRootFolderIdFromEnv(desarrolloId);
};

export const loadDriveFolderIdFromCampoConfig = async (
  desarrolloId: string,
): Promise<string | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("campo_config")
    .eq("id", desarrolloId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeCampoConfig(data.campo_config).driveFolderId?.trim() || null;
};

/** Env primero; si no, `campo_config.driveFolderId` en admin. */
export const resolveGoogleDriveRootFolderId = async (
  desarrolloId: string,
): Promise<string | null> => {
  const fromEnv = getGoogleDriveRootFolderIdFromEnv(desarrolloId);
  if (fromEnv) {
    return fromEnv;
  }
  return loadDriveFolderIdFromCampoConfig(desarrolloId);
};

const loadDriveExpedientesSubfolderFromCampoConfig = async (
  desarrolloId: string,
): Promise<string | null> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from("desarrollos_catalog")
    .select("campo_config")
    .eq("id", desarrolloId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeCampoConfig(data.campo_config).driveExpedientesSubfolder?.trim() || null;
};

/**
 * Nombre de la carpeta donde se crean los expedientes de cliente
 * (hija de la raíz del desarrollo). Null = crear directo en la raíz.
 */
export const resolveDriveExpedientesSubfolderName = async (
  desarrolloId: string,
): Promise<string | null> => {
  const fromCampo = await loadDriveExpedientesSubfolderFromCampoConfig(desarrolloId);
  if (fromCampo) {
    return fromCampo;
  }
  return DEFAULT_DRIVE_EXPEDIENTES_SUBFOLDER[desarrolloId] ?? null;
};

export const hasGoogleDriveServiceAccount = (): boolean =>
  Boolean(
    trimEnv("GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL") && trimEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"),
  );

export const isGoogleDriveConfiguredForDesarrollo = (
  desarrolloId: string,
  overrideFolderId?: string | null,
): boolean => {
  return Boolean(
    hasGoogleDriveServiceAccount() && getGoogleDriveRootFolderId(desarrolloId, overrideFolderId),
  );
};

export const isGoogleDriveConfiguredForDesarrolloAsync = async (
  desarrolloId: string,
): Promise<boolean> => {
  if (!hasGoogleDriveServiceAccount()) {
    return false;
  }
  return Boolean(await resolveGoogleDriveRootFolderId(desarrolloId));
};

/**
 * Exige Drive solo si el desarrollo ya tiene carpeta provisionada
 * (env legacy, env genérico, o override de admin).
 */
export const assertGoogleDriveRequiredForDesarrollo = (
  desarrolloId: string,
  overrideFolderId?: string | null,
): void => {
  const provisioned =
    Boolean(overrideFolderId?.trim()) ||
    Boolean(getGoogleDriveRootFolderIdFromEnv(desarrolloId)) ||
    Boolean(LEGACY_DRIVE_FOLDER_ENV[desarrolloId]);

  if (!provisioned) {
    return;
  }

  if (!isGoogleDriveConfiguredForDesarrollo(desarrolloId, overrideFolderId)) {
    const envHint = LEGACY_DRIVE_FOLDER_ENV[desarrolloId] ?? genericDriveEnvKey(desarrolloId);
    throw new Error(
      `Google Drive obligatorio para este desarrollo. Configura ${envHint} o el ID de carpeta en admin, más la cuenta de servicio.`,
    );
  }
};

export const assertGoogleDriveRequiredForDesarrolloAsync = async (
  desarrolloId: string,
): Promise<void> => {
  const folderId = await resolveGoogleDriveRootFolderId(desarrolloId);
  const legacyMapped = Boolean(LEGACY_DRIVE_FOLDER_ENV[desarrolloId]);
  if (!folderId && !legacyMapped) {
    return;
  }
  if (!hasGoogleDriveServiceAccount() || !folderId) {
    const envHint = LEGACY_DRIVE_FOLDER_ENV[desarrolloId] ?? genericDriveEnvKey(desarrolloId);
    throw new Error(
      `Google Drive obligatorio para este desarrollo. Configura ${envHint} o el ID de carpeta en admin, más la cuenta de servicio.`,
    );
  }
};

export const getGoogleDriveOperacionFolderUrl = (folderId: string) =>
  `https://drive.google.com/drive/folders/${folderId}`;

export const getGoogleDriveFileViewUrl = (fileId: string) =>
  `https://drive.google.com/file/d/${fileId}/view`;

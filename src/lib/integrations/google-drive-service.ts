import { Readable } from "node:stream";
import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import {
  getGoogleDriveFileViewUrl,
  getGoogleDriveOperacionFolderUrl,
  resolveGoogleDriveRootFolderId,
  isGoogleDriveConfiguredForDesarrolloAsync,
} from "@/lib/integrations/google-drive-config";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

const normalizePrivateKey = (raw: string) => {
  let key = raw.trim();
  if (key.startsWith('"')) {
    key = key.slice(1);
  } else if (key.startsWith("'")) {
    key = key.slice(1);
  }
  key = key.replace(/\\n/g, "\n");
  key = key.replace(/["'],?\s*$/g, "").trim();
  return key;
};

const getDriveClient = (): drive_v3.Drive | null => {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (!clientEmail || !privateKeyRaw) {
    return null;
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: normalizePrivateKey(privateKeyRaw),
    scopes: [DRIVE_SCOPE],
  });

  return google.drive({ version: "v3", auth });
};

const driveParams = {
  supportsAllDrives: true,
  includeItemsFromAllDrives: true,
};

const sanitizeFolderName = (value: string) =>
  value.replace(/[/\\?*:|"<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);

export type GoogleDriveUploadResult = {
  fileId: string;
  webViewLink: string;
  folderId: string;
  folderUrl: string;
};

export const testGoogleDriveConnection = async (
  desarrolloId = "pasaje-alamos",
): Promise<{ ok: true; folderName: string; folderId: string }> => {
  const rootFolderId = await resolveGoogleDriveRootFolderId(desarrolloId);
  if (!rootFolderId) {
    throw new Error(`No hay carpeta Drive configurada para ${desarrolloId}.`);
  }

  const drive = getDriveClient();
  if (!drive) {
    throw new Error("Faltan GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL o GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.");
  }

  try {
    const { data } = await drive.files.get({
      fileId: rootFolderId,
      fields: "id,name,mimeType,driveId",
      ...driveParams,
    });

    if (!data.id) {
      throw new Error("No se encontró la carpeta raíz en Drive.");
    }

    return {
      ok: true,
      folderName: data.name ?? "Carpeta GABI",
      folderId: data.id,
    };
  } catch (caught) {
    const hint =
      rootFolderId.includes("aBcDe") || rootFolderId.length < 20
        ? " Revisa GOOGLE_DRIVE_PASAJE_ALAMOS_FOLDER_ID: debe ser el ID real de tu carpeta en Drive (no el ejemplo del README)."
        : " Verifica que la cuenta de servicio tenga acceso a esa carpeta o unidad compartida.";
    const message =
      caught instanceof Error ? caught.message : "Error al conectar con Google Drive.";
    throw new Error(`${message}.${hint}`);
  }
};

export const ensureOperacionDriveFolder = async (input: {
  desarrolloId: string;
  operacionId: string;
  clienteNombre: string;
  unidadNumero: string;
  existingFolderId?: string | null;
}): Promise<{ folderId: string; folderUrl: string }> => {
  if (!(await isGoogleDriveConfiguredForDesarrolloAsync(input.desarrolloId))) {
    throw new Error("Google Drive no configurado para este desarrollo.");
  }

  if (input.existingFolderId) {
    return {
      folderId: input.existingFolderId,
      folderUrl: getGoogleDriveOperacionFolderUrl(input.existingFolderId),
    };
  }

  const rootFolderId = await resolveGoogleDriveRootFolderId(input.desarrolloId);
  if (!rootFolderId) {
    throw new Error("Carpeta raíz de Drive no configurada.");
  }

  const drive = getDriveClient();
  if (!drive) {
    throw new Error("Credenciales de Google Drive incompletas.");
  }

  const folderName = sanitizeFolderName(
    `${input.clienteNombre} — Unidad ${input.unidadNumero}`,
  );

  const { data } = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id,name,webViewLink",
    ...driveParams,
  });

  if (!data.id) {
    throw new Error("No se pudo crear la carpeta en Drive.");
  }

  return {
    folderId: data.id,
    folderUrl: data.webViewLink ?? getGoogleDriveOperacionFolderUrl(data.id),
  };
};

export const uploadExpedienteToGoogleDrive = async (input: {
  desarrolloId: string;
  operacionId: string;
  clienteNombre: string;
  unidadNumero: string;
  checklistCodigo: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  existingFolderId?: string | null;
}): Promise<GoogleDriveUploadResult> => {
  const { folderId, folderUrl } = await ensureOperacionDriveFolder({
    desarrolloId: input.desarrolloId,
    operacionId: input.operacionId,
    clienteNombre: input.clienteNombre,
    unidadNumero: input.unidadNumero,
    existingFolderId: input.existingFolderId,
  });

  const drive = getDriveClient();
  if (!drive) {
    throw new Error("Credenciales de Google Drive incompletas.");
  }

  const driveFileName = sanitizeFolderName(`${input.checklistCodigo}-${input.fileName}`);

  const { data } = await drive.files.create({
    requestBody: {
      name: driveFileName,
      parents: [folderId],
    },
    media: {
      mimeType: input.mimeType,
      body: bufferToStream(input.buffer),
    },
    fields: "id,webViewLink",
    ...driveParams,
  });

  if (!data.id) {
    throw new Error("No se pudo subir el archivo a Drive.");
  }

  return {
    fileId: data.id,
    webViewLink: data.webViewLink ?? getGoogleDriveFileViewUrl(data.id),
    folderId,
    folderUrl,
  };
};

const bufferToStream = (buffer: Buffer) => Readable.from(buffer);

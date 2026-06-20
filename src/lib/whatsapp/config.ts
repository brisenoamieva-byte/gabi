import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

export type WhatsAppCloudConfig = {
  accessToken: string | null;
  phoneNumberId: string | null;
  enabled: boolean;
};

const envPhoneNumberIdForDesarrollo = (desarrolloId: string): string | null => {
  const normalized = desarrolloId.toUpperCase().replace(/-/g, "_");
  const specific = process.env[`WHATSAPP_PHONE_NUMBER_ID_${normalized}`]?.trim();
  if (specific) {
    return specific;
  }

  if (desarrolloId === MISION_LA_GAVIA_DESARROLLO_ID) {
    return process.env.WHATSAPP_PHONE_NUMBER_ID_MISION_LA_GAVIA?.trim() || null;
  }

  return process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
};

export const isWhatsAppCloudConfigured = (desarrolloId: string): boolean => {
  const cfg = getWhatsAppCloudConfig(desarrolloId);
  return cfg.enabled && Boolean(cfg.accessToken && cfg.phoneNumberId);
};

export const getWhatsAppCloudConfig = (desarrolloId: string): WhatsAppCloudConfig => {
  const globalEnabled = process.env.WHATSAPP_CLOUD_ENABLED?.trim() !== "false";
  const allowedRaw = process.env.WHATSAPP_ENABLED_DESARROLLO_IDS?.trim();
  const allowed = allowedRaw
    ? allowedRaw.split(",").map((item) => item.trim()).filter(Boolean)
    : null;

  const desarrolloEnabled = !allowed || allowed.includes(desarrolloId);

  return {
    accessToken: process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim() || null,
    phoneNumberId: envPhoneNumberIdForDesarrollo(desarrolloId),
    enabled: globalEnabled && desarrolloEnabled,
  };
};

export const getMetaWebhookVerifyToken = (): string | null =>
  process.env.META_WEBHOOK_VERIFY_TOKEN?.trim() || null;

export const getMetaAppSecret = (): string | null =>
  process.env.META_APP_SECRET?.trim() || null;

export const getMetaPageAccessToken = (): string | null =>
  process.env.META_PAGE_ACCESS_TOKEN?.trim() || null;

export const getMetaGraphApiVersion = (): string =>
  process.env.META_GRAPH_API_VERSION?.trim() || "v21.0";

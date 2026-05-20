import { desarrollos } from "@/lib/data";

/** Motivos en los que no tiene sentido reintentar envío al CRM. */
export const CRM_NON_RETRY_REASONS = new Set([
  "crm_disabled",
  "missing_token",
  "crm_not_configured",
]);

export type CrmContactResult = {
  status?: string;
  reason?: string;
};

export const shouldQueueLeadForCrm = (result: CrmContactResult) => {
  if (result.status === "synced" || result.status === "duplicate") {
    return false;
  }

  if (result.status === "queued" && result.reason && CRM_NON_RETRY_REASONS.has(result.reason)) {
    return false;
  }

  return result.status === "queued" || result.status === "error";
};

export const shouldRemoveLeadFromCrmQueue = (result: CrmContactResult) =>
  result.status === "synced" ||
  result.status === "duplicate" ||
  (result.status === "queued" &&
    Boolean(result.reason && CRM_NON_RETRY_REASONS.has(result.reason)));

export const isDesarrolloCrmEnabled = (desarrolloId?: string) => {
  if (!desarrolloId) {
    return false;
  }

  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  return Boolean(desarrollo?.crm.enabled && desarrollo.crm.provider === "hubspot");
};

export const leadRegistrationMessage = (result: CrmContactResult) => {
  if (result.status === "synced") {
    return "Prospecto registrado y enviado al CRM del desarrollo.";
  }

  if (result.status === "queued" && result.reason && CRM_NON_RETRY_REASONS.has(result.reason)) {
    return "Prospecto registrado en gabi.";
  }

  if (result.status === "queued") {
    return "Prospecto registrado. Quedó pendiente de envío al CRM.";
  }

  return "Prospecto registrado en gabi.";
};

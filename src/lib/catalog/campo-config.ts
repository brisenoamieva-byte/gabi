import type { DatosBancarios } from "@/lib/data";

export type CampoCotizadorEsquema = "mensualidades" | "contado";

export type CampoCotizadorRules = {
  enganchePct: number;
  apartado: number;
  descuentoStep: number;
  esquemas: CampoCotizadorEsquema[];
};

/** Pack de operación de campo editable en admin (sin redeploy). */
export type DesarrolloCampoConfig = {
  cotizador?: Partial<CampoCotizadorRules> | null;
  datosBancarios?: Partial<DatosBancarios> | null;
  /** ID de carpeta raíz en Google Drive (alternativa a env GOOGLE_DRIVE_*_FOLDER_ID). */
  driveFolderId?: string | null;
  /** Contrato comercial Garantía SLA + destinatarios del reporte semanal. */
  garantiaContrato?: GarantiaContratoConfig | null;
};

export type GarantiaContratoConfig = {
  /** Activa el producto/contrato de garantía para este desarrollo. */
  enabled?: boolean;
  /** Envía reporte semanal automático (email + WhatsApp). Default true si enabled. */
  weeklyReportEnabled?: boolean;
  /** Nombre del plan en el PDF/contrato. */
  planLabel?: string;
  /** Correos del dueño / gerencia del desarrollador (además de gerentes Gabi). */
  recipientEmails?: string[];
  /** Teléfonos WhatsApp (+52…) para el resumen semanal. */
  recipientPhones?: string[];
  /** Notas visibles en el PDF contractual. */
  notes?: string;
};

export const defaultCampoCotizadorRules: CampoCotizadorRules = {
  enganchePct: 0.1,
  apartado: 50000,
  descuentoStep: 5000,
  esquemas: ["mensualidades", "contado"],
};

export const emptyCampoConfig = (): DesarrolloCampoConfig => ({});

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeEsquemas = (value: unknown): CampoCotizadorEsquema[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const allowed = new Set<CampoCotizadorEsquema>(["mensualidades", "contado"]);
  const next = value.filter((item): item is CampoCotizadorEsquema =>
    typeof item === "string" && allowed.has(item as CampoCotizadorEsquema),
  );
  return next.length ? next : undefined;
};

export const normalizeCampoConfig = (raw: unknown): DesarrolloCampoConfig => {
  const root = asRecord(raw);
  if (!root) {
    return emptyCampoConfig();
  }

  const cotizadorRaw = asRecord(root.cotizador);
  const bancariosRaw = asRecord(root.datosBancarios);

  const cotizador = cotizadorRaw
    ? {
        enganchePct: asNumber(cotizadorRaw.enganchePct),
        apartado: asNumber(cotizadorRaw.apartado),
        descuentoStep: asNumber(cotizadorRaw.descuentoStep),
        esquemas: normalizeEsquemas(cotizadorRaw.esquemas),
      }
    : undefined;

  const datosBancarios = bancariosRaw
    ? {
        razonSocial: asString(bancariosRaw.razonSocial),
        rfc: asString(bancariosRaw.rfc),
        banco: asString(bancariosRaw.banco),
        sucursal: asString(bancariosRaw.sucursal),
        cuenta: asString(bancariosRaw.cuenta),
        clabe: asString(bancariosRaw.clabe),
        concepto: asString(bancariosRaw.concepto),
        reportarA: asString(bancariosRaw.reportarA),
      }
    : undefined;

  const garantiaRaw = asRecord(root.garantiaContrato);
  const emailsRaw = garantiaRaw?.recipientEmails;
  const phonesRaw = garantiaRaw?.recipientPhones;
  const recipientEmails = Array.isArray(emailsRaw)
    ? emailsRaw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : undefined;
  const recipientPhones = Array.isArray(phonesRaw)
    ? phonesRaw
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;

  const garantiaContrato = garantiaRaw
    ? {
        enabled: typeof garantiaRaw.enabled === "boolean" ? garantiaRaw.enabled : undefined,
        weeklyReportEnabled:
          typeof garantiaRaw.weeklyReportEnabled === "boolean"
            ? garantiaRaw.weeklyReportEnabled
            : undefined,
        planLabel: asString(garantiaRaw.planLabel),
        recipientEmails,
        recipientPhones,
        notes: asString(garantiaRaw.notes),
      }
    : undefined;

  return {
    cotizador: cotizador && Object.values(cotizador).some((v) => v !== undefined) ? cotizador : undefined,
    datosBancarios:
      datosBancarios && Object.values(datosBancarios).some((v) => v !== undefined)
        ? datosBancarios
        : undefined,
    driveFolderId: asString(root.driveFolderId) ?? null,
    garantiaContrato:
      garantiaContrato &&
      (garantiaContrato.enabled !== undefined ||
        garantiaContrato.weeklyReportEnabled !== undefined ||
        garantiaContrato.planLabel ||
        (garantiaContrato.recipientEmails?.length ?? 0) > 0 ||
        (garantiaContrato.recipientPhones?.length ?? 0) > 0 ||
        garantiaContrato.notes)
        ? garantiaContrato
        : undefined,
  };
};

export const hasDatosBancariosConfig = (config: DesarrolloCampoConfig | null | undefined): boolean => {
  const clabe = config?.datosBancarios?.clabe?.trim();
  const cuenta = config?.datosBancarios?.cuenta?.trim();
  return Boolean(clabe || cuenta);
};

export const hasCotizadorRulesConfig = (config: DesarrolloCampoConfig | null | undefined): boolean => {
  const rules = config?.cotizador;
  if (!rules) {
    return false;
  }
  return (
    rules.enganchePct !== undefined ||
    rules.apartado !== undefined ||
    rules.descuentoStep !== undefined ||
    Boolean(rules.esquemas?.length)
  );
};

export const resolveCotizadorRulesFromCampo = (
  config: DesarrolloCampoConfig | null | undefined,
  fallback: CampoCotizadorRules = defaultCampoCotizadorRules,
): CampoCotizadorRules => {
  const override = config?.cotizador;
  if (!override) {
    return fallback;
  }
  return {
    enganchePct: override.enganchePct ?? fallback.enganchePct,
    apartado: override.apartado ?? fallback.apartado,
    descuentoStep: override.descuentoStep ?? fallback.descuentoStep,
    esquemas: override.esquemas?.length ? override.esquemas : fallback.esquemas,
  };
};

export const resolveDatosBancariosFromCampo = (
  config: DesarrolloCampoConfig | null | undefined,
  fallback: DatosBancarios,
): DatosBancarios => {
  const override = config?.datosBancarios;
  if (!override) {
    return fallback;
  }
  return {
    razonSocial: override.razonSocial ?? fallback.razonSocial,
    rfc: override.rfc ?? fallback.rfc,
    banco: override.banco ?? fallback.banco,
    sucursal: override.sucursal ?? fallback.sucursal,
    cuenta: override.cuenta ?? fallback.cuenta,
    clabe: override.clabe ?? fallback.clabe,
    concepto: override.concepto ?? fallback.concepto,
    reportarA: override.reportarA ?? fallback.reportarA,
  };
};

/** Serializa para guardar en jsonb (omite vacíos). */
export const serializeCampoConfig = (config: DesarrolloCampoConfig): DesarrolloCampoConfig => {
  const normalized = normalizeCampoConfig(config);
  const out: DesarrolloCampoConfig = {};

  if (hasCotizadorRulesConfig(normalized)) {
    out.cotizador = {
      enganchePct: normalized.cotizador?.enganchePct,
      apartado: normalized.cotizador?.apartado,
      descuentoStep: normalized.cotizador?.descuentoStep,
      esquemas: normalized.cotizador?.esquemas,
    };
  }

  if (hasDatosBancariosConfig(normalized) || normalized.datosBancarios?.razonSocial) {
    out.datosBancarios = { ...normalized.datosBancarios };
  }

  if (normalized.driveFolderId) {
    out.driveFolderId = normalized.driveFolderId;
  }

  if (normalized.garantiaContrato) {
    out.garantiaContrato = { ...normalized.garantiaContrato };
  }

  return out;
};

export const isGarantiaContratoEnabled = (
  config: DesarrolloCampoConfig | null | undefined,
): boolean => Boolean(config?.garantiaContrato?.enabled);

export const isGarantiaWeeklyReportEnabled = (
  config: DesarrolloCampoConfig | null | undefined,
): boolean => {
  const contrato = config?.garantiaContrato;
  if (!contrato?.enabled) {
    return false;
  }
  return contrato.weeklyReportEnabled !== false;
};

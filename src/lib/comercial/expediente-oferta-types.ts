/** Datos KYC del oferente (Anexo A). */
export type ClienteKycDatos = {
  identificacion_tipo?: string | null;
  identificacion_numero?: string | null;
  fecha_nacimiento?: string | null;
  lugar_nacimiento?: string | null;
  nacionalidad?: string | null;
  estado_civil?: string | null;
  curp?: string | null;
  rfc?: string | null;
  domicilio?: string | null;
  ocupacion?: string | null;
  tipo_operacion?: string | null;
  /** Consentimiento transferencia de datos (Anexo F). Default no. */
  consentir_transferencia?: boolean | null;
};

/** Un tramo de mensualidades del Anexo B. */
export type PlanPagoTramo = {
  monto_total: number;
  num_pagos: number;
  monto_mensual: number;
  dia_pago?: number | null;
  periodo_texto: string;
};

/** Plan de pagos estructurado (Anexo B). */
export type PlanPagoDatos = {
  apartado_monto?: number | null;
  apartado_fecha?: string | null;
  tramos?: PlanPagoTramo[] | null;
  finiquito_monto?: number | null;
  finiquito_fecha?: string | null;
  finiquito_fuente?: string | null;
  /** Si se llena, sustituye el cuerpo generado de tramos. */
  texto_libre?: string | null;
};

export const emptyClienteKyc = (): ClienteKycDatos => ({
  identificacion_tipo: "INE",
  identificacion_numero: "",
  fecha_nacimiento: "",
  lugar_nacimiento: "",
  nacionalidad: "Mexicana",
  estado_civil: "",
  curp: "",
  rfc: "",
  domicilio: "",
  ocupacion: "",
  tipo_operacion: "Libre Especial",
  consentir_transferencia: false,
});

export const emptyPlanPago = (): PlanPagoDatos => ({
  apartado_monto: null,
  apartado_fecha: "",
  tramos: [],
  finiquito_monto: null,
  finiquito_fecha: "",
  finiquito_fuente: "recursos propios y/o crédito hipotecario",
  texto_libre: "",
});

export const normalizeClienteKyc = (raw: unknown): ClienteKycDatos => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyClienteKyc();
  }
  const r = raw as Record<string, unknown>;
  const str = (key: string) =>
    typeof r[key] === "string" ? (r[key] as string) : "";
  return {
    identificacion_tipo: str("identificacion_tipo") || "INE",
    identificacion_numero: str("identificacion_numero"),
    fecha_nacimiento: str("fecha_nacimiento"),
    lugar_nacimiento: str("lugar_nacimiento"),
    nacionalidad: str("nacionalidad") || "Mexicana",
    estado_civil: str("estado_civil"),
    curp: str("curp"),
    rfc: str("rfc"),
    domicilio: str("domicilio"),
    ocupacion: str("ocupacion"),
    tipo_operacion: str("tipo_operacion") || "Libre Especial",
    consentir_transferencia:
      typeof r.consentir_transferencia === "boolean"
        ? r.consentir_transferencia
        : false,
  };
};

export const normalizePlanPago = (raw: unknown): PlanPagoDatos => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyPlanPago();
  }
  const r = raw as Record<string, unknown>;
  const num = (key: string): number | null => {
    const v = r[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const parsed = Number(v.replace(/[,$]/g, ""));
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };
  const str = (key: string) =>
    typeof r[key] === "string" ? (r[key] as string) : "";

  const tramosRaw = Array.isArray(r.tramos) ? r.tramos : [];
  const tramos: PlanPagoTramo[] = tramosRaw
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const n = (key: string) => {
        const v = item[key];
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string" && v.trim()) {
          const parsed = Number(String(v).replace(/[,$]/g, ""));
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      };
      return {
        monto_total: n("monto_total"),
        num_pagos: n("num_pagos") || 1,
        monto_mensual: n("monto_mensual"),
        dia_pago: n("dia_pago") || 30,
        periodo_texto: typeof item.periodo_texto === "string" ? item.periodo_texto : "",
      };
    });

  return {
    apartado_monto: num("apartado_monto"),
    apartado_fecha: str("apartado_fecha"),
    tramos,
    finiquito_monto: num("finiquito_monto"),
    finiquito_fecha: str("finiquito_fecha"),
    finiquito_fuente: str("finiquito_fuente") || "recursos propios y/o crédito hipotecario",
    texto_libre: str("texto_libre"),
  };
};

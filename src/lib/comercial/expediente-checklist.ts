export type ExpedienteChecklistEtapa = "apartado" | "contrato" | "cancelacion";
export type ExpedienteChecklistParte = "empresa" | "cliente";

export type ExpedienteChecklistItem = {
  codigo: string;
  etapa: ExpedienteChecklistEtapa;
  parte: ExpedienteChecklistParte;
  titulo: string;
  /** Obligatorio para solicitar comisión (etapa contrato + enganche). */
  requeridoFormalizacion: boolean;
  /** Obligatorio para apartado / oferta. */
  requeridoApartado: boolean;
  /** Solo persona moral. */
  soloPersonaMoral?: boolean;
  /** Cuando aplique (ej. acta matrimonio). */
  opcionalCondicional?: boolean;
  orden: number;
};

/** Checklist La Ceiba — base legal BBR (aplicable como plantilla por desarrollo). */
export const CHECKLIST_LA_CEIBA: ExpedienteChecklistItem[] = [
  { codigo: "OC", etapa: "apartado", parte: "empresa", titulo: "Carta oferta de compra (OC)", requeridoApartado: true, requeridoFormalizacion: false, orden: 1 },
  { codigo: "ANEXO_A_DATOS", etapa: "apartado", parte: "empresa", titulo: "Manifestación de datos generales (ANEXO A)", requeridoApartado: true, requeridoFormalizacion: false, orden: 2 },
  { codigo: "ANEXO_B_PAGO", etapa: "apartado", parte: "empresa", titulo: "Modalidad de pago (ANEXO B)", requeridoApartado: true, requeridoFormalizacion: false, orden: 3 },
  { codigo: "SIMULADOR", etapa: "apartado", parte: "empresa", titulo: "Simulador de ventas", requeridoApartado: true, requeridoFormalizacion: false, orden: 4 },
  { codigo: "ANEXO_C_ESPEC", etapa: "apartado", parte: "empresa", titulo: "Especificaciones del departamento (ANEXO C)", requeridoApartado: true, requeridoFormalizacion: false, orden: 5 },
  { codigo: "ANEXO_D_MANT", etapa: "apartado", parte: "empresa", titulo: "Aceptación cuotas de mantenimiento (ANEXO D)", requeridoApartado: true, requeridoFormalizacion: false, orden: 6 },
  { codigo: "ANEXO_E_PLD", etapa: "apartado", parte: "empresa", titulo: "Carta prevención de lavado de dinero (ANEXO E)", requeridoApartado: true, requeridoFormalizacion: false, orden: 7 },
  { codigo: "ANEXO_F_PRIV", etapa: "apartado", parte: "empresa", titulo: "Aviso de privacidad (ANEXO F)", requeridoApartado: true, requeridoFormalizacion: false, orden: 8 },
  { codigo: "DEPOA", etapa: "apartado", parte: "cliente", titulo: "Comprobante depósito de apartado (DEPOA)", requeridoApartado: true, requeridoFormalizacion: false, orden: 9 },
  { codigo: "ID", etapa: "apartado", parte: "cliente", titulo: "Identificación oficial (ID)", requeridoApartado: true, requeridoFormalizacion: false, orden: 10 },
  { codigo: "CURP", etapa: "apartado", parte: "cliente", titulo: "CURP", requeridoApartado: true, requeridoFormalizacion: false, orden: 11 },
  { codigo: "RFC", etapa: "apartado", parte: "cliente", titulo: "RFC (o RFC genérico)", requeridoApartado: true, requeridoFormalizacion: false, orden: 12 },
  { codigo: "DOM", etapa: "apartado", parte: "cliente", titulo: "Comprobante de domicilio — 3 meses (DOM)", requeridoApartado: true, requeridoFormalizacion: false, orden: 13 },
  { codigo: "CONST", etapa: "apartado", parte: "cliente", titulo: "Acta constitutiva (CONST)", requeridoApartado: false, requeridoFormalizacion: false, soloPersonaMoral: true, orden: 14 },
  { codigo: "PODER", etapa: "apartado", parte: "cliente", titulo: "Poder representante legal (PODER)", requeridoApartado: false, requeridoFormalizacion: false, soloPersonaMoral: true, orden: 15 },
  { codigo: "ID_APOD", etapa: "apartado", parte: "cliente", titulo: "IFE apoderado legal (ID APOD)", requeridoApartado: false, requeridoFormalizacion: false, soloPersonaMoral: true, orden: 16 },
  { codigo: "CONTRATO", etapa: "contrato", parte: "empresa", titulo: "Contrato de compra-venta (CONTRATO)", requeridoApartado: false, requeridoFormalizacion: true, orden: 17 },
  { codigo: "CONTRATO_ANEXO_A", etapa: "contrato", parte: "empresa", titulo: "Anexo A — Plano de ubicación", requeridoApartado: false, requeridoFormalizacion: true, orden: 18 },
  { codigo: "CONTRATO_ANEXO_B", etapa: "contrato", parte: "empresa", titulo: "Anexo B — Datos bancarios del vendedor", requeridoApartado: false, requeridoFormalizacion: true, orden: 19 },
  { codigo: "CONTRATO_ANEXO_C", etapa: "contrato", parte: "empresa", titulo: "Anexo C — Tabla de pagos", requeridoApartado: false, requeridoFormalizacion: true, orden: 20 },
  { codigo: "CONTRATO_ANEXO_D", etapa: "contrato", parte: "empresa", titulo: "Anexo D — Notarías", requeridoApartado: false, requeridoFormalizacion: true, orden: 21 },
  { codigo: "ESTACIONAMIENTOS", etapa: "contrato", parte: "empresa", titulo: "Estacionamientos", requeridoApartado: false, requeridoFormalizacion: true, orden: 22 },
  { codigo: "PAGARE", etapa: "contrato", parte: "empresa", titulo: "Pagaré (cuando aplique)", requeridoApartado: false, requeridoFormalizacion: false, opcionalCondicional: true, orden: 23 },
  { codigo: "ACUSE_R", etapa: "contrato", parte: "empresa", titulo: "Acuse recibo — Reglamentos (ACUSE R)", requeridoApartado: false, requeridoFormalizacion: false, opcionalCondicional: true, orden: 24 },
  { codigo: "ACUSE_C", etapa: "contrato", parte: "empresa", titulo: "Acuse recibo — Contrato (ACUSE C)", requeridoApartado: false, requeridoFormalizacion: false, opcionalCondicional: true, orden: 25 },
  { codigo: "A_NAC", etapa: "contrato", parte: "cliente", titulo: "Acta de nacimiento (A. NAC)", requeridoApartado: false, requeridoFormalizacion: true, orden: 26 },
  { codigo: "A_MAT", etapa: "contrato", parte: "cliente", titulo: "Acta de matrimonio (A. MAT)", requeridoApartado: false, requeridoFormalizacion: false, opcionalCondicional: true, orden: 27 },
  { codigo: "EDO_CTA", etapa: "contrato", parte: "cliente", titulo: "Estado de cuenta (EDO. CTA)", requeridoApartado: false, requeridoFormalizacion: true, orden: 28 },
  { codigo: "DEPOE", etapa: "contrato", parte: "cliente", titulo: "Comprobante depósito de enganche (DEPOE)", requeridoApartado: false, requeridoFormalizacion: true, orden: 29 },
  { codigo: "CANCEL_EMP", etapa: "cancelacion", parte: "empresa", titulo: "Solicitud cancelación (CANCEL)", requeridoApartado: false, requeridoFormalizacion: false, orden: 30 },
  { codigo: "REUB", etapa: "cancelacion", parte: "empresa", titulo: "Solicitud reubicación (REUB)", requeridoApartado: false, requeridoFormalizacion: false, orden: 31 },
  { codigo: "F_CANCEL", etapa: "cancelacion", parte: "cliente", titulo: "Formato cancelación (F. CANCEL)", requeridoApartado: false, requeridoFormalizacion: false, orden: 32 },
];

const CHECKLIST_POR_DESARROLLO: Record<string, ExpedienteChecklistItem[]> = {
  "pasaje-alamos": CHECKLIST_LA_CEIBA,
  "la-vista-residencial": CHECKLIST_LA_CEIBA,
};

/** Desarrollos sin catálogo propio usan plantilla La Ceiba. */
export const getExpedienteChecklist = (desarrolloId: string): ExpedienteChecklistItem[] =>
  CHECKLIST_POR_DESARROLLO[desarrolloId] ?? CHECKLIST_LA_CEIBA;

export const getChecklistItem = (desarrolloId: string, codigo: string) =>
  getExpedienteChecklist(desarrolloId).find((item) => item.codigo === codigo);

export const checklistEtapaLabel: Record<ExpedienteChecklistEtapa, string> = {
  apartado: "Apartado y oferta de compra",
  contrato: "Formalización de contrato y cierre",
  cancelacion: "Cancelación o reubicación",
};

export const checklistParteLabel: Record<ExpedienteChecklistParte, string> = {
  empresa: "Por parte de la empresa",
  cliente: "Por parte del cliente",
};

export type ExpedienteProgresoChecklist = {
  apartado: { completados: number; requeridos: number; pct: number };
  formalizacion: { completados: number; requeridos: number; pct: number };
  formalizacionCompleta: boolean;
  apartadoCompleto: boolean;
};

export const computeChecklistProgreso = (
  desarrolloId: string,
  codigosPresentes: Iterable<string>,
  options?: { personaMoral?: boolean },
): ExpedienteProgresoChecklist => {
  const present = new Set(codigosPresentes);
  const items = getExpedienteChecklist(desarrolloId).filter((item) => {
    if (item.soloPersonaMoral && !options?.personaMoral) {
      return false;
    }
    if (item.opcionalCondicional) {
      return false;
    }
    return true;
  });

  const apartadoReq = items.filter((i) => i.requeridoApartado);
  const formalReq = items.filter((i) => i.requeridoFormalizacion);

  const apartadoCompletados = apartadoReq.filter((i) => present.has(i.codigo)).length;
  const formalCompletados = formalReq.filter((i) => present.has(i.codigo)).length;

  return {
    apartado: {
      completados: apartadoCompletados,
      requeridos: apartadoReq.length,
      pct: apartadoReq.length ? Math.round((apartadoCompletados / apartadoReq.length) * 100) : 0,
    },
    formalizacion: {
      completados: formalCompletados,
      requeridos: formalReq.length,
      pct: formalReq.length ? Math.round((formalCompletados / formalReq.length) * 100) : 0,
    },
    apartadoCompleto: apartadoReq.length > 0 && apartadoCompletados === apartadoReq.length,
    formalizacionCompleta: formalReq.length > 0 && formalCompletados === formalReq.length,
  };
};

/** Compatibilidad con tipos legacy del MVP inicial. */
export const LEGACY_TIPO_TO_CODIGO: Record<string, string> = {
  identificacion: "ID",
  comprobante_domicilio: "DOM",
  contrato: "CONTRATO",
  solicitud_apartado: "OC",
  comprobante_pago: "DEPOE",
  rfc: "RFC",
  escritura: "CONTRATO",
};

export const resolveChecklistCodigo = (value: string) =>
  getChecklistItem("", value) ? value : LEGACY_TIPO_TO_CODIGO[value] ?? value;

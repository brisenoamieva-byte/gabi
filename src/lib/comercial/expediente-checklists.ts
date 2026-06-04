export type ExpedienteChecklistEtapa = "apartado" | "contrato" | "cancelacion";
export type ExpedienteChecklistParte = "empresa" | "cliente";
export type PersonaTipo = "fisica" | "moral";

export type ExpedienteChecklistItem = {
  codigo: string;
  etapa: ExpedienteChecklistEtapa;
  parte: ExpedienteChecklistParte;
  titulo: string;
  obligatorio: boolean;
  /** Requerido para solicitar comisión (formalización de venta). */
  requeridoComision: boolean;
  personaFisica: boolean;
  personaMoral: boolean;
  orden: number;
};

/** Checklist legal La Ceiba — base BBR para formalización de venta. */
export const CHECKLIST_LA_CEIBA: ExpedienteChecklistItem[] = [
  { codigo: "OC", etapa: "apartado", parte: "empresa", titulo: "Carta oferta de compra (OC)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 1 },
  { codigo: "ANEXO_A_DATOS", etapa: "apartado", parte: "empresa", titulo: "Manifestación de datos generales (Anexo A)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 2 },
  { codigo: "ANEXO_B_PAGO", etapa: "apartado", parte: "empresa", titulo: "Modalidad de pago (Anexo B)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 3 },
  { codigo: "SIMULADOR", etapa: "apartado", parte: "empresa", titulo: "Simulador de ventas", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 4 },
  { codigo: "ANEXO_C_DEPTO", etapa: "apartado", parte: "empresa", titulo: "Especificaciones del departamento (Anexo C)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 5 },
  { codigo: "ANEXO_D_MANT", etapa: "apartado", parte: "empresa", titulo: "Aceptación cuotas de mantenimiento (Anexo D)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 6 },
  { codigo: "ANEXO_E_PLD", etapa: "apartado", parte: "empresa", titulo: "Carta prevención lavado de dinero (Anexo E)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 7 },
  { codigo: "ANEXO_F_PRIV", etapa: "apartado", parte: "empresa", titulo: "Aviso de privacidad (Anexo F)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 8 },
  { codigo: "DEPOA", etapa: "apartado", parte: "cliente", titulo: "Comprobante depósito de apartado (DEPOA)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 9 },
  { codigo: "ID", etapa: "apartado", parte: "cliente", titulo: "Identificación oficial (ID)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 10 },
  { codigo: "CURP", etapa: "apartado", parte: "cliente", titulo: "CURP", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: false, orden: 11 },
  { codigo: "RFC", etapa: "apartado", parte: "cliente", titulo: "RFC (o RFC genérico)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 12 },
  { codigo: "DOM", etapa: "apartado", parte: "cliente", titulo: "Comprobante de domicilio (3 meses)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 13 },
  { codigo: "CONST", etapa: "apartado", parte: "cliente", titulo: "Acta constitutiva (CONST)", obligatorio: false, requeridoComision: false, personaFisica: false, personaMoral: true, orden: 14 },
  { codigo: "PODER", etapa: "apartado", parte: "cliente", titulo: "Poder representante legal (PODER)", obligatorio: false, requeridoComision: false, personaFisica: false, personaMoral: true, orden: 15 },
  { codigo: "ID_APOD", etapa: "apartado", parte: "cliente", titulo: "IFE apoderado legal (ID APOD)", obligatorio: false, requeridoComision: false, personaFisica: false, personaMoral: true, orden: 16 },
  { codigo: "CONTRATO", etapa: "contrato", parte: "empresa", titulo: "Contrato de compraventa (CONTRATO)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 17 },
  { codigo: "ANEXO_A_UBIC", etapa: "contrato", parte: "empresa", titulo: "Anexo A — Plano de ubicación", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 18 },
  { codigo: "ANEXO_B_BANCO", etapa: "contrato", parte: "empresa", titulo: "Anexo B — Datos bancarios del vendedor", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 19 },
  { codigo: "ANEXO_C_TABLA", etapa: "contrato", parte: "empresa", titulo: "Anexo C — Tabla de pagos", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 20 },
  { codigo: "ANEXO_D_NOT", etapa: "contrato", parte: "empresa", titulo: "Anexo D — Notarías", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 21 },
  { codigo: "ESTACIONAMIENTOS", etapa: "contrato", parte: "empresa", titulo: "Estacionamientos", obligatorio: true, requeridoComision: false, personaFisica: true, personaMoral: true, orden: 22 },
  { codigo: "PAGARE", etapa: "contrato", parte: "empresa", titulo: "Pagaré (cuando aplique)", obligatorio: false, requeridoComision: false, personaFisica: true, personaMoral: true, orden: 23 },
  { codigo: "ACUSE_R", etapa: "contrato", parte: "empresa", titulo: "Acuse recibo — Reglamentos", obligatorio: false, requeridoComision: false, personaFisica: true, personaMoral: true, orden: 24 },
  { codigo: "ACUSE_C", etapa: "contrato", parte: "empresa", titulo: "Acuse recibo — Contrato", obligatorio: false, requeridoComision: false, personaFisica: true, personaMoral: true, orden: 25 },
  { codigo: "A_NAC", etapa: "contrato", parte: "cliente", titulo: "Acta de nacimiento (A. NAC)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: false, orden: 26 },
  { codigo: "A_MAT", etapa: "contrato", parte: "cliente", titulo: "Acta de matrimonio (A. MAT)", obligatorio: false, requeridoComision: false, personaFisica: true, personaMoral: false, orden: 27 },
  { codigo: "EDO_CTA", etapa: "contrato", parte: "cliente", titulo: "Estado de cuenta (EDO. CTA)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 28 },
  { codigo: "DEPOE", etapa: "contrato", parte: "cliente", titulo: "Comprobante depósito de enganche (DEPOE)", obligatorio: true, requeridoComision: true, personaFisica: true, personaMoral: true, orden: 29 },
  { codigo: "CANCEL", etapa: "cancelacion", parte: "empresa", titulo: "Solicitud cancelación (empresa)", obligatorio: false, requeridoComision: false, personaFisica: true, personaMoral: true, orden: 30 },
  { codigo: "REUB", etapa: "cancelacion", parte: "empresa", titulo: "Solicitud reubicación (REUB)", obligatorio: false, requeridoComision: false, personaFisica: true, personaMoral: true, orden: 31 },
  { codigo: "F_CANCEL", etapa: "cancelacion", parte: "cliente", titulo: "Formato cancelación (F. CANCEL)", obligatorio: false, requeridoComision: false, personaFisica: true, personaMoral: true, orden: 32 },
];

const CHECKLIST_POR_DESARROLLO: Record<string, ExpedienteChecklistItem[]> = {
  "la-ceiba-bosque-urbano": CHECKLIST_LA_CEIBA,
  "pasaje-alamos": CHECKLIST_LA_CEIBA,
  "la-vista-residencial": CHECKLIST_LA_CEIBA,
};

export const getExpedienteChecklist = (desarrolloId: string): ExpedienteChecklistItem[] =>
  CHECKLIST_POR_DESARROLLO[desarrolloId] ?? CHECKLIST_LA_CEIBA;

export const getChecklistItem = (desarrolloId: string, codigo: string) =>
  getExpedienteChecklist(desarrolloId).find((item) => item.codigo === codigo);

export const etapaChecklistLabel: Record<ExpedienteChecklistEtapa, string> = {
  apartado: "Apartado y oferta de compra",
  contrato: "Formalización de contrato y cierre",
  cancelacion: "Cancelación o reubicación",
};

export const parteChecklistLabel: Record<ExpedienteChecklistParte, string> = {
  empresa: "Por parte de la empresa",
  cliente: "Por parte del cliente",
};

export const filterChecklistForPersona = (
  items: ExpedienteChecklistItem[],
  persona: PersonaTipo,
) =>
  items.filter((item) => (persona === "fisica" ? item.personaFisica : item.personaMoral));

export const computeChecklistProgreso = (
  items: ExpedienteChecklistItem[],
  codigosPresentes: Iterable<string>,
  options?: { soloComision?: boolean; persona?: PersonaTipo },
) => {
  const present = new Set(codigosPresentes);
  let filtered = items;
  if (options?.persona) {
    filtered = filterChecklistForPersona(filtered, options.persona);
  }
  if (options?.soloComision) {
    filtered = filtered.filter((item) => item.requeridoComision);
  } else {
    filtered = filtered.filter((item) => item.obligatorio);
  }

  const requeridos = filtered.length;
  const completados = filtered.filter((item) => present.has(item.codigo)).length;

  return {
    completados,
    requeridos,
    pct: requeridos ? Math.round((completados / requeridos) * 100) : 0,
    faltantes: filtered.filter((item) => !present.has(item.codigo)),
  };
};

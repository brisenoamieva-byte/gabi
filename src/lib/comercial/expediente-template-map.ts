import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

export type ExpedienteTemplateDef = {
  codigo: string;
  fileName: string;
  titulo: string;
};

const GAVIA_APARTADO_TEMPLATES: ExpedienteTemplateDef[] = [
  { codigo: "OC", fileName: "oferta-compra.docx", titulo: "Carta oferta de compra (OC)" },
  {
    codigo: "ANEXO_A_DATOS",
    fileName: "anexo-a-datos.docx",
    titulo: "Manifestación de datos generales (ANEXO A)",
  },
  {
    codigo: "ANEXO_B_PAGO",
    fileName: "anexo-b-pago.docx",
    titulo: "Modalidad de pago (ANEXO B)",
  },
  {
    codigo: "ANEXO_D_MANT",
    fileName: "anexo-d-mantenimiento.docx",
    titulo: "Aceptación cuotas de mantenimiento (ANEXO D)",
  },
  {
    codigo: "ANEXO_E_PLD",
    fileName: "anexo-e-pld.docx",
    titulo: "Carta prevención de lavado de dinero (ANEXO E)",
  },
  {
    codigo: "ANEXO_F_PRIV",
    fileName: "anexo-f-privacidad.docx",
    titulo: "Aviso de privacidad (ANEXO F)",
  },
];

const TEMPLATES_BY_DESARROLLO: Record<string, ExpedienteTemplateDef[]> = {
  [MISION_LA_GAVIA_DESARROLLO_ID]: GAVIA_APARTADO_TEMPLATES,
};

export const getApartadoTemplateDefs = (desarrolloId: string): ExpedienteTemplateDef[] =>
  TEMPLATES_BY_DESARROLLO[desarrolloId] ?? [];

export const canGenerateApartadoPack = (desarrolloId: string): boolean =>
  getApartadoTemplateDefs(desarrolloId).length > 0;

export const getExpedienteTemplateBaseDir = (desarrolloId: string): string | null => {
  if (desarrolloId === MISION_LA_GAVIA_DESARROLLO_ID) {
    return "mision-la-gavia";
  }
  return null;
};

/** Plantillas aprobadas en Meta Business Manager (WhatsApp > Message templates). */
export const WHATSAPP_TEMPLATE_PROSPECT = "gabi_lead_confirmacion_prospecto";
export const WHATSAPP_TEMPLATE_ASESOR = "gabi_lead_alerta_asesor";
export const WHATSAPP_TEMPLATE_COMPLIANCE = "gabi_crm_pendiente_asesor";

export const WHATSAPP_TEMPLATE_LANGUAGE = "es_MX";

export type WhatsAppTemplateTexts = {
  prospectBody: string;
  asesorBody: string;
  complianceBody: string;
};

/** Textos propuestos para registrar en Meta (deben coincidir con las variables {{1}}…). */
export const DEFAULT_WHATSAPP_TEMPLATE_TEXTS: WhatsAppTemplateTexts = {
  prospectBody:
    "Hola {{1}}, gracias por tu interés en {{2}}.\n\nRecibimos tu solicitud de información. En los próximos minutos {{3}} se pondrá en contacto contigo por este mismo canal.\n\nEquipo {{2}}",
  asesorBody:
    "Nuevo lead en {{1}}: {{2}} · Tel: {{3}} · Campaña: {{4}}.\n\nPor favor contacta en menos de 5 minutos.",
  complianceBody:
    "Hola {{1}}, tienes {{2}} paso(s) vencido(s) en {{3}}.\n\nPrioridad: {{4}}.\n\nActualiza tu CRM en GABI hoy.",
};

export const buildProspectFallbackMessage = (
  prospectNombre: string,
  desarrolloNombre: string,
  asesorNombre: string,
) =>
  `Hola ${prospectNombre}, gracias por tu interés en ${desarrolloNombre}.\n\nRecibimos tu solicitud. En los próximos minutos ${asesorNombre} se pondrá en contacto contigo.\n\nEquipo ${desarrolloNombre}`;

export const buildAsesorFallbackMessage = (
  desarrolloNombre: string,
  prospectNombre: string,
  prospectTelefono: string,
  campanaNombre: string,
  prospectoUrl: string,
) =>
  `Nuevo lead en ${desarrolloNombre}: ${prospectNombre} · Tel: ${prospectTelefono} · Campaña: ${campanaNombre}.\n\nContacta en menos de 5 min.\n${prospectoUrl}`;

export const buildComplianceFallbackMessage = (
  asesorNombre: string,
  overdueCount: number,
  desarrolloNombre: string,
  priorityLabel: string,
  misLeadsUrl: string,
) =>
  `Hola ${asesorNombre}, tienes ${overdueCount} paso(s) vencido(s) en ${desarrolloNombre}.\n\nPrioridad: ${priorityLabel}.\n\nActualiza tu CRM: ${misLeadsUrl}`;

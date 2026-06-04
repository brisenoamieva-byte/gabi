export const EXPEDIENTE_TIPOS = [
  "identificacion",
  "comprobante_domicilio",
  "contrato",
  "solicitud_apartado",
  "comprobante_pago",
  "rfc",
  "escritura",
  "otro",
] as const;

export type ExpedienteTipo = (typeof EXPEDIENTE_TIPOS)[number];

export const EXPEDIENTE_TIPOS_REQUERIDOS: ExpedienteTipo[] = [
  "identificacion",
  "comprobante_domicilio",
  "contrato",
  "solicitud_apartado",
  "comprobante_pago",
  "rfc",
  "escritura",
];

export const expedienteTipoLabel: Record<ExpedienteTipo, string> = {
  identificacion: "Identificación (INE / pasaporte)",
  comprobante_domicilio: "Comprobante de domicilio",
  contrato: "Contrato de compraventa",
  solicitud_apartado: "Solicitud / apartado firmado",
  comprobante_pago: "Comprobante de pago",
  rfc: "RFC / constancia fiscal",
  escritura: "Escritura / protocolización",
  otro: "Otro documento",
};

export const isExpedienteTipo = (value: string): value is ExpedienteTipo =>
  (EXPEDIENTE_TIPOS as readonly string[]).includes(value);

export const computeExpedienteProgreso = (tiposPresentes: Iterable<ExpedienteTipo>) => {
  const present = new Set(tiposPresentes);
  const requeridos = EXPEDIENTE_TIPOS_REQUERIDOS.length;
  const completados = EXPEDIENTE_TIPOS_REQUERIDOS.filter((tipo) => present.has(tipo)).length;
  return {
    completados,
    requeridos,
    pct: requeridos ? Math.round((completados / requeridos) * 100) : 0,
  };
};

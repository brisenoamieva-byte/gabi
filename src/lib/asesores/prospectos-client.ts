import type { ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

export const ETAPAS_ASESOR: ProspectoEtapa[] = [
  "nuevo",
  "contactado",
  "cita",
  "perdido",
];

export const prospectoEtapaEditableByAsesor = (etapa: string) =>
  etapa !== "apartado" &&
  etapa !== "vendido" &&
  etapa !== "cancelado" &&
  etapa !== "perdido";

/** Antes de apartado/vendido: el asesor puede cotizar y solicitar apartado a gerencia. */
export const prospectoAsesorPuedeCotizarOSolicitarApartado = (etapa: string) =>
  etapa !== "apartado" &&
  etapa !== "vendido" &&
  etapa !== "cancelado" &&
  etapa !== "perdido";

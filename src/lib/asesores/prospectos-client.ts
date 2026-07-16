import type { ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

export const ETAPAS_ASESOR: ProspectoEtapa[] = [
  "nuevo",
  "contactado",
  "cita",
  "visita",
  "perdido",
];

/** Etapa por defecto al rescatar un lead descartado. */
export const ETAPA_RESCATE_DEFAULT: ProspectoEtapa = "nuevo";

export const prospectoEtapaEditableByAsesor = (
  etapa: string,
  options?: { leadership?: boolean },
) => {
  if (etapa === "apartado" || etapa === "vendido" || etapa === "cancelado") {
    return false;
  }
  if (etapa === "perdido") {
    return Boolean(options?.leadership);
  }
  return true;
};

/** Antes de apartado/vendido: el asesor puede cotizar y solicitar apartado a gerencia. */
export const prospectoAsesorPuedeCotizarOSolicitarApartado = (etapa: string) =>
  etapa !== "apartado" &&
  etapa !== "vendido" &&
  etapa !== "cancelado" &&
  etapa !== "perdido";

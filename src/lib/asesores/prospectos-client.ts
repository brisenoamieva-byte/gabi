import type { ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

export const ETAPAS_ASESOR: ProspectoEtapa[] = [
  "nuevo",
  "contactado",
  "cita",
  "negociacion",
  "perdido",
];

export const prospectoEtapaEditableByAsesor = (etapa: string) =>
  etapa !== "apartado" && etapa !== "vendido";

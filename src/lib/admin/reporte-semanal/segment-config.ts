import {
  LA_VISTA_RESIDENCIAL_ID,
  LA_VISTA_SEMBRADO_SEGMENTOS,
  PASAJE_ALAMOS_ID,
  PASAJE_SEMBRADO_SEGMENTOS,
} from "@/lib/comercial/sembrado-status";

export type ReporteSemanalSegmentConfig = {
  id: string;
  label: string;
  clusterId: string;
  /** Para resumen Pasaje: deptos vs oficinas */
  resumenKey?: "departamentos" | "oficinas";
};

const PASAJE_SEGMENTS: ReporteSemanalSegmentConfig[] = Object.values(PASAJE_SEMBRADO_SEGMENTOS).map(
  (item) => ({
    id: item.id,
    label: item.label,
    clusterId: item.clusterId,
    resumenKey: item.id as "departamentos" | "oficinas",
  }),
);

const LA_VISTA_SEGMENTS: ReporteSemanalSegmentConfig[] = Object.values(
  LA_VISTA_SEMBRADO_SEGMENTOS,
).map((item) => ({
  id: item.id,
  label: item.label,
  clusterId: item.clusterId,
}));

/** Desarrollos con reporte semanal estructurado por segmentos. */
export const REPORTE_SEMANAL_DESARROLLOS = [PASAJE_ALAMOS_ID, LA_VISTA_RESIDENCIAL_ID] as const;

export function getReporteSemanalSegments(
  desarrolloId: string,
): ReporteSemanalSegmentConfig[] | null {
  if (desarrolloId === PASAJE_ALAMOS_ID) {
    return PASAJE_SEGMENTS;
  }
  if (desarrolloId === LA_VISTA_RESIDENCIAL_ID) {
    return LA_VISTA_SEGMENTS;
  }
  return null;
}

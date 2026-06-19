import {
  getReporteSemanalDesarrolloIds,
  getSembradoSegmentsForDesarrollo,
  hasSegmentedReporteSemanal,
} from "@/lib/catalog/desarrollos-registry";

export type ReporteSemanalSegmentConfig = {
  id: string;
  label: string;
  clusterId: string;
  /** Para resumen Pasaje: deptos vs oficinas */
  resumenKey?: "departamentos" | "oficinas";
};

/** Desarrollos con reporte semanal estructurado por segmentos. */
export const REPORTE_SEMANAL_DESARROLLOS = getReporteSemanalDesarrolloIds();

export function getReporteSemanalSegments(
  desarrolloId: string,
): ReporteSemanalSegmentConfig[] | null {
  if (!hasSegmentedReporteSemanal(desarrolloId)) {
    return null;
  }

  const segments = getSembradoSegmentsForDesarrollo(desarrolloId);
  if (!segments.length) {
    return null;
  }

  return segments.map((segment) => ({
    id: segment.id,
    label: segment.label,
    clusterId: segment.clusterId,
    resumenKey: segment.resumenKey,
  }));
}

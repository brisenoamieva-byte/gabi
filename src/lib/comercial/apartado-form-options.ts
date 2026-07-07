import { getSembradoSegmentsForDesarrollo } from "@/lib/catalog/desarrollos-registry";
import type { SembradoUnidadRow } from "@/lib/comercial/sembrado-status";

/** Medios publicitarios normalizados para CRM / sembrado (reporte semanal). */
export const MEDIO_PUBLICITARIO_OPTIONS = [
  "Contacto Directo",
  "Facebook",
  "Instagram",
  "Tik Tok",
  "Página Web/GOOGLE",
  "Inmobiliarias/Asesor Externo",
  "Eventos/Promociones",
  "Crosseling",
  "Espectacular",
  "Portales",
  "Oficina de Ventas",
  "Referido",
  "Medios Digitales",
  "Pase",
] as const;

export const EQUIPO_VENTA_OPTIONS = [
  { value: "Interno (BBR)", label: "Interno (BBR)" },
  { value: "Externo", label: "Externo" },
] as const;

export const PROMOTOR_ASESOR_OTRO = "__otro__";

const MEDIO_ALIASES: Record<string, string> = {
  "contacto-directo": "Contacto Directo",
  "contacto directo": "Contacto Directo",
  referido: "Referido",
  "medios-digitales": "Medios Digitales",
  pase: "Pase",
  "inmobiliaria-externo": "Inmobiliarias/Asesor Externo",
  espectacular: "Espectacular",
  "cross-selling": "Crosseling",
  crosseling: "Crosseling",
  facebook: "Facebook",
  instagram: "Instagram",
};

export const normalizeMedioPublicitarioSelect = (raw: string | null | undefined): string => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return "";
  }

  const alias = MEDIO_ALIASES[trimmed.toLowerCase()];
  if (alias) {
    return alias;
  }

  const match = MEDIO_PUBLICITARIO_OPTIONS.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase(),
  );
  return match ?? trimmed;
};

export const normalizeEquipoVentaSelect = (raw: string | null | undefined): string => {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) {
    return "";
  }
  if (value.includes("interno") || value === "bbr" || value.includes("equipo interno")) {
    return "Interno (BBR)";
  }
  if (value.includes("externo") || value.includes("inmobiliar")) {
    return "Externo";
  }
  return raw!.trim();
};

export const resolveSembradoSegmentIdForUnidad = (
  desarrolloId: string,
  row: Pick<SembradoUnidadRow, "clusterId" | "tipo">,
): string | null => {
  const segments = getSembradoSegmentsForDesarrollo(desarrolloId);
  const byCluster = segments.find((segment) => segment.clusterId === row.clusterId);
  if (byCluster) {
    return byCluster.id;
  }
  const byTipo = segments.find((segment) => segment.tipo === row.tipo);
  return byTipo?.id ?? null;
};

export const filterUnidadesBySembradoSegment = (
  unidades: SembradoUnidadRow[],
  desarrolloId: string,
  segmentId: string,
): SembradoUnidadRow[] => {
  if (!segmentId) {
    return unidades;
  }

  const segment = getSembradoSegmentsForDesarrollo(desarrolloId).find(
    (item) => item.id === segmentId,
  );
  if (!segment) {
    return unidades;
  }

  return unidades.filter((row) => row.clusterId === segment.clusterId);
};

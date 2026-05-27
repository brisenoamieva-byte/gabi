import type { DisponibilidadUnidad } from "@/lib/data";
import { formatAreaM2 } from "@/lib/format/money";

export type ProductoRecomendadoRecord = {
  id: string;
  desarrollo_id: string;
  cluster_id: string;
  unidad: string;
  tipo: DisponibilidadUnidad["tipo"];
  estatus: DisponibilidadUnidad["estatus"];
  prototipo_id: string | null;
  precio: number | null;
  superficie_m2: number | null;
  superficie_terreno_m2: number | null;
  superficie_construccion_m2: number | null;
  superficie_interna_m2?: number | null;
  superficie_externa_m2?: number | null;
  superficie_bodega_m2?: number | null;
  cajones?: number | null;
  entrega: string | null;
  etapa: string | null;
  torre: string | null;
  nivel: string | null;
  notas: string | null;
  orden: number;
  visitable: boolean;
  prioridad_comercial: DisponibilidadUnidad["prioridadComercial"];
  razones_venta: string[];
  ubicacion_comercial: string | null;
  instruccion_recorrido: string | null;
  nota_acceso: string | null;
  activo: boolean;
  updated_at: string;
};

export type ProductoRecomendadoInput = {
  desarrolloId: string;
  clusterId: string;
  unidad: string;
  tipo: DisponibilidadUnidad["tipo"];
  estatus?: DisponibilidadUnidad["estatus"];
  prototipoId?: string | null;
  precio?: number | null;
  superficieTerrenoM2?: number | null;
  superficieConstruccionM2?: number | null;
  entrega?: string | null;
  etapa?: string | null;
  torre?: string | null;
  nivel?: string | null;
  notas?: string | null;
  orden?: number;
  visitable?: boolean;
  prioridadComercial?: DisponibilidadUnidad["prioridadComercial"];
  razonesVenta?: string[];
  ubicacionComercial?: string | null;
  instruccionRecorrido?: string | null;
  notaAcceso?: string | null;
};

const resolveLegacySuperficie = (row: ProductoRecomendadoRecord) => {
  const terreno = row.superficie_terreno_m2 ?? undefined;
  const construccion = row.superficie_construccion_m2 ?? undefined;
  const legacy = row.superficie_m2 ?? undefined;

  if (row.tipo === "terreno") {
    return {
      superficieTerrenoM2: terreno ?? legacy,
      superficieConstruccionM2: construccion,
      superficieM2: terreno ?? legacy,
    };
  }

  if (row.tipo === "departamento") {
    return {
      superficieTerrenoM2: terreno,
      superficieConstruccionM2: construccion ?? legacy,
      superficieM2: construccion ?? legacy,
    };
  }

  return {
    superficieTerrenoM2: terreno ?? legacy,
    superficieConstruccionM2: construccion ?? legacy,
    superficieM2: construccion ?? terreno ?? legacy,
  };
};

export const formatSuperficiesLabel = (unit: Pick<
  DisponibilidadUnidad,
  "tipo" | "superficieTerrenoM2" | "superficieConstruccionM2" | "superficieM2"
>) => {
  const terreno = unit.superficieTerrenoM2;
  const construccion = unit.superficieConstruccionM2;
  const legacy = unit.superficieM2;

  if (unit.tipo === "terreno") {
    const value = terreno ?? legacy;
    const formatted = formatAreaM2(value);
    return formatted ? `${formatted} terreno` : "";
  }

  if (unit.tipo === "departamento") {
    const value = construccion ?? legacy;
    const formatted = formatAreaM2(value);
    return formatted ? `${formatted} construcción` : "";
  }

  const parts: string[] = [];
  const terrenoValue = terreno ?? (legacy && !construccion ? legacy : undefined);
  const construccionValue = construccion ?? (legacy && terreno ? legacy : legacy);

  const terrenoLabel = formatAreaM2(terrenoValue);
  if (terrenoLabel) {
    parts.push(`${terrenoLabel} terreno`);
  }
  const construccionLabel = formatAreaM2(construccionValue);
  if (construccionLabel && construccionValue !== terrenoValue) {
    parts.push(`${construccionLabel} construcción`);
  } else if (construccion && !terreno) {
    const solo = formatAreaM2(construccion);
    if (solo) {
      parts.push(`${solo} construcción`);
    }
  }

  return parts.join(" · ");
};

export const mapProductoRecomendadoToUnidad = (
  row: ProductoRecomendadoRecord,
): DisponibilidadUnidad => {
  const superficies = resolveLegacySuperficie(row);

  return {
    id: row.id,
    clusterId: row.cluster_id,
    unidad: row.unidad,
    tipo: row.tipo,
    estatus: row.estatus,
    prototipoId: row.prototipo_id ?? undefined,
    precio: row.precio ?? undefined,
    ...superficies,
    superficieInternaM2: row.superficie_interna_m2 ?? undefined,
    superficieExternaM2: row.superficie_externa_m2 ?? undefined,
    superficieBodegaM2: row.superficie_bodega_m2 ?? undefined,
    cajones: row.cajones ?? undefined,
    entrega: row.entrega ?? undefined,
    etapa: row.etapa ?? undefined,
    torre: row.torre ?? undefined,
    nivel: row.nivel ?? undefined,
    notas: row.notas ?? undefined,
    orden: row.orden,
    visitable: row.visitable,
    prioridadComercial: row.prioridad_comercial,
    razonesVenta: row.razones_venta ?? [],
    ubicacionComercial: row.ubicacion_comercial ?? undefined,
    instruccionRecorrido: row.instruccion_recorrido ?? undefined,
    notaAcceso: row.nota_acceso ?? undefined,
    x: 0,
    y: 0,
  };
};

export const parseRazonesVenta = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const syncSuperficieLegacyFields = (
  tipo: DisponibilidadUnidad["tipo"],
  terreno: number | null | undefined,
  construccion: number | null | undefined,
) => {
  if (tipo === "terreno") {
    return {
      superficie_terreno_m2: terreno ?? null,
      superficie_construccion_m2: null,
      superficie_m2: terreno ?? null,
    };
  }

  if (tipo === "departamento") {
    return {
      superficie_terreno_m2: null,
      superficie_construccion_m2: construccion ?? null,
      superficie_m2: construccion ?? null,
    };
  }

  return {
    superficie_terreno_m2: terreno ?? null,
    superficie_construccion_m2: construccion ?? null,
    superficie_m2: construccion ?? terreno ?? null,
  };
};

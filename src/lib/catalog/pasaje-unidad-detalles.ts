import { pasajeAlamosDisponibilidades } from "@/lib/catalog/pasaje-alamos.generated";
import type { DisponibilidadUnidad } from "@/lib/data";

const pasajeById = new Map(
  pasajeAlamosDisponibilidades.map((unit) => [unit.id, unit]),
);

const pasajeByClusterUnidad = new Map(
  pasajeAlamosDisponibilidades.map((unit) => [
    `${unit.clusterId}:${unit.unidad}`,
    unit,
  ]),
);

/** Completa superficies y cajones desde el catálogo Pasaje cuando Supabase no tiene migración 017. */
export const enrichPasajeUnidad = (
  unit: DisponibilidadUnidad,
): DisponibilidadUnidad => {
  const catalog =
    pasajeById.get(unit.id) ??
    pasajeByClusterUnidad.get(`${unit.clusterId}:${unit.unidad}`);

  if (!catalog) {
    return unit;
  }

  return {
    ...unit,
    precio: unit.precio ?? catalog.precio,
    superficieInternaM2: unit.superficieInternaM2 ?? catalog.superficieInternaM2,
    superficieExternaM2: unit.superficieExternaM2 ?? catalog.superficieExternaM2,
    superficieBodegaM2: unit.superficieBodegaM2 ?? catalog.superficieBodegaM2,
    superficieConstruccionM2:
      unit.superficieConstruccionM2 ?? catalog.superficieConstruccionM2,
    cajones: unit.cajones ?? catalog.cajones,
    nivel: unit.nivel ?? catalog.nivel,
  };
};

export const enrichPasajeInventario = (
  units: DisponibilidadUnidad[],
  desarrolloId?: string,
): DisponibilidadUnidad[] => {
  if (desarrolloId !== "pasaje-alamos") {
    return units;
  }
  return units.map(enrichPasajeUnidad);
};

/** Superficie total = interna + terraza/balcón + bodega (cuando hay desglose). */
export const computePasajeSuperficieTotalM2 = (
  unit?: Pick<
    DisponibilidadUnidad,
    | "superficieInternaM2"
    | "superficieExternaM2"
    | "superficieBodegaM2"
    | "superficieConstruccionM2"
  > | null,
): number | null => {
  if (!unit) {
    return null;
  }

  const interna = unit.superficieInternaM2 ?? 0;
  const externa = unit.superficieExternaM2 ?? 0;
  const bodega = unit.superficieBodegaM2 ?? 0;

  if (interna > 0 || externa > 0) {
    const total = interna + externa + bodega;
    return total > 0 ? Math.round(total * 100) / 100 : null;
  }

  const base = unit.superficieConstruccionM2;
  if (base != null && base > 0) {
    return Math.round((base + bodega) * 100) / 100;
  }

  return bodega > 0 ? bodega : null;
};

import type { DisponibilidadUnidad, Prototipo } from "@/lib/data";

export const isUnidadEnVenta = (unit: DisponibilidadUnidad): boolean =>
  unit.estatus === "disponible" || unit.estatus === "apartado";

export const getUnidadesPorPrototipo = (
  inventario: DisponibilidadUnidad[],
  prototipoId: string,
  options?: { soloEnVenta?: boolean },
): DisponibilidadUnidad[] => {
  const soloEnVenta = options?.soloEnVenta ?? true;

  return inventario
    .filter((unit) => unit.prototipoId === prototipoId)
    .filter((unit) => !soloEnVenta || isUnidadEnVenta(unit))
    .sort((a, b) => {
      const precioA = a.precio ?? Number.POSITIVE_INFINITY;
      const precioB = b.precio ?? Number.POSITIVE_INFINITY;
      if (precioA !== precioB) {
        return precioA - precioB;
      }
      const nivelA = a.nivelOrden ?? 0;
      const nivelB = b.nivelOrden ?? 0;
      if (nivelA !== nivelB) {
        return nivelA - nivelB;
      }
      return a.unidad.localeCompare(b.unidad, "es");
    });
};

export const getPrecioDesdePrototipo = (
  prototipo: Prototipo,
  unidades: DisponibilidadUnidad[],
): number => {
  const precios = unidades
    .map((unit) => unit.precio)
    .filter((precio): precio is number => typeof precio === "number" && precio > 0);

  if (precios.length) {
    return Math.min(...precios);
  }

  return prototipo.precioFinal || prototipo.precioBase;
};

export const prototipoTieneVariosPrecios = (unidades: DisponibilidadUnidad[]): boolean => {
  const precios = new Set(
    unidades
      .map((unit) => unit.precio)
      .filter((precio): precio is number => typeof precio === "number" && precio > 0),
  );
  return precios.size > 1;
};

export const prototipoMuestraPrecioDesde = (unidades: DisponibilidadUnidad[]): boolean =>
  unidades.length > 1 || prototipoTieneVariosPrecios(unidades);

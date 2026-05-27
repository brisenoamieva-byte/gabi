import {
  clusters as fallbackClusters,
  formatPrice,
  getDisponibilidadesByCluster,
  getPrototipoById,
  getPrototiposByCluster,
  type Cluster,
  type DisponibilidadUnidad,
  type Prototipo,
} from "@/lib/data";
import { roundMoney } from "@/lib/format/money";

export type CotizadorCatalog = {
  clusters: Cluster[];
  prototipos: Prototipo[];
};

export type CotizadorEsquema = "mensualidades" | "contado";

export type CotizadorRules = {
  enganchePct: number;
  apartado: number;
  descuentoStep: number;
  esquemas: CotizadorEsquema[];
};

export const cotizadorRulesByDesarrollo: Record<string, CotizadorRules> = {
  "la-vista-residencial": {
    enganchePct: 0.1,
    apartado: 50000,
    descuentoStep: 5000,
    esquemas: ["mensualidades", "contado"],
  },
  "pasaje-alamos": {
    enganchePct: 0.3,
    apartado: 50000,
    descuentoStep: 5000,
    esquemas: ["mensualidades", "contado"],
  },
};

export const defaultCotizadorRules: CotizadorRules = {
  enganchePct: 0.1,
  apartado: 50000,
  descuentoStep: 5000,
  esquemas: ["mensualidades", "contado"],
};

export type CotizacionInput = {
  desarrolloId: string;
  clusterId: string;
  prototipoId?: string;
  unidadId?: string;
  descuento: number;
  esquema: CotizadorEsquema;
  /** Inventario del cluster (Supabase o fallback local). */
  inventarioUnidades?: DisponibilidadUnidad[];
  /** Catálogo del desarrollo (Supabase o fallback). */
  catalog?: CotizadorCatalog;
};

export type CotizacionResult = {
  precioLista: number;
  bonoMaximo: number;
  descuento: number;
  precioFinal: number;
  enganche: number;
  apartado: number;
  saldoEnganche: number;
  esquema: CotizadorEsquema;
  clusterNombre: string;
  prototipoNombre: string;
  unidadNombre?: string;
  entrega?: string;
};

export const getCotizadorRules = (desarrolloId: string) =>
  cotizadorRulesByDesarrollo[desarrolloId] ?? defaultCotizadorRules;

const findCluster = (clusterId: string, catalog?: CotizadorCatalog) =>
  catalog?.clusters.find((item) => item.id === clusterId) ??
  fallbackClusters.find((item) => item.id === clusterId);

const findPrototipo = (prototipoId: string, catalog?: CotizadorCatalog) =>
  catalog?.prototipos.find((item) => item.id === prototipoId) ??
  getPrototipoById(prototipoId);

export const resolveCotizacionPricing = (
  clusterId: string,
  prototipoId?: string,
  unidadId?: string,
  inventarioUnidades?: DisponibilidadUnidad[],
  catalog?: CotizadorCatalog,
) => {
  const units = inventarioUnidades ?? getDisponibilidadesByCluster(clusterId);
  const unidad = unidadId ? units.find((item) => item.id === unidadId) : undefined;

  const resolvedPrototipoId = prototipoId || unidad?.prototipoId || "";
  const prototipo = resolvedPrototipoId
    ? findPrototipo(resolvedPrototipoId, catalog)
    : undefined;
  const precioLista = unidad?.precio ?? prototipo?.precioBase ?? 0;
  const bonoMaximo = prototipo?.bonoMaximo ?? 0;

  return { prototipo, unidad, precioLista, bonoMaximo };
};

export const computeCotizacion = (input: CotizacionInput): CotizacionResult | null => {
  const cluster = findCluster(input.clusterId, input.catalog);
  if (!cluster) {
    return null;
  }

  const { prototipo, unidad, precioLista, bonoMaximo } = resolveCotizacionPricing(
    input.clusterId,
    input.prototipoId,
    input.unidadId,
    input.inventarioUnidades,
    input.catalog,
  );

  if (!precioLista || (!prototipo && !unidad)) {
    return null;
  }

  const rules = getCotizadorRules(input.desarrolloId);
  const descuento = roundMoney(Math.min(Math.max(0, input.descuento), bonoMaximo));
  const precioFinal = roundMoney(Math.max(0, precioLista - descuento));
  const enganche = roundMoney(precioFinal * rules.enganchePct);
  const saldoEnganche = roundMoney(Math.max(enganche - rules.apartado, 0));

  const tipoLabel =
    unidad?.tipo === "terreno"
      ? "Terreno"
      : unidad?.tipo === "casa"
        ? "Casa"
        : unidad?.tipo === "departamento"
          ? "Departamento"
          : "Unidad";

  return {
    precioLista: roundMoney(precioLista),
    bonoMaximo: roundMoney(bonoMaximo),
    descuento,
    precioFinal,
    enganche,
    apartado: roundMoney(rules.apartado),
    saldoEnganche,
    esquema: input.esquema,
    clusterNombre: cluster.nombre,
    prototipoNombre: prototipo?.nombre ?? tipoLabel,
    unidadNombre: unidad?.unidad,
    entrega: unidad?.entrega ?? prototipo?.entrega,
  };
};

export const getUnidadesCotizables = (
  clusterId: string,
  inventarioUnidades?: DisponibilidadUnidad[],
): DisponibilidadUnidad[] => {
  const units = inventarioUnidades ?? getDisponibilidadesByCluster(clusterId);
  return units.filter((unit) => unit.estatus === "disponible" && unit.visitable);
};

export const getPrototiposCotizables = (
  clusterId: string,
  catalog?: CotizadorCatalog,
): Prototipo[] => {
  const list = catalog
    ? catalog.prototipos.filter((item) => item.clusterId === clusterId)
    : getPrototiposByCluster(clusterId);

  return list.filter((item) => item.activo && !item.soldOut);
};

export const buildCotizacionSummary = (
  cotizacion: CotizacionResult,
  desarrolloNombre: string,
  clienteNombre?: string,
  desarrolloId = "la-vista-residencial",
) => {
  const rules = getCotizadorRules(desarrolloId);
  const lines = [
    `Cotización gabi · ${desarrolloNombre}`,
    clienteNombre ? `Cliente: ${clienteNombre}` : null,
    `Cluster: ${cotizacion.clusterNombre}`,
    `Producto: ${cotizacion.prototipoNombre}`,
    cotizacion.unidadNombre ? `Unidad: ${cotizacion.unidadNombre}` : null,
    cotizacion.entrega ? `Entrega: ${cotizacion.entrega}` : null,
    "",
    `Precio lista: ${formatPrice(cotizacion.precioLista)}`,
    cotizacion.descuento > 0
      ? `Descuento: −${formatPrice(cotizacion.descuento)}`
      : null,
    `Precio final: ${formatPrice(cotizacion.precioFinal)}`,
    "",
    `Enganche (${Math.round(rules.enganchePct * 100)}%): ${formatPrice(cotizacion.enganche)}`,
    `Apartado: ${formatPrice(cotizacion.apartado)}`,
    `Saldo enganche: ${formatPrice(cotizacion.saldoEnganche)}`,
    `Esquema: ${cotizacion.esquema === "mensualidades" ? "Mensualidades" : "Contado"}`,
  ].filter(Boolean);

  return lines.join("\n");
};

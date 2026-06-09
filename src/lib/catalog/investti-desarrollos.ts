import type { Cluster, Desarrollo } from "@/lib/data";
import { getCorredorDesarrolloById } from "@/lib/corredor/zona-sur-seed";
import { isInvesttiSimuladorDesarrollo } from "@/lib/corredor/investti-simulador";

/** Desarrollos Grupo Investti en catálogo gabi (recorrido + cotizador). */
export const INVESTTI_CATALOG_DESARROLLO_IDS = [
  "canadas-del-valle",
  "canadas-del-arroyo",
  "simate",
  "canadas-la-porta",
] as const;

export type InvesttiCatalogDesarrolloId = (typeof INVESTTI_CATALOG_DESARROLLO_IDS)[number];

export function isInvesttiCatalogDesarrollo(
  desarrolloId: string | null | undefined,
): desarrolloId is InvesttiCatalogDesarrolloId {
  return (
    typeof desarrolloId === "string" &&
    (INVESTTI_CATALOG_DESARROLLO_IDS as readonly string[]).includes(desarrolloId)
  );
}

export function investtiCatalogHasSimulador(desarrolloId: string): boolean {
  return isInvesttiSimuladorDesarrollo(desarrolloId);
}

const INVESTTI_BRAND = {
  desarrollador: "Grupo Investti",
  comercializador: "BBR Habitarea",
  desarrolladorLogo: "/corredor/desarrolladores/investti.jpg",
  colorPrincipal: "#13315C",
  colorAcento: "#6cc24a",
  crm: { provider: "none" as const, enabled: false },
};

function corredorToDesarrollo(
  id: InvesttiCatalogDesarrolloId,
  overrides?: Partial<Desarrollo>,
): Desarrollo {
  const corredor = getCorredorDesarrolloById(id);
  if (!corredor) {
    throw new Error(`Desarrollo corredor no encontrado: ${id}`);
  }
  return {
    id,
    nombre: corredor.nombre,
    slug: id,
    ubicacion: corredor.mapQuery ?? "Corregidora, Querétaro",
    descripcion: corredor.notas ?? `Terrenos ${corredor.nombre} · Grupo Investti.`,
    precioDesde: corredor.ticketDesde,
    tiposProducto: ["terrenos"],
    estado: "activo",
    brochurePdf: corredor.brochureUrl,
    ...INVESTTI_BRAND,
    ...overrides,
  };
}

const canadasLaPortaDesarrollo: Desarrollo = {
  id: "canadas-la-porta",
  nombre: "Cañadas La Porta",
  slug: "canadas-la-porta",
  ubicacion: "Corregidora, Querétaro",
  descripcion:
    "Desarrollo de terrenos Grupo Investti. Comercialización BBR Habitarea — validar metrajes y lista vigente con Control Gerencia.",
  precioDesde: 900_000,
  tiposProducto: ["terrenos"],
  estado: "activo",
  ...INVESTTI_BRAND,
};

export const investtiCatalogDesarrollos: Desarrollo[] = [
  corredorToDesarrollo("canadas-del-valle"),
  corredorToDesarrollo("canadas-del-arroyo"),
  corredorToDesarrollo("simate"),
  canadasLaPortaDesarrollo,
];

export const investtiCatalogClusters: Cluster[] = investtiCatalogDesarrollos.map((d) => ({
  id: `${d.id}-terrenos`,
  nombre: "Terrenos",
  slug: "terrenos",
  desarrolloId: d.id,
  tipo: "terrenos" as const,
  totalViviendas: 0,
  descripcion: "Lotes residenciales · simulador oficial Investti en cotización",
  precioDesde: d.precioDesde,
  entregaGeneral: "Por confirmar",
  amenidades: [],
  fotoPortada: "",
  logo: d.desarrolladorLogo ?? "",
  activo: true,
  brochurePdf: d.brochurePdf,
}));

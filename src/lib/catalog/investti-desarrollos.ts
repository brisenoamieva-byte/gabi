import type { Cluster, Desarrollo } from "@/lib/data";
import { getCorredorDesarrolloById } from "@/lib/corredor/zona-sur-seed";
import { getDesarrolloLogoUrl } from "@/lib/corredor/desarrollo-logos";
import { INVESTTI_SIMULADOR_CONFIG } from "@/lib/corredor/investti-simulador-config.generated";
import { isInvesttiSimuladorDesarrollo } from "@/lib/corredor/investti-simulador";
import {
  INVESTTI_DESARROLLO_LOGOS,
  INVESTTI_DESARROLLO_PORTADAS,
  INVESTTI_TARJETAS_PROCESO,
} from "@/lib/catalog/investti-recorrido-data";

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

/** Precio lista mínimo del Excel maestro Investti (feb 2026). */
export function getInvesttiSimuladorPrecioDesde(
  desarrolloId: InvesttiCatalogDesarrolloId,
): number {
  const lista = INVESTTI_SIMULADOR_CONFIG.stats.precioDesdeLista?.[desarrolloId];
  if (typeof lista === "number" && lista > 0) {
    return Math.floor(lista);
  }
  const corredor = getCorredorDesarrolloById(desarrolloId);
  return corredor?.ticketDesde ?? 0;
}

/** Sobrescribe catálogo remoto (Supabase) con lista y logo del simulador oficial. */
export function applyInvesttiDesarrolloCatalogDefaults<
  T extends { id: string; precioDesde?: number; logo?: string },
>(desarrollo: T): T {
  if (!isInvesttiCatalogDesarrollo(desarrollo.id)) {
    return desarrollo;
  }
  const id = desarrollo.id as InvesttiCatalogDesarrolloId;
  return {
    ...desarrollo,
    precioDesde: getInvesttiSimuladorPrecioDesde(id),
    logo: INVESTTI_DESARROLLO_LOGOS[id],
  };
}

/** Logo corporativo Grupo Investti (simulador, cotizador, recorrido). */
export const INVESTTI_GRUPO_LOGO = "/corredor/desarrolladores/investti.jpg";

/** Logo oficial del desarrollo Investti (simulador y PDF). */
export function getInvesttiDesarrolloLogo(desarrolloId: string): string {
  if (isInvesttiCatalogDesarrollo(desarrolloId)) {
    return INVESTTI_DESARROLLO_LOGOS[desarrolloId];
  }
  return INVESTTI_GRUPO_LOGO;
}

const INVESTTI_BRAND = {
  desarrollador: "Grupo Investti",
  comercializador: "BBR Habitarea",
  desarrolladorLogo: INVESTTI_GRUPO_LOGO,
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
  const logo = INVESTTI_DESARROLLO_LOGOS[id];
  const portada = INVESTTI_DESARROLLO_PORTADAS[id];
  return {
    id,
    nombre: corredor.nombre,
    slug: id,
    ubicacion: corredor.mapQuery ?? "Corregidora, Querétaro",
    descripcion: corredor.notas ?? `Terrenos ${corredor.nombre} · Grupo Investti.`,
    precioDesde: getInvesttiSimuladorPrecioDesde(id),
    tiposProducto: ["terrenos"],
    estado: "activo",
    logo,
    masterPlanImage: portada,
    brochurePdf: corredor.brochureUrl,
    tarjetasProcesoPdf: INVESTTI_TARJETAS_PROCESO[id],
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
  precioDesde: getInvesttiSimuladorPrecioDesde("canadas-la-porta"),
  tiposProducto: ["terrenos"],
  estado: "activo",
  logo: INVESTTI_DESARROLLO_LOGOS["canadas-la-porta"],
  masterPlanImage: INVESTTI_DESARROLLO_PORTADAS["canadas-la-porta"],
  tarjetasProcesoPdf: INVESTTI_TARJETAS_PROCESO["canadas-la-porta"],
  ...INVESTTI_BRAND,
};

export const investtiCatalogDesarrollos: Desarrollo[] = [
  corredorToDesarrollo("canadas-del-valle", {
    descripcion:
      "80+ ha en El Patol · 2,200 lotes · 30+ amenidades. Etapa 1 160–250 m² + premium vista cañada. Líder del corredor sur: 15 lotes/mes.",
  }),
  corredorToDesarrollo("canadas-del-arroyo", {
    descripcion:
      "538 lotes Reserva · km 6.4 Metropolitano · 160–342 m². Fibra óptica y 15+ amenidades. 2.ª absorción del corredor: 7.8 lotes/mes.",
  }),
  corredorToDesarrollo("simate", {
    descripcion:
      "312 lotes · pie del Cimatario · 180–400 m². Casa club operativa · 23,000 m² verdes. Naturaleza premium en acceso Noria.",
  }),
  canadasLaPortaDesarrollo,
];

export const investtiCatalogClusters: Cluster[] = investtiCatalogDesarrollos.map((d) => {
  const corredor = getCorredorDesarrolloById(d.id);
  const projectLogo = getDesarrolloLogoUrl({ id: d.id }) ?? d.logo ?? "";
  const portada =
    INVESTTI_DESARROLLO_PORTADAS[d.id as InvesttiCatalogDesarrolloId] ?? projectLogo;
  return {
    id: `${d.id}-terrenos`,
    nombre: "Terrenos",
    slug: "terrenos",
    desarrolloId: d.id,
    tipo: "terrenos" as const,
    totalViviendas: corredor?.totalLotes ?? 0,
    descripcion:
      d.id === "canadas-del-valle"
        ? "Etapa 1 160–250 m² + premium vista cañada · nueva etapa 220–260 m² recomendada · simulador oficial Investti"
        : d.id === "canadas-del-arroyo"
          ? "Reserva 538 lotes · 160–342 m² · fibra óptica · 15+ amenidades · simulador oficial Investti"
          : d.id === "simate"
            ? "180–400 m² · casa club operativa · Cimatario · simulador oficial Investti"
            : d.id === "canadas-la-porta"
              ? "Terrenos Grupo Investti · simulador oficial Investti en cotización"
              : (corredor?.notas?.split(".")[0] ??
                "Lotes residenciales · simulador oficial Investti en cotización"),
    precioDesde: d.precioDesde,
    entregaGeneral: "Por confirmar",
    amenidades: corredor?.amenidades ?? [],
    fotoPortada: portada,
    logo: projectLogo,
    activo: true,
    brochurePdf: d.brochurePdf,
    tarjetasProcesoPdf: d.tarjetasProcesoPdf,
  };
});

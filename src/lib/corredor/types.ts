import type { PuntoInteres } from "@/lib/data";

export type CorredorCarretera = "metropolitano" | "411" | "413" | "noria";

export type CorredorMunicipio = "corregidora" | "huimilpan" | "batán";

export type AmenidadTier = "base" | "media" | "diferenciador" | "premium";

export type CorredorAmenidadTag =
  | "caseta-vigilancia"
  | "areas-verdes"
  | "juegos-infantiles"
  | "padel"
  | "calles-pavimentadas"
  | "casa-club"
  | "gym-exterior"
  | "pet-park"
  | "ciclovia"
  | "alberca"
  | "lago"
  | "area-comercial"
  | "tirolesa"
  | "huerto-urbano"
  | "golf"
  | "hipico"
  | "senderos"
  | "coworking"
  | "camping"
  | "bike-park"
  | "ecuestre"
  | "kayak";

export type CorredorDesarrollo = {
  id: string;
  nombre: string;
  /** Kilómetro sobre Blvd. Metropolitano; null si acceso por Noria u otra vía */
  kmCorredor: number | null;
  kmLabel: string;
  desarrollador: string;
  desarrolladorId: string;
  municipio: CorredorMunicipio;
  carretera: CorredorCarretera;
  loteMinM2: number;
  loteMaxM2: number;
  precioMinM2: number;
  precioMaxM2: number;
  ticketDesde: number;
  absorcionMes: number | null;
  totalLotes: number | null;
  enganchePct: number | null;
  plazoMeses: number | null;
  amenidades: string[];
  amenidadTags: CorredorAmenidadTag[];
  destacado?: boolean;
  esProyectoPropio?: boolean;
  /** Logo para pin del mapa (ej. /corredor/logos/el-condado.png). */
  logoUrl?: string;
  /** Pin en mapa; si falta, se usa estimación por km del corredor. */
  ubicacion?: {
    lat: number;
    lng: number;
    aproximada?: boolean;
    mapsUrl?: string;
  };
  /** Representación autorizada vía convenio directo con el desarrollador. */
  convenioDirecto?: boolean;
  mapQuery: string;
  /** Brochure oficial en /public (ej. /corredor/brochures/preserve-country.pdf). */
  brochureUrl?: string;
  notas?: string;
  argumentosVenta?: string[];
  guiaAsesor?: string;
};

export type CorredorFilters = {
  loteMinM2: number | null;
  loteMaxM2: number | null;
  precioM2Min: number | null;
  precioM2Max: number | null;
  ticketMax: number | null;
  engancheMaxPct: number | null;
  mensualidadMax: number | null;
  desarrolladorId: string | null;
  carretera: CorredorCarretera | null;
  kmMin: number | null;
  kmMax: number | null;
  amenidadTags: CorredorAmenidadTag[];
  soloProyectosPropios: boolean;
};

export type CorredorContextoMercado = {
  titulo: string;
  indicadores: Array<{ valor: string; etiqueta: string; detalle?: string }>;
  narrativa: string[];
  fuente: string;
};

export type CorredorZonaContexto = {
  titulo: string;
  subtitulo: string;
  mapaEmbedUrl: string;
  mapaUrl: string;
  mensajeAsesor: string;
  puntosCercanos: PuntoInteres[];
};

export type CorredorZonaMacroBloque = {
  id: "queretaro" | "corregidora" | "huimilpan";
  titulo: string;
  subtitulo: string;
  badge: string;
  indicadores: Array<{ valor: string; etiqueta: string; detalle?: string }>;
  puntosClave: string[];
  notaAplicabilidad?: string;
};

export type CorredorZonaMacro = {
  titulo: string;
  subtitulo: string;
  guiaAsesor: string;
  fuente: string;
  bloques: CorredorZonaMacroBloque[];
};

export type CorredorZonaEtapa = "macro" | "corredor" | "zona";

export type CorredorFichaEtapa = "desarrollador" | "producto" | "comparativo" | "simulador";

export type CorredorEtapa = CorredorZonaEtapa | CorredorFichaEtapa;

/** Contexto compartido por todos los desarrollos — solo en el hub /corredor */
export const CORREDOR_ZONA_ETAPAS: { id: CorredorZonaEtapa; label: string }[] = [
  { id: "macro", label: "Querétaro" },
  { id: "corredor", label: "Corredor" },
  { id: "zona", label: "Ubicación" },
];

/** Ficha individual de cada desarrollo */
export const CORREDOR_FICHA_ETAPAS: { id: CorredorFichaEtapa; label: string }[] = [
  { id: "desarrollador", label: "Desarrollador" },
  { id: "producto", label: "Producto" },
  { id: "comparativo", label: "Comparativo" },
  { id: "simulador", label: "Simulador" },
];

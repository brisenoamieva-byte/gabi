import type { PuntoInteres } from "@/lib/data";
import type { InvesttiCatalogDesarrolloId } from "@/lib/catalog/investti-desarrollos";

/** Tarjetas de proceso BBR · Grupo Investti (PDF en /public). */
export const INVESTTI_TARJETAS_PROCESO: Record<InvesttiCatalogDesarrolloId, string> = {
  "canadas-del-valle": "/documentos/investti/canadas-del-valle-tarjetas-proceso.pdf",
  "canadas-del-arroyo": "/documentos/investti/canadas-del-arroyo-tarjetas-proceso.pdf",
  simate: "/documentos/investti/simate-tarjetas-proceso.pdf",
  "canadas-la-porta": "/documentos/investti/canadas-la-porta-tarjetas-proceso.pdf",
};

export const INVESTTI_DESARROLLO_LOGOS: Record<InvesttiCatalogDesarrolloId, string> = {
  "canadas-del-valle": "/corredor/logos/CANADAS-DEL-VALLE.jpg",
  "canadas-del-arroyo": "/corredor/logos/CANADAS-DEL-ARROYO.jpg",
  simate: "/corredor/logos/SIMATE.jpg",
  "canadas-la-porta": "/corredor/desarrolladores/investti.jpg",
};

export const grupoInvesttiRecorrido = {
  titulo: "Grupo Investti",
  subtitulo: "Desarrollador",
  historia:
    "Grupo Investti diseña y desarrolla proyectos inmobiliarios en Querétaro con más de 20 años de experiencia, planeamiento urbano y seguridad jurídica. Más de 2.4 millones de m² desarrollados y 1.3 millones de m² vendidos.",
  metricas: [
    { valor: "+20 años", etiqueta: "de experiencia" },
    { valor: "2.4 M m²", etiqueta: "desarrollados" },
    { valor: "1.3 M m²", etiqueta: "vendidos" },
  ],
  respaldo: [
    "Especialistas en diseño y desarrollo de fraccionamientos en Querétaro",
    "Planeamiento urbano con ambientes atractivos y alto valor",
    "Mejor relación costo/calidad y soluciones innovadoras",
    "Comercialización BBR Habitarea con convenio directo",
  ],
  fraseAsesor:
    "Aquí no solo eliges un terreno: compras el respaldo de un desarrollador con escala, experiencia y comunidades consolidadas en el corredor sur.",
  logoPath: "/corredor/desarrolladores/investti.jpg",
} as const;

const POIS_METROPOLITANO: PuntoInteres[] = [
  {
    id: "metropolitano-acceso",
    nombre: "Blvd. Metropolitano",
    categoria: "Conectividad",
    tiempo: "En desarrollo",
    detalle: "Acceso directo al corredor sur Santa Bárbara–Huimilpan.",
    destacado: true,
  },
  {
    id: "fontanar",
    nombre: "Zona Fontanar / Plaza Constituyentes",
    categoria: "Comercio",
    tiempo: "~6 km",
    detalle: "Costco, Chedraui, servicios y retail de la zona sur.",
    destacado: true,
  },
  {
    id: "tec-milenio",
    nombre: "Tec Milenio / educación superior",
    categoria: "Educación",
    tiempo: "15 min",
    detalle: "Universidades y colegios privados del corredor sur.",
  },
  {
    id: "hospitales-sur",
    nombre: "Hospitales y servicios de salud",
    categoria: "Salud",
    tiempo: "15 min",
    detalle: "Red hospitalaria de Corregidora y zona metropolitana.",
  },
  {
    id: "centro-qro",
    nombre: "Centro de Querétaro",
    categoria: "Conectividad",
    tiempo: "20–25 min",
    detalle: "Acceso a servicios, empleo y vida urbana de la capital.",
  },
];

/** POIs específicos CDV — brochure 2026 + corredor sur (homologado a densidad de La Vista). */
const POIS_CDV_VALLE: PuntoInteres[] = [
  {
    id: "km-85-metropolitano",
    nombre: "Blvd. Metropolitano km 8.5",
    categoria: "Conectividad",
    tiempo: "Acceso directo",
    detalle:
      "Entrada El Patol · caseta 24/7 · 3 carriles de entrada y salida · corredor sur Santa Bárbara–Huimilpan.",
    destacado: true,
  },
  {
    id: "el-patol",
    nombre: "El Patol · reservas naturales",
    categoria: "Entorno",
    tiempo: "En el desarrollo",
    detalle:
      "Más de 1,500 árboles, río natural, espejos de agua y contacto directo con la naturaleza.",
    destacado: true,
  },
  {
    id: "cimatario",
    nombre: "Parque Nacional El Cimatario",
    categoria: "Entorno",
    tiempo: "Pie del cerro",
    detalle: "2,400 ha de reserva natural — pulmón verde de Querétaro.",
    destacado: true,
  },
  {
    id: "preserve-country",
    nombre: "Preserve Country",
    categoria: "Entorno",
    tiempo: "Vecino directo",
    detalle: "Fraccionamiento premium en km 8–9 — contexto de plusvalía del corredor Metropolitano.",
  },
  {
    id: "fontanar",
    nombre: "Zona Fontanar / Plaza Constituyentes",
    categoria: "Comercio",
    tiempo: "~6 km",
    detalle: "Costco, Chedraui, servicios y retail de la zona sur.",
    destacado: true,
  },
  {
    id: "colegios-sur",
    nombre: "Red de colegios privados sur",
    categoria: "Educación",
    tiempo: "10–15 min",
    detalle: "Fontanar, Kidu, Alberi y opciones de educación privada en Corregidora.",
  },
  {
    id: "tec-milenio",
    nombre: "Tec Milenio / educación superior",
    categoria: "Educación",
    tiempo: "15 min",
    detalle: "Universidades y colegios privados del corredor sur.",
  },
  {
    id: "hospitales-sur",
    nombre: "Hospitales y servicios de salud",
    categoria: "Salud",
    tiempo: "15 min",
    detalle: "Red hospitalaria de Corregidora y zona metropolitana.",
  },
  {
    id: "centro-qro",
    nombre: "Centro de Querétaro",
    categoria: "Conectividad",
    tiempo: "20–25 min",
    detalle: "Servicios, empleo y vida urbana de la capital.",
  },
  {
    id: "aeropuerto-qro",
    nombre: "Aeropuerto Intercontinental de Querétaro",
    categoria: "Conectividad",
    tiempo: "25–30 min",
    detalle: "Conexión a CDMX, Monterrey y rutas corporativas nacionales.",
  },
];

/** POIs Cañadas del Arroyo Reserva — brochure feb 2026. */
const POIS_CANADAS_ARROYO: PuntoInteres[] = [
  {
    id: "km-64-metropolitano",
    nombre: "Blvd. Metropolitano km 6.4",
    categoria: "Conectividad",
    tiempo: "Acceso directo",
    detalle:
      "Rancho Arroyo Hondo · corredor Santa Bárbara–Huimilpan · 15 min a Querétaro · servicios a 6 km.",
    destacado: true,
  },
  {
    id: "reserva",
    nombre: "Cañadas del Arroyo Reserva",
    categoria: "Entorno",
    tiempo: "En el desarrollo",
    detalle:
      "538 lotes · fraccionamiento privado con naturaleza, aire puro y vistas integradas.",
    destacado: true,
  },
  {
    id: "club-regency",
    nombre: "Club Cañadas by Regency",
    categoria: "Entorno",
    tiempo: "Acceso preferencial",
    detalle: "Costo preferencial para propietarios del desarrollo Investti.",
  },
  {
    id: "fontanar",
    nombre: "Zona Fontanar / Plaza Constituyentes",
    categoria: "Comercio",
    tiempo: "~6 km",
    detalle: "Costco, Chedraui, servicios y retail de la zona sur.",
    destacado: true,
  },
  {
    id: "tec-milenio",
    nombre: "Tec Milenio / educación superior",
    categoria: "Educación",
    tiempo: "15 min",
    detalle: "Universidades y colegios privados del corredor sur.",
  },
  {
    id: "hospitales-sur",
    nombre: "Hospitales y servicios de salud",
    categoria: "Salud",
    tiempo: "15 min",
    detalle: "Red hospitalaria de Corregidora y zona metropolitana.",
  },
  {
    id: "centro-qro",
    nombre: "Centro de Querétaro",
    categoria: "Conectividad",
    tiempo: "15 min",
    detalle: "Servicios, empleo y vida urbana de la capital.",
  },
];

const POIS_SIMATE: PuntoInteres[] = [
  {
    id: "cimatario",
    nombre: "Parque Nacional El Cimatario",
    categoria: "Entorno",
    tiempo: "Pie del cerro",
    detalle: "2,400 ha de reserva natural — pulmón verde de Querétaro.",
    destacado: true,
  },
  {
    id: "noria-acceso",
    nombre: "Camino a la Noria",
    categoria: "Conectividad",
    tiempo: "600 m Metropolitano",
    detalle: "Acceso Noria con conexión al Blvd. Metropolitano.",
    destacado: true,
  },
  {
    id: "simate-club",
    nombre: "Casa club Simaté",
    categoria: "Entorno",
    tiempo: "Operativa",
    detalle:
      "Casa club histórica del terreno · alberca templada · pádel · coworking y mirador.",
    destacado: true,
  },
  {
    id: "fontanar",
    nombre: "Zona Fontanar / Plaza Constituyentes",
    categoria: "Comercio",
    tiempo: "~6 km",
    detalle: "Costco, Chedraui, servicios y retail de la zona sur.",
    destacado: true,
  },
  {
    id: "colegios-sur",
    nombre: "Red de colegios privados sur",
    categoria: "Educación",
    tiempo: "10–15 min",
    detalle: "Fontanar, Kidu, Alberi y opciones de educación privada en Corregidora.",
  },
  {
    id: "tec-milenio",
    nombre: "Tec Milenio / educación superior",
    categoria: "Educación",
    tiempo: "15 min",
    detalle: "Universidades y colegios privados del corredor sur.",
  },
  {
    id: "hospitales-sur",
    nombre: "Hospitales y servicios de salud",
    categoria: "Salud",
    tiempo: "15 min",
    detalle: "Red hospitalaria de Corregidora y zona metropolitana.",
  },
  {
    id: "centro-qro",
    nombre: "Centro de Querétaro",
    categoria: "Conectividad",
    tiempo: "20–25 min",
    detalle: "Servicios, empleo y vida urbana de la capital.",
  },
];

function embedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=m&z=14&output=embed`;
}

type InvesttiRecorridoStatic = {
  zonaSubtitulo: string;
  mapQuery: string;
  mapaUrl: string;
  mensajeAsesor: string;
  categoriasOrden: string[];
  puntosCercanos: PuntoInteres[];
  overviewSubtitulo: string;
  narrativa: string[];
  destacados: string[];
  masterPlanImage?: string;
  masterPlanStats?: Array<{ valor: string; etiqueta: string }>;
  bondades: string[];
  tecnicaDosMinutos: string[];
  guiaAsesor: string;
};

export const investtiRecorridoById: Record<InvesttiCatalogDesarrolloId, InvesttiRecorridoStatic> = {
  "canadas-del-valle": {
    zonaSubtitulo:
      "Blvd. Metropolitano km 8.5 · El Patol — corredor sur con mayor absorción y naturaleza única en Querétaro.",
    mapQuery: "Cañadas del Valle, Blvd. Metropolitano km 8.5, El Patol, Corregidora, Querétaro",
    mapaUrl: "https://maps.app.goo.gl/LYyDBWzE2vatqZMr6",
    mensajeAsesor:
      "Antes de hablar de metraje, ancla la decisión en ubicación: km 8.5 Metropolitano, naturaleza El Patol y Cimatario, servicios a 6 km y el ritmo de venta del corredor. Luego recorrido en camioneta, presentación en camper y simulador oficial.",
    categoriasOrden: ["Entorno", "Conectividad", "Comercio", "Educación", "Salud"],
    puntosCercanos: POIS_CDV_VALLE,
    overviewSubtitulo: "80+ ha · 2,200 lotes · 30+ amenidades · líder del corredor sur",
    narrativa: [
      "Cañadas del Valle es el desarrollo de terrenos más grande de Grupo Investti en el km 8.5 del Metropolitano: más de 80 hectáreas, 2,200 lotes, 150,000 m² de áreas verdes y un río natural con más de 1,500 árboles de alturas superiores a 30 m.",
      "Etapa 1 en venta de 160 a 250 m² (brochure feb 2026) más línea premium con vista a la cañada; nueva etapa recomendada 220–260 m² donde el sembrado y los apartados muestran mayor demanda (mediana ~225 m²).",
      "Más de 30 amenidades integradas: puente colgante, bike park, casa club, pádel, huerto urbano, parque para perros, tirolesa, restaurante y terraza de eventos — 5 km de andadores y ciclopistas.",
      "Ticket desde $875,000 · 15 lotes/mes (3× la absorción promedio del corredor) · plusvalía histórica ~12% anual · apartado $15,000 y financiamiento propio hasta 60 meses en simulador oficial.",
    ],
    destacados: [
      "15 lotes/mes — líder del corredor sur (3× media)",
      "80+ ha · 150,000 m² verdes · 5 km andadores",
      "30+ amenidades: puente, bike park, casa club, pádel",
      "Apartado $15K · enganche desde 15% · hasta 60 meses",
    ],
    masterPlanStats: [
      { valor: "2,200", etiqueta: "Lotes totales" },
      { valor: "160–547", etiqueta: "m² catálogo" },
      { valor: "15/mes", etiqueta: "Absorción" },
      { valor: "$875K", etiqueta: "Ticket desde" },
    ],
    bondades: [
      "Más de 1,500 árboles existentes con alturas superiores a 30 m",
      "Río natural y espejos de agua en el desarrollo",
      "5 km de andadores y ciclopistas · parque lineal y bike park",
      "Puente colgante, tirolesa infantil, huerto urbano y parque para perros",
      "Canchas multiusos, pádel, restaurante y terraza de eventos",
      "Caseta 24/7 · acceso controlado · 3 carriles entrada/salida",
      "Terrenos premium con vista a la cañada · vecino Preserve Country",
      "Respaldo Grupo Investti + comercialización BBR con convenio directo",
    ],
    tecnicaDosMinutos: [
      "Grupo Investti: +20 años de experiencia, 2.4 millones de m² desarrollados y 1.3 millones vendidos — seguridad jurídica y planeamiento urbano.",
      "Ubicación estratégica: Blvd. Metropolitano km 8.5, El Patol, pie del Cimatario y servicios a 6 km (Costco, Fontanar, hospitales).",
      "Escala única: 2,200 lotes en 80+ ha con 150,000 m² de áreas verdes, río natural y más de 1,500 árboles.",
      "Más de 30 amenidades sin salir de casa: puente colgante, bike park, casa club, pádel, huerto, pet park y restaurante.",
      "Producto en venta: Etapa 1 160–250 m² + premium vista cañada; nueva etapa 220–260 m² con sell-through probado en sembrado.",
      "15 lotes/mes — mayor absorción del corredor sur; ticket desde $875,000 y plusvalía histórica ~12% anual.",
      "Financiamiento propio Investti: apartado $15,000, enganche desde 15% y plazos hasta 60 meses (simulador oficial BBR).",
      "Proceso de venta: recorrido en camioneta → presentación audiovisual en camper → simulador → apartado (tarjetas de proceso BBR).",
    ],
    guiaAsesor:
      "Presenta Cañadas del Valle como comunidad de terrenos con naturaleza única: usa el brochure para ubicar etapas y amenidades, valida metraje con sembrado (220–260 m² en mayor demanda; 200–250 m² casi agotado) y cierra con el simulador Investti antes del apartado.",
  },
  "canadas-del-arroyo": {
    zonaSubtitulo:
      "Blvd. Metropolitano km 6.4 · Rancho Arroyo Hondo — ticket de entrada Investti con 15+ amenidades.",
    mapQuery:
      "Cañadas del Arroyo Reserva, Blvd. Metropolitano km 6.4, Rancho Arroyo Hondo, Corregidora, Querétaro",
    mapaUrl: "https://maps.app.goo.gl/ZQb8HiHUgmSoCC7A8",
    mensajeAsesor:
      "Antes de metraje, ancla ubicación y producto Reserva: km 6.4 Metropolitano, 538 lotes, fibra óptica y servicios a 6 km. Posiciónalo como ticket accesible del portafolio Investti vs escala de CDV.",
    categoriasOrden: ["Conectividad", "Entorno", "Comercio", "Educación", "Salud"],
    puntosCercanos: POIS_CANADAS_ARROYO,
    overviewSubtitulo: "538 lotes Reserva · 160–342 m² · 2.ª absorción del corredor",
    narrativa: [
      "Cañadas del Arroyo Reserva es la sección premium del portafolio Investti en km 6.4 del Metropolitano: 538 lotes que integran naturaleza, accesibilidad y servicios a menos de 15 minutos de Querétaro.",
      "Terrenos desde 160 m² (brochure feb 2026) en fraccionamiento privado con servicios ocultos, fibra óptica, acceso controlado y vigilancia 24/7.",
      "Más de 15 amenidades: alberca y casa club, pádel, parque lineal, huerto, gimnasio al aire libre, parque para perros y zona de asadores — distribución pensada para que todos los lotes accedan rápido a áreas verdes.",
      "Ticket desde $940,000 · 7.8 lotes/mes · apartado $15,000 y financiamiento propio hasta 60 meses en simulador oficial BBR.",
    ],
    destacados: [
      "7.8 lotes/mes — 2.ª absorción del corredor sur",
      "538 lotes Reserva · fibra óptica",
      "15+ amenidades: pádel, alberca, huerto, parque lineal",
      "Apartado $15K · enganche desde 15% · hasta 60 meses",
    ],
    masterPlanStats: [
      { valor: "538", etiqueta: "Lotes Reserva" },
      { valor: "160–342", etiqueta: "m² catálogo" },
      { valor: "7.8/mes", etiqueta: "Absorción" },
      { valor: "$940K", etiqueta: "Ticket desde" },
    ],
    bondades: [
      "Zona sur de Corregidora con mayor plusvalía histórica",
      "Acceso controlado 24/7 · servicios ocultos · fibra óptica",
      "Alberca, casa club, pádel y canchas multiusos",
      "Parque lineal, senderos, ciclopista y gym al aire libre",
      "Parque infantil, pet park, huerto y pabellón",
      "Área de asadores, terrazas y picnic",
      "Servicios a 6 km: Fontanar, Costco, hospitales",
      "Acceso preferencial Club Cañadas by Regency",
    ],
    tecnicaDosMinutos: [
      "Grupo Investti: +20 años, 2.4 M m² desarrollados — planeamiento urbano y seguridad jurídica.",
      "Ubicación km 6.4 Metropolitano: Rancho Arroyo Hondo, 15 min a Querétaro y servicios a 6 km.",
      "Cañadas del Arroyo Reserva: 538 lotes con naturaleza, aire puro y vistas integradas.",
      "Infraestructura completa: servicios ocultos, fibra óptica, acceso controlado y vigilancia 24/7.",
      "15+ amenidades: pádel, alberca, huerto, parque lineal, gym al aire libre y zona de asadores.",
      "Terrenos desde 160 m² — ticket accesible desde $940,000 vs mayor escala en CDV.",
      "Financiamiento propio: apartado $15,000, enganche desde 15% y plazos hasta 60 meses.",
      "Proceso: presentación audiovisual → plano de disponibilidad → simulador oficial → apartado.",
    ],
    guiaAsesor:
      "Vende Reserva como ticket de entrada Investti: fibra óptica y amenidades vs competencia en km 6–8. Ideal para cliente que busca Metropolitano sin escala CDV; cierra con simulador antes del apartado.",
  },
  simate: {
    zonaSubtitulo:
      "Camino a la Noria · 600 m del Metropolitano · pie del Cimatario — naturaleza premium Investti.",
    mapQuery: "Simaté Parque Residencial, Camino a la Noria, Corregidora, Querétaro",
    mapaUrl: "https://maps.app.goo.gl/7hc5EGwkd12VSgkg6",
    mensajeAsesor:
      "Antes de metraje, ancla naturaleza y exclusividad: pie del Cimatario, casa club ya operativa y solo 312 lotes. Diferencia de Cañadas por tranquilidad y reserva natural vs volumen en Metropolitano.",
    categoriasOrden: ["Entorno", "Conectividad", "Comercio", "Educación", "Salud"],
    puntosCercanos: POIS_SIMATE,
    overviewSubtitulo: "15 ha · 312 lotes · Parque Residencial · ~40% vendido",
    narrativa: [
      "Simaté Parque Residencial está a las faldas del Parque Nacional El Cimatario (2,400 ha de reserva): 15 hectáreas, 312 lotes y 23,000 m² de áreas verdes exclusivas con arbolado maduro de más de 50 años.",
      "Casa club histórica del terreno ya operativa: alberca templada, pádel, coworking, mirador al Cimatario, zona de camping y área comercial exclusiva — amenidades desde el día uno.",
      "Lotes de 180 a 400 m² (brochure feb 2026) en diseño urbano seguro para peatones y automovilistas; acceso Noria a 600 m del Blvd. Metropolitano.",
      "Ticket desde $1,150,000 · ~40% vendido · apartado $30,000 y financiamiento propio hasta 60 meses (enganche desde 20%) en simulador oficial.",
    ],
    destacados: [
      "2,400 ha Cimatario · casa club operativa",
      "312 lotes · 23,000 m² áreas verdes",
      "Alberca templada · pádel · coworking · mirador",
      "Apartado $30K · enganche desde 20% · hasta 60 meses",
    ],
    masterPlanStats: [
      { valor: "312", etiqueta: "Lotes" },
      { valor: "180–400", etiqueta: "m² catálogo" },
      { valor: "4.6/mes", etiqueta: "Absorción" },
      { valor: "$1.15M", etiqueta: "Ticket desde" },
    ],
    bondades: [
      "Pie del Parque Nacional El Cimatario — 2,400 ha de reserva",
      "312 lotes — desarrollo compacto y exclusivo (~40% vendido)",
      "Casa club histórica ya operativa con alberca templada",
      "Pádel, coworking, mirador, camping y área comercial",
      "23,000 m² de áreas verdes · arbolado de más de 50 años",
      "Andadores peatonales y ciclistas · parque para perros",
      "Acceso Noria a 600 m del Metropolitano",
      "Respaldo Grupo Investti + comercialización BBR",
    ],
    tecnicaDosMinutos: [
      "Grupo Investti: +20 años, 2.4 M m² desarrollados — seguridad jurídica y planeamiento urbano.",
      "Simaté Parque Residencial: pie del Cimatario, 2,400 ha de reserva natural a tu puerta.",
      "Solo 312 lotes en 15 ha — exclusividad y tranquilidad vs volumen de Cañadas en Metropolitano.",
      "Casa club operativa: alberca templada, pádel, coworking y mirador — amenidades desde ya.",
      "23,000 m² de áreas verdes con arbolado maduro de más de 50 años.",
      "Lotes 180–400 m² · ticket desde $1,150,000 · proyecto ~40% vendido en consolidación.",
      "Financiamiento propio: apartado $30,000, enganche desde 20% y plazos hasta 60 meses.",
      "Proceso: presentación audiovisual → plano → simulador oficial → apartado (tarjetas BBR).",
    ],
    guiaAsesor:
      "Enfatiza Cimatario + casa club lista + exclusividad (312 lotes). Ideal familias que buscan naturaleza y tranquilidad sobre volumen Metropolitano; cierra con simulador antes del apartado.",
  },
  "canadas-la-porta": {
    zonaSubtitulo: "Corregidora, Querétaro · Grupo Investti",
    mapQuery: "Cañadas La Porta, Corregidora, Querétaro",
    mapaUrl: "",
    mensajeAsesor:
      "Presenta Cañadas La Porta como extensión del portafolio Investti. Valida metraje, lista y condiciones con Control Gerencia antes de cotizar.",
    categoriasOrden: ["Conectividad", "Entorno", "Comercio"],
    puntosCercanos: POIS_METROPOLITANO.slice(0, 4),
    overviewSubtitulo: "Terrenos residenciales · portafolio Investti",
    narrativa: [
      "Cañadas La Porta es desarrollo de terrenos comercializado por BBR Habitarea bajo convenio Grupo Investti.",
      "Confirma inventario, metrajes y precios de lista vigentes con Control Gerencia.",
    ],
    destacados: [
      "Comercialización BBR Habitarea",
      "Convenio directo Grupo Investti",
      "Proceso de venta estandarizado Investti",
    ],
    bondades: [
      "Respaldo Grupo Investti",
      "Comercialización BBR con convenio directo",
      "Proceso de ventas en 4 pasos + seguimiento estructurado",
      "Simulador oficial cuando el lote esté definido",
    ],
    tecnicaDosMinutos: [
      "Cañadas La Porta — terrenos Grupo Investti comercializados por BBR Habitarea.",
      "Ubicación en corredor sur de Querétaro — validar accesos y servicios con brochure vigente.",
      "Metrajes y etapas disponibles — confirmar con Control Gerencia.",
      "Simulador de pagos Investti al definir lote.",
    ],
    guiaAsesor: "Confirma inventario y precios de lista antes de cotizar.",
  },
};

export function getInvesttiMapEmbedUrl(desarrolloId: InvesttiCatalogDesarrolloId): string {
  const q = investtiRecorridoById[desarrolloId].mapQuery;
  return q ? embedUrl(q) : "";
}

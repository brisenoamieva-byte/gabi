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
  ...POIS_METROPOLITANO.filter((p) => p.id !== "metropolitano-acceso"),
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
    zonaSubtitulo: "km 6.4 · Cañadas del Arroyo Reserva",
    mapQuery:
      "Cañadas del Arroyo Reserva, Blvd. Metropolitano km 6.4, Rancho Arroyo Hondo, Corregidora, Querétaro",
    mapaUrl: "https://maps.app.goo.gl/ZQb8HiHUgmSoCC7A8",
    mensajeAsesor:
      "Posiciona Reserva como ticket de entrada Investti en Metropolitano: 538 lotes, infraestructura completa y amenidades desde el día uno.",
    categoriasOrden: ["Conectividad", "Comercio", "Educación", "Salud", "Entorno"],
    puntosCercanos: POIS_METROPOLITANO,
    overviewSubtitulo: "538 lotes · sección Reserva · km 6.4",
    narrativa: [
      "Cañadas del Arroyo Reserva integra naturaleza, accesibilidad y servicios a menos de 15 minutos de Querétaro.",
      "Fraccionamiento privado con servicios ocultos, fibra óptica, acceso controlado y vigilancia 24/7.",
      "Distribución pensada para que todos los lotes tengan acceso rápido a amenidades y áreas verdes.",
    ],
    destacados: [
      "538 lotes en sección Reserva",
      "15+ amenidades: pádel, alberca, huerto, parque lineal",
      "7.8 lotes/mes — 2.ª absorción del corredor",
      "Acceso preferencial Club Cañadas by Regency",
    ],
    masterPlanStats: [
      { valor: "532", etiqueta: "Lotes catálogo" },
      { valor: "538", etiqueta: "Reserva" },
      { valor: "7.8/mes", etiqueta: "Absorción" },
      { valor: "km 6.4", etiqueta: "Metropolitano" },
    ],
    bondades: [
      "Lo más selecto de Corregidora — zona sur con mayor plusvalía",
      "Fraccionamiento privado con seguridad 24 hrs y acceso controlado",
      "Extensas avenidas y parque central",
      "Cerca de escuelas, hospitales y plaza comercial (Costco, Chedraui)",
      "Servicios ocultos, fibra óptica e infraestructura completa",
      "15+ amenidades: pádel, gimnasio al aire libre, parque para perros",
      "Acceso con costo preferencial al Club Cañadas by Regency",
    ],
    tecnicaDosMinutos: [
      "Grupo Investti: +20 años, 2.4 M m² desarrollados — planeamiento urbano y seguridad jurídica.",
      "Cañadas del Arroyo Reserva: naturaleza, aire puro y vistas a menos de 15 min de todos los servicios.",
      "538 lotes con infraestructura oculta, acceso controlado, fibra óptica y vigilancia 24/7.",
      "Distribución proporcional: todos los lotes con acceso a áreas verdes y equipamientos.",
      "Amenidades: pádel, alberca, huerto, parque lineal, gimnasio al aire libre y zona de asadores.",
      "Presentación audiovisual + plano de disponibilidad + simulador oficial.",
    ],
    guiaAsesor:
      "Vende volumen y ticket accesible vs CDV. Destaca fibra óptica y amenidades vs competencia en km 6–8.",
  },
  simate: {
    zonaSubtitulo: "Noria · 600 m del Metropolitano · pie del Cimatario",
    mapQuery: "Simaté Parque Residencial, Camino a la Noria, Corregidora, Querétaro",
    mapaUrl: "https://maps.app.goo.gl/7hc5EGwkd12VSgkg6",
    mensajeAsesor:
      "Simaté es naturaleza premium en acceso Noria: casa club ya operativa, Cimatario y lotes desde 180 m². Diferenciar de Cañadas por tranquilidad vs volumen Metropolitano.",
    categoriasOrden: ["Entorno", "Conectividad", "Comercio", "Educación", "Salud"],
    puntosCercanos: POIS_SIMATE,
    overviewSubtitulo: "15 ha · 312 lotes · Parque Residencial",
    narrativa: [
      "Simaté Parque Residencial está a las faldas del Parque Nacional El Cimatario, con casa club histórica y amenidades desde ya.",
      "Diseño urbano seguro para peatones y automovilistas, con más de 20,000 m² de áreas verdes y arbolado maduro.",
      "Lotes de 180 a 400 m² en un desarrollo compacto de 312 lotes — ~40% vendido (brochure feb 2026).",
    ],
    destacados: [
      "Vistas a 2,400 ha del Cimatario",
      "Casa club operativa + alberca templada + pádel",
      "23,000 m² áreas verdes exclusivas",
      "Co-working, mirador y zona de camping",
    ],
    masterPlanStats: [
      { valor: "312", etiqueta: "Lotes" },
      { valor: "15 ha", etiqueta: "Desarrollo" },
      { valor: "180–400", etiqueta: "m² lote" },
      { valor: "4.6/mes", etiqueta: "Absorción" },
    ],
    bondades: [
      "A las faldas de la Reserva natural del Cimatario",
      "312 lotes — desarrollo compacto y exclusivo",
      "Increíbles amenidades con casa club ya operativa",
      "Muy arbolado — árboles de más de 50 años",
      "Diseño urbano seguro para peatones y automovilistas",
      "Lotes desde 180 m²",
      "Más de 20,000 m² de áreas verdes",
      "Calles principales rodeadas de áreas verdes",
    ],
    tecnicaDosMinutos: [
      "Casa club operativa: las familias pueden disfrutar amenidades desde ya, no hay que esperar construcción.",
      "Arbolado maduro + nuevas plantaciones — zonas frescas y sombra todo el año.",
      "Pie del cerro del Cimatario: naturaleza directa y ambiente sano para la familia.",
      "Simaté Parque Residencial — presentación audiovisual, plano y simulador oficial.",
      "Seguimiento 24 h, semanal y pre-firma según tarjetas de proceso BBR.",
    ],
    guiaAsesor:
      "Enfatiza Cimatario + casa club lista + exclusividad (312 lotes). Ideal familias que buscan naturaleza sobre volumen.",
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

/** Análisis BBR → desarrollador NUBO · condiciones mínimas para preventa. */
export const NUBO_PREVENTA_META = {
  titulo: "NUBO",
  subtitulo: "Condiciones mínimas para iniciar preventa",
  ubicacion: "San Miguel de Allende, Guanajuato",
  cliente: "Desarrollador NUBO",
  elaboradoPor: "BBR Habitarea",
  fecha: "Junio 2026",
  clasificacion: "Asesoría comercial · Confidencial",
} as const;

export const NUBO_PREVENTA_DIAGNOSTICO = {
  titulo: "Antes de abrir preventa",
  contexto:
    "NUBO no tiene tráfico espontáneo. El prospecto no pasa por la zona por accidente: hay que convocarlo, recibirlo bien y darle una razón para volver.",
  escenario:
    "Propuesta comercial BBR: 100 lotes en 25 meses (4/mes) · ticket promedio ~$3.2 M · ingreso proyectado ~$324 M.",
  cierre:
    "Comercializar sin infraestructura visible obliga a vender promesas. Con acceso, hotel, restaurante y campaña al 2.5%, vendemos experiencia.",
} as const;

export const NUBO_PREVENTA_CONDICIONES = [
  {
    num: "01",
    titulo: "Acceso construido",
    detalle: "Arco, caseta y primer tramo presentable visibles desde la vía este.",
  },
  {
    num: "02",
    titulo: "Hotel Taboada renovado",
    detalle: "Capital invertido en la amenidad que ya existe en sitio.",
  },
  {
    num: "03",
    titulo: "Restaurante campestre",
    detalle: "Operación fines de semana que traiga familias al proyecto.",
  },
  {
    num: "04",
    titulo: "Presupuesto de publicidad",
    detalle: "2.5% del valor del proyecto · campaña desde agosto 2026.",
  },
] as const;

export const NUBO_PREVENTA_PLANOS = {
  ubicacionSitio: "Polígono del proyecto con acceso, hotel y zona arbolada señalados.",
} as const;

export const NUBO_PREVENTA_ACCESOS = {
  num: "01",
  titulo: "Acceso principal",
  hoy: "Sin entrada construida, el prospecto solo ve renders. En un terreno aislado eso frena la decisión.",
  recomendacion:
    "Construir desde el inicio un acceso de desarrollo premium: arco visible, caseta de bienvenida, iluminación y paisajismo de llegada.",
  paraArrancar: [
    "Arco o portal principal desde la vía este — piedra, madera o cantera local.",
    "Caseta integrada con branding NUBO; primer tramo pavimentado hacia hotel y restaurante.",
    "Fase mínima: arco + 150–200 m de acceso presentable antes de abrir el restaurante.",
  ],
  ubicacionEnPlano: "Acceso principal · lado este, conexión con la vía desde San Miguel.",
} as const;

export const NUBO_PREVENTA_HOTEL = {
  num: "02",
  titulo: "Hotel Hacienda Taboada",
  nombre: "Hotel Hacienda Taboada",
  hoy: "El hotel está en sitio y funciona, pero luce de otra época. No está en malas condiciones — le falta renovarse para representar el nivel NUBO.",
  recomendacion:
    "Inyectar capital y remodelar Taboada como la amenidad referente del proyecto: habitaciones, lobby, áreas comunes y exteriores alineados al master plan.",
  paraArrancar: [
    "Remodelación integral, no solo mantenimiento — el visitante debe notar el cambio.",
    "Habitaciones, lobby y áreas exteriores al nivel del producto residencial prometido.",
    "Incluir el hotel en el recorrido de preventa junto al acceso y el restaurante.",
  ],
  fotoActualCaption:
    "Situación actual — base de hacienda con potencial; requiere inversión para proyectar el estándar del desarrollo.",
  ubicacionEnPlano: "Zona media-oeste del polígono, corredor hacia el Village.",
} as const;

export const NUBO_PREVENTA_RESTAURANTE = {
  num: "03",
  titulo: "Restaurante campestre",
  hoy: "La zona arbolada con mesas de picnic no basta para que alguien se desplace al proyecto ni se quede el tiempo necesario para conocerlo.",
  recomendacion:
    "Operar un restaurante campestre fines de semana — cocina a leña, terrazas bajo árbol, estacionamiento claro — con el look & feel de Plantado: fogata, iluminación cálida y mesas al aire libre.",
  paraArrancar: [
    "80–120 comensales; operación sábado–domingo con reservación por WhatsApp.",
    "Señalética carretera → restaurante → sala de preventa.",
    "El restaurante genera tráfico para ventas; no la reemplaza.",
  ],
  ubicacionEnPlano: "Zona arbolada · corredor verde al sur del Village.",
  lookAndFeel:
    "Referencia de ambiente: Plantado — terrazas bajo árbol, fogata central e iluminación cálida que sostienen la sobremesa y el recorrido por el proyecto.",
  referenciasConcepto: [
    {
      nombre: "Plantado",
      detalle: "Look & feel objetivo para la zona arbolada NUBO.",
    },
    {
      nombre: "Mama Mia Campestre",
      detalle: "Referencia operativa en San Miguel — cocina de fuego y recorrido familiar.",
    },
  ],
} as const;

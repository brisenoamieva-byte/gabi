import type { CorredorZonaMacro } from "./types";

export const CORREDOR_ZONA_MACRO: CorredorZonaMacro = {
  titulo: "Querétaro y la zona sur",
  subtitulo:
    "Antes de comparar desarrollos: el contexto macro que sostiene la plusvalía del corredor Metropolitano y la 413.",
  fuente: "Softec DIME 2T2026, AMPI Querétaro, CEPIQ, INEGI — referencia comercial 2026.",
  guiaAsesor:
    "Abre con el estado (nearshoring, empleo, demanda), baja a Corregidora como motor del sur y cierra con Huimilpan cuando el producto esté ahí.",
  bloques: [
    {
      id: "queretaro",
      titulo: "Estado de Querétaro",
      subtitulo: "Economía dinámica, empleo formal y demanda habitacional sostenida",
      badge: "Contexto estatal",
      indicadores: [
        { valor: "226", etiqueta: "Proyectos activos", detalle: "Oferta habitacional en el estado · Softec 2T2026" },
        { valor: "8,760", etiqueta: "Familias nuevas / año", detalle: "Flujo demográfico · CEPIQ / AMPI" },
        { valor: "$2,500+ MDD", etiqueta: "Nearshoring / año", detalle: "Inversión industrial recurrente" },
        { valor: "Top 3", etiqueta: "Competitividad", detalle: "Aeroespacial, automotriz y manufactura avanzada" },
      ],
      puntosClave: [
        "Demanda de vivienda media y residencial en rango $2.5M–$5M impulsada por empleo industrial.",
        "Querétaro combina conectividad (México–QRO, 57, libramientos) con calidad de vida.",
        "Plusvalía ligada a anclas comerciales e industriales, no solo a un fraccionamiento.",
        "El sur del estado captura familias que buscan más m² y mejor precio sin salir del área metropolitana.",
      ],
    },
    {
      id: "corregidora",
      titulo: "Corregidora",
      subtitulo: "El municipio de mayor crecimiento del estado — corazón del corredor sur",
      badge: "Municipio en expansión",
      indicadores: [
        { valor: "5.8%", etiqueta: "Crecimiento anual", detalle: "El más alto del estado · población y vivienda" },
        { valor: "$100 MDD", etiqueta: "Costco", detalle: "Apertura nov 2026 · piso 8,000 m² · ancla comercial" },
        { valor: "15 min", etiqueta: "Al centro sur", detalle: "Libramiento sur-poniente sin peaje" },
        { valor: "411 / 413", etiqueta: "Corredores", detalle: "Metropolitano + accesos Noria y Batán" },
      ],
      puntosClave: [
        "Concentración de desarrollos de terreno: Cañadas, Preserve, Velasur, El Condado, Faro de los Cisnes, Ciudad Maderas y más en un solo eje.",
        "Costco y retail en formación elevan plusvalía en radio 3–5 km (referencia mercado: 8–15%).",
        "Estadio Conspiradores y corredor deportivo-comercial en consolidación.",
        "Servicios, plazas y conectividad industrial hacia el parque sur y nearshoring.",
        "El Batán y zonas aledañas completan la oferta residencial del municipio.",
      ],
    },
    {
      id: "huimilpan",
      titulo: "Huimilpan",
      subtitulo: "Extensión natural del sur — más terreno, naturaleza y precio de entrada",
      badge: "Cuando aplica",
      indicadores: [
        { valor: "30–40%", etiqueta: "vs. norte QRO", detalle: "Referencia de precio por m² en corredor sur" },
        { valor: "413", etiqueta: "Carretera estatal", detalle: "Eje hacia Valle Cardinal y desarrollos sur" },
        { valor: "km 10+", etiqueta: "Metropolitano", detalle: "Continuidad del corredor hacia Huimilpan" },
        { valor: "Campestre", etiqueta: "Concepto", detalle: "Lotes amplios, vistas y baja densidad" },
      ],
      puntosClave: [
        "Ideal para prospectos que buscan más metros cuadrados y entorno natural sin alejarse del área metropolitana.",
        "Desarrollos como Valle Cardinal anclan la oferta sobre la 413.",
        "El corredor empuja hacia Huimilpan conforme se satura Corregidora — entrar hoy fija base de valor.",
        "Vender la combinación: conectividad al centro + vida de pueblo + proyecto master plan.",
      ],
      notaAplicabilidad:
        "Usa este bloque cuando el prospecto compare Corregidora vs. Huimilpan o busque lote grande / campestre.",
    },
  ],
};

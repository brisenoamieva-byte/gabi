import type { RecorridoContenido } from "@/lib/catalog/recorrido-content";
import { tecnicasCierre } from "@/lib/data";
import { getCorredorDesarrolloById } from "@/lib/corredor/zona-sur-seed";
import type { InvesttiCatalogDesarrolloId } from "@/lib/catalog/investti-desarrollos";

function buildFromCorredor(desarrolloId: InvesttiCatalogDesarrolloId): RecorridoContenido | null {
  const d = getCorredorDesarrolloById(desarrolloId);
  if (!d) return null;

  const metricas = [
    d.absorcionMes != null
      ? { valor: `${d.absorcionMes}`, etiqueta: "Lotes/mes" }
      : null,
    d.totalLotes != null
      ? { valor: `${d.totalLotes}`, etiqueta: "Lotes totales" }
      : null,
    { valor: `${d.loteMinM2}–${d.loteMaxM2}`, etiqueta: "Metraje m²" },
  ].filter((m): m is { valor: string; etiqueta: string } => m != null);

  return {
    zona: {
      titulo: "Ubicación",
      subtitulo: d.kmLabel ?? "Corredor sur",
      centro: d.nombre,
      direccion: d.mapQuery ?? "",
      mapaEmbedUrl: "",
      mapaUrl: d.ubicacion?.mapsUrl ?? "",
      mensajeAsesor:
        d.guiaAsesor ??
        `Presenta ${d.nombre} con brochure y simulador oficial antes de cerrar metraje y esquema de pago.`,
      categoriasOrden: ["acceso", "entorno", "servicios"],
      puntosCercanos: [],
    },
    desarrollador: {
      titulo: "Grupo Investti",
      subtitulo: "Desarrollador",
      historia:
        "Portafolio de terrenos en el corredor sur de Querétaro. BBR Habitarea comercializa con convenio directo.",
      metricas,
      respaldo: d.argumentosVenta ?? [],
      fraseAsesor: d.guiaAsesor ?? "",
      logoPath: "/corredor/desarrolladores/investti.jpg",
    },
    overview: {
      titulo: d.nombre,
      subtitulo: d.kmLabel ?? "Terrenos residenciales",
      narrativa: [d.notas ?? ""].filter(Boolean),
      destacados: d.amenidades?.slice(0, 6) ?? [],
      logoPath: undefined,
      guiaAsesor: d.guiaAsesor,
    },
    bondades: d.argumentosVenta ?? [],
    tecnicasCierre: [...tecnicasCierre],
    tecnicaDosMinutos: {
      titulo: "Presentación en 2 minutos",
      tiempo: 120,
      puntos: [
        `Ubicación y acceso: ${d.kmLabel ?? d.nombre}.`,
        `Producto: terrenos de ${d.loteMinM2} a ${d.loteMaxM2} m².`,
        d.absorcionMes
          ? `Ritmo de venta: ${d.absorcionMes} lotes al mes.`
          : "Ritmo de venta: validar con sembrado vigente.",
        "Amenidades y plusvalía del desarrollo.",
        "Simula precio y mensualidades con el simulador oficial antes del apartado.",
      ],
    },
  };
}

const laPortaDefaults = (): RecorridoContenido => ({
  zona: {
    titulo: "Ubicación",
    subtitulo: "Corregidora, Querétaro",
    centro: "Cañadas La Porta",
    direccion: "Corregidora, Querétaro",
    mapaEmbedUrl: "",
    mapaUrl: "",
    mensajeAsesor:
      "Presenta Cañadas La Porta como parte del portafolio Investti. Valida metraje y lista con Control Gerencia.",
    categoriasOrden: ["acceso", "entorno"],
    puntosCercanos: [],
  },
  desarrollador: {
    titulo: "Grupo Investti",
    subtitulo: "Desarrollador",
    historia: "Desarrollo de terrenos comercializado por BBR Habitarea.",
    metricas: [],
    respaldo: [],
    fraseAsesor: "Convenio directo BBR · Grupo Investti",
    logoPath: "/corredor/desarrolladores/investti.jpg",
  },
  overview: {
    titulo: "Cañadas La Porta",
    subtitulo: "Terrenos residenciales",
    narrativa: ["Desarrollo Grupo Investti en el corredor sur de Querétaro."],
    destacados: [],
    guiaAsesor: "Confirma inventario y precios de lista antes de cotizar.",
  },
  bondades: [],
  tecnicasCierre: [...tecnicasCierre],
  tecnicaDosMinutos: {
    titulo: "Presentación en 2 minutos",
    tiempo: 120,
    puntos: [
      "Ubicación y acceso al desarrollo.",
      "Metrajes y etapas disponibles.",
      "Amenidades del proyecto.",
      "Simulador de pagos cuando el lote esté definido.",
    ],
  },
});

export function getInvesttiRecorridoContenido(
  desarrolloId: InvesttiCatalogDesarrolloId,
): RecorridoContenido {
  if (desarrolloId === "canadas-la-porta") {
    return laPortaDefaults();
  }
  return buildFromCorredor(desarrolloId) ?? laPortaDefaults();
}

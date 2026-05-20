import type { RecorridoContenido } from "@/lib/catalog/recorrido-content";

export type RecorridoContenidoForm = {
  zonaTitulo: string;
  zonaSubtitulo: string;
  zonaCentro: string;
  zonaDireccion: string;
  zonaMapaEmbedUrl: string;
  zonaMapaUrl: string;
  zonaMensajeAsesor: string;
  desarrolladorTitulo: string;
  desarrolladorSubtitulo: string;
  desarrolladorHistoria: string;
  desarrolladorFraseAsesor: string;
  desarrolladorLogoPath: string;
  desarrolladorMetricas: string;
  desarrolladorRespaldo: string;
  overviewTitulo: string;
  overviewSubtitulo: string;
  overviewGuiaAsesor: string;
  overviewLogoPath: string;
  overviewNarrativa: string;
  overviewDestacados: string;
  bondades: string;
  tecnicaTitulo: string;
  tecnicaPuntos: string;
};

export const linesToArray = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const arrayToLines = (items: string[]) => items.join("\n");

export const metricasFromLines = (text: string) =>
  linesToArray(text)
    .map((line) => {
      const [valor, etiqueta] = line.split("|").map((part) => part.trim());
      return { valor: valor ?? "", etiqueta: etiqueta ?? "" };
    })
    .filter((item) => item.valor);

export const metricasToLines = (items: Array<{ valor: string; etiqueta: string }>) =>
  arrayToLines(items.map((item) => `${item.valor}|${item.etiqueta}`));

export const contenidoToForm = (content: RecorridoContenido): RecorridoContenidoForm => ({
  zonaTitulo: content.zona.titulo,
  zonaSubtitulo: content.zona.subtitulo,
  zonaCentro: content.zona.centro,
  zonaDireccion: content.zona.direccion,
  zonaMapaEmbedUrl: content.zona.mapaEmbedUrl,
  zonaMapaUrl: content.zona.mapaUrl,
  zonaMensajeAsesor: content.zona.mensajeAsesor,
  desarrolladorTitulo: content.desarrollador.titulo,
  desarrolladorSubtitulo: content.desarrollador.subtitulo,
  desarrolladorHistoria: content.desarrollador.historia,
  desarrolladorFraseAsesor: content.desarrollador.fraseAsesor,
  desarrolladorLogoPath: content.desarrollador.logoPath ?? "",
  desarrolladorMetricas: metricasToLines(content.desarrollador.metricas),
  desarrolladorRespaldo: arrayToLines(content.desarrollador.respaldo),
  overviewTitulo: content.overview.titulo,
  overviewSubtitulo: content.overview.subtitulo,
  overviewGuiaAsesor: content.overview.guiaAsesor ?? "",
  overviewLogoPath: content.overview.logoPath ?? "",
  overviewNarrativa: arrayToLines(content.overview.narrativa),
  overviewDestacados: arrayToLines(content.overview.destacados),
  bondades: arrayToLines(content.bondades),
  tecnicaTitulo: content.tecnicaDosMinutos.titulo,
  tecnicaPuntos: arrayToLines(content.tecnicaDosMinutos.puntos),
});

export const formToContenido = (
  form: RecorridoContenidoForm,
  base: RecorridoContenido,
): RecorridoContenido => ({
  ...base,
  zona: {
    ...base.zona,
    titulo: form.zonaTitulo.trim(),
    subtitulo: form.zonaSubtitulo.trim(),
    centro: form.zonaCentro.trim(),
    direccion: form.zonaDireccion.trim(),
    mapaEmbedUrl: form.zonaMapaEmbedUrl.trim(),
    mapaUrl: form.zonaMapaUrl.trim(),
    mensajeAsesor: form.zonaMensajeAsesor.trim(),
  },
  desarrollador: {
    ...base.desarrollador,
    titulo: form.desarrolladorTitulo.trim(),
    subtitulo: form.desarrolladorSubtitulo.trim(),
    historia: form.desarrolladorHistoria.trim(),
    fraseAsesor: form.desarrolladorFraseAsesor.trim(),
    logoPath: form.desarrolladorLogoPath.trim() || undefined,
    metricas: metricasFromLines(form.desarrolladorMetricas),
    respaldo: linesToArray(form.desarrolladorRespaldo),
  },
  overview: {
    ...base.overview,
    titulo: form.overviewTitulo.trim(),
    subtitulo: form.overviewSubtitulo.trim(),
    guiaAsesor: form.overviewGuiaAsesor.trim() || undefined,
    logoPath: form.overviewLogoPath.trim() || undefined,
    narrativa: linesToArray(form.overviewNarrativa),
    destacados: linesToArray(form.overviewDestacados),
  },
  bondades: linesToArray(form.bondades),
  tecnicaDosMinutos: {
    ...base.tecnicaDosMinutos,
    titulo: form.tecnicaTitulo.trim(),
    puntos: linesToArray(form.tecnicaPuntos),
  },
});

export const emptyRecorridoContenidoForm = (): RecorridoContenidoForm =>
  contenidoToForm({
    zona: {
      titulo: "",
      subtitulo: "",
      centro: "",
      direccion: "",
      mapaEmbedUrl: "",
      mapaUrl: "",
      mensajeAsesor: "",
      categoriasOrden: [],
      puntosCercanos: [],
    },
    desarrollador: {
      titulo: "",
      subtitulo: "",
      historia: "",
      metricas: [],
      respaldo: [],
      fraseAsesor: "",
    },
    overview: {
      titulo: "",
      subtitulo: "",
      narrativa: [],
      destacados: [],
    },
    bondades: [],
    tecnicasCierre: [],
    tecnicaDosMinutos: { titulo: "", tiempo: 120, puntos: [] },
  });

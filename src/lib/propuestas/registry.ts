import type { PropuestaComercialData } from "@/lib/propuestas/types";
import { NUBO_PROPUESTA_GENERATED } from "@/lib/propuestas/nubo.generated";
import { VITA_ALTA_PROPUESTA_GENERATED } from "@/lib/propuestas/vita-alta.generated";
import { VITA_ALTA_MEDIA, type PropuestaComercialMedia } from "@/lib/propuestas/vita-alta-media";
import { NUBO_MEDIA } from "@/lib/propuestas/nubo-media";

export type PropuestaListItem = {
  slug: string;
  titulo: string;
  ubicacion: string;
  desarrollador: string;
  fecha: string;
  estado: PropuestaComercialData["estado"];
};

const PROPUESTAS_DATA: Record<string, PropuestaComercialData> = {
  [VITA_ALTA_PROPUESTA_GENERATED.slug]: VITA_ALTA_PROPUESTA_GENERATED,
  [NUBO_PROPUESTA_GENERATED.slug]: NUBO_PROPUESTA_GENERATED,
};

const PROPUESTA_MEDIA: Record<string, PropuestaComercialMedia> = {
  [VITA_ALTA_PROPUESTA_GENERATED.slug]: VITA_ALTA_MEDIA,
  [NUBO_PROPUESTA_GENERATED.slug]: NUBO_MEDIA,
};

/** Estudio de preventa vinculado a una propuesta (si existe). */
const PROPUESTA_ESTUDIO_LINK: Record<string, string> = {
  [NUBO_PROPUESTA_GENERATED.slug]: "/estudios/nubo",
};

export const PROPUESTAS_REGISTRY: PropuestaListItem[] = Object.values(PROPUESTAS_DATA).map(
  (propuesta) => ({
    slug: propuesta.slug,
    titulo: propuesta.meta.titulo,
    ubicacion: propuesta.meta.ubicacion,
    desarrollador: propuesta.meta.desarrollador,
    fecha: propuesta.meta.fecha,
    estado: propuesta.estado,
  }),
);

export function getPropuestaBySlug(slug: string): PropuestaComercialData | null {
  return PROPUESTAS_DATA[slug] ?? null;
}

export function getPropuestaMedia(slug: string): PropuestaComercialMedia {
  return PROPUESTA_MEDIA[slug] ?? NUBO_MEDIA;
}

export function getPropuestaEstudioLink(slug: string): string | null {
  return PROPUESTA_ESTUDIO_LINK[slug] ?? null;
}

export function isPropuestaSlug(slug: string): boolean {
  return slug in PROPUESTAS_DATA;
}

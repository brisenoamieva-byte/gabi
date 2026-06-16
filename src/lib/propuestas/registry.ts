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

export const PROPUESTAS_REGISTRY: PropuestaListItem[] = [
  {
    slug: VITA_ALTA_PROPUESTA_GENERATED.slug,
    titulo: VITA_ALTA_PROPUESTA_GENERATED.meta.titulo,
    ubicacion: VITA_ALTA_PROPUESTA_GENERATED.meta.ubicacion,
    desarrollador: VITA_ALTA_PROPUESTA_GENERATED.meta.desarrollador,
    fecha: VITA_ALTA_PROPUESTA_GENERATED.meta.fecha,
    estado: VITA_ALTA_PROPUESTA_GENERATED.estado,
  },
  {
    slug: NUBO_PROPUESTA_GENERATED.slug,
    titulo: NUBO_PROPUESTA_GENERATED.meta.titulo,
    ubicacion: NUBO_PROPUESTA_GENERATED.meta.ubicacion,
    desarrollador: NUBO_PROPUESTA_GENERATED.meta.desarrollador,
    fecha: NUBO_PROPUESTA_GENERATED.meta.fecha,
    estado: NUBO_PROPUESTA_GENERATED.estado,
  },
];

export function getPropuestaBySlug(slug: string): PropuestaComercialData | null {
  if (slug === VITA_ALTA_PROPUESTA_GENERATED.slug) {
    return VITA_ALTA_PROPUESTA_GENERATED;
  }
  if (slug === NUBO_PROPUESTA_GENERATED.slug) {
    return NUBO_PROPUESTA_GENERATED;
  }
  return null;
}

export function getPropuestaMedia(slug: string): PropuestaComercialMedia {
  if (slug === VITA_ALTA_PROPUESTA_GENERATED.slug) {
    return VITA_ALTA_MEDIA;
  }
  return NUBO_MEDIA;
}

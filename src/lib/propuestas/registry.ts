import type { PropuestaComercialData } from "@/lib/propuestas/types";
import { NUBO_PROPUESTA_GENERATED } from "@/lib/propuestas/nubo.generated";

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
    slug: NUBO_PROPUESTA_GENERATED.slug,
    titulo: NUBO_PROPUESTA_GENERATED.meta.titulo,
    ubicacion: NUBO_PROPUESTA_GENERATED.meta.ubicacion,
    desarrollador: NUBO_PROPUESTA_GENERATED.meta.desarrollador,
    fecha: NUBO_PROPUESTA_GENERATED.meta.fecha,
    estado: NUBO_PROPUESTA_GENERATED.estado,
  },
];

export function getPropuestaBySlug(slug: string): PropuestaComercialData | null {
  if (slug === NUBO_PROPUESTA_GENERATED.slug) {
    return NUBO_PROPUESTA_GENERATED;
  }
  return null;
}

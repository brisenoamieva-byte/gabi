import { ESTUDIOS_REGISTRY } from "@/lib/estudios/registry";

export const NUBO_ESTUDIO_SHARE_SLUG = "nubo-preventa";

export type EstudioShareListItem = {
  slug: string;
  titulo: string;
  subtitulo: string;
  cliente: string;
};

export function getEstudioShareBySlug(slug: string): EstudioShareListItem | null {
  const item = ESTUDIOS_REGISTRY.find((estudio) => estudio.slug === slug);
  if (!item) return null;
  return {
    slug: item.slug,
    titulo: item.titulo,
    subtitulo: item.subtitulo,
    cliente: item.cliente,
  };
}

export function isKnownEstudioShareSlug(slug: string): boolean {
  return Boolean(getEstudioShareBySlug(slug));
}

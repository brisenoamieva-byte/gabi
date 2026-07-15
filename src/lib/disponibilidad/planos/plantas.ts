import type { GaviaLado, GaviaTipologia } from "@/lib/disponibilidad/planos/mision-la-gavia";

const PLANTAS_BASE = "/desarrollos/mision-la-gavia/plantas";

export type GaviaPlantaAssets = {
  plantaSrc: string;
  roofSrc: string | null;
};

/** Resuelve assets por tipología + lado + nivel (misma clave del Excel). */
export function resolveGaviaPlantaAssets(
  tipologia: GaviaTipologia,
  lado: GaviaLado,
  nivel: 1 | 2 | 3,
): GaviaPlantaAssets {
  const prefix = tipologia === "3R" ? "3r" : "2r";
  const nivelCode = String(nivel).padStart(2, "0");
  const stem = `${prefix}-${lado}-${nivelCode}`;

  return {
    plantaSrc: `${PLANTAS_BASE}/${stem}.png`,
    roofSrc: nivel === 3 ? `${PLANTAS_BASE}/${prefix}-${lado}-03-roof.png` : null,
  };
}

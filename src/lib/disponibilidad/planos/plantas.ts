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

const parseGaviaNivelFromModelo = (value: string): 1 | 2 | 3 | null => {
  const text = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (text.includes("planta baja") || text.includes("nivel-01") || /(?:^|-)01(?:-|$)/.test(text)) {
    return 1;
  }
  if (text.includes("primer nivel") || text.includes("nivel-02") || /(?:^|-)02(?:-|$)/.test(text)) {
    return 2;
  }
  if (
    text.includes("segundo") ||
    text.includes("roof") ||
    text.includes("nivel-03") ||
    /(?:^|-)03(?:-|$)/.test(text)
  ) {
    return 3;
  }
  return null;
};

const parseGaviaTipologia = (
  nombreOrSlug: string,
  recamaras?: number,
): GaviaTipologia | null => {
  const text = nombreOrSlug.toLowerCase();
  if (text.includes("3r") || text.includes("3-r")) return "3R";
  if (text.includes("2r") || text.includes("2-r")) return "2R";
  if (typeof recamaras === "number") {
    return recamaras >= 3 ? "3R" : "2R";
  }
  return null;
};

/**
 * Planta representativa del prototipo (modelo), sin unidad específica.
 * Usa lado izquierdo como referencia visual del catálogo.
 */
export function resolveMisionLaGaviaPrototipoPlanta(input: {
  id?: string;
  nombre?: string;
  slug?: string;
  recamaras?: number;
  planos?: string[];
}): string | null {
  if (input.planos?.[0]) {
    return input.planos[0];
  }

  const key = `${input.slug ?? ""} ${input.nombre ?? ""} ${input.id ?? ""}`;
  const tipologia = parseGaviaTipologia(key, input.recamaras);
  const nivel = parseGaviaNivelFromModelo(key);
  if (!tipologia || !nivel) {
    return null;
  }

  return resolveGaviaPlantaAssets(tipologia, "izq", nivel).plantaSrc;
}

/** Logotipos de desarrollos con los que BBR ha comercializado (slide Quiénes somos). */
const BASE = "/propuestas/desarrollos-alianzas";

export type DesarrolloAlianzaLogo = {
  id: string;
  nombre: string;
  src: string;
  width: number;
  height: number;
  /** Escala extra cuando el trazo del logo se ve pequeño en la celda (p. ej. outline). */
  scale?: number;
};

/** Celda uniforme: todos los logos ocupan el mismo espacio visual. */
export const DESARROLLO_LOGO_CELL = {
  width: 112,
  height: 46,
} as const;

export const DESARROLLO_LOGO_CELL_COMPACT = {
  width: 92,
  height: 38,
} as const;

export const DESARROLLOS_ALIANZA_LOGOS: DesarrolloAlianzaLogo[] = [
  { id: "depoint", nombre: "Depoint Business Corner", src: `${BASE}/depoint.png`, width: 769, height: 265 },
  { id: "punt-olivo", nombre: "PuntOlivo Residencial", src: `${BASE}/punt-olivo.png`, width: 728, height: 442 },
  { id: "garambullos", nombre: "Garambullos", src: `${BASE}/garambullos.png`, width: 760, height: 473 },
  { id: "velasur", nombre: "Velasur", src: `${BASE}/velasur.png`, width: 734, height: 389 },
  { id: "canadas-la-porta", nombre: "Cañadas La Porta", src: `${BASE}/canadas-la-porta.png`, width: 764, height: 496 },
  { id: "la-gota", nombre: "La Gota", src: `${BASE}/la-gota.png`, width: 729, height: 336, scale: 1.15 },
  { id: "lago-juriquilla", nombre: "Lago de Juriquilla", src: `${BASE}/lago-juriquilla.png`, width: 674, height: 248 },
  { id: "barrio-santiago", nombre: "Barrio Santiago", src: `${BASE}/barrio-santiago.png`, width: 697, height: 69 },
  { id: "balvanera", nombre: "Balvanera", src: `${BASE}/balvanera.png`, width: 604, height: 180 },
  { id: "tierradentro", nombre: "Tierradentro", src: `${BASE}/tierradentro.png`, width: 1024, height: 341 },
  { id: "pasaje-alamos", nombre: "Pasaje Álamos", src: `${BASE}/pasaje-alamos.png`, width: 724, height: 377 },
  { id: "la-vista", nombre: "La Vista Residencial", src: `${BASE}/la-vista.png`, width: 818, height: 224 },
  { id: "canadas-del-valle", nombre: "Cañadas del Valle", src: `${BASE}/canadas-del-valle.png`, width: 1024, height: 600 },
  { id: "simate", nombre: "Simate Parque Residencial", src: `${BASE}/simate.png`, width: 728, height: 293 },
  { id: "urban-valley", nombre: "Urban Valley Open Pavilion", src: `${BASE}/urban-valley.png`, width: 890, height: 330 },
  { id: "mision-la-gavia", nombre: "Misión La Gavia", src: `${BASE}/mision-la-gavia.png`, width: 708, height: 606 },
  { id: "canadas-del-arroyo", nombre: "Cañadas del Arroyo Reserva", src: `${BASE}/canadas-del-arroyo.png`, width: 1023, height: 791, scale: 1.12 },
  { id: "la-ceiba", nombre: "La Ceiba Bosque Urbano", src: `${BASE}/la-ceiba.png`, width: 853, height: 1024, scale: 1.12 },
];

export function desarrolloLogoDisplaySize(
  logo: DesarrolloAlianzaLogo,
  cell: { width: number; height: number } = DESARROLLO_LOGO_CELL,
) {
  const scale = logo.scale ?? 1;
  const ratio = logo.width / logo.height;
  const maxW = cell.width * scale;
  const maxH = cell.height * scale;

  let width: number;
  let height: number;

  if (ratio > maxW / maxH) {
    width = maxW;
    height = maxW / ratio;
  } else {
    height = maxH;
    width = maxH * ratio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

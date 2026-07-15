import { MISION_LA_GAVIA_DESARROLLO_ID } from "@/lib/catalog/mision-la-gavia";

export type GaviaLado = "izq" | "der";
export type GaviaTipologia = "2R" | "3R";

/**
 * Orientación al mirar el edificio de frente desde su calle de acceso.
 * - `row-izq-der`: izq izquierda, der derecha (vista norte típica)
 * - `row-der-izq`: der izquierda, izq derecha
 * - `stack-der-izq`: der arriba, izq abajo (ej. O–R vistos desde la calle este)
 * - `stack-izq-der`: izq arriba, der abajo (ej. J–G vistos desde la calle oeste)
 */
export type GaviaVistaCalle =
  | "row-izq-der"
  | "row-der-izq"
  | "stack-der-izq"
  | "stack-izq-der";

export type GaviaEdificioId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R";

export type GaviaDecodedUnidad = {
  codigo: string;
  edificio: GaviaEdificioId;
  lado: GaviaLado;
  /** 1 = planta baja, 2 = primer nivel, 3 = segundo + roof */
  nivel: 1 | 2 | 3;
};

export type GaviaEdificioLayout = {
  id: GaviaEdificioId;
  /** Columna en el grid del plano (incluye calles). */
  col: number;
  /** Fila (1 = primera fila de edificios). */
  row: number;
  tipologia: GaviaTipologia;
  etapa1?: boolean;
  /** Si el edificio no tiene un lado en inventario. */
  lados?: GaviaLado[];
  /**
   * Cómo se acomodan izq/der al mirar el edificio desde la calle.
   * Default: row-izq-der.
   */
  vistaCalle?: GaviaVistaCalle;
};

export type DisponibilidadPlanoConfigGavia = {
  desarrolloId: typeof MISION_LA_GAVIA_DESARROLLO_ID;
  kind: "edificio-lado-niveles";
  edificios: GaviaEdificioLayout[];
  gridCols: number;
  gridRows: number;
};

const EDIFICIO_IDS = new Set<string>([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
]);

/**
 * Layout alineado al diagrama comercial Gavia.
 * O–R se ven desde la calle este: der arriba, izq abajo.
 * J–G se ven desde la calle oeste: izq arriba, der abajo.
 */
export const MISION_LA_GAVIA_EDIFICIOS: GaviaEdificioLayout[] = [
  // Columna oeste 2R — acceso desde calle este (mirando al oeste)
  { id: "O", col: 2, row: 1, tipologia: "2R", etapa1: true, vistaCalle: "stack-der-izq" },
  { id: "P", col: 2, row: 2, tipologia: "2R", etapa1: true, vistaCalle: "stack-der-izq" },
  { id: "Q", col: 2, row: 3, tipologia: "2R", etapa1: true, vistaCalle: "stack-der-izq" },
  { id: "R", col: 2, row: 4, tipologia: "2R", etapa1: true, vistaCalle: "stack-der-izq" },

  // Manzana central 3R — fila norte (vista desde calle norte, mirando sur)
  { id: "N", col: 4, row: 1, tipologia: "3R", etapa1: true, vistaCalle: "row-der-izq" },
  { id: "M", col: 5, row: 1, tipologia: "3R", etapa1: true, vistaCalle: "row-der-izq" },
  { id: "L", col: 6, row: 1, tipologia: "3R", vistaCalle: "row-der-izq" },
  { id: "K", col: 7, row: 1, tipologia: "3R", vistaCalle: "row-der-izq" },

  // Manzana central 3R — fila sur (vista desde calle sur, mirando norte)
  { id: "A", col: 4, row: 2, tipologia: "3R", etapa1: true, vistaCalle: "row-izq-der" },
  { id: "B", col: 5, row: 2, tipologia: "3R", etapa1: true, vistaCalle: "row-izq-der" },
  { id: "C", col: 6, row: 2, tipologia: "3R", vistaCalle: "row-izq-der" },
  { id: "D", col: 7, row: 2, tipologia: "3R", vistaCalle: "row-izq-der" },

  // Columna este 2R — acceso desde calle oeste (mirando al este)
  { id: "J", col: 9, row: 1, tipologia: "2R", vistaCalle: "stack-izq-der" },
  { id: "I", col: 9, row: 2, tipologia: "2R", vistaCalle: "stack-izq-der" },
  { id: "H", col: 9, row: 3, tipologia: "2R", vistaCalle: "stack-izq-der" },
  { id: "G", col: 9, row: 4, tipologia: "2R", vistaCalle: "stack-izq-der" },

  // Sur-este
  { id: "E", col: 9, row: 5, tipologia: "2R", lados: ["der"], vistaCalle: "stack-izq-der" },
  { id: "F", col: 8, row: 5, tipologia: "2R", vistaCalle: "row-der-izq" },
];

export const MISION_LA_GAVIA_PLANO: DisponibilidadPlanoConfigGavia = {
  desarrolloId: MISION_LA_GAVIA_DESARROLLO_ID,
  kind: "edificio-lado-niveles",
  edificios: MISION_LA_GAVIA_EDIFICIOS,
  gridCols: 9,
  gridRows: 5,
};

export const GAVIA_NIVEL_LABEL: Record<1 | 2 | 3, string> = {
  1: "Planta baja",
  2: "Primer nivel",
  3: "Segundo + roof",
};

export const GAVIA_LADO_LABEL: Record<GaviaLado, string> = {
  izq: "Izquierdo",
  der: "Derecho",
};

export function normalizeGaviaLado(value: string): GaviaLado | null {
  const v = value.trim().toLowerCase();
  if (v === "izq" || v === "izquierdo" || v === "izquierda" || v === "1") {
    return "izq";
  }
  if (v === "der" || v === "derecho" || v === "derecha" || v === "2") {
    return "der";
  }
  return null;
}

/** Decodifica `R-101` → edificio R, izq, nivel 1. */
export function decodeMisionLaGaviaUnidad(codigo: string): GaviaDecodedUnidad | null {
  const match = /^([A-Ra-r])\s*[-–]?\s*([12])(0[1-3])$/.exec(codigo.trim());
  if (!match) {
    return null;
  }

  const edificio = match[1].toUpperCase();
  if (!EDIFICIO_IDS.has(edificio)) {
    return null;
  }

  const ladoDigit = match[2];
  const nivelDigit = Number(match[3].slice(1)) as 1 | 2 | 3;

  return {
    codigo: `${edificio}-${ladoDigit}0${nivelDigit}`,
    edificio: edificio as GaviaEdificioId,
    lado: ladoDigit === "1" ? "izq" : "der",
    nivel: nivelDigit,
  };
}

export function buildGaviaUnidadCodigo(
  edificio: GaviaEdificioId,
  lado: GaviaLado,
  nivel: 1 | 2 | 3,
): string {
  const ladoDigit = lado === "izq" ? "1" : "2";
  return `${edificio}-${ladoDigit}0${nivel}`;
}

export function expectedUnidadesForLado(
  edificio: GaviaEdificioId,
  lado: GaviaLado,
): string[] {
  return ([1, 2, 3] as const).map((nivel) => buildGaviaUnidadCodigo(edificio, lado, nivel));
}

export function getGaviaEdificioLados(edificio: GaviaEdificioLayout): GaviaLado[] {
  const available = new Set(edificio.lados ?? ["izq", "der"]);
  const vista = edificio.vistaCalle ?? "row-izq-der";

  const order: GaviaLado[] =
    vista === "stack-der-izq" || vista === "row-der-izq"
      ? ["der", "izq"]
      : ["izq", "der"];

  return order.filter((lado) => available.has(lado));
}

export function isGaviaVistaApilada(edificio: GaviaEdificioLayout): boolean {
  const vista = edificio.vistaCalle ?? "row-izq-der";
  return vista === "stack-der-izq" || vista === "stack-izq-der";
}

/**
 * Orden de niveles en el plano: el último cercano a la calle de acceso.
 * - O–R (calle este): 3 · 2 · PB → derecha = calle
 * - J–G (calle oeste): PB · 2 · 3 → izquierda = calle
 * - A–D (calle sur): 3 · 2 · PB vertical (abajo = calle)
 * - N–K (calle norte): PB · 2 · 3 vertical (arriba = calle)
 */
export function getGaviaNivelesOrden(
  edificio: GaviaEdificioLayout,
): Array<1 | 2 | 3> {
  const vista = edificio.vistaCalle ?? "row-izq-der";
  if (vista === "stack-izq-der" || vista === "row-der-izq") {
    return [1, 2, 3];
  }
  return [3, 2, 1];
}

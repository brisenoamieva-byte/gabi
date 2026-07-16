import { getCotizadorKind } from "@/lib/catalog/desarrollos-registry";
import { getPasajeSimuladorConfig } from "@/lib/cotizador/pasaje-simulador";
import { getMisionLaGaviaEsquemas } from "@/lib/corredor/mision-la-gavia-simulador";

/** Regla de descuento publicada en una lista de precios (fracción 0–1). */
export type ListaPrecioEsquemaDescuento = {
  id: string;
  label: string;
  /** Fracción 0–1 (ej. 0.159 = 15.9%). */
  descuentoPct: number;
  incluirEnPdf: boolean;
  orden: number;
};

const round4 = (value: number) => Math.round(value * 10000) / 10000;

export const precioConDescuentoEsquema = (
  precioLista: number,
  descuentoPct: number,
): number => {
  const pct = clampDescuentoFrac(descuentoPct);
  return Math.round(precioLista * (1 - pct) * 100) / 100;
};

export const clampDescuentoFrac = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(0.95, Math.max(0, value));
};

/** % para UI (15.9) ↔ fracción (0.159). */
export const descuentoFracToPctPoints = (frac: number): number =>
  Math.round(clampDescuentoFrac(frac) * 10000) / 100;

export const descuentoPctPointsToFrac = (pctPoints: number): number =>
  clampDescuentoFrac(pctPoints / 100);

const makeRule = (
  id: string,
  label: string,
  descuentoPct: number,
  orden: number,
  incluirEnPdf = true,
): ListaPrecioEsquemaDescuento => ({
  id,
  label,
  descuentoPct: round4(clampDescuentoFrac(descuentoPct)),
  incluirEnPdf,
  orden,
});

/** Defaults según reglas comerciales del desarrollo (simuladores vigentes). */
export const getDefaultDescuentosEsquema = (
  desarrolloId: string,
): ListaPrecioEsquemaDescuento[] => {
  const kind = getCotizadorKind(desarrolloId);

  if (kind === "pasaje") {
    const contado = getPasajeSimuladorConfig("departamento").descuentoContadoPct;
    return [
      makeRule("contado", "Contado", contado, 1),
      makeRule("contado-diferido", "Contado diferido", contado, 2),
      makeRule("msi", "MSI", contado, 3),
      makeRule("30-30-40", "30-30-40", contado, 4),
    ];
  }

  if (kind === "mision-gavia") {
    return getMisionLaGaviaEsquemas()
      .filter((esquema) => esquema.id !== "libre")
      .map((esquema, index) =>
        makeRule(esquema.id, esquema.label, esquema.descuentoPct, index + 1),
      );
  }

  if (kind === "investti") {
    return [
      makeRule("contado", "Contado", 0.0899, 1),
      makeRule("12msi", "12 MSI", 0.05, 2),
      makeRule("24msi", "24 MSI", 0.03, 3),
    ];
  }

  return [makeRule("contado", "Contado", 0, 1)];
};

export const normalizeDescuentosEsquema = (
  raw: unknown,
  fallback: ListaPrecioEsquemaDescuento[] = [],
): ListaPrecioEsquemaDescuento[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return fallback.map((row, index) => ({
      ...row,
      orden: row.orden || index + 1,
    }));
  }

  const rows: ListaPrecioEsquemaDescuento[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const item = raw[index];
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const label = String(row.label ?? "").trim();
    if (!id || !label) {
      continue;
    }
    const descuentoRaw = Number(row.descuentoPct);
    rows.push(
      makeRule(
        id,
        label,
        descuentoRaw,
        Number.isFinite(Number(row.orden)) ? Number(row.orden) : index + 1,
        row.incluirEnPdf !== false,
      ),
    );
  }

  if (!rows.length) {
    return fallback;
  }

  return rows.sort((a, b) => a.orden - b.orden);
};

export const descuentosParaPdf = (
  rules: ListaPrecioEsquemaDescuento[],
): ListaPrecioEsquemaDescuento[] =>
  rules.filter((row) => row.incluirEnPdf).sort((a, b) => a.orden - b.orden);

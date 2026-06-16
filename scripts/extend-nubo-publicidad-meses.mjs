import fs from "node:fs";
import path from "node:path";

const TOTAL = 30;
const partidasPath = path.join(
  process.cwd(),
  "src/lib/estudios/nubo-publicidad-partidas.ts",
);

const src = fs.readFileSync(partidasPath, "utf8");
const match = src.match(
  /export const NUBO_PUBLICIDAD_PARTIDAS_MENSUAL = (\[[\s\S]*?\]) as const/,
);
if (!match) throw new Error("No se encontró NUBO_PUBLICIDAD_PARTIDAS_MENSUAL");

const partidas = JSON.parse(match[1]);

function padMeses(meses, total = TOTAL) {
  const normalized = meses.map((m) => Math.max(0, Number(m) || 0));
  if (normalized.length >= total) return normalized.slice(0, total);

  const result = [...normalized];
  const nonZero = normalized.filter((m) => m > 0);

  if (nonZero.length > 0 && normalized.every((m) => m === nonZero[0])) {
    while (result.length < total) result.push(nonZero[0]);
    return result;
  }

  if (nonZero.length === 1) {
    while (result.length < total) result.push(0);
    return result;
  }

  while (result.length < total) {
    result.push(normalized[result.length % normalized.length] ?? 0);
  }
  return result;
}

const extended = partidas.map((p) => {
  const meses = padMeses(p.meses);
  return {
    ...p,
    meses,
    anual: meses.reduce((sum, m) => sum + m, 0),
  };
});

const contents = `/** Generado desde Presupuesto 23sep24.xlsx — extendido a ${TOTAL} meses (Ago 2026–Ene 2029) */
export type NuboPublicidadPartidaMensual = {
  proveedor: string;
  concepto: string;
  segmento: string;
  anual: number;
  meses: readonly number[];
};

export const NUBO_PUBLICIDAD_PARTIDAS_MENSUAL = ${JSON.stringify(extended, null, 2)} as const satisfies readonly NuboPublicidadPartidaMensual[];
`;

fs.writeFileSync(partidasPath, contents);
console.log(`Extended ${extended.length} partidas → ${TOTAL} months each`);

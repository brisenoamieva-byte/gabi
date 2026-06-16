import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const xlsxPath =
  process.argv[2] ??
  "g:/Unidades compartidas/Puerta Allende/Presupuesto 23sep24.xlsx";

const wb = XLSX.readFile(xlsxPath);
const data = XLSX.utils.sheet_to_json(wb.Sheets["Proyectado"], {
  header: 1,
  defval: "",
});

const segmentoMap = {
  "Campaña Digital": "Campaña digital",
  "Herramienta tecnológica": "Herramientas",
  "Publicidad Impresa": "Publicidad impresa",
};

const proveedorMap = {
  "Dragon CEM": "Xperience",
};

/** @type {Array<{proveedor:string,concepto:string,segmento:string,anual:number,meses:number[]}>} */
const partidas = [];

for (let i = 12; i <= 34; i++) {
  const row = data[i];
  if (!row?.[2]) continue;
  const segmentoRaw = String(row[3]);
  partidas.push({
    proveedor: proveedorMap[String(row[1]).replace(/\s*\|\s*/g, " · ")] ??
      String(row[1]).replace(/\s*\|\s*/g, " · "),
    concepto: String(row[2]),
    segmento: segmentoMap[segmentoRaw] ?? segmentoRaw,
    anual: Number(row[4]) || 0,
    meses: row.slice(5, 17).map((v) => Number(v) || 0),
  });
}

/** Calendario NUBO: Ago 2026 = índice 0 → Feb 2027 = índice 6 */
const EVENTO_FF_MES = 6;
const MESES_PROYECCION = 30;

for (const partida of partidas) {
  if (partida.concepto === "Evento F&F") {
    partida.meses = Array.from({ length: MESES_PROYECCION }, (_, i) =>
      i === EVENTO_FF_MES ? partida.anual : 0,
    );
  }

  if (partida.proveedor === "Edimoviles" && partida.concepto === "Renta de local") {
    partida.proveedor = "NUBO";
    partida.concepto = "Construcción de showroom 80 m²";
    partida.anual = 1_700_000;
    partida.meses = Array.from({ length: MESES_PROYECCION }, (_, i) => (i === 0 ? partida.anual : 0));
  }
}

for (const partida of partidas) {
  if (partida.meses.length < MESES_PROYECCION) {
    const src = partida.meses;
    const nonZero = src.filter((m) => m > 0);
    if (nonZero.length > 0 && src.every((m) => m === nonZero[0])) {
      partida.meses = Array.from({ length: MESES_PROYECCION }, () => nonZero[0]);
    } else if (nonZero.length === 1) {
      partida.meses = [...src, ...Array(MESES_PROYECCION - src.length).fill(0)];
    } else {
      partida.meses = Array.from(
        { length: MESES_PROYECCION },
        (_, i) => src[i % src.length] ?? 0,
      );
    }
    partida.anual = partida.meses.reduce((sum, m) => sum + m, 0);
  }
}

const outPath = path.join(
  process.cwd(),
  "src/lib/estudios/nubo-publicidad-partidas.ts",
);

const contents = `/** Generado desde Presupuesto 23sep24.xlsx — \`node scripts/generate-nubo-publicidad-partidas.mjs\` */
export type NuboPublicidadPartidaMensual = {
  proveedor: string;
  concepto: string;
  segmento: string;
  anual: number;
  meses: readonly number[];
};

export const NUBO_PUBLICIDAD_PARTIDAS_MENSUAL = ${JSON.stringify(partidas, null, 2)} as const satisfies readonly NuboPublicidadPartidaMensual[];
`;

fs.writeFileSync(outPath, contents);
console.log(`Wrote ${partidas.length} partidas → ${outPath}`);

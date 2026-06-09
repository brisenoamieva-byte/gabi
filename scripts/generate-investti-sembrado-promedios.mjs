/**
 * Promedio de m² de todos los lotes con dato en sembrado Investti (Arroyo, Simaté).
 * CDV se calcula en cdv-sembrado-analisis.ts.
 *
 * Uso: node scripts/generate-investti-sembrado-promedios.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../src/lib/corredor/investti-sembrado-promedios.generated.ts");

const SOURCES = [
  {
    id: "canadas-del-arroyo",
    nombre: "Cañadas del Arroyo",
    path:
      process.env.CDA_SEMBRADO_XLSX ??
      "G:/Unidades compartidas/Cañadas del Arroyo/CDA 4ta Sección/6. Control Gerencia/Sembrado 4ta Sección Cañadas del Arroyo 01_06_2026.xlsx",
    hdr: 7,
    m2Col: 2,
    filter: (r) => r[2] && Number(r[2]) > 0,
    fuente: "Sembrado 4ta Sección Cañadas del Arroyo 01/06/2026 — Control Gerencia Investti",
  },
  {
    id: "simate",
    nombre: "Simaté",
    path:
      process.env.SIMATE_SEMBRADO_XLSX ??
      "G:/Unidades compartidas/Simaté/6. Control Gerencia/Sembrado Simaté 2025.xlsx",
    hdr: 6,
    m2Col: 4,
    filter: (r) => r[4] && Number(r[4]) > 0 && String(r[7]).trim() !== "Cancelado",
    fuente: "Sembrado Simaté 2025 — Control Gerencia Investti",
  },
];

function promedioLotes(path, hdr, m2Col, filter) {
  const wb = XLSX.readFile(path, { cellDates: true });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sembrado"], { header: 1, defval: "" });
  const m2 = rows
    .slice(hdr + 1)
    .filter(filter)
    .map((r) => Number(r[m2Col]))
    .filter((n) => n > 0);
  if (!m2.length) throw new Error(`Sin lotes con m² en ${path}`);
  const sum = m2.reduce((a, b) => a + b, 0);
  return {
    totalLotes: m2.length,
    promedioSembradoM2: Math.round(sum / m2.length),
    minM2: Math.round(Math.min(...m2) * 10) / 10,
    maxM2: Math.round(Math.max(...m2) * 10) / 10,
  };
}

const promedios = {};
const fuentes = {};
const detalle = {};

for (const src of SOURCES) {
  const stats = promedioLotes(src.path, src.hdr, src.m2Col, src.filter);
  promedios[src.id] = stats.promedioSembradoM2;
  fuentes[src.id] = src.fuente;
  detalle[src.id] = { nombre: src.nombre, ...stats };
  console.log(`${src.nombre}: ${stats.promedioSembradoM2} m² (${stats.totalLotes} lotes)`);
}

const ts = `/** AUTO-GENERADO — scripts/generate-investti-sembrado-promedios.mjs */
/** Promedio de m² de todos los lotes con dato en sembrado (vendido + apartado + disponible). */

export const INVESTTI_SEMBRADO_METRAJE_PROMEDIO: Record<string, number> = ${JSON.stringify(promedios, null, 2)};

export const INVESTTI_SEMBRADO_METRAJE_FUENTE: Record<string, string> = ${JSON.stringify(fuentes, null, 2)};

export const INVESTTI_SEMBRADO_METRAJE_DETALLE = ${JSON.stringify(detalle, null, 2)} as const;
`;

fs.writeFileSync(OUT, ts);
console.log("Wrote", OUT);

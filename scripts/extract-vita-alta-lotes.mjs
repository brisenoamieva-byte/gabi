/**
 * Extrae lotes del plano LOT-01 (lotificación Fracción 8) → Excel.
 * Uso: node scripts/extract-vita-alta-lotes.mjs [pdf] [salida.xlsx]
 */
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = process.cwd();
const DEFAULT_PDF = path.join(
  ROOT,
  "public/propuestas/vita-alta/lotificacion-fraccion-8.pdf",
);
const DEFAULT_OUT = path.join(ROOT, "data/vita-alta-lotes-detalle.xlsx");

const pdfPath = process.argv[2] ?? DEFAULT_PDF;
const outPath = process.argv[3] ?? DEFAULT_OUT;

if (!fs.existsSync(pdfPath)) {
  console.error("No se encontró el PDF:", pdfPath);
  process.exit(1);
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function parseArea(str) {
  const m = str.replace(/\s/g, "").match(/^(\d{2,3}(?:\.\d+)?)\s*m[²2]?$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return n >= 80 && n <= 200 ? Math.round(n * 100) / 100 : null;
}

function parseManzana(str) {
  const m = str.match(/^MANZANA\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function nearestManzana(lot, manzanaItems, exclude = []) {
  return [...manzanaItems]
    .filter((m) => !exclude.includes(parseManzana(m.str)))
    .sort((a, b) => dist(a, lot) - dist(b, lot))[0];
}

function nearestDims(lot, items) {
  const dimPattern = /^\d+\.\d{2}$/;
  const near = items
    .filter((i) => i !== lot && dist(i, lot) < 25 && dimPattern.test(i.str))
    .sort((a, b) => dist(a, lot) - dist(b, lot));
  const frentes = near.filter((i) => {
    const n = parseFloat(i.str);
    return n >= 6 && n <= 9;
  });
  const fondos = near.filter((i) => {
    const n = parseFloat(i.str);
    return n >= 14 && n <= 16;
  });
  const frente = frentes[0] ? parseFloat(frentes[0].str) : null;
  const fondo = fondos[0] ? parseFloat(fondos[0].str) : null;
  return { frente, fondo };
}

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const page = await doc.getPage(1);
const tc = await page.getTextContent();

const items = tc.items
  .filter((i) => "str" in i && i.str.trim())
  .map((i) => ({
    str: i.str.trim(),
    x: i.transform[4],
    y: i.transform[5],
  }));

const lotItems = items.filter((i) => /^LOTE\s+(\d+)$/i.test(i.str));
const manzanaItems = items.filter((i) => parseManzana(i.str));
const etapaItems = items.filter((i) => /^ETAPA\s+\d+$/i.test(i.str));

const rows = lotItems.map((lot) => {
  const num = parseInt(lot.str.replace(/\D/g, ""), 10);
  const nearArea = items
    .filter((i) => i !== lot && dist(i, lot) < 20 && parseArea(i.str))
    .sort((a, b) => dist(a, lot) - dist(b, lot))[0];
  const nearEtapa = [...etapaItems].sort((a, b) => dist(a, lot) - dist(b, lot))[0];
  const dims = nearestDims(lot, items);
  return {
    etapa: nearEtapa ? parseInt(nearEtapa.str.replace(/\D/g, ""), 10) : null,
    lote: num,
    superficie_m2: nearArea ? parseArea(nearArea.str) : null,
    frente_m: dims.frente,
    fondo_m: dims.fondo,
    _lot: lot,
  };
});

for (const row of rows) {
  const used = new Set();
  let m = nearestManzana(row._lot, manzanaItems, [...used]);
  let manz = parseManzana(m?.str);
  let attempts = 0;
  while (attempts < 15) {
    const existing = rows.find(
      (r) => r !== row && r._assigned && r.manzana === manz && r.lote === row.lote,
    );
    if (!existing) break;
    used.add(manz);
    m = nearestManzana(row._lot, manzanaItems, [...used]);
    if (!m) break;
    manz = parseManzana(m.str);
    attempts++;
  }
  row.manzana = manz;
  row._assigned = true;
  delete row._lot;
}

const withArea = rows.filter((r) => r.superficie_m2 != null);
const withoutArea = rows.filter((r) => r.superficie_m2 == null);

const exportRows = withArea
  .map(({ _assigned, ...r }) => ({
    Etapa: r.etapa,
    Manzana: r.manzana,
    Lote: r.lote,
    "Superficie (m²)": r.superficie_m2,
    "Frente (m)": r.frente_m ?? "",
    "Fondo (m)": r.fondo_m ?? "",
    "Precio/m²": "",
    "Precio lista": "",
    Estatus: "Disponible",
  }))
  .sort((a, b) => a.Etapa - b.Etapa || a.Manzana - b.Manzana || a.Lote - b.Lote);

exportRows.forEach((r, i) => {
  r["#"] = i + 1;
});

const resumen = [
  ["Vita Alta — Detalle de lotes (Fracción 8)"],
  ["Fuente", path.basename(pdfPath)],
  ["Desarrollador", "Grupo FRISA"],
  ["Total lotes en plano", exportRows.length],
  ["Lotes sin superficie en plano", withoutArea.length],
  ["Nota", "Precios pendientes de confirmación por desarrollador."],
  [],
  ["Etapa", "Lotes", "Superficie total (m²)", "Superficie prom. (m²)"],
];

const byEtapa = {};
for (const r of exportRows) {
  if (!byEtapa[r.Etapa]) byEtapa[r.Etapa] = [];
  byEtapa[r.Etapa].push(r);
}
for (const [etapa, list] of Object.entries(byEtapa).sort((a, b) => a[0] - b[0])) {
  const totalM2 = list.reduce((s, r) => s + r["Superficie (m²)"], 0);
  resumen.push([Number(etapa), list.length, Math.round(totalM2 * 100) / 100, Math.round((totalM2 / list.length) * 100) / 100]);
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen");
XLSX.utils.book_append_sheet(
  wb,
  XLSX.utils.json_to_sheet(exportRows, {
    header: ["#", "Etapa", "Manzana", "Lote", "Superficie (m²)", "Frente (m)", "Fondo (m)", "Precio/m²", "Precio lista", "Estatus"],
  }),
  "Lotes",
);

if (withoutArea.length) {
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      withoutArea.map((r) => ({ Etapa: r.etapa, Manzana: r.manzana, Lote: r.lote })),
    ),
    "Sin superficie",
  );
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
XLSX.writeFile(wb, outPath);

console.log("Lotes exportados:", exportRows.length);
console.log("Sin superficie:", withoutArea.length);
console.log("Archivo:", outPath);

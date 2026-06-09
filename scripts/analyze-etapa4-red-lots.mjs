import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pdfPath =
  process.argv[2] ??
  path.join(__dirname, "..", "public", "corredor", "cdv-etapa4-vobo-lotificacion.pdf");
const scale = 4;

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale });
const canvas = createCanvas(viewport.width, viewport.height);
const ctx = canvas.getContext("2d");
await page.render({ canvasContext: ctx, viewport }).promise;
const img = ctx.getImageData(0, 0, viewport.width, viewport.height);

function pdfToCanvas(x, y) {
  return {
    px: Math.round(x * scale),
    py: Math.round((viewport.height / scale - y) * scale),
  };
}

function sampleRedScore(px, py, radius = 8) {
  let red = 0;
  let total = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = px + dx;
      const y = py + dy;
      if (x < 0 || y < 0 || x >= viewport.width || y >= viewport.height) continue;
      const i = (y * viewport.width + x) * 4;
      const r = img.data[i];
      const g = img.data[i + 1];
      const b = img.data[i + 2];
      const a = img.data[i + 3];
      if (a < 30) continue;
      total++;
      if (r > 120 && r > g + 25 && r > b + 25 && g < 160) red++;
    }
  }
  return total ? red / total : 0;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function parseDim(str) {
  const m = str.replace(/\s/g, "").match(/^(\d+(?:\.\d+)?)m$/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return n >= 3 && n <= 45 ? n : null;
}

function parseArea(str) {
  const s = str.replace(/\s/g, "");
  let m = s.match(/^(\d{3}\.\d{2,3})m$/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (n >= 140 && n <= 500) return Math.round(n * 10) / 10;
  }
  m = s.match(/^(\d{2,3}\.\d{2,3})\s*m$/i);
  if (m) {
    const n = parseFloat(m[1]);
    if (n >= 140 && n <= 500) return Math.round(n * 10) / 10;
  }
  return null;
}

const styled = await page.getTextContent();
const items = styled.items
  .filter((item) => "str" in item && item.str.trim())
  .map((item) => {
    const { px, py } = pdfToCanvas(item.transform[4], item.transform[5]);
    const str = item.str.trim();
    return {
      str,
      x: item.transform[4],
      y: item.transform[5],
      redScore: sampleRedScore(px, py),
      red: sampleRedScore(px, py) >= 0.08,
      dim: parseDim(str),
      area: parseArea(str),
      isLot: /^L-?\d+$/i.test(str),
    };
  });

const redLots = [...new Map(items.filter((i) => i.red && i.isLot).map((i) => [i.str, i])).values()];
const dims = items.filter((i) => i.dim != null);
const areas = items.filter((i) => i.area != null);

const lotEstimates = redLots.map((lot) => {
  const near = items
    .filter((i) => i !== lot && dist(i, lot) < 55)
    .sort((a, b) => dist(a, lot) - dist(b, lot));

  const nearArea = near.find((i) => i.area != null);
  if (nearArea) {
    return { lot: lot.str, m2: nearArea.area, method: "anotación", note: nearArea.str };
  }

  const nearDims = near.filter((i) => i.dim != null).slice(0, 6).map((i) => i.dim);
  const frentes = nearDims.filter((d) => d >= 6 && d <= 16);
  const fondos = nearDims.filter((d) => d >= 14 && d <= 40);
  if (frentes.length && fondos.length) {
    const products = [];
    for (const f of frentes) {
      for (const b of fondos) {
        products.push(Math.round(f * b));
      }
    }
    products.sort((a, b) => a - b);
    const mid = products[Math.floor(products.length / 2)];
    return {
      lot: lot.str,
      m2: mid,
      method: "frente×fondo cercano",
      note: `${frentes[0]}×${fondos[0]} …`,
    };
  }

  return { lot: lot.str, m2: null, method: "sin dato", note: "" };
});

lotEstimates.sort((a, b) => (a.m2 ?? 9999) - (b.m2 ?? 9999));

console.log("Red new lots detected:", redLots.length);
console.log("Explicit areas on plan:", areas.map((a) => `${a.area} (${a.str})`).join(", "));

console.log("\n=== Estimación por lote nuevo (rojo) ===");
for (const e of lotEstimates) {
  console.log(`  ${e.lot}: ${e.m2 ?? "?"} m² [${e.method}] ${e.note}`);
}

const withM2 = lotEstimates.filter((e) => e.m2 != null).map((e) => e.m2);
if (withM2.length) {
  withM2.sort((a, b) => a - b);
  const in220 = withM2.filter((m) => m >= 220 && m <= 260).length;
  console.log("\n=== Resumen lotes nuevos ===");
  console.log("  Con estimación:", withM2.length);
  console.log("  Mínimo:", withM2[0], "m²");
  console.log("  Máximo:", withM2[withM2.length - 1], "m²");
  console.log("  Mediana:", withM2[Math.floor(withM2.length / 2)], "m²");
  console.log("  En 220–260:", in220, `(${Math.round((in220 / withM2.length) * 100)}%)`);
}

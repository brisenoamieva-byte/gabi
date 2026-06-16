/**
 * Normaliza logotipos: recorte de márgenes y fondo negro → blanco.
 * Uso: node scripts/normalize-desarrollos-logos.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DIR = path.join(process.cwd(), "public/propuestas/desarrollos-alianzas");

async function normalizeLogo(filePath) {
  const trimmed = await sharp(filePath).trim({ threshold: 18 }).png().toBuffer();
  const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max < 12) {
      data[i + 3] = 0;
      continue;
    }

    // Gris oscuro casi negro (texto sobre fondo negro) → negro legible en fondo blanco
    if (max < 72 && max - min < 18) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }

  const out = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  await sharp(out).toFile(filePath);
  const meta = await sharp(filePath).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

const skip = new Set(["la-victoria.png", "la-gota.png", "canadas-del-arroyo.png"]);

const results = [];
for (const name of fs.readdirSync(DIR).filter((f) => f.endsWith(".png")).sort()) {
  if (skip.has(name)) continue;
  const filePath = path.join(DIR, name);
  const dims = await normalizeLogo(filePath);
  results.push({ name, ...dims });
}

console.log(JSON.stringify(results, null, 2));

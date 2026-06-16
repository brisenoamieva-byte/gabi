/**
 * Quita el fondo negro del organigrama NUBO y oscurece líneas conectoras para fondo blanco.
 * Uso: node scripts/normalize-organigrama.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const FILE = path.join(process.cwd(), "public/propuestas/nubo/organigrama.png");

function isBlack(data, i) {
  return Math.max(data[i], data[i + 1], data[i + 2]) < 20;
}

function isNearWhite(data, i) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return r > 210 && g > 210 && b > 210 && Math.max(r, g, b) - Math.min(r, g, b) < 25;
}

function isColored(data, i) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return Math.max(r, g, b) - Math.min(r, g, b) > 35 && Math.max(r, g, b) > 40;
}

const { data, info } = await sharp(FILE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width;
const h = info.height;

function idx(x, y) {
  return (y * w + x) * 4;
}

for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = idx(x, y);
    if (isBlack(data, i)) data[i + 3] = 0;
  }
}

for (let y = 1; y < h - 1; y++) {
  for (let x = 1; x < w - 1; x++) {
    const i = idx(x, y);
    if (data[i + 3] === 0 || !isNearWhite(data, i)) continue;
    let onBox = false;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const j = idx(x + dx, y + dy);
      if (data[j + 3] > 0 && isColored(data, j)) {
        onBox = true;
        break;
      }
    }
    if (!onBox) {
      data[i] = 148;
      data[i + 1] = 163;
      data[i + 2] = 184;
      data[i + 3] = 255;
    }
  }
}

const out = Buffer.alloc(w * h * 4);
for (let i = 0; i < w * h; i++) {
  const s = i * 4;
  if (data[s + 3] === 0) {
    out[s] = 255;
    out[s + 1] = 255;
    out[s + 2] = 255;
    out[s + 3] = 255;
  } else {
    out[s] = data[s];
    out[s + 1] = data[s + 1];
    out[s + 2] = data[s + 2];
    out[s + 3] = 255;
  }
}

const tmp = `${FILE}.tmp`;
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(tmp);
fs.renameSync(tmp, FILE);
console.log("Organigrama actualizado:", FILE);

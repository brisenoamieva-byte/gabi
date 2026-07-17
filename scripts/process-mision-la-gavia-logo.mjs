import fs from "fs";
import path from "path";
import sharp from "sharp";

const assetsDir =
  "C:/Users/brise/.cursor/projects/c-Users-brise-gabi-bbr-asesores-guia/assets";
const outDir = path.join(process.cwd(), "public", "logos");

const SOURCE_GLOB = "Misi_n_la_Gavia_vertical";

function findSource() {
  const files = fs.readdirSync(assetsDir);
  const match = files.find((f) => f.includes(SOURCE_GLOB));
  if (!match) {
    throw new Error(`No se encontró logo La Gavia en ${assetsDir}`);
  }
  return path.join(assetsDir, match);
}

async function processLogo(srcPath, destName, { onDark = false } = {}) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    if (max <= 28) {
      if (onDark) {
        data[i] = 20;
        data[i + 1] = 69;
        data[i + 2] = 61;
        data[i + 3] = 255;
      } else {
        data[i + 3] = 0;
      }
    } else {
      data[i + 3] = 255;
    }
  }

  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, destName);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log("OK", outPath);
}

const src = findSource();
await processLogo(src, "mision-la-gavia.png");
await processLogo(src, "mision-la-gavia-mark.png", { onDark: true });

const mainPath = path.join(outDir, "mision-la-gavia.png");
const mainMeta = await sharp(mainPath).metadata();
const mainW = mainMeta.width ?? 707;
const mainH = mainMeta.height ?? 606;

/**
 * El PNG completo incluye el tagline «RESPIRO URBANO» abajo.
 * El selector debe conservar pájaro + MISIÓN + LA GAVIA (sin cortar tipografía).
 * Cortes agresivos (~82%) partían «LA GAVIA» a la mitad.
 */
const { data: rawMain, info: rawInfo } = await sharp(mainPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const rowHasInk = (y) => {
  let ink = 0;
  const w = rawInfo.width;
  for (let x = 0; x < w; x += 1) {
    const i = (y * w + x) * 4;
    if (rawMain[i + 3] > 20 && rawMain[i] + rawMain[i + 1] + rawMain[i + 2] > 40) {
      ink += 1;
    }
  }
  return ink > w * 0.01;
};

const bands = [];
let inBand = false;
let bandStart = 0;
for (let y = 0; y < rawInfo.height; y += 1) {
  const ink = rowHasInk(y);
  if (ink && !inBand) {
    inBand = true;
    bandStart = y;
  }
  if (!ink && inBand) {
    bands.push([bandStart, y - 1]);
    inBand = false;
  }
}
if (inBand) {
  bands.push([bandStart, rawInfo.height - 1]);
}

// Última banda = tagline; cortar un poco después de la penúltima (LA GAVIA).
const nameBand = bands.length >= 2 ? bands[bands.length - 2] : bands[bands.length - 1];
const selectorHeight = Math.min(
  mainH,
  Math.max(1, (nameBand?.[1] ?? Math.round(mainH * 0.9)) + 12),
);

await sharp(mainPath)
  .extract({
    left: 0,
    top: 0,
    width: mainW,
    height: selectorHeight,
  })
  .trim({ threshold: 12 })
  .extend({
    top: 16,
    bottom: 16,
    left: 20,
    right: 20,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, "mision-la-gavia-selector.png"));
console.log("OK", path.join(outDir, "mision-la-gavia-selector.png"), {
  selectorHeight,
  bands,
});

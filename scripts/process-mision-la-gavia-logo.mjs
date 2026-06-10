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

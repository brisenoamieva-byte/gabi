import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const input = path.join(root, "public/logos/gabi-logo.png");
const output = path.join(root, "public/logos/gabi-logo-transparent.png");
const iconOutput = path.join(root, "public/logos/gabi-icon.png");

/** Cream background sampled from brand asset (~#F2F0E9) */
const BG = { r: 242, g: 240, b: 233 };
const TOLERANCE = 28;

function isBackground(r, g, b, a) {
  if (a < 16) return true;
  const dr = Math.abs(r - BG.r);
  const dg = Math.abs(g - BG.g);
  const db = Math.abs(b - BG.b);
  return dr <= TOLERANCE && dg <= TOLERANCE && db <= TOLERANCE;
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (isBackground(r, g, b, data[i + 3])) {
    data[i + 3] = 0;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(output);

await sharp(output)
  .resize(512, null, { fit: "inside", withoutEnlargement: false })
  .png()
  .toFile(iconOutput);

console.log("Wrote", output);
console.log("Wrote", iconOutput);

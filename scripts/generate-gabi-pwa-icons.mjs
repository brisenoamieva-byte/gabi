import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";

/**
 * Regenera PNG PWA + favicon desde public/logos/gabi-icon.svg
 * (misma geometría que GabiMark en src/components/brand/GabiLogo.tsx).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logosDir = path.join(root, "public", "logos");
const svgPath = path.join(logosDir, "gabi-icon.svg");
const svgBuffer = readFileSync(svgPath);

const outputs = [
  { file: "gabi-icon-512.png", size: 512 },
  { file: "gabi-icon-192.png", size: 192 },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "gabi-icon.png", size: 512 },
];

for (const { file, size } of outputs) {
  await sharp(svgBuffer).resize(size, size).png().toFile(path.join(logosDir, file));
  console.log("Wrote", file);
}

// Favicon multi-size ICO (16 / 32 / 48) para src/app/favicon.ico
const icoSizes = [16, 32, 48];
const pngBuffers = [];
for (const size of icoSizes) {
  pngBuffers.push(await sharp(svgBuffer).resize(size, size).png().toBuffer());
}

try {
  const pngToIco = (await import("png-to-ico")).default;
  const ico = await pngToIco(pngBuffers);
  writeFileSync(path.join(root, "src", "app", "favicon.ico"), ico);
  console.log("Wrote src/app/favicon.ico");
} catch (error) {
  console.warn(
    "png-to-ico no disponible; se copió PNG 32px como fallback icon.",
    error instanceof Error ? error.message : error,
  );
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(root, "src", "app", "icon.png"));
  console.log("Wrote src/app/icon.png");
}

// Icono App Router (Next metadata)
writeFileSync(path.join(root, "src", "app", "icon.svg"), readFileSync(svgPath));
console.log("Wrote src/app/icon.svg");

console.log("PWA icons ready.");

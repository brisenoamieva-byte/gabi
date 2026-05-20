import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logosDir = path.join(__dirname, "..", "public", "logos");

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="108" fill="#13315C"/>
  <circle cx="256" cy="256" r="200" fill="#13315C"/>
  <text x="256" y="318" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="280" font-weight="800" fill="#2DD4BF">g</text>
</svg>`;

const svgBuffer = Buffer.from(iconSvg);

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

writeFileSync(
  path.join(logosDir, "gabi-icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="108" fill="#13315C"/>
  <text x="256" y="318" text-anchor="middle" font-family="system-ui,sans-serif" font-size="280" font-weight="800" fill="#2DD4BF">g</text>
</svg>`,
);

console.log("PWA icons ready.");

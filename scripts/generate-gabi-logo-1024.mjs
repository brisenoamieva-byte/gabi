import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyFileSync, existsSync, statSync } from "node:fs";

/**
 * Logo oficial gabi: wordmark "g"(teal)+"abi"(blanco) sobre navy con esquinas redondeadas.
 * Salida 1024×1024 PNG para Meta / app icons (rango 512–1024, máx 5 MB).
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logosDir = path.join(__dirname, "..", "public", "logos");
const out = path.join(logosDir, "gabi-logo-1024.png");
const out512 = path.join(logosDir, "gabi-logo-512.png");

const SIZE = 1024;
const RX = Math.round((SIZE * 48) / 300);
const FONT = Math.round((SIZE * 82) / 300);
const TRACK = ((SIZE * -3.5) / 300).toFixed(2);
const BASELINE = Math.round((SIZE * 170) / 300);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" rx="${RX}" fill="#13315C"/>
  <text x="${SIZE / 2}" y="${BASELINE}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${FONT}" font-weight="700" letter-spacing="${TRACK}">
    <tspan fill="#2DD4BF">g</tspan><tspan fill="#FFFFFF">abi</tspan>
  </text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
await sharp(out).resize(512, 512).png({ compressionLevel: 9 }).toFile(out512);

const meta = await sharp(out).metadata();
const bytes = statSync(out).size;
console.log("Wrote", out, `${meta.width}x${meta.height}`, `${(bytes / 1024).toFixed(1)} KB`);
console.log("Wrote", out512);

// Keep LinkedIn 300 in sync with same artwork if missing
const linkedin = path.join(logosDir, "gabi-linkedin-300.png");
const refAsset = path.join(logosDir, "_ref-gabi-wordmark.png");
if (existsSync(refAsset) && !existsSync(linkedin)) {
  copyFileSync(refAsset, linkedin);
}

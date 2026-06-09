/**
 * Extrae imágenes del PPTX NUBO → public/propuestas/nubo/
 * Uso: node scripts/extract-nubo-pptx-assets.mjs [ruta.pptx]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_PPTX =
  "c:/Users/brise/OneDrive/Obsoletos/archivos/Escritorio9nov19/Escritorio2/Escritorio/Propuesta Comercial NUBO1.pptx";
const OUT = path.join(ROOT, "public/propuestas/nubo");

const MAP = {
  "image26.png": "master-plan.png",
  "image30.jpeg": "acceso-1.jpg",
  "image31.jpeg": "acceso-2.jpg",
  "image32.jpeg": "acceso-3.jpg",
  "image33.jpeg": "amenidad-1.jpg",
  "image34.jpeg": "amenidad-2.jpg",
  "image35.jpeg": "amenidad-3.jpg",
  "image36.jpeg": "amenidad-4.jpg",
  "image37.jpeg": "amenidad-5.jpg",
  "image38.jpeg": "evento-1.jpg",
  "image39.png": "evento-2.png",
  "image40.jpeg": "evento-3.jpg",
  "image41.jpeg": "evento-4.jpg",
  "image42.jpg": "feria-1.jpg",
  "image43.jpg": "feria-2.jpg",
  "image44.jpg": "feria-3.jpg",
  "image15.png": "organigrama.png",
  "image2.png": "bbr-logo.png",
};

const pptx = process.argv[2] ?? DEFAULT_PPTX;
if (!fs.existsSync(pptx)) {
  console.error("No se encontró:", pptx);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
const { execSync } = await import("node:child_process");
const tmp = path.join(OUT, ".tmp-extract");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });
fs.copyFileSync(pptx, path.join(tmp, "deck.zip"));

if (process.platform === "win32") {
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Path '${path.join(tmp, "deck.zip")}' -DestinationPath '${tmp}' -Force"`,
    { stdio: "inherit" },
  );
} else {
  execSync(`unzip -o "${path.join(tmp, "deck.zip")}" -d "${tmp}"`, { stdio: "inherit" });
}

const media = path.join(tmp, "ppt/media");
let copied = 0;
for (const [src, dest] of Object.entries(MAP)) {
  const from = path.join(media, src);
  if (!fs.existsSync(from)) {
    console.warn("Falta:", src);
    continue;
  }
  fs.copyFileSync(from, path.join(OUT, dest));
  copied += 1;
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Listo: ${copied} imágenes en public/propuestas/nubo/`);

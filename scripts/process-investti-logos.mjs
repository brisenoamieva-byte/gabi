import fs from "fs";
import path from "path";
import sharp from "sharp";

const assetsDir =
  "C:/Users/brise/.cursor/projects/c-Users-brise-gabi-bbr-asesores-guia/assets";
const outDir = path.join(process.cwd(), "public", "corredor", "logos", "investti");

/** Archivos originales compartidos por el usuario (fondo negro, sin canal alpha). */
const SOURCES = [
  {
    src: `${assetsDir}/c__Users_brise_AppData_Roaming_Cursor_User_workspaceStorage_67633a6a8bf6ea8b9005f3630d5bfc0a_images_CA_ADAS_ID_2-9a401f7a-490b-4f13-92ad-f15f78bc5301.png`,
    dest: "canadas-del-valle.png",
  },
  {
    src: `${assetsDir}/c__Users_brise_AppData_Roaming_Cursor_User_workspaceStorage_67633a6a8bf6ea8b9005f3630d5bfc0a_images_CDA-1_2-72c16c13-1500-429a-9a8d-1ef467fb9de7.png`,
    dest: "canadas-del-arroyo.png",
    /** Logo Reserva: gris oscuro + cyan — fondo blanco en simulador/PDF. */
    arroyo: true,
  },
  {
    src: `${assetsDir}/c__Users_brise_AppData_Roaming_Cursor_User_workspaceStorage_67633a6a8bf6ea8b9005f3630d5bfc0a_images_gold-e7f3d231-0791-4c85-89cb-c79aeef5cedd.png`,
    dest: "canadas-la-porta.png",
    /** Dorado sobre negro — legible en recuadro oscuro del simulador. */
    laPorta: true,
  },
  {
    src: `${assetsDir}/c__Users_brise_AppData_Roaming_Cursor_User_workspaceStorage_67633a6a8bf6ea8b9005f3630d5bfc0a_images_simate_logodorado-08410787-3f27-41cc-98f4-efb6a4581f7a.png`,
    dest: "simate.png",
    transparent: true,
  },
];

function chroma(r, g, b) {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

/** Quita negro/gris neutro del fondo sin tocar verdes, grises de marca ni dorados. */
function alphaForPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const chromaVal = chroma(r, g, b);

  if (max <= 18) return 0;
  if (chromaVal < 10 && max <= 42) return 0;
  if (chromaVal < 8 && max <= 55) {
    return Math.round(((max - 42) / 13) * 255);
  }
  return 255;
}

/** Fondo Cañadas del Arroyo en simulador — blanco para legibilidad del nombre. */
const ARROYO_BG = { r: 255, g: 255, b: 255 };

/** Fondo Cañadas La Porta — negro cálido para dorado (#0C0B0A). */
const LA_PORTA_BG = { r: 12, g: 11, b: 10 };

function isLaPortaGold(r, g, b) {
  const max = Math.max(r, g, b);
  const chromaVal = chroma(r, g, b);
  return r >= 65 && g >= 45 && b <= 170 && chromaVal >= 10 && max >= 55;
}

function classifyArroyoPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const chromaVal = chroma(r, g, b);
  if (g >= 120 && b >= 120 && r <= 130 && chromaVal >= 35) return "brand";
  // Solo negro puro del fondo; el nombre va en gris ~#202020 y no debe borrarse.
  if (max <= 22 && chromaVal < 12) return "bg";
  if (max <= 210) return "text";
  return "brand";
}

async function processLogo({ src, dest, transparent = false, arroyo = false, laPorta = false }) {
  if (!fs.existsSync(src)) {
    const fallback = path.join(outDir, dest);
    if (!fs.existsSync(fallback)) {
      throw new Error(`No se encontró origen ni destino: ${src}`);
    }
    console.log("SKIP (sin original), reprocesando existente:", dest);
    return processFile(fallback, { transparent, arroyo, laPorta });
  }

  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, dest);
  fs.copyFileSync(src, filePath);
  await processFile(filePath, { transparent, arroyo, laPorta });
}

async function processFile(filePath, { transparent = false, arroyo = false, laPorta = false } = {}) {
  const image = sharp(filePath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (arroyo) {
      const kind = classifyArroyoPixel(r, g, b);
      if (kind === "bg") {
        data[i] = ARROYO_BG.r;
        data[i + 1] = ARROYO_BG.g;
        data[i + 2] = ARROYO_BG.b;
        data[i + 3] = 255;
      } else if (kind === "text") {
        // Conservar gris de marca (#202020) — legible sobre blanco.
        data[i + 3] = 255;
      } else {
        data[i + 3] = 255;
      }
    } else if (laPorta) {
      const max = Math.max(r, g, b);
      const chromaVal = chroma(r, g, b);
      if (max <= 35 && chromaVal < 22) {
        data[i] = LA_PORTA_BG.r;
        data[i + 1] = LA_PORTA_BG.g;
        data[i + 2] = LA_PORTA_BG.b;
        data[i + 3] = 255;
      } else if (isLaPortaGold(r, g, b)) {
        data[i + 3] = 255;
      } else if (max <= 55 && chromaVal < 14) {
        data[i] = LA_PORTA_BG.r;
        data[i + 1] = LA_PORTA_BG.g;
        data[i + 2] = LA_PORTA_BG.b;
        data[i + 3] = 255;
      } else {
        data[i + 3] = 255;
      }
    } else if (transparent) {
      const max = Math.max(r, g, b);
      const chromaVal = chroma(r, g, b);
      if (a < 20 || (max <= 30 && chromaVal < 18)) data[i + 3] = 0;
      else if (max <= 55 && chromaVal < 14) {
        data[i + 3] = Math.min(a, Math.round((chromaVal / 14) * a));
      }
    } else {
      data[i + 3] = alphaForPixel(r, g, b);
    }
  }

  const tmpPath = `${filePath}.tmp.png`;
  let pipeline = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });

  if (transparent) {
    pipeline = pipeline.trim({ threshold: 12 });
  } else if (arroyo) {
    pipeline = pipeline.flatten({ background: ARROYO_BG }).trim({ threshold: 10 });
  } else if (laPorta) {
    pipeline = pipeline.flatten({ background: LA_PORTA_BG }).trim({ threshold: 8 });
  } else {
    pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
  }

  await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(tmpPath);

  fs.renameSync(tmpPath, filePath);
}

// Resolver rutas en assets (cualquier variante subida por el usuario)
const assetFiles = fs.readdirSync(assetsDir);
const simateGlob = assetFiles.find((f) => f.includes("simate_logodorado"));
if (simateGlob) {
  const simateEntry = SOURCES.find((s) => s.dest === "simate.png");
  if (simateEntry) simateEntry.src = path.join(assetsDir, simateGlob);
}
const arroyoGlob =
  assetFiles.find((f) => f.includes("CDA-1_2__1_")) ??
  assetFiles.find((f) => f.includes("CDA-1_2")) ??
  assetFiles.find((f) => f.includes("image-a8391ccc"));
if (arroyoGlob) {
  const arroyoEntry = SOURCES.find((s) => s.dest === "canadas-del-arroyo.png");
  if (arroyoEntry) arroyoEntry.src = path.join(assetsDir, arroyoGlob);
}
const laPortaGlob =
  assetFiles.find((f) => f.includes("gold-e7f3d231")) ??
  assetFiles.find((f) => f.includes("gold_2-ee75a4b7")) ??
  assetFiles.find((f) => f.includes("_images_gold"));
if (laPortaGlob) {
  const laPortaEntry = SOURCES.find((s) => s.dest === "canadas-la-porta.png");
  if (laPortaEntry) laPortaEntry.src = path.join(assetsDir, laPortaGlob);
}

for (const entry of SOURCES) {
  await processLogo(entry);
  const tag = entry.transparent
    ? "(transparente)"
    : entry.arroyo
      ? "(arroyo)"
      : entry.laPorta
        ? "(la-porta)"
        : "";
  console.log("OK", entry.dest, tag);
}

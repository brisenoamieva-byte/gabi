const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/** Nombres en Excel (columna Desarrollo) → slug gabi */
const EXCEL_TO_SLUG = {
  Cañadas_del_Valle: "canadas-del-valle",
  Cañadas_del_Arroyo: "canadas-del-arroyo",
  Simaté: "simate",
  Cañadas_La_Porta: "canadas-la-porta",
};

function resolveXlsmPath() {
  if (process.env.INVESTTI_XLSM && fs.existsSync(process.env.INVESTTI_XLSM)) {
    return process.env.INVESTTI_XLSM;
  }
  const downloads = "c:\\Users\\brise\\Downloads";
  const candidates = fs
    .readdirSync(downloads)
    .filter(
      (f) =>
        /^Simulador Master Investti/i.test(f) &&
        f.endsWith(".xlsm") &&
        !f.startsWith("~$"),
    )
    .map((f) => ({ file: f, full: path.join(downloads, f), mtime: fs.statSync(path.join(downloads, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  // Preferir serie maestra 4feb25 (mismo layout que el simulador en gabi).
  const feb25 = candidates.filter((c) => /4feb25/i.test(c.file));
  const pool = feb25.length > 0 ? feb25 : candidates;
  if (pool[0]) return pool[0].full;

  throw new Error(
    "No se encontró Simulador Master Investti .xlsm en Downloads. Define INVESTTI_XLSM.",
  );
}

const xlsm = resolveXlsmPath();
const sourceName = path.basename(xlsm);
console.log("Fuente:", sourceName);

const wb = XLSX.readFile(xlsm);
const wsLista = wb.Sheets["Lista de precios"];
const rows = XLSX.utils.sheet_to_json(wsLista, { header: 1, defval: "" });

const header = rows[2];
console.log("Header:", header.slice(0, 20));

function parseMoney(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v * 100) / 100;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function formatEntregaCell(v) {
  if (v == null || v === "") return null;
  const serial = typeof v === "number" ? v : /^\d{4,6}$/.test(String(v).trim()) ? Number(v) : NaN;
  if (Number.isFinite(serial) && serial > 10000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed?.y) {
      const dt = new Date(parsed.y, parsed.m - 1, parsed.d);
      return dt.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
  }
  const text = String(v).trim();
  return text || null;
}

/** Reglas por desarrollo desde hoja Manzanas (apartado, enganche mín., plazo máx., mens. mín.). */
function parseReglasFromManzanas(manRows) {
  const apartadoByExcel = {};
  const engancheMin = {};
  const plazoMax = {};
  const mensMin = {};

  let section = null;
  for (const r of manRows) {
    const dev = String(r[4] ?? "").trim();
    const val = r[5];
    const label = String(val ?? "").trim();

    if (dev === "Desarrollo" && label === "Apartado") {
      section = "apartado";
      continue;
    }
    if (dev === "Desarrollo" && /enganche/i.test(label)) {
      section = "enganche";
      continue;
    }
    if (dev === "Desarrollo" && /max meses/i.test(label)) {
      section = "plazo";
      continue;
    }
    if (dev === "Desarrollo" && /mens\.\s*mínima/i.test(label)) {
      section = "mens";
      continue;
    }
    if (dev === "Desarrollo" && /infonavit/i.test(label)) {
      section = "infonavit";
      continue;
    }

    if (!dev || !(dev in EXCEL_TO_SLUG)) continue;
    if (section === "infonavit") continue;
    if (typeof val !== "number") continue;

    if (section === "apartado") apartadoByExcel[dev] = val;
    else if (section === "enganche") engancheMin[dev] = val;
    else if (section === "plazo") plazoMax[dev] = val;
    else if (section === "mens") mensMin[dev] = val;
  }

  const reglas = {};
  for (const [excelName, slug] of Object.entries(EXCEL_TO_SLUG)) {
    reglas[slug] = {
      engancheMinPct: engancheMin[excelName] ?? 0.15,
      plazoMaxMeses: plazoMax[excelName] ?? 60,
      mensualidadMinima: mensMin[excelName] ?? 7000,
      apartado: apartadoByExcel[excelName] ?? 50000,
    };
  }
  return reglas;
}

const lotes = [];
const byDev = {};

for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  const dev = String(r[0] ?? "").trim();
  if (!dev || !(dev in EXCEL_TO_SLUG)) continue;
  const manzana = String(r[1] ?? "").trim();
  const lote = String(r[2] ?? "").trim();
  const superficie = Number(r[5]);
  const tipo = String(r[6] ?? "").trim();
  const precioM2 = parseMoney(r[7]);
  const precioLista = parseMoney(r[8]);
  if (!manzana || !lote || !superficie || !precioLista) continue;

  byDev[dev] = (byDev[dev] || 0) + 1;
  lotes.push({
    desarrollo: dev,
    manzana,
    lote,
    key: `${dev}${manzana}-${lote}`,
    superficie,
    tipo,
    precioM2,
    precioLista,
    contado: parseMoney(r[9]),
    m6: parseMoney(r[10]),
    m12: parseMoney(r[11]),
    m18: parseMoney(r[12]),
    m24: parseMoney(r[13]),
    m36: parseMoney(r[14]),
    m48: parseMoney(r[15]),
    m60: parseMoney(r[16]),
    entrega: formatEntregaCell(r[17]),
  });
}

console.log("byDev", byDev, "total", lotes.length);
console.log("sample", lotes[0]);

const wsMan = wb.Sheets["Manzanas"];
const manRows = XLSX.utils.sheet_to_json(wsMan, { header: 1, defval: "" });
const manzanaConfig = [];
for (let i = 1; i < manRows.length; i++) {
  const r = manRows[i];
  const dev = String(r[0] ?? "").trim();
  const manzana = String(r[1] ?? "").trim();
  if (!dev || !manzana || !(dev in EXCEL_TO_SLUG)) continue;
  manzanaConfig.push({ desarrollo: dev, manzana });
}
console.log("manzanas count", manzanaConfig.length);

const reglas = parseReglasFromManzanas(manRows);
console.log("reglas", reglas);

const slugDesarrollo = Object.fromEntries(
  Object.entries(EXCEL_TO_SLUG).map(([k, v]) => [v, k]),
);

const config = {
  generatedAt: new Date().toISOString(),
  source: sourceName,
  interestAnual: 0.12,
  apartadoDefault: 50000,
  descuentosEsquemaPct: {
    contado: 0.0899,
    m6: 0.06078994337268717,
    m12: 0.04090999147584562,
    m18: 0.020646449482791707,
    m24: 0,
    m36: -0.042437540346608404,
    m48: -0.08639180451239925,
    m60: -0.131847790372845,
    m72: -0.25846215128266503,
    libre: -0.03270530357144197,
  },
  esquemas: [
    { id: "contado", label: "CONTADO", enganchePct: 1, engancheDiferidoMeses: 0, plazoMeses: 0 },
    { id: "m6", label: "6 meses", enganchePct: 0.3, engancheDiferidoMeses: 1, plazoMeses: 6 },
    { id: "m12", label: "12 meses", enganchePct: 0.3, engancheDiferidoMeses: 1, plazoMeses: 12 },
    { id: "m18", label: "18 meses", enganchePct: 0.3, engancheDiferidoMeses: 1, plazoMeses: 18 },
    { id: "m24", label: "24 meses", enganchePct: 0.3, engancheDiferidoMeses: 1, plazoMeses: 24 },
    { id: "m36", label: "36 meses", enganchePct: 0.3, engancheDiferidoMeses: 1, plazoMeses: 36 },
    { id: "m48", label: "48 meses", enganchePct: 0.3, engancheDiferidoMeses: 1, plazoMeses: 48 },
    { id: "m60", label: "60 meses", enganchePct: 0.3, engancheDiferidoMeses: 1, plazoMeses: 60 },
    { id: "m72", label: "72 meses", enganchePct: 0.15, engancheDiferidoMeses: 3, plazoMeses: 72 },
    { id: "libre", label: "LIBRE", enganchePct: 0.15, engancheDiferidoMeses: 3, plazoMeses: 23 },
  ],
  desarrolloSlug: { ...EXCEL_TO_SLUG },
  slugDesarrollo,
  reglas,
  stats: { lotes: lotes.length, byDev },
  manzanas: manzanaConfig,
  lotes,
};

const outJson = path.join(__dirname, "..", "public", "data", "investti-simulador-lotes.json");
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(config));
console.log("Wrote", outJson, `(${(fs.statSync(outJson).size / 1024).toFixed(0)} KB)`);

const outConfig = path.join(__dirname, "..", "src", "lib", "corredor", "investti-simulador-config.generated.ts");
const configOnly = {
  generatedAt: config.generatedAt,
  source: config.source,
  interestAnual: config.interestAnual,
  apartadoDefault: config.apartadoDefault,
  descuentosEsquemaPct: config.descuentosEsquemaPct,
  esquemas: config.esquemas,
  desarrolloSlug: config.desarrolloSlug,
  slugDesarrollo: config.slugDesarrollo,
  stats: config.stats,
  reglas: config.reglas,
};
fs.writeFileSync(
  outConfig,
  `/* eslint-disable */\nexport const INVESTTI_SIMULADOR_CONFIG = ${JSON.stringify(configOnly, null, 2)} as const;\n`,
);
console.log("Wrote", outConfig);

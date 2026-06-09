const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const xlsm = "c:\\Users\\brise\\Downloads\\Simulador Master Investti 4feb25 (25).xlsm";
const wb = XLSX.readFile(xlsm);
const wsLista = wb.Sheets["Lista de precios"];
const rows = XLSX.utils.sheet_to_json(wsLista, { header: 1, defval: "" });

// Row index 2 (0-based row 2 = line 3) is header
const header = rows[2];
console.log("Header:", header.slice(0, 20));

function parseMoney(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v * 100) / 100;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

const SKIP = /La_Porta|La Porta/i;
const lotes = [];
const byDev = {};

for (let i = 3; i < rows.length; i++) {
  const r = rows[i];
  const dev = String(r[0] ?? "").trim();
  if (!dev || SKIP.test(dev)) continue;
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
    entrega: String(r[17] ?? "").trim() || null,
  });
}

console.log("byDev", byDev, "total", lotes.length);
console.log("sample", lotes[0]);

// Manzanas config
const wsMan = wb.Sheets["Manzanas"];
const manRows = XLSX.utils.sheet_to_json(wsMan, { header: 1, defval: "" });
const manzanaConfig = [];
for (let i = 1; i < manRows.length; i++) {
  const r = manRows[i];
  const dev = String(r[0] ?? "").trim();
  const manzana = String(r[1] ?? "").trim();
  if (!dev || !manzana || SKIP.test(dev)) continue;
  manzanaConfig.push({ desarrollo: dev, manzana });
}
console.log("manzanas count", manzanaConfig.length);

const config = {
  generatedAt: new Date().toISOString(),
  source: "Simulador Master Investti 4feb25 (25).xlsm",
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
  desarrolloSlug: {
    Cañadas_del_Valle: "canadas-del-valle",
    Cañadas_del_Arroyo: "canadas-del-arroyo",
    Simaté: "simate",
  },
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
  slugDesarrollo: Object.fromEntries(Object.entries(config.desarrolloSlug).map(([k, v]) => [v, k])),
  stats: { lotes: lotes.length, byDev },
  reglas: {
    "canadas-del-valle": { engancheMinPct: 0.15, plazoMaxMeses: 60, apartado: 15000 },
    "canadas-del-arroyo": { engancheMinPct: 0.15, plazoMaxMeses: 60, apartado: 15000 },
    simate: { engancheMinPct: 0.2, plazoMaxMeses: 60, apartado: 30000 },
  },
};
fs.writeFileSync(
  outConfig,
  `/* eslint-disable */\nexport const INVESTTI_SIMULADOR_CONFIG = ${JSON.stringify(configOnly, null, 2)} as const;\n`,
);
console.log("Wrote", outConfig);

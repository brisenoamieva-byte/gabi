import * as XLSX from "xlsx";
import type {
  InvesttiDesarrolloReglas,
  InvesttiSimuladorPayload,
} from "@/lib/corredor/investti-simulador-data-types";

export const INVESTTI_EXCEL_TO_SLUG: Record<string, string> = {
  Cañadas_del_Valle: "canadas-del-valle",
  Cañadas_del_Arroyo: "canadas-del-arroyo",
  Simaté: "simate",
  Cañadas_La_Porta: "canadas-la-porta",
};

const DEFAULT_ESQUEMAS = [
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
] as const;

const DEFAULT_DESCUENTOS = {
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
};

function parseMoney(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Math.round(v * 100) / 100;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function formatEntregaCell(v: unknown): string | null {
  if (v == null || v === "") return null;
  const serial =
    typeof v === "number" ? v : /^\d{4,6}$/.test(String(v).trim()) ? Number(v) : NaN;
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

export function parseReglasFromManzanas(
  manRows: unknown[][],
): Record<string, InvesttiDesarrolloReglas> {
  const apartadoByExcel: Record<string, number> = {};
  const engancheMin: Record<string, number> = {};
  const plazoMax: Record<string, number> = {};
  const mensMin: Record<string, number> = {};

  let section: string | null = null;
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

    if (!dev || !(dev in INVESTTI_EXCEL_TO_SLUG)) continue;
    if (section === "infonavit") continue;
    if (typeof val !== "number") continue;

    if (section === "apartado") apartadoByExcel[dev] = val;
    else if (section === "enganche") engancheMin[dev] = val;
    else if (section === "plazo") plazoMax[dev] = val;
    else if (section === "mens") mensMin[dev] = val;
  }

  const reglas: Record<string, InvesttiDesarrolloReglas> = {};
  for (const [excelName, slug] of Object.entries(INVESTTI_EXCEL_TO_SLUG)) {
    reglas[slug] = {
      engancheMinPct: engancheMin[excelName] ?? 0.15,
      plazoMaxMeses: plazoMax[excelName] ?? 60,
      mensualidadMinima: mensMin[excelName] ?? 7000,
      apartado: apartadoByExcel[excelName] ?? 50000,
    };
  }
  return reglas;
}

export function extractInvesttiSimuladorFromBuffer(
  buffer: Buffer,
  sourceName: string,
): InvesttiSimuladorPayload {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const wsLista = wb.Sheets["Lista de precios"];
  const wsMan = wb.Sheets["Manzanas"];
  if (!wsLista || !wsMan) {
    throw new Error('El Excel debe incluir las hojas "Lista de precios" y "Manzanas".');
  }

  const rows = XLSX.utils.sheet_to_json(wsLista, { header: 1, defval: "" }) as unknown[][];
  const manRows = XLSX.utils.sheet_to_json(wsMan, { header: 1, defval: "" }) as unknown[][];

  const lotes: InvesttiSimuladorPayload["lotes"] = [];
  const byDev: Record<string, number> = {};

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const dev = String(r[0] ?? "").trim();
    if (!dev || !(dev in INVESTTI_EXCEL_TO_SLUG)) continue;
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
      precioM2: precioM2 ?? 0,
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

  if (!lotes.length) {
    throw new Error("No se encontraron lotes válidos en la hoja Lista de precios.");
  }

  const manzanas: Array<{ desarrollo: string; manzana: string }> = [];
  for (let i = 1; i < manRows.length; i++) {
    const r = manRows[i] as unknown[];
    const dev = String(r[0] ?? "").trim();
    const manzana = String(r[1] ?? "").trim();
    if (!dev || !manzana || !(dev in INVESTTI_EXCEL_TO_SLUG)) continue;
    manzanas.push({ desarrollo: dev, manzana });
  }

  const reglas = parseReglasFromManzanas(manRows);
  const generatedAt = new Date().toISOString();

  return {
    generatedAt,
    source: sourceName,
    interestAnual: 0.12,
    apartadoDefault: 50000,
    descuentosEsquemaPct: { ...DEFAULT_DESCUENTOS },
    esquemas: DEFAULT_ESQUEMAS.map((e) => ({ ...e })),
    desarrolloSlug: { ...INVESTTI_EXCEL_TO_SLUG },
    slugDesarrollo: Object.fromEntries(
      Object.entries(INVESTTI_EXCEL_TO_SLUG).map(([k, v]) => [v, k]),
    ),
    stats: { lotes: lotes.length, byDev },
    reglas,
    manzanas,
    lotes,
  };
}

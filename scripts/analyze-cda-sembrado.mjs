/**
 * Análisis exploratorio — Sembrado CDA 4ta Sección (Control Gerencia).
 * Uso: node scripts/analyze-cda-sembrado.mjs
 */
import XLSX from "xlsx";

const EXCEL_PATH =
  process.env.CDA_SEMBRADO_XLSX ??
  "G:/Unidades compartidas/Cañadas del Arroyo/CDA 4ta Sección/6. Control Gerencia/Sembrado 4ta Sección Cañadas del Arroyo 01_06_2026.xlsx";

const HDR = 7;
const VENDIDO = new Set([
  "Vendidas Cobradas",
  "Vendida Lista Para Cobro 15%",
  "Vendida Lista Para Cobro 20%",
  "Vendida Lista Para Cobro 30%",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
  "Vendida Lista Para Cobro",
]);
const APARTADO = new Set(["Apartado", "Apartado C/Enganche"]);

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pct(n, d) {
  return d ? Math.round((n / d) * 1000) / 10 : 0;
}

function inBucket(m, lo, hi) {
  if (hi >= 550) return m >= lo && m <= hi;
  return m >= lo && m < hi;
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date && v.getFullYear() > 2000) return v;
  return null;
}

const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sembrado"], { header: 1, defval: "" });
const data = rows.slice(HDR + 1).filter((r) => r[2] && Number(r[2]) > 0);

const vendidos = data.filter((r) => VENDIDO.has(String(r[3]).trim()));
const apartados = data.filter((r) => APARTADO.has(String(r[3]).trim()));
const disponibles = data.filter((r) => String(r[3]).trim() === "Disponibles");
const demanda = [...vendidos, ...apartados];

const m2v = vendidos.map((r) => Number(r[2]));
const m2a = apartados.map((r) => Number(r[2]));
const m2d = disponibles.map((r) => Number(r[2]));
const m2dem = demanda.map((r) => Number(r[2]));

console.log("=== CDA 4ta Sección — Sembrado 01/06/2026 ===\n");
console.log("Lotes con dato:", data.length);
console.log("Vendidas:", vendidos.length, "| Apartados:", apartados.length, "| Disponibles:", disponibles.length);
console.log("\nMetraje");
console.log("  Mediana venta:", median(m2v)?.toFixed(1), "m² (CDV ref: 190.3)");
console.log("  Promedio venta:", (m2v.reduce((a, b) => a + b, 0) / m2v.length).toFixed(1), "m²");
console.log("  Mediana apartado:", median(m2a)?.toFixed(1), "m² (CDV ref: 224.7)");
console.log("  Mediana disponible:", median(m2d)?.toFixed(1), "m² (CDV ref: 176.0)");

const buckets = [
  [160, 180, "160–180"],
  [180, 200, "180–200"],
  [200, 220, "200–220"],
  [220, 250, "220–250"],
  [250, 280, "250–280"],
  [280, 320, "280–320"],
  [320, 400, "320–400"],
  [400, 550, "400–550"],
];

console.log("\nDemanda por rango (ventas + apartados)");
const totalDem = m2dem.length;
for (const [lo, hi, label] of buckets) {
  const dem = m2dem.filter((m) => inBucket(m, lo, hi));
  const disp = m2d.filter((m) => inBucket(m, lo, hi));
  const st = dem.length + disp.length ? dem.length / (dem.length + disp.length) : 0;
  console.log(
    `  ${label.padEnd(8)} dem ${String(dem.length).padStart(3)} (${String(pct(dem.length, totalDem)).padStart(5)}%)  disp ${String(disp.length).padStart(3)}  ST ${Math.round(st * 100)}%`,
  );
}

function window(lo, hi) {
  return {
    dem: m2dem.filter((m) => m >= lo && m <= hi).length,
    disp: m2d.filter((m) => m >= lo && m <= hi).length,
  };
}

const bajo250 = m2dem.filter((m) => m < 250).length;
console.log("\nVentanas vs propuesta CDV 220–260 m²");
console.log("  Demanda <250 m²:", bajo250, `(${pct(bajo250, totalDem)}%) — CDV: 82.4%`);
console.log("  200–250:", window(200, 250));
console.log("  220–260:", window(220, 260));
console.log("  220–280:", window(220, 280));
console.log("  Disponibles <250:", m2d.filter((m) => m < 250).length, "de", m2d.length);

const tickets = demanda.filter((r) => Number(r[22]) > 0).map((r) => Number(r[22]));
const pm2 = vendidos.filter((r) => Number(r[21]) > 0).map((r) => Number(r[21]));
console.log("\nPrecio (lista final)");
console.log("  $/m² vendidos:", Math.round(Math.min(...pm2)), "–", Math.round(Math.max(...pm2)), "| med", Math.round(median(pm2)));
console.log("  Ticket demanda:", Math.round(Math.min(...tickets)), "–", Math.round(Math.max(...tickets)), "| med", Math.round(median(tickets)));

const fechas = demanda.map((r) => parseDate(r[27])).filter(Boolean).sort((a, b) => a - b);
if (fechas.length) {
  const first = fechas[0];
  const last = fechas[fechas.length - 1];
  const months =
    (last.getFullYear() - first.getFullYear()) * 12 + (last.getMonth() - first.getMonth()) + 1;
  console.log("\nVelocidad (fecha depósito apartado)");
  console.log("  Periodo:", first.toISOString().slice(0, 10), "→", last.toISOString().slice(0, 10));
  console.log("  Absorción aprox:", (demanda.length / months).toFixed(1), "lotes/mes (seed corredor: 7.8)");
}

const equipos = {};
for (const r of demanda) {
  const eq = String(r[15] || "Sin dato").trim() || "Sin dato";
  equipos[eq] = (equipos[eq] || 0) + 1;
}
console.log("\nCanal venta (demanda acumulada)");
for (const [k, v] of Object.entries(equipos).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v} (${pct(v, totalDem)}%)`);
}

const apart2025 = apartados.filter((r) => {
  const d = parseDate(r[27]);
  return d && d >= new Date("2025-01-01");
});
console.log("\nPipeline reciente (apartados 2025+):", apart2025.length, "lotes");
console.log("  Mediana m²:", median(apart2025.map((r) => Number(r[2])))?.toFixed(1));

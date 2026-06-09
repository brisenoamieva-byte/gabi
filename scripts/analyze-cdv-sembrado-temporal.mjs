/**
 * Análisis temporal del sembrado CDV v.4 — fecha depósito apartado + metraje.
 * Genera: src/lib/corredor/cdv-sembrado-temporal.generated.ts
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const EXCEL_PATH =
  process.env.CDV_SEMBRADO_XLSX ??
  "G:/Unidades compartidas/Cañadas del Valle/6. Control Gerencia/Sembrado Cañadas del Valle v.4.xlsx";

const HEADER_ROW = 8;
const OUT_PATH = path.join(ROOT, "src/lib/corredor/cdv-sembrado-temporal.generated.ts");

const COL = {
  manzana: 0,
  lote: 2,
  m2: 5,
  status: 7,
  fechaApartado: 41,
  fechaEnganche: 36,
  fechaContrato: 39,
};

const VENDIDO_STATUSES = new Set([
  "Vendidas Cobradas",
  "Vendida Lista Para Cobro 15%",
  "Vendida Lista Para Cobro 20%",
  "Vendida Lista Para Cobro 30%",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
]);

function parseDate(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    if (v.getFullYear() < 2000) return null;
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d || d.y < 2000) return null;
    return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return null;
}

function median(arr) {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mean(arr) {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function linearTrend(values) {
  /** Regresión lineal simple y = a + b*x */
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function pct(n, d) {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

function m2Band(m2) {
  if (m2 < 180) return "160–180";
  if (m2 < 200) return "180–200";
  if (m2 < 220) return "200–220";
  if (m2 < 250) return "220–250";
  if (m2 < 280) return "250–280";
  if (m2 < 320) return "280–320";
  if (m2 < 400) return "320–400";
  return "400+";
}

function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error("No se encontró el Excel:", EXCEL_PATH);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const ws = wb.Sheets.Sembrado;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  const lotes = rows
    .slice(HEADER_ROW + 1)
    .filter((r) => r && typeof r[COL.m2] === "number")
    .map((r) => {
      const status = String(r[COL.status] ?? "").trim();
      const m2 = Math.round(r[COL.m2] * 10) / 10;
      const fechaApartado = parseDate(r[COL.fechaApartado]);
      const fechaEnganche = parseDate(r[COL.fechaEnganche]);
      const fechaContrato = parseDate(r[COL.fechaContrato]);
      const fechaEvento = fechaApartado ?? fechaEnganche ?? fechaContrato;
      const esVenta = VENDIDO_STATUSES.has(status);
      const esApartado = status === "Apartado";
      const esMovimiento = esVenta || esApartado;
      return {
        id: `${r[COL.manzana]}-${r[COL.lote]}`,
        status,
        m2,
        fechaApartado,
        fechaEnganche,
        fechaEvento,
        tipo: esVenta ? "venta" : esApartado ? "apartado" : "otro",
        esMovimiento,
      };
    });

  const movidos = lotes.filter((l) => l.esMovimiento && l.fechaEvento);
  const movidosSinFecha = lotes.filter((l) => l.esMovimiento && !l.fechaEvento);

  const byMonthMap = new Map();
  for (const l of movidos) {
    const ym = l.fechaEvento.slice(0, 7);
    if (!byMonthMap.has(ym)) {
      byMonthMap.set(ym, { ym, ventas: 0, apartados: 0, total: 0, m2: [] });
    }
    const b = byMonthMap.get(ym);
    b.total++;
    b.m2.push(l.m2);
    if (l.tipo === "venta") b.ventas++;
    else b.apartados++;
  }

  const serieMensual = [...byMonthMap.values()]
    .sort((a, b) => a.ym.localeCompare(b.ym))
    .map((b) => ({
      ym: b.ym,
      ventas: b.ventas,
      apartados: b.apartados,
      total: b.total,
      medianaM2: Math.round((median(b.m2) ?? 0) * 10) / 10,
      promedioM2: Math.round((mean(b.m2) ?? 0) * 10) / 10,
      pct220oMas: pct(b.m2.filter((m) => m >= 220).length, b.m2.length),
    }));

  const medianaM6 = serieMensual.map((_, i, arr) => {
    const win = arr.slice(Math.max(0, i - 5), i + 1);
    const vals = win.map((w) => w.medianaM2);
    return Math.round((median(vals) ?? 0) * 10) / 10;
  });
  const serieConRolling = serieMensual.map((s, i) => ({
    ...s,
    medianaM6: medianaM6[i],
  }));

  const medians = serieMensual.map((s) => s.medianaM2);
  const trend = linearTrend(medians);
  const slopePerMonth = Math.round(trend.slope * 10) / 10;

  const last12 = serieMensual.slice(-12);
  const prior = serieMensual.slice(0, -12);
  const m2Last12 = movidos.filter((l) =>
    last12.some((m) => m.ym === l.fechaEvento.slice(0, 7)),
  );
  const m2Prior = movidos.filter(
    (l) => !last12.some((m) => m.ym === l.fechaEvento.slice(0, 7)),
  );
  const last6Yms = serieConRolling.slice(-6).map((s) => s.ym);
  const apartadosRecientes = movidos.filter(
    (l) => l.tipo === "apartado" && last6Yms.includes(l.fechaEvento.slice(0, 7)),
  );
  const medianaApartados6m = Math.round((median(apartadosRecientes.map((l) => l.m2)) ?? 0) * 10) / 10;

  const bandasReciente = {};
  for (const l of m2Last12) {
    const b = m2Band(l.m2);
    bandasReciente[b] = (bandasReciente[b] ?? 0) + 1;
  }

  const bandasHistorico = {};
  for (const l of movidos) {
    const b = m2Band(l.m2);
    bandasHistorico[b] = (bandasHistorico[b] ?? 0) + 1;
  }

  const acumulado = [];
  let runVentas = 0;
  let runApart = 0;
  for (const s of serieConRolling) {
    runVentas += s.ventas;
    runApart += s.apartados;
    acumulado.push({
      ym: s.ym,
      ventasAcum: runVentas,
      apartadosAcum: runApart,
      totalAcum: runVentas + runApart,
    });
  }

  const pronostico = [];
  if (serieConRolling.length >= 3) {
    const last3 = serieConRolling.slice(-3);
    const avgOps =
      last3.reduce((s, m) => s + m.total, 0) / last3.length;
    const lastMed = last3.map((m) => m.medianaM2);
    const medTrend = linearTrend(lastMed);
    const startIdx = serieConRolling.length;
    const [y, m] = serieConRolling[serieConRolling.length - 1].ym.split("-").map(Number);
    for (let i = 1; i <= 6; i++) {
      let nm = m + i;
      let ny = y;
      while (nm > 12) {
        nm -= 12;
        ny++;
      }
      const ym = `${ny}-${String(nm).padStart(2, "0")}`;
      const projectedMed = Math.round(
        (medTrend.intercept + medTrend.slope * (startIdx - 1 + i)) * 10,
      ) / 10;
      pronostico.push({
        ym,
        opsEstimadas: Math.round(avgOps * 10) / 10,
        medianaM2Proyectada: projectedMed,
      });
    }
  }

  const insights = {
    totalMovimientos: movidos.length,
    movimientosSinFecha: movidosSinFecha.length,
    periodoDesde: serieConRolling[0]?.ym ?? null,
    periodoHasta: serieConRolling[serieConRolling.length - 1]?.ym ?? null,
    medianaM2Historica: Math.round((median(movidos.map((l) => l.m2)) ?? 0) * 10) / 10,
    medianaM2Ultimos12Meses: Math.round((median(m2Last12.map((l) => l.m2)) ?? 0) * 10) / 10,
    medianaM2PeriodoPrevio: Math.round((median(m2Prior.map((l) => l.m2)) ?? 0) * 10) / 10,
    pct220oMasUltimos12: pct(m2Last12.filter((l) => l.m2 >= 220).length, m2Last12.length),
    pct220oMasHistorico: pct(movidos.filter((l) => l.m2 >= 220).length, movidos.length),
    pct250oMasUltimos12: pct(m2Last12.filter((l) => l.m2 >= 250).length, m2Last12.length),
    tendenciaMedianaM2PorMes: slopePerMonth,
    opsPromedioMensualUltimos6: Math.round(
      (serieConRolling.slice(-6).reduce((s, m) => s + m.total, 0) /
        Math.min(6, serieConRolling.length)) *
        10,
    ) / 10,
    medianaApartadosUltimos6m: medianaApartados6m,
    apartadosUltimos6m: apartadosRecientes.length,
    deltaMediana12m:
      Math.round(
        ((median(m2Last12.map((l) => l.m2)) ?? 0) -
          (median(m2Prior.map((l) => l.m2)) ?? 0)) *
          10,
      ) / 10,
    deltaPct220:
      Math.round(
        (pct(m2Last12.filter((l) => l.m2 >= 220).length, m2Last12.length) -
          pct(m2Prior.filter((l) => l.m2 >= 220).length, m2Prior.length)) *
          10,
      ) / 10,
    fechaFuentePrincipal: "FECHA DEPOSITO APARTADO",
    fechaFuenteRespaldo: "FECHA REAL PAGO ENGANCHE / fecha venta contrato",
  };

  const picoApartados = [...serieConRolling].sort((a, b) => b.apartados - a.apartados)[0];

  const conclusiones = [
    `${movidos.length} ventas o apartados con fecha (2023–2026). El tamaño típico histórico fue ${insights.medianaM2Historica} m².`,
    `En el último año el tamaño típico subió de ${insights.medianaM2PeriodoPrevio} m² a ${insights.medianaM2Ultimos12Meses} m² (+${Math.round((insights.medianaM2Ultimos12Meses - insights.medianaM2PeriodoPrevio) * 10) / 10} m²).`,
    `Los lotes de 220 m² o más pasaron del ${insights.pct220oMasHistorico}% al ${insights.pct220oMasUltimos12}% de las ventas en 12 meses.`,
    `${insights.apartadosUltimos6m} apartados en los últimos 6 meses; tamaño típico ${insights.medianaApartadosUltimos6m} m²${picoApartados ? ` (pico: ${picoApartados.apartados} en ${picoApartados.ym})` : ""}.`,
    `Ritmo reciente: ~${insights.opsPromedioMensualUltimos6} ventas al mes.`,
    "Los lotes muy grandes (250 m²+) siguen siendo minoría; conviene mantener el producto en 220–260 m².",
  ];

  const output = {
    fuente: "Sembrado Cañadas del Valle v.4.xlsx — FECHA DEPOSITO APARTADO (+ respaldo enganche/contrato)",
    generadoEn: new Date().toISOString().slice(0, 10),
    insights,
    serieMensual: serieConRolling,
    acumulado,
    pronostico,
    bandasReciente12m: Object.entries(bandasReciente)
      .map(([banda, count]) => ({ banda, count }))
      .sort((a, b) => a.banda.localeCompare(b.banda)),
    bandasHistorico: Object.entries(bandasHistorico)
      .map(([banda, count]) => ({ banda, count }))
      .sort((a, b) => a.banda.localeCompare(b.banda)),
    conclusiones,
  };

  const ts = `/** AUTO-GENERADO — scripts/analyze-cdv-sembrado-temporal.mjs */\nexport const CDV_SEMBRADO_TEMPORAL = ${JSON.stringify(output, null, 2)} as const;\n`;
  fs.writeFileSync(OUT_PATH, ts, "utf8");

  console.log("Generado:", OUT_PATH);
  console.log("Movimientos:", movidos.length, "| Sin fecha:", movidosSinFecha.length);
  console.log("Periodo:", insights.periodoDesde, "→", insights.periodoHasta);
  console.log("Mediana últimos 12m:", insights.medianaM2Ultimos12Meses);
  console.log("Tendencia m²/mes:", slopePerMonth);
}

main();

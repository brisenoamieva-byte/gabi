/**
 * Seed presupuesto MKT 2026 de Misión La Gavia desde el Excel de publicidad.
 *
 * Uso:
 *   npm run mkt:import:gavia
 *   npm run mkt:import:gavia -- "C:/ruta/MISION LA GAVIA MKT.xlsx"
 *   npm run mkt:import:gavia -- --dry-run
 *   npm run mkt:import:gavia -- --replace
 *
 * Fuente:
 *   - Real_Presupuesto → partidas (ACUMULADO como monto autorizado)
 *   - Propuesta → plantilla (conceptos que no estén en Real)
 *   - Detalle Interno → gastos (omite cobros agregados BBR HABITAREA / Administración)
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";
import { loadEnvLocal } from "./load-env-local.mjs";
import { MISION_LA_GAVIA_DESARROLLO_ID } from "./mision-la-gavia-excel.mjs";

const DEFAULT_XLSX = "C:/Users/brise/Downloads/MISION LA GAVIA MKT-06.03.26.xlsx";
const ANIO = 2026;

const SEGMENT_MAP = {
  "campaña digital": "Campaña Digital",
  "campana digital": "Campaña Digital",
  eventos: "Eventos y prospección",
  "eventos y prospección": "Eventos y prospección",
  "eventos y prospeccion": "Eventos y prospección",
  herramientas: "Herramientas",
  "herramienta tecnológica": "Herramientas",
  "herramienta tecnologica": "Herramientas",
  "oficina y equipo comercial": "Oficina y equipo comercial",
  "publicidad impresa": "Oficina y equipo comercial",
  uniformes: "Oficina y equipo comercial",
  "oficina de ventas": "Oficina y equipo comercial",
  camper: "Oficina y equipo comercial",
  tapete: "Oficina y equipo comercial",
  mobiliario: "Mobiliario",
  muebles: "Mobiliario",
  señaletica: "Señaletica",
  señalética: "Señaletica",
  senaletica: "Señaletica",
  hosting: "Herramientas",
  "google correos": "Herramientas",
  callpiker: "Herramientas",
  callpicker: "Herramientas",
  varios: "Otros",
  otros: "Otros",
};

const norm = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const mapSegmento = (raw) => {
  const key = norm(raw);
  if (!key) return "Otros";
  return SEGMENT_MAP[key] ?? SEGMENT_MAP[key.replace(/\s+/g, " ")] ?? "Otros";
};

const asNumber = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const toIsoDate = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime()) || value.getFullYear() < 2000) return null;
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed || parsed.y < 2000) return null;
    const mm = String(parsed.m).padStart(2, "0");
    const dd = String(parsed.d).padStart(2, "0");
    return `${parsed.y}-${mm}-${dd}`;
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  const dt = new Date(text);
  if (!Number.isNaN(dt.getTime()) && dt.getFullYear() >= 2000) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
};

const mapEstatus = (raw) => {
  const key = norm(raw);
  if (key === "pagada") return "pagada";
  if (key === "cancelada") return "cancelada";
  if (key === "pendiente") return "pendiente";
  return null;
};

const partidaKey = (proveedor, concepto, segmento) =>
  `${norm(proveedor)}|${norm(concepto)}|${norm(segmento)}`;

const isAggregateBbrCobro = (proveedor, descripcion) => {
  const p = norm(proveedor);
  const d = norm(descripcion);
  return p.includes("bbr habitarea") && d.includes("administracion de publicidad");
};

const parsePartidas = (wb) => {
  /** @type {Array<{ segmento: string, proveedor: string, concepto: string, tipo: string, cantidad: number, monto_autorizado: number, orden: number }>} */
  const partidas = [];
  const seenKeys = new Set();
  let orden = 0;

  const pushPartida = (row, { dedupe = false } = {}) => {
    const proveedor = String(row.proveedor ?? "").trim() || "Varios";
    const concepto = String(row.concepto ?? "").trim() || proveedor;
    const segmento = mapSegmento(row.segmento);
    const key = partidaKey(proveedor, concepto, segmento);
    if (dedupe && seenKeys.has(key)) return;
    seenKeys.add(key);
    partidas.push({
      segmento,
      proveedor,
      concepto,
      tipo: row.tipo === "fijo" ? "fijo" : "variable",
      cantidad: row.cantidad > 0 ? row.cantidad : 1,
      monto_autorizado: Math.max(0, row.monto_autorizado),
      orden: orden++,
    });
  };

  const realName = wb.SheetNames.find((n) => norm(n).includes("real_presupuesto")) ?? "Real_Presupuesto";
  const real = XLSX.utils.sheet_to_json(wb.Sheets[realName], { header: 1, defval: null, raw: true });
  for (let i = 11; i < real.length; i++) {
    const r = real[i];
    if (!r) continue;
    const proveedor = r[1];
    const concepto = r[2];
    const segmento = r[3];
    if (!proveedor && !concepto) continue;
    if (typeof segmento === "string" && /total|ejercido|diferencia|subtotal|iva|inversi[oó]n|gastos aldea/i.test(segmento)) {
      continue;
    }
    // Real puede repetir proveedor+concepto; cada fila conserva su ACUMULADO.
    pushPartida({
      proveedor,
      concepto: concepto || proveedor,
      segmento,
      tipo: "variable",
      cantidad: asNumber(r[4]) || 1,
      monto_autorizado: asNumber(r[5]),
    });
  }

  const propuestaName = wb.SheetNames.find((n) => norm(n) === "propuesta") ?? "Propuesta";
  const propuesta = XLSX.utils.sheet_to_json(wb.Sheets[propuestaName], {
    header: 1,
    defval: null,
    raw: true,
  });
  for (let i = 2; i < propuesta.length; i++) {
    const r = propuesta[i];
    if (!r?.[0]) continue;
    const tipoRaw = norm(r[4]);
    pushPartida(
      {
        segmento: r[0],
        proveedor: r[1],
        concepto: r[2],
        tipo: tipoRaw === "fijo" ? "fijo" : "variable",
        cantidad: asNumber(r[3]) || 1,
        monto_autorizado: Math.max(asNumber(r[6]), asNumber(r[7])),
      },
      { dedupe: true },
    );
  }

  return partidas.sort((a, b) => a.orden - b.orden);
};

const parseGastos = (wb) => {
  const sheetName =
    wb.SheetNames.find((n) => norm(n).includes("detalle interno")) ?? wb.SheetNames[2];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null, raw: true });

  /** @type {Array<Record<string, unknown>>} */
  const gastos = [];
  let layout = "proyecto"; // proveedor @ 3

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    if (norm(r[0]) === "registro") {
      layout = norm(r[2]) === "proyecto" ? "proyecto" : "externo";
      continue;
    }

    const estatus = mapEstatus(r[10]);
    if (!estatus) continue;

    const proveedor = String(layout === "proyecto" ? r[3] : r[2] ?? "").trim();
    const descripcion = String(r[4] ?? "").trim();
    if (!proveedor || !descripcion) continue;
    if (isAggregateBbrCobro(proveedor, descripcion)) continue;

    const monto = asNumber(r[7]);
    const iva = asNumber(r[8]);
    const total = asNumber(r[9]) || monto + iva;
    if (total <= 0 && monto <= 0) continue;

    const fechaRegistro = toIsoDate(r[1]) ?? `${ANIO}-01-01`;
    const fechaFactura = toIsoDate(r[6]);
    const fechaPagoRaw = r[11];
    const fechaPago =
      typeof fechaPagoRaw === "string" && fechaPagoRaw.includes(" - ")
        ? toIsoDate(fechaPagoRaw.split(" - ").at(-1))
        : toIsoDate(fechaPagoRaw);

    gastos.push({
      fecha_registro: fechaRegistro,
      fecha_factura: fechaFactura,
      fecha_pago: fechaPago,
      proveedor,
      descripcion,
      factura_ref: r[5] != null && String(r[5]).trim() ? String(r[5]).trim() : null,
      monto_sin_iva: Math.round(monto * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      total: Math.round(total * 100) / 100,
      estatus,
      observaciones: r[12] != null && String(r[12]).trim() ? String(r[12]).trim() : null,
    });
  }

  return gastos;
};

const resolveAuthorizedTotal = (partidas) => {
  const sum = partidas.reduce((s, p) => s + p.monto_autorizado, 0);
  return Math.round(sum * 100) / 100;
};

const findPartidaId = (partidasDb, gasto) => {
  const prov = norm(gasto.proveedor);
  const desc = norm(gasto.descripcion);
  const scored = partidasDb
    .map((p) => {
      const pp = norm(p.proveedor);
      const pc = norm(p.concepto);
      let score = 0;
      if (pp && (prov.includes(pp) || pp.includes(prov))) score += 2;
      if (pc && (desc.includes(pc) || pc.includes(desc.slice(0, 24)))) score += 1;
      return { id: p.id, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? null;
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const replace = args.includes("--replace");
  const pathArg = args.find((a) => !a.startsWith("--"));
  const xlsxPath = resolve(pathArg ?? DEFAULT_XLSX);

  if (!existsSync(xlsxPath)) {
    console.error("No se encontró el Excel:", xlsxPath);
    process.exit(1);
  }

  if (!loadEnvLocal()) {
    console.error("Falta .env.local con credenciales de Supabase.");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath, { cellDates: true, cellFormula: false });
  const partidas = parsePartidas(wb);
  const gastos = parseGastos(wb);
  const montoAutorizado = resolveAuthorizedTotal(partidas);

  console.log(`[mkt-gavia] Excel: ${xlsxPath}`);
  console.log(`[mkt-gavia] Partidas: ${partidas.length} · Gastos: ${gastos.length}`);
  console.log(`[mkt-gavia] Monto autorizado (suma ACUMULADO/Total): $${montoAutorizado.toLocaleString("es-MX")}`);

  if (dryRun) {
    console.log("[mkt-gavia] --dry-run: no se escribe en Supabase.");
    console.log("  Segmentos:", [...new Set(partidas.map((p) => p.segmento))].join(", "));
    console.log(
      "  Estatus gastos:",
      Object.entries(
        gastos.reduce((acc, g) => {
          acc[g.estatus] = (acc[g.estatus] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([k, v]) => `${k}=${v}`)
        .join(", "),
    );
    return;
  }

  const supabase = createClient(url, key);

  const { error: probe } = await supabase.from("desarrollo_mkt_presupuesto").select("id").limit(1);
  if (probe?.message?.includes("schema cache") || probe?.code === "PGRST205") {
    console.error("\nAplica migración 060_desarrollo_mkt_presupuesto.sql en Supabase.\n");
    console.error("  npm run db:apply:060\n");
    process.exit(1);
  }

  const { data: existing, error: existingErr } = await supabase
    .from("desarrollo_mkt_presupuesto")
    .select("id")
    .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID)
    .eq("anio", ANIO)
    .maybeSingle();

  if (existingErr) {
    console.error("Error leyendo presupuesto:", existingErr.message);
    process.exit(1);
  }

  if (existing?.id && !replace) {
    console.error(
      `[mkt-gavia] Ya existe presupuesto ${ANIO} (${existing.id}). Usa --replace para regenerar.`,
    );
    process.exit(1);
  }

  if (existing?.id && replace) {
    console.log(`[mkt-gavia] --replace: eliminando presupuesto ${existing.id}…`);
    const { error: delErr } = await supabase
      .from("desarrollo_mkt_presupuesto")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      console.error("Error eliminando:", delErr.message);
      process.exit(1);
    }
  }

  const { data: presupuesto, error: upsertErr } = await supabase
    .from("desarrollo_mkt_presupuesto")
    .insert({
      desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
      anio: ANIO,
      monto_autorizado: montoAutorizado,
      moneda: "MXN",
      notas: `Importado desde ${xlsxPath.split(/[/\\]/).pop()} · Real_Presupuesto + Detalle Interno`,
      activo: true,
    })
    .select("id")
    .single();

  if (upsertErr || !presupuesto) {
    console.error("Error creando presupuesto:", upsertErr?.message);
    process.exit(1);
  }

  console.log(`[mkt-gavia] Presupuesto creado: ${presupuesto.id}`);

  const partidaRows = partidas.map((p) => ({
    presupuesto_id: presupuesto.id,
    desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
    segmento: p.segmento,
    proveedor: p.proveedor,
    concepto: p.concepto,
    tipo: p.tipo,
    cantidad: p.cantidad,
    monto_autorizado: Math.round(p.monto_autorizado * 100) / 100,
    orden: p.orden,
  }));

  const { data: partidasDb, error: partErr } = await supabase
    .from("desarrollo_mkt_partida")
    .insert(partidaRows)
    .select("id, proveedor, concepto");

  if (partErr) {
    console.error("Error insertando partidas:", partErr.message);
    process.exit(1);
  }

  console.log(`[mkt-gavia] Partidas insertadas: ${partidasDb?.length ?? 0}`);

  const gastoRows = gastos.map((g) => ({
    desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
    presupuesto_id: presupuesto.id,
    partida_id: findPartidaId(partidasDb ?? [], g),
    fecha_registro: g.fecha_registro,
    fecha_factura: g.fecha_factura,
    fecha_pago: g.fecha_pago,
    proveedor: g.proveedor,
    descripcion: g.descripcion,
    factura_ref: g.factura_ref,
    monto_sin_iva: g.monto_sin_iva,
    iva: g.iva,
    total: g.total,
    estatus: g.estatus,
    observaciones: g.observaciones,
  }));

  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < gastoRows.length; i += chunkSize) {
    const chunk = gastoRows.slice(i, i + chunkSize);
    const { error: gErr } = await supabase.from("desarrollo_mkt_gasto").insert(chunk);
    if (gErr) {
      console.error("Error insertando gastos:", gErr.message);
      process.exit(1);
    }
    inserted += chunk.length;
  }

  const erogado = gastos
    .filter((g) => g.estatus === "pagada" || g.estatus === "pendiente")
    .reduce((s, g) => s + g.total, 0);

  console.log(`[mkt-gavia] Gastos insertados: ${inserted}`);
  console.log(
    `[mkt-gavia] Erogado (pagada+pendiente): $${erogado.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`,
  );
  console.log("[mkt-gavia] Listo. Ver en /admin/desarrollos?desarrollo=mision-la-gavia&view=mkt");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

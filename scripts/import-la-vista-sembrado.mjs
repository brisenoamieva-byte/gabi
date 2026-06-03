/**
 * Importa sembrado La Vista Residencial desde Excel VINTE 2026.
 * Crea/actualiza inventario + operaciones + cobranza en Supabase.
 *
 * Uso:
 *   npm run sembrado:import:la-vista
 *   npm run sembrado:import:la-vista -- "G:/ruta/al/archivo.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";
import {
  normalizeTipoInversion,
  operacionTieneCliente,
  parseDate,
  parseNumber,
  parsePagosFromRow,
  parsePct,
  sembradoToInventario,
} from "./sembrado-import-utils.mjs";

const DEFAULT_XLSX =
  "G:/Unidades compartidas/La Vista - VINTE/6. Control Gerencia/1. Sembrado VINTE 2026.xlsx";

const DESARROLLO_ID = "la-vista-residencial";
const MAIN_HEADER_ROW = 13;
const CANCEL_HEADER_ROW = 0;

const CLUSTER_BY_SHEET_NAME = {
  BENEVENTO: "benevento",
  OLIVETO: "oliveto",
  VOLTERRA: "volterra",
};

const PROTOTIPO_BY_TIPO = {
  Castello: "castello-benevento",
  "Scordia Plus": "scordia-plus",
  Scordia: "scordia",
  Pontevel: "pontevel",
  Tarento: null,
};

const normalizeEstatusSembrado = (statusRaw) => {
  const status = String(statusRaw ?? "").trim();
  switch (status) {
    case "Disponibles":
      return "Disponibles";
    case "Apartado BBR":
    case "Apartado Vinte":
      return "Apartado";
    case "Vendida cobrada 1er parte":
      return "Vendido Cobrado 1er Parte";
    case "Vendida Lista Para Cobro":
      return "Vendidas listas para cobro";
    case "Vendidas Cobradas":
      return "Vendidas Cobradas";
    case "Firmada":
      return "Asignado";
    case "No Disponible":
    case "CASA MUESTRA":
      return "Bloqueado";
    case "Cancelado":
      return "Apartado";
    default:
      return status || "Disponibles";
  }
};

const formatVolterraUnidad = (fase, ubicacion, planta) => {
  const etapa = String(fase ?? "")
    .trim()
    .toUpperCase()
    .replace("-", "");
  const level = String(planta || ubicacion).toUpperCase().includes("PA") ? "PA" : "PB";
  const num = String(ubicacion).replace(/[^\d]/g, "");
  return `Depto ${etapa} ${level}-${num}`;
};

const inferTipoProducto = (clusterId, estatus, cliente) => {
  if (clusterId === "volterra") {
    return "departamento";
  }

  const status = String(estatus ?? "").trim();
  if (status === "CASA MUESTRA") {
    return "casa";
  }
  if (cliente) {
    return "casa";
  }
  if (status === "Firmada" || status === "Disponibles") {
    return "terreno";
  }
  return "casa";
};

const buildUnidadLabel = (clusterId, row) => {
  const ubicacion = String(row.ubicacion ?? "").trim();
  if (!ubicacion) {
    return null;
  }

  if (clusterId === "volterra") {
    return formatVolterraUnidad(row.fase, row.ubicacion, row.planta);
  }

  const tipo = inferTipoProducto(clusterId, row.estatusRaw, row.cliente);
  return `${tipo === "terreno" ? "Lote" : "Vivienda"} ${ubicacion}`;
};

const resolvePrototipoId = (clusterId, tipoNombre, planta) => {
  const key = String(tipoNombre ?? "").trim();
  if (!key) {
    return null;
  }

  if (key === "Tarento") {
    return String(planta ?? "").toUpperCase().includes("PA") ? "tarento-pa" : "tarento-pb";
  }

  return PROTOTIPO_BY_TIPO[key] ?? null;
};

const parseOrigen = (colonia, municipio, estado) => {
  const parts = [colonia, municipio, estado]
    .map((value) => (value ? String(value).trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
};

const parseLaVistaRow = (headers, row, options = {}) => {
  const idx = (name) => headers.findIndex((h) => String(h).trim() === String(name).trim());

  const desarrolloRaw = String(row[idx("Desarrollo")] ?? "").trim();
  const clusterId = CLUSTER_BY_SHEET_NAME[desarrolloRaw.toUpperCase()];
  const ubicacion = row[idx("Ubicación")] ?? row[idx("Ubicación ")];

  if (!clusterId || ubicacion === "" || ubicacion == null) {
    return null;
  }

  const estatusRaw = row[idx("STATUS")] || "Disponibles";
  const estatus = normalizeEstatusSembrado(estatusRaw);
  const cliente = String(row[idx("NOMBRE CLIENTE")] ?? "").trim();
  const fase = row[idx("Fase")];
  const planta = row[idx("Planta")];
  const tipoNombre = row[idx("Tipo")];
  const tipoProducto = inferTipoProducto(clusterId, estatusRaw, cliente);
  const unidadLabel = buildUnidadLabel(clusterId, {
    ubicacion,
    fase,
    planta,
    estatusRaw,
    cliente,
  });

  if (!unidadLabel) {
    return null;
  }

  const escrituracion = row[idx("ESCRITURACIÓN")];
  const hasOp =
    Boolean(options.cancelada) ||
    (operacionTieneCliente(estatus) && cliente.length > 0);

  return {
    clusterId,
    unidad: unidadLabel,
    tipoProducto,
    ubicacion: String(ubicacion).trim(),
    fase: fase ? String(fase).trim() : null,
    fachada: row[idx("Fachada")] ? String(row[idx("Fachada")]).trim() : null,
    prototipoId: resolvePrototipoId(clusterId, tipoNombre, planta),
    entregado: false,
    escriturado: Boolean(parseDate(escrituracion)),
    listaPrecios: row[idx("Fachada")] ? String(row[idx("Fachada")]).trim() : null,
    estatus,
    estatusRaw: String(estatusRaw).trim(),
    cliente,
    origenCiudad: parseOrigen(
      row[idx("COLONIA")],
      row[idx("MUNICIPIO")],
      row[idx("ESTADO")],
    ),
    equipoVenta: row[idx("EQUIPO DE VENTA")]
      ? String(row[idx("EQUIPO DE VENTA")]).trim()
      : null,
    promotor: row[idx("PROMOTOR")] ? String(row[idx("PROMOTOR")]).trim() : null,
    tipoInversion: normalizeTipoInversion(row[idx("MOTIVO DE COMPRA")]),
    precioLista: parseNumber(row[idx("PRECIO LISTA")]),
    descuentoPct: parsePct(row[idx("DESC")]),
    precioVenta: parseNumber(row[idx("PRECIO VTA FINAL")]),
    esquemaPago: row[idx("TIPO DE COMPRA")]
      ? String(row[idx("TIPO DE COMPRA")]).trim()
      : null,
    fechaApartado: parseDate(row[idx("FECHA DEPOSITO APARTADO")]),
    medioPublicitario: row[idx("MEDIO PUBLICITARIO")]
      ? String(row[idx("MEDIO PUBLICITARIO")]).trim()
      : null,
    observacionesPagos: null,
    observaciones: row[idx("OBSERVACIONES")]
      ? String(row[idx("OBSERVACIONES")]).trim()
      : null,
    comprobacion: parseNumber(row[idx("Comprobación")]),
    hasOp,
    cancelada: Boolean(options.cancelada),
    pagos: parsePagosFromRow(headers, row),
    precio: parseNumber(row[idx("PRECIO LISTA")]),
    superficieTerreno: parseNumber(row[idx("Superficie M2")]),
    superficieConstruccion: parseNumber(row[idx("M2 Constr")]),
    etapa: clusterId === "volterra" && fase ? String(fase).trim().toUpperCase() : null,
    torre: clusterId === "volterra" ? "Volterra" : null,
    nivel:
      clusterId === "volterra"
        ? String(planta ?? "").toUpperCase().includes("PA")
          ? "Planta alta"
          : "Planta baja"
        : null,
  };
};

const parseSheet = (sheet, headerRowIndex, options = {}) => {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  const headers = rows[headerRowIndex];
  if (!headers?.length) {
    return [];
  }

  return rows
    .slice(headerRowIndex + 1)
    .map((row) => parseLaVistaRow(headers, row, options))
    .filter(Boolean);
};

const upsertInventarioBatch = async (supabase, rows, hasEntregadoColumn) => {
  const payload = rows.map((row) => {
    const item = {
      desarrollo_id: DESARROLLO_ID,
      cluster_id: row.clusterId,
      unidad: row.unidad,
      tipo: row.tipoProducto,
      estatus: sembradoToInventario(row.estatus),
      prototipo_id: row.prototipoId,
      precio: row.precio,
      superficie_terreno_m2: row.superficieTerreno,
      superficie_construccion_m2: row.superficieConstruccion,
      lista_precios: row.listaPrecios,
      etapa: row.etapa,
      torre: row.torre,
      nivel: row.nivel,
      visitable: row.estatus === "Disponibles",
      prioridad_comercial: "media",
      razones_venta: [],
      orden: parseNumber(row.ubicacion) ?? 0,
      activo: true,
      updated_at: new Date().toISOString(),
    };

    if (hasEntregadoColumn) {
      item.entregado = row.entregado;
      item.escriturado = row.escriturado;
    }

    return item;
  });

  const { error } = await supabase.from("disponibilidad_unidades").upsert(payload, {
    onConflict: "desarrollo_id,cluster_id,unidad",
  });

  if (error) {
    throw new Error(error.message);
  }
};

const main = async () => {
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

  const xlsxPath = resolve(process.argv[2] ?? DEFAULT_XLSX);
  if (!existsSync(xlsxPath)) {
    console.error("No se encontró el Excel:", xlsxPath);
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const wb = XLSX.readFile(xlsxPath, { cellDates: true, cellFormula: false });

  const activeRows = parseSheet(wb.Sheets["Sembrado Ventas Vinte"], MAIN_HEADER_ROW);
  const cancelRows = parseSheet(wb.Sheets.Cancelados, CANCEL_HEADER_ROW, {
    cancelada: true,
  }).filter((row) => row.cliente);

  const allRows = [...activeRows, ...cancelRows];
  console.log(
    `[la-vista] Filas a procesar: ${allRows.length} (${activeRows.length} activas + ${cancelRows.length} canceladas)`,
  );

  const { error: schemaProbe } = await supabase
    .from("operaciones_comerciales")
    .select("id")
    .limit(1);

  if (schemaProbe?.message?.includes("schema cache") || schemaProbe?.code === "PGRST205") {
    console.error(
      "\n[la-vista] Falta aplicar la migración 018_comercial_crm_sembrado.sql en Supabase.",
    );
    process.exit(1);
  }

  const { error: entregadoProbe } = await supabase
    .from("disponibilidad_unidades")
    .select("entregado")
    .limit(1);

  const hasEntregadoColumn = !entregadoProbe;

  console.log("[la-vista] Sincronizando inventario...");
  for (let i = 0; i < allRows.length; i += 50) {
    await upsertInventarioBatch(supabase, allRows.slice(i, i + 50), hasEntregadoColumn);
  }

  const { data: unidadesDb, error: unidadesError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad, tipo, cluster_id")
    .eq("desarrollo_id", DESARROLLO_ID);

  if (unidadesError) {
    console.error("Error leyendo inventario:", unidadesError.message);
    process.exit(1);
  }

  const unitLookup = new Map(
    (unidadesDb ?? []).map((unit) => [`${unit.cluster_id}|${unit.unidad}`, unit]),
  );

  let operacionesCreadas = 0;
  let prospectosCreados = 0;
  let pagosInsertados = 0;
  const missing = [];

  for (const row of allRows) {
    const unit = unitLookup.get(`${row.clusterId}|${row.unidad}`);
    if (!unit) {
      missing.push(`${row.clusterId} · ${row.unidad}`);
      continue;
    }

    if (!row.hasOp) {
      continue;
    }

    let prospectoId = null;
    if (row.cliente) {
      const { data: prospecto, error: prospectoError } = await supabase
        .from("prospectos")
        .insert({
          desarrollo_id: DESARROLLO_ID,
          nombre: row.cliente,
          origen_ciudad: row.origenCiudad,
          medio_publicitario: row.medioPublicitario,
          promotor_nombre: row.promotor,
          equipo_venta: row.equipoVenta,
          tipo_inversion: row.tipoInversion,
          etapa: row.cancelada ? "perdido" : row.estatus === "Apartado" ? "apartado" : "vendido",
        })
        .select("id")
        .single();

      if (prospectoError) {
        console.error(`Prospecto ${row.cliente}:`, prospectoError.message);
      } else {
        prospectoId = prospecto.id;
        prospectosCreados++;
      }
    }

    const { data: existingOps } = await supabase
      .from("operaciones_comerciales")
      .select("id")
      .eq("unidad_id", unit.id);

    for (const op of existingOps ?? []) {
      await supabase.from("cobranza_mensual").delete().eq("operacion_id", op.id);
      await supabase.from("operaciones_comerciales").delete().eq("id", op.id);
    }

    const { data: operacion, error: opError } = await supabase
      .from("operaciones_comerciales")
      .insert({
        desarrollo_id: DESARROLLO_ID,
        unidad_id: unit.id,
        prospecto_id: prospectoId,
        estatus_sembrado: row.cancelada ? "Apartado" : row.estatus,
        cliente_nombre: row.cliente || "Sin nombre",
        origen_ciudad: row.origenCiudad,
        equipo_venta: row.equipoVenta,
        promotor_nombre: row.promotor,
        tipo_inversion: row.tipoInversion,
        lista_precios: row.listaPrecios,
        precio_lista: row.precioLista,
        descuento_pct: row.descuentoPct,
        precio_venta: row.precioVenta,
        esquema_pago: row.esquemaPago,
        fecha_apartado: row.fechaApartado,
        medio_publicitario: row.medioPublicitario,
        observaciones: row.observaciones,
        entregado: row.entregado,
        escriturado: row.escriturado,
        cancelada: Boolean(row.cancelada),
        cancelada_at: row.cancelada ? new Date().toISOString() : null,
        comprobacion: row.comprobacion,
      })
      .select("id")
      .single();

    if (opError) {
      console.error(`Operación ${row.unidad}:`, opError.message);
      continue;
    }

    operacionesCreadas++;

    if (operacion?.id && row.pagos.length) {
      const { error: pagosError } = await supabase.from("cobranza_mensual").insert(
        row.pagos.map((pago) => ({
          operacion_id: operacion.id,
          mes: pago.mes,
          monto: pago.monto,
        })),
      );

      if (pagosError) {
        console.error(`Cobranza ${row.unidad}:`, pagosError.message);
      } else {
        pagosInsertados += row.pagos.length;
      }
    }
  }

  const resumen = {
    Disponibles: 0,
    Apartado: 0,
    Vendido: 0,
    Bloqueado: 0,
    Otros: 0,
  };

  for (const row of activeRows) {
    const bucket = sembradoToInventario(row.estatus);
    if (bucket === "disponible") resumen.Disponibles++;
    else if (bucket === "apartado") resumen.Apartado++;
    else if (bucket === "vendido") resumen.Vendido++;
    else if (bucket === "bloqueado") resumen.Bloqueado++;
    else resumen.Otros++;
  }

  console.log("\n[la-vista] Importación completada:");
  console.log("  Unidades en inventario:", unidadesDb?.length ?? 0);
  console.log("  Operaciones:", operacionesCreadas);
  console.log("  Prospectos:", prospectosCreados);
  console.log("  Pagos mensuales:", pagosInsertados);
  console.log("  Resumen estatus:", resumen);
  if (missing.length) {
    console.log("  Unidades no encontradas:", missing.slice(0, 10).join(", "));
    if (missing.length > 10) console.log(`  ... y ${missing.length - 10} más`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

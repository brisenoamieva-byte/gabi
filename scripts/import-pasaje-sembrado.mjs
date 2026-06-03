/**
 * Importa el sembrado de Pasaje Álamos desde Excel a Supabase.
 * Requiere migración 018_comercial_crm_sembrado.sql aplicada.
 *
 * Uso:
 *   npm run sembrado:import
 *   npm run sembrado:import -- "G:/ruta/al/archivo.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

const DEFAULT_XLSX =
  "G:/Unidades compartidas/Pasaje Álamos/6. Control Gerencia/1. Sembrado 5sep24.xlsx";

const DESARROLLO_ID = "pasaje-alamos";
const CLUSTER_BY_TIPO = {
  departamento: "pasaje-alamos-departamentos",
  oficina: "pasaje-alamos-oficinas",
};

const sembradoToInventario = (estatus) => {
  switch (estatus) {
    case "Disponibles":
      return "disponible";
    case "Apartado":
    case "Vendido Cobrado 1er Parte":
    case "Vendidas listas para cobro":
    case "Vendidas en espera de cobro":
      return "apartado";
    case "Vendidas Cobradas":
      return "vendido";
    case "Bloqueado":
    case "Asignado":
      return "bloqueado";
    default:
      return "disponible";
  }
};

const operacionTieneCliente = (estatus) =>
  !["Disponibles", "Asignado", "Bloqueado"].includes(estatus);

const normalizeTipoInversion = (value) => {
  if (!value?.trim()) return null;
  const lower = value.trim().toLowerCase();
  if (lower.includes("vivir") || lower.includes("habitar")) return "vivir";
  if (lower.includes("invers")) return "inversion";
  if (lower.includes("trabaj")) return "trabajar";
  return "otro";
};

const parseNumber = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePct = (value) => {
  const n = parseNumber(value);
  if (n == null) return null;
  if (Math.abs(n) <= 1) return n * 100;
  return n;
};

const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
};

const parseSheetRows = (sheet, headerRowIndex, unitColIndex, tipoProducto) => {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  const headers = rows[headerRowIndex];
  const idx = (name) => headers.findIndex((h) => h === name);
  const compIdx = idx("Comprobación");

  return rows.slice(headerRowIndex + 1).flatMap((row) => {
    const unidad = row[unitColIndex];
    if (!unidad || !/^\d+$/.test(String(unidad))) {
      return [];
    }

    const estatus = row[idx("Estatus")] || "Disponibles";
    const cliente = String(row[idx("Nombre Cliente")] ?? "").trim();
    const hasOp = operacionTieneCliente(estatus) && cliente.length > 0;

    const pagos = [];
    if (compIdx >= 0) {
      for (let c = compIdx + 1; c < headers.length; c++) {
        const header = headers[c];
        const monto = parseNumber(row[c]);
        if (!header || monto == null || monto === 0) continue;
        const mes =
          header instanceof Date
            ? header
            : new Date(header);
        if (Number.isNaN(mes.getTime())) continue;
        pagos.push({
          mes: new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString().slice(0, 10),
          monto,
        });
      }
    }

    return [
      {
        unidad: String(unidad),
        tipoProducto,
        entregado: Boolean(row[idx("Entregado")]),
        escriturado: Boolean(row[idx("Escriturado")]),
        listaPrecios: row[idx("Lista")] ? String(row[idx("Lista")]).trim() : null,
        estatus,
        cliente,
        origenCiudad: row[idx("Origen")] ? String(row[idx("Origen")]).trim() : null,
        equipoVenta: row[idx("Equipo de Venta")] ? String(row[idx("Equipo de Venta")]).trim() : null,
        promotor: row[idx("Promotor")] ? String(row[idx("Promotor")]).trim() : null,
        tipoInversion: normalizeTipoInversion(row[idx("Tipo Inversión")]),
        precioLista: parseNumber(row[idx("Precio Lista")]),
        descuentoPct: parsePct(row[idx("Descuento")]),
        precioVenta: parseNumber(row[idx("Precio Venta")]),
        esquemaPago: row[idx("Pago")] ? String(row[idx("Pago")]).trim() : null,
        fechaApartado: parseDate(row[idx("Fecha Apartado")]),
        fechaCierre: parseDate(row[idx("Fecha Cierre Vta.")]),
        medioPublicitario: row[idx("Medio Publicitario")]
          ? String(row[idx("Medio Publicitario")]).trim()
          : null,
        observacionesPagos: row[idx("OBSERVACIONES DE PAGOS")]
          ? String(row[idx("OBSERVACIONES DE PAGOS")]).trim()
          : null,
        observaciones: row[idx("Observaciones")]
          ? String(row[idx("Observaciones")]).trim()
          : null,
        comprobacion: parseNumber(row[idx("Comprobación")]),
        hasOp,
        pagos,
      },
    ];
  });
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

  const activeRows = [
    ...parseSheetRows(wb.Sheets["Sembrado Deptos"], 7, 3, "departamento"),
    ...parseSheetRows(wb.Sheets["Sembrado Oficinas"], 10, 2, "oficina"),
  ];

  const cancelRows = [
    ...parseSheetRows(wb.Sheets["Cancelados Deptos"], 7, 2, "departamento").map((r) => ({
      ...r,
      cancelada: true,
    })),
    ...parseSheetRows(wb.Sheets["Cancelados Oficinas"], 7, 2, "oficina").map((r) => ({
      ...r,
      cancelada: true,
    })),
  ];

  const allRows = [...activeRows, ...cancelRows];
  console.log(`[sembrado] Filas a procesar: ${allRows.length} (${activeRows.length} activas + ${cancelRows.length} canceladas)`);

  const { error: schemaProbe } = await supabase
    .from("operaciones_comerciales")
    .select("id")
    .limit(1);

  if (schemaProbe?.message?.includes("schema cache") || schemaProbe?.code === "PGRST205") {
    console.error(
      "\n[sembrado] Falta aplicar la migración 018_comercial_crm_sembrado.sql en Supabase SQL Editor.",
    );
    console.error("Luego vuelve a ejecutar: npm run sembrado:import\n");
    process.exit(1);
  }

  const { error: entregadoProbe } = await supabase
    .from("disponibilidad_unidades")
    .select("entregado")
    .limit(1);

  const hasEntregadoColumn = !entregadoProbe;

  const { data: unidadesDb, error: unidadesError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad, tipo, cluster_id")
    .eq("desarrollo_id", DESARROLLO_ID);

  if (unidadesError) {
    console.error("Error leyendo inventario:", unidadesError.message);
    process.exit(1);
  }

  const unitLookup = new Map(
    (unidadesDb ?? []).map((u) => [`${u.unidad}|${u.tipo}`, u]),
  );

  let inventarioActualizado = 0;
  let operacionesCreadas = 0;
  let prospectosCreados = 0;
  let pagosInsertados = 0;
  const missing = [];

  for (const row of allRows) {
    const unit = unitLookup.get(`${row.unidad}|${row.tipoProducto}`);
    if (!unit) {
      missing.push(`${row.unidad} (${row.tipoProducto})`);
      continue;
    }

    if (!row.cancelada) {
      const inventarioPatch = {
        lista_precios: row.listaPrecios,
        estatus: sembradoToInventario(row.estatus),
        updated_at: new Date().toISOString(),
      };

      if (hasEntregadoColumn) {
        inventarioPatch.entregado = row.entregado;
        inventarioPatch.escriturado = row.escriturado;
      }

      const { error: invError } = await supabase
        .from("disponibilidad_unidades")
        .update(inventarioPatch)
        .eq("id", unit.id);

      if (invError) {
        console.error(`Inventario ${row.unidad}:`, invError.message);
        continue;
      }
      inventarioActualizado++;
    }

    if (!row.hasOp && !row.cancelada) {
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

    const { data: existingOp } = await supabase
      .from("operaciones_comerciales")
      .select("id")
      .eq("unidad_id", unit.id)
      .eq("cancelada", false)
      .maybeSingle();

    if (existingOp?.id && !row.cancelada) {
      await supabase.from("cobranza_mensual").delete().eq("operacion_id", existingOp.id);
      await supabase.from("operaciones_comerciales").delete().eq("id", existingOp.id);
    }

    const { data: operacion, error: opError } = await supabase
      .from("operaciones_comerciales")
      .insert({
        desarrollo_id: DESARROLLO_ID,
        unidad_id: unit.id,
        prospecto_id: prospectoId,
        estatus_sembrado: row.estatus,
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
        fecha_cierre: row.fechaCierre,
        medio_publicitario: row.medioPublicitario,
        observaciones_pagos: row.observacionesPagos,
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
        row.pagos.map((p) => ({
          operacion_id: operacion.id,
          mes: p.mes,
          monto: p.monto,
        })),
      );
      if (pagosError) {
        console.error(`Cobranza ${row.unidad}:`, pagosError.message);
      } else {
        pagosInsertados += row.pagos.length;
      }
    }
  }

  console.log("\n[sembrado] Importación completada:");
  console.log("  Inventario actualizado:", inventarioActualizado);
  console.log("  Operaciones:", operacionesCreadas);
  console.log("  Prospectos:", prospectosCreados);
  console.log("  Pagos mensuales:", pagosInsertados);
  if (missing.length) {
    console.log("  Unidades no encontradas en Supabase:", missing.slice(0, 10).join(", "));
    if (missing.length > 10) console.log(`  ... y ${missing.length - 10} más`);
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

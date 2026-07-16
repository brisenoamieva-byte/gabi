/**
 * Import unificado de sembrado → Supabase (inventario + operaciones + cobranza + prospectos).
 *
 * Uso:
 *   npm run sembrado:import -- pasaje-alamos
 *   npm run sembrado:import:gavia
 *   node scripts/import-sembrado.mjs mision-la-gavia "G:/ruta/archivo.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";
import { resolveSembradoConfig } from "./sembrado-import-configs.mjs";
import {
  parseSembradoSheetRows,
  prospectoEtapaFromSembrado,
  sembradoToInventario,
} from "./sembrado-import-utils.mjs";

const desarrolloArg = process.argv[2] || "pasaje-alamos";
const xlsxArg = process.argv[3];

const loadSheetRows = (wb, sheetName) => {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.warn(`[sembrado] Hoja no encontrada: "${sheetName}"`);
    return [];
  }
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
};

const collectRows = (wb, config) => {
  const byKey = new Map();

  const upsert = (row) => {
    const key =
      config.unitLookupMode === "unidad|tipo"
        ? `${row.unidad}|${row.tipoProducto}`
        : row.unidad;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      return;
    }
    byKey.set(key, {
      ...prev,
      ...row,
      pagos: row.pagos?.length ? row.pagos : prev.pagos,
      cancelada: Boolean(row.cancelada || prev.cancelada),
      hasOp: Boolean(row.hasOp || prev.hasOp),
    });
  };

  for (const sheet of config.sheets) {
    const rows = loadSheetRows(wb, sheet.name);
    for (const parsed of parseSembradoSheetRows(rows, sheet)) {
      upsert(parsed);
    }
  }

  for (const sheet of config.cancelSheets ?? []) {
    const rows = loadSheetRows(wb, sheet.name);
    for (const parsed of parseSembradoSheetRows(rows, { ...sheet, cancelada: true })) {
      upsert(parsed);
    }
  }

  return [...byKey.values()];
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

  const config = resolveSembradoConfig(desarrolloArg);
  const xlsxPath = resolve(xlsxArg ?? config.defaultXlsx);
  if (!existsSync(xlsxPath)) {
    console.error("No se encontró el Excel:", xlsxPath);
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath, { cellDates: true, cellFormula: false });
  const allRows = collectRows(wb, config);
  console.log(
    `[sembrado:${config.desarrolloId}] Filas: ${allRows.length} (${xlsxPath})`,
  );

  const supabase = createClient(url, key);

  const { error: schemaProbe } = await supabase
    .from("operaciones_comerciales")
    .select("id")
    .limit(1);
  if (schemaProbe?.message?.includes("schema cache") || schemaProbe?.code === "PGRST205") {
    console.error("Aplica migración 018_comercial_crm_sembrado.sql en Supabase.");
    process.exit(1);
  }

  const { error: captacionProbe } = await supabase
    .from("operaciones_comerciales")
    .select("origen_captacion, contrato_firmado")
    .limit(1);
  const hasCaptacionCols = !captacionProbe;

  if (captacionProbe?.message?.includes("origen_captacion")) {
    console.warn(
      "[sembrado] Falta migración 066_sembrado_captacion_perfil.sql — se importará sin captación/perfil/contrato.",
    );
  }

  const { data: unidadesDb, error: unidadesError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad, tipo, cluster_id, precio")
    .eq("desarrollo_id", config.desarrolloId);

  if (unidadesError) {
    console.error("Error leyendo inventario:", unidadesError.message);
    process.exit(1);
  }

  const unitLookup = new Map(
    (unidadesDb ?? []).map((u) => {
      const key =
        config.unitLookupMode === "unidad|tipo" ? `${u.unidad}|${u.tipo}` : u.unidad;
      return [key, u];
    }),
  );

  let inventarioActualizado = 0;
  let operacionesCreadas = 0;
  let operacionesActualizadas = 0;
  let prospectosCreados = 0;
  let cobranzaInsertada = 0;
  const missing = [];

  for (const row of allRows) {
    const key =
      config.unitLookupMode === "unidad|tipo"
        ? `${row.unidad}|${row.tipoProducto}`
        : row.unidad;
    const unit = unitLookup.get(key);
    if (!unit) {
      missing.push(key);
      continue;
    }

    if (!row.cancelada) {
      const { error: invError } = await supabase
        .from("disponibilidad_unidades")
        .update({
          lista_precios: row.listaPrecios,
          estatus: sembradoToInventario(row.estatus),
          visitable: sembradoToInventario(row.estatus) === "disponible",
          entregado: Boolean(row.entregado),
          escriturado: Boolean(row.escriturado),
          notas: [row.edificio, row.lado, row.listaPrecios].filter(Boolean).join(" · ") || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", unit.id);

      if (invError) {
        console.error(`Inventario ${row.unidad}:`, invError.message);
        continue;
      }
      inventarioActualizado += 1;
    }

    if (!row.hasOp && !row.cancelada) continue;

    let prospectoId = null;
    if (row.cliente) {
      const { data: existingProspecto } = await supabase
        .from("prospectos")
        .select("id")
        .eq("desarrollo_id", config.desarrolloId)
        .ilike("nombre", row.cliente)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();

      const prospectoPatch = {
        origen_ciudad: row.origenCiudad || null,
        medio_publicitario: row.medioPublicitario || null,
        promotor_nombre: row.promotor || null,
        equipo_venta: row.equipoVenta || null,
        tipo_inversion: row.tipoInversion,
        etapa: prospectoEtapaFromSembrado(row.estatus, row.cancelada),
        updated_at: new Date().toISOString(),
      };

      if (hasCaptacionCols) {
        prospectoPatch.origen_captacion = row.origenCaptacion || null;
        prospectoPatch.edad = row.edad;
        prospectoPatch.sexo = row.sexo;
        prospectoPatch.ocupacion = row.ocupacion;
      }

      if (existingProspecto?.id) {
        prospectoId = existingProspecto.id;
        await supabase.from("prospectos").update(prospectoPatch).eq("id", prospectoId);
      } else {
        const insertRow = {
          desarrollo_id: config.desarrolloId,
          nombre: row.cliente,
          ...prospectoPatch,
          notas: row.origenCaptacion
            ? `Origen sembrado: ${row.origenCaptacion}`
            : null,
        };
        delete insertRow.updated_at;

        const { data: prospecto, error: prospectoError } = await supabase
          .from("prospectos")
          .insert(insertRow)
          .select("id")
          .single();

        if (prospectoError) {
          console.error(`Prospecto ${row.unidad}:`, prospectoError.message);
        } else {
          prospectoId = prospecto.id;
          prospectosCreados += 1;
        }
      }
    }

    const { data: existingOp } = await supabase
      .from("operaciones_comerciales")
      .select("id")
      .eq("unidad_id", unit.id)
      .eq("cancelada", false)
      .maybeSingle();

    const opPayload = {
      desarrollo_id: config.desarrolloId,
      unidad_id: unit.id,
      prospecto_id: prospectoId,
      estatus_sembrado: row.cancelada ? "Cancelado" : row.estatus,
      cliente_nombre: row.cliente || "Sin nombre",
      origen_ciudad: row.origenCiudad || null,
      equipo_venta: row.equipoVenta || null,
      promotor_nombre: row.promotor || null,
      tipo_inversion: row.tipoInversion,
      lista_precios: row.listaPrecios,
      precio_lista: row.precioLista ?? unit.precio ?? null,
      descuento_pct: row.descuentoPct,
      precio_venta: row.precioVenta,
      esquema_pago: row.esquemaPago,
      fecha_apartado: row.fechaApartado,
      fecha_cierre: row.fechaCierre,
      medio_publicitario: row.medioPublicitario,
      observaciones_pagos: row.observacionesPagos,
      observaciones: row.observaciones,
      entregado: Boolean(row.entregado),
      escriturado: Boolean(row.escriturado),
      cancelada: Boolean(row.cancelada),
      cancelada_at: row.cancelada ? new Date().toISOString() : null,
      comprobacion: row.comprobacion,
      updated_at: new Date().toISOString(),
    };

    if (hasCaptacionCols) {
      opPayload.origen_captacion = row.origenCaptacion || null;
      opPayload.contrato_firmado = Boolean(row.contratoFirmado);
      opPayload.contrato_firmado_at = row.contratoFirmado ? row.fechaCierre || row.fechaApartado : null;
    }

    let operacionId = existingOp?.id ?? null;

    if (existingOp?.id) {
      await supabase.from("cobranza_mensual").delete().eq("operacion_id", existingOp.id);
      const { error: updErr } = await supabase
        .from("operaciones_comerciales")
        .update(opPayload)
        .eq("id", existingOp.id);
      if (updErr) {
        console.error(`Actualizar op ${row.unidad}:`, updErr.message);
        continue;
      }
      operacionesActualizadas += 1;
    } else {
      const { data: operacion, error: opError } = await supabase
        .from("operaciones_comerciales")
        .insert(opPayload)
        .select("id")
        .single();

      if (opError) {
        console.error(`Operación ${row.unidad}:`, opError.message);
        continue;
      }
      operacionId = operacion.id;
      operacionesCreadas += 1;
    }

    if (operacionId && row.pagos?.length && !row.cancelada) {
      const { error: pagosError } = await supabase.from("cobranza_mensual").insert(
        row.pagos.map((p) => ({
          operacion_id: operacionId,
          mes: p.mes,
          monto: p.monto,
        })),
      );
      if (pagosError) {
        console.error(`Cobranza ${row.unidad}:`, pagosError.message);
      } else {
        cobranzaInsertada += row.pagos.length;
      }
    }
  }

  console.log(`[sembrado] Inventario actualizado: ${inventarioActualizado}`);
  console.log(`[sembrado] Prospectos nuevos: ${prospectosCreados}`);
  console.log(`[sembrado] Operaciones nuevas: ${operacionesCreadas}`);
  console.log(`[sembrado] Operaciones actualizadas: ${operacionesActualizadas}`);
  console.log(`[sembrado] Filas cobranza: ${cobranzaInsertada}`);
  if (missing.length) {
    console.warn(
      `[sembrado] Sin match en inventario (${missing.length}):`,
      missing.slice(0, 8).join(", "),
    );
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

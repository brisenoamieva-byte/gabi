/**
 * Importa sembrado Misión La Gavia → Supabase (inventario + operaciones + cobranza).
 * Requiere migración 018 y catálogo sembrado vía npm run catalog:sync.
 *
 * Uso:
 *   npm run sembrado:import:gavia
 *   npm run sembrado:import:gavia -- "G:/ruta/sembrado.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";
import {
  DEFAULT_SEMBRADO_XLSX,
  MISION_LA_GAVIA_DESARROLLO_ID,
  parseSembradoMaps,
  readWorkbook,
  sembradoToInventario,
} from "./mision-la-gavia-excel.mjs";

const prospectoEtapaFromSembrado = (estatus, cancelada) => {
  if (cancelada) return "perdido";
  if (estatus === "Apartado") return "apartado";
  if (
    estatus === "Vendidas Cobradas" ||
    estatus === "Vendidas Desarrollador" ||
    estatus === "Vendido Cobrado 1er Parte" ||
    estatus === "Vendidas listas para cobro" ||
    estatus === "Vendidas en espera de cobro"
  ) {
    return "vendido";
  }
  return "cita";
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

  const xlsxPath = resolve(process.argv[2] ?? DEFAULT_SEMBRADO_XLSX);
  if (!existsSync(xlsxPath)) {
    console.error("No se encontró el Excel:", xlsxPath);
    process.exit(1);
  }

  const wb = readWorkbook(xlsxPath);
  const sembradoByUnidad = parseSembradoMaps(wb);
  const rows = [...sembradoByUnidad.values()];
  console.log(`[gavia-sembrado] Filas: ${rows.length} (${xlsxPath})`);

  const supabase = createClient(url, key);

  const { error: schemaProbe } = await supabase.from("operaciones_comerciales").select("id").limit(1);
  if (schemaProbe?.message?.includes("schema cache") || schemaProbe?.code === "PGRST205") {
    console.error("\nAplica migración 018_comercial_crm_sembrado.sql en Supabase.\n");
    process.exit(1);
  }

  const { data: unidadesDb, error: unidadesError } = await supabase
    .from("disponibilidad_unidades")
    .select("id, unidad, tipo, cluster_id, precio")
    .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID);

  if (unidadesError) {
    console.error("Error leyendo inventario:", unidadesError.message);
    process.exit(1);
  }

  const unitLookup = new Map((unidadesDb ?? []).map((u) => [u.unidad, u]));
  let inventarioActualizado = 0;
  let operacionesCreadas = 0;
  let operacionesActualizadas = 0;
  let prospectosCreados = 0;
  let cobranzaInsertada = 0;
  const missing = [];

  for (const row of rows) {
    const unit = unitLookup.get(row.unidad);
    if (!unit) {
      missing.push(row.unidad);
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
          notas: [row.edificio, row.lado, row.listaPrecios].filter(Boolean).join(" · "),
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
        .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID)
        .ilike("nombre", row.cliente)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();

      if (existingProspecto?.id) {
        prospectoId = existingProspecto.id;
        await supabase
          .from("prospectos")
          .update({
            origen_ciudad: row.origenCiudad || null,
            medio_publicitario: row.medioPublicitario || null,
            promotor_nombre: row.promotor || null,
            equipo_venta: row.equipoVenta || null,
            tipo_inversion: row.tipoInversion,
            etapa: prospectoEtapaFromSembrado(row.estatus, row.cancelada),
            updated_at: new Date().toISOString(),
          })
          .eq("id", prospectoId);
      } else {
        const { data: prospecto, error: prospectoError } = await supabase
          .from("prospectos")
          .insert({
            desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
            nombre: row.cliente,
            origen_ciudad: row.origenCiudad || null,
            medio_publicitario: row.medioPublicitario || null,
            promotor_nombre: row.promotor || null,
            equipo_venta: row.equipoVenta || null,
            tipo_inversion: row.tipoInversion,
            etapa: prospectoEtapaFromSembrado(row.estatus, row.cancelada),
            notas: row.origen ? `Origen sembrado: ${row.origen}` : null,
          })
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
      desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
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
      observaciones: row.observaciones,
      entregado: Boolean(row.entregado),
      escriturado: Boolean(row.escriturado),
      cancelada: Boolean(row.cancelada),
      cancelada_at: row.cancelada ? new Date().toISOString() : null,
      comprobacion: row.comprobacion,
      updated_at: new Date().toISOString(),
    };

    let operacionId = existingOp?.id ?? null;

    if (existingOp?.id) {
      if (row.cancelada) {
        await supabase.from("cobranza_mensual").delete().eq("operacion_id", existingOp.id);
        const { error: cancelErr } = await supabase
          .from("operaciones_comerciales")
          .update(opPayload)
          .eq("id", existingOp.id);
        if (cancelErr) {
          console.error(`Cancelar op ${row.unidad}:`, cancelErr.message);
          continue;
        }
        operacionesActualizadas += 1;
      } else {
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
      }
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

  console.log(`[gavia-sembrado] Inventario actualizado: ${inventarioActualizado}`);
  console.log(`[gavia-sembrado] Prospectos nuevos: ${prospectosCreados}`);
  console.log(`[gavia-sembrado] Operaciones nuevas: ${operacionesCreadas}`);
  console.log(`[gavia-sembrado] Operaciones actualizadas: ${operacionesActualizadas}`);
  console.log(`[gavia-sembrado] Filas cobranza: ${cobranzaInsertada}`);
  if (missing.length) {
    console.warn(
      `[gavia-sembrado] Sin match en inventario (${missing.length}):`,
      missing.slice(0, 8).join(", "),
    );
    if (missing.length > 8) console.warn("…");
    console.warn("Ejecuta npm run catalog:sync para cargar unidades La Gavia en Supabase.");
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

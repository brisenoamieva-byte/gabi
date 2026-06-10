/**
 * Importa sembrado Misión La Gavia → Supabase (inventario + operaciones).
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
  MISION_LA_GAVIA_CLUSTER_ID,
  MISION_LA_GAVIA_DESARROLLO_ID,
  operacionTieneCliente,
  parseSembradoMaps,
  readWorkbook,
  sembradoToInventario,
} from "./mision-la-gavia-excel.mjs";

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
    .select("id, unidad, tipo, cluster_id")
    .eq("desarrollo_id", MISION_LA_GAVIA_DESARROLLO_ID);

  if (unidadesError) {
    console.error("Error leyendo inventario:", unidadesError.message);
    process.exit(1);
  }

  const unitLookup = new Map((unidadesDb ?? []).map((u) => [u.unidad, u]));
  let inventarioActualizado = 0;
  let operacionesCreadas = 0;
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

    const hasOp = operacionTieneCliente(row.estatus, row.cliente);
    if (!hasOp) continue;

    const { data: existingOp } = await supabase
      .from("operaciones_comerciales")
      .select("id")
      .eq("disponibilidad_unidad_id", unit.id)
      .eq("cancelada", false)
      .maybeSingle();

    if (existingOp?.id) continue;

    const { data: prospecto, error: prospectoError } = await supabase
      .from("prospectos")
      .insert({
        nombre: row.cliente,
        desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
        origen: row.origen || null,
        medio: row.origen || null,
        notas: row.promotor ? `Promotor: ${row.promotor}` : null,
      })
      .select("id")
      .single();

    if (prospectoError) {
      console.error(`Prospecto ${row.unidad}:`, prospectoError.message);
      continue;
    }

    const { error: opError } = await supabase.from("operaciones_comerciales").insert({
      prospecto_id: prospecto.id,
      disponibilidad_unidad_id: unit.id,
      desarrollo_id: MISION_LA_GAVIA_DESARROLLO_ID,
      cluster_id: MISION_LA_GAVIA_CLUSTER_ID,
      estatus_sembrado: row.estatus,
      cancelada: Boolean(row.cancelada),
      equipo_venta: row.equipoVenta || null,
      promotor: row.promotor || null,
    });

    if (opError) {
      console.error(`Operación ${row.unidad}:`, opError.message);
      continue;
    }
    operacionesCreadas += 1;
  }

  console.log(`[gavia-sembrado] Inventario actualizado: ${inventarioActualizado}`);
  console.log(`[gavia-sembrado] Operaciones nuevas: ${operacionesCreadas}`);
  if (missing.length) {
    console.warn(`[gavia-sembrado] Sin match en inventario (${missing.length}):`, missing.slice(0, 8).join(", "));
    if (missing.length > 8) console.warn("…");
    console.warn("Ejecuta npm run catalog:sync para cargar unidades La Gavia en Supabase.");
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

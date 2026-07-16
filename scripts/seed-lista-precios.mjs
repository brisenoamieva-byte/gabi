/**
 * Seed Lista 1 para un desarrollo desde inventario + backfill lista_precios_id en operaciones.
 *
 * Uso:
 *   npm run listas:seed:gavia
 *   node scripts/seed-lista-precios.mjs mision-la-gavia
 *   node scripts/seed-lista-precios.mjs mision-la-gavia --activate
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

const desarrolloId = process.argv[2] || "mision-la-gavia";
const activate = process.argv.includes("--activate");

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

  const supabase = createClient(url, key);

  const { error: probe } = await supabase.from("listas_precios").select("id").limit(1);
  if (probe?.message?.includes("schema cache") || probe?.code === "PGRST205") {
    console.error("Aplica migración 065_listas_precios.sql primero (npm run db:apply:065).");
    process.exit(1);
  }

  const { data: existingActiva } = await supabase
    .from("listas_precios")
    .select("id, nombre, estado")
    .eq("desarrollo_id", desarrolloId)
    .eq("estado", "activa")
    .maybeSingle();

  if (existingActiva) {
    console.log(`[listas] Ya hay lista activa: ${existingActiva.nombre} (${existingActiva.id})`);
  } else {
    const { data: existingAny } = await supabase
      .from("listas_precios")
      .select("id")
      .eq("desarrollo_id", desarrolloId)
      .limit(1);

    if (existingAny?.length) {
      console.log("[listas] Ya existen listas; no se crea seed. Activa una desde admin.");
    } else {
      const { data: units, error: unitsError } = await supabase
        .from("disponibilidad_unidades")
        .select("id, unidad, precio")
        .eq("desarrollo_id", desarrolloId);

      if (unitsError) {
        console.error(unitsError.message);
        process.exit(1);
      }

      const priced = (units ?? []).filter((row) => row.precio != null && Number(row.precio) > 0);
      if (!priced.length) {
        console.error("No hay unidades con precio. Corre sembrado/catalog sync primero.");
        process.exit(1);
      }

      const vigenciaDesde = new Date().toISOString().slice(0, 10);
      const { data: lista, error: listaError } = await supabase
        .from("listas_precios")
        .insert({
          desarrollo_id: desarrolloId,
          nombre: "Lista 1",
          codigo: "lista-1",
          vigencia_desde: vigenciaDesde,
          estado: activate ? "activa" : "borrador",
          notas: "Seed desde inventario vigente (script seed-lista-precios).",
        })
        .select("*")
        .single();

      if (listaError) {
        console.error(listaError.message);
        process.exit(1);
      }

      const { error: insertError } = await supabase.from("lista_precios_unidades").insert(
        priced.map((row) => ({
          lista_id: lista.id,
          unidad_id: row.id,
          precio_lista: Number(row.precio),
        })),
      );

      if (insertError) {
        await supabase.from("listas_precios").delete().eq("id", lista.id);
        console.error(insertError.message);
        process.exit(1);
      }

      if (activate) {
        for (const row of priced) {
          await supabase
            .from("disponibilidad_unidades")
            .update({
              lista_precios: "Lista 1",
              updated_at: new Date().toISOString(),
            })
            .eq("id", row.id)
            .neq("estatus", "vendido");
        }
      }

      console.log(
        `[listas] Creada ${lista.nombre} (${lista.estado}) con ${priced.length} precios · ${lista.id}`,
      );
    }
  }

  const { data: activa } = await supabase
    .from("listas_precios")
    .select("id, nombre")
    .eq("desarrollo_id", desarrolloId)
    .eq("estado", "activa")
    .maybeSingle();

  if (!activa) {
    console.log("[listas] Sin lista activa: no hay backfill de operaciones.");
    return;
  }

  const { data: ops, error: opsError } = await supabase
    .from("operaciones_comerciales")
    .select("id, lista_precios, lista_precios_id")
    .eq("desarrollo_id", desarrolloId)
    .is("lista_precios_id", null);

  if (opsError) {
    console.error("Backfill:", opsError.message);
    process.exit(1);
  }

  let updated = 0;
  for (const op of ops ?? []) {
    const { error } = await supabase
      .from("operaciones_comerciales")
      .update({
        lista_precios_id: activa.id,
        lista_precios: op.lista_precios?.trim() || activa.nombre,
        updated_at: new Date().toISOString(),
      })
      .eq("id", op.id);
    if (!error) {
      updated += 1;
    }
  }

  console.log(`[listas] Backfill operaciones: ${updated} filas → ${activa.nombre}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

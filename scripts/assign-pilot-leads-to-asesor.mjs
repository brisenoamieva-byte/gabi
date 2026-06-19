/**
 * Asigna prospectos sin asesor en desarrollos piloto (Pasaje + La Vista).
 *
 *   npm run leads:assign-pilot
 *   npm run leads:assign-pilot -- rbriseno
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const PILOT_DESARROLLOS = ["pasaje-alamos", "la-vista-residencial"];
const defaultAsesorId = process.argv[2]?.trim() || "rbriseno";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: asesor, error: asesorError } = await supabase
  .from("asesores")
  .select("id, nombre, desarrollos_ids, activo")
  .eq("id", defaultAsesorId)
  .maybeSingle();

if (asesorError || !asesor) {
  console.error(`Asesor no encontrado: ${defaultAsesorId}`);
  process.exit(1);
}

if (!asesor.activo) {
  console.error(`Asesor ${defaultAsesorId} no está activo.`);
  process.exit(1);
}

const desarrollosIds = asesor.desarrollos_ids ?? [];
const allowed = PILOT_DESARROLLOS.filter((id) => desarrollosIds.includes(id));
if (!allowed.length) {
  console.error(
    `Asesor ${asesor.nombre} no tiene acceso a desarrollos piloto en desarrollos_ids.`,
  );
  process.exit(1);
}

let total = 0;

for (const desarrolloId of allowed) {
  const { data: rows, error } = await supabase
    .from("prospectos")
    .select("id")
    .eq("desarrollo_id", desarrolloId)
    .is("asesor_id", null);

  if (error) {
    console.error(`Error listando ${desarrolloId}:`, error.message);
    process.exit(1);
  }

  const ids = (rows ?? []).map((row) => row.id);
  if (!ids.length) {
    console.log(`${desarrolloId}: 0 sin asesor`);
    continue;
  }

  const { error: updateError } = await supabase
    .from("prospectos")
    .update({
      asesor_id: defaultAsesorId,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (updateError) {
    console.error(`Error asignando ${desarrolloId}:`, updateError.message);
    process.exit(1);
  }

  console.log(`${desarrolloId}: ${ids.length} lead(s) → ${asesor.nombre} (${defaultAsesorId})`);
  total += ids.length;
}

console.log(`\nTotal asignados: ${total}`);

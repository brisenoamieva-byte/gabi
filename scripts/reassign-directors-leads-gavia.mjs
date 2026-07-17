import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const DIRECTOR_IDS = ["nperea", "fvera", "rbriseno", "ricardo"];
const DESARROLLO = "mision-la-gavia";
const TARGET = "emmanuel.escobar";

const { data, error } = await s
  .from("prospectos")
  .select("id, nombre, asesor_id, etapa, activo")
  .eq("desarrollo_id", DESARROLLO)
  .in("asesor_id", DIRECTOR_IDS)
  .eq("activo", true);

if (error) {
  console.error(error);
  process.exit(1);
}

const byAsesor = {};
for (const p of data ?? []) {
  byAsesor[p.asesor_id] = (byAsesor[p.asesor_id] || 0) + 1;
}
console.log("count", data?.length);
console.log("byAsesor", byAsesor);
console.log(
  (data ?? [])
    .slice(0, 20)
    .map((p) => `${p.asesor_id} | ${p.etapa} | ${p.nombre}`)
    .join("\n"),
);

const apply = process.argv.includes("--apply");
if (!apply) {
  console.log("\nDry-run. Pasa --apply para reasignar a", TARGET);
  process.exit(0);
}

const ids = (data ?? []).map((p) => p.id);
if (!ids.length) {
  console.log("Nada que reasignar.");
  process.exit(0);
}

const { error: updError } = await s
  .from("prospectos")
  .update({
    asesor_id: TARGET,
    updated_at: new Date().toISOString(),
  })
  .in("id", ids);

if (updError) {
  console.error(updError);
  process.exit(1);
}

console.log(`Reasignados ${ids.length} prospectos a ${TARGET}`);

const { error: rolError } = await s
  .from("asesores")
  .update({ rol: "gerente", updated_at: new Date().toISOString() })
  .eq("id", TARGET);

if (rolError) {
  console.error("No se pudo poner gerente a Emmanuel:", rolError);
  process.exit(1);
}
console.log("Emmanuel Escobar → rol gerente");

/**
 * Smoke test: migraciones 037/038 + datos playbook piloto.
 *   npm run db:smoke:playbook
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("Falta .env.local");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const checks = [
  { id: "037", table: "prospecto_encuestas", column: "tipo" },
  { id: "038", table: "crm_playbook_configs", column: "desarrollo_id" },
];

let ok = true;

for (const check of checks) {
  const { error } = await supabase.from(check.table).select(check.column).limit(1);
  if (error) {
    ok = false;
    console.log(`FAIL ${check.id}: ${check.table} — ${error.message}`);
  } else {
    console.log(`OK ${check.id}: ${check.table}`);
  }
}

if (!ok) {
  console.log("\n→ Aplica: npm run db:apply:037-038 (con SUPABASE_DB_PASSWORD)");
  console.log("   o pega _bundle_037_038_apply_once.sql en SQL Editor\n");
  process.exit(1);
}

const { data: configs, error: configError } = await supabase
  .from("crm_playbook_configs")
  .select("desarrollo_id, enabled, block_etapa")
  .in("desarrollo_id", ["pasaje-alamos", "la-vista-residencial"]);

if (configError) {
  console.log("FAIL seed playbook:", configError.message);
  process.exit(1);
}

const ids = (configs ?? []).map((row) => row.desarrollo_id);
console.log(`Playbooks piloto en BD: ${ids.join(", ") || "ninguno"}`);

if (ids.length < 2) {
  console.log("WARN: falta seed de playbooks — reaplica 038");
}

const { count, error: prospectoError } = await supabase
  .from("prospectos")
  .select("id", { count: "exact", head: true })
  .eq("desarrollo_id", "pasaje-alamos");

if (!prospectoError) {
  console.log(`Prospectos Pasaje: ${count ?? 0}`);
}

console.log("\nSmoke test OK — playbook CRM listo en Supabase.");

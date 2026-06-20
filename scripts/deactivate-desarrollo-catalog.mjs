/**
 * Desactiva un desarrollo en catálogo y lo quita de asesores activos.
 * Uso: node scripts/deactivate-desarrollo-catalog.mjs la-vista-residencial
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const desarrolloId = process.argv[2]?.trim();
if (!desarrolloId) {
  console.error("Uso: node scripts/deactivate-desarrollo-catalog.mjs <desarrollo-id>");
  process.exit(1);
}

const envPath = resolve(process.cwd(), ".env.local");
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

const { error: catalogError } = await supabase
  .from("desarrollos_catalog")
  .update({ activo: false, updated_at: new Date().toISOString() })
  .eq("id", desarrolloId);

if (catalogError) {
  console.error("Catálogo:", catalogError.message);
  process.exit(1);
}

const { data: asesores, error: listError } = await supabase
  .from("asesores")
  .select("id, nombre, desarrollos_ids")
  .contains("desarrollos_ids", [desarrolloId]);

if (listError) {
  console.error("Asesores:", listError.message);
  process.exit(1);
}

let updatedAsesores = 0;
for (const row of asesores ?? []) {
  const ids = (row.desarrollos_ids ?? []).filter((id) => id !== desarrolloId);
  const { error } = await supabase
    .from("asesores")
    .update({ desarrollos_ids: ids, updated_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) {
    console.error(`Asesor ${row.id}:`, error.message);
  } else {
    updatedAsesores += 1;
    console.log(`OK asesor ${row.nombre} (${row.id})`);
  }
}

console.log(`\nDesarrollo ${desarrolloId} desactivado en catálogo.`);
console.log(`Asesores actualizados: ${updatedAsesores}`);

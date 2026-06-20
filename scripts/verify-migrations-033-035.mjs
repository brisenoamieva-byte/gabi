import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const checks = [
  {
    id: "033",
    table: "propuestas_overrides",
    column: "slug",
    migration: "033_propuestas_overrides.sql",
  },
  {
    id: "034",
    table: "corredor_desarrollo_overrides",
    column: "desarrollo_id",
    migration: "034_corredor_overrides.sql",
  },
  {
    id: "035",
    table: "comercial_objetivos_anuales",
    column: "id",
    migration: "035_comercial_objetivos_anuales.sql",
  },
  {
    id: "036",
    table: "asesores",
    column: "telefono",
    migration: "036_asesores_telefono.sql",
  },
  {
    id: "037",
    table: "prospecto_encuestas",
    column: "tipo",
    migration: "037_prospecto_qa_satisfaccion.sql",
  },
  {
    id: "038",
    table: "crm_playbook_configs",
    column: "desarrollo_id",
    migration: "038_crm_playbook.sql",
  },
  {
    id: "039",
    table: "guardia_asignaciones",
    column: "turno",
    migration: "039_guardias_calendario.sql",
  },
];

let allOk = true;

for (const check of checks) {
  const { error } = await supabase.from(check.table).select(check.column).limit(1);
  if (error) {
    allOk = false;
    console.log(`FAIL ${check.id}: ${check.table} — ${error.message}`);
    console.log(`  → Aplica supabase/migrations/${check.migration}`);
  } else {
    console.log(`OK ${check.id}: ${check.table}`);
  }
}

const { data, error: objetivosError } = await supabase
  .from("comercial_objetivos_anuales")
  .select("segmento_id")
  .eq("desarrollo_id", "pasaje-alamos")
  .eq("anio", 2026);

if (!objetivosError) {
  const count = data?.length ?? 0;
  console.log(`Objetivos Pasaje 2026: ${count} segmento(s)`);
  if (count < 2) {
    allOk = false;
    console.log("  → Falta seed de objetivos; reaplica 035_comercial_objetivos_anuales.sql");
  }
}

const { data: playbookRows, error: playbookSeedError } = await supabase
  .from("crm_playbook_configs")
  .select("desarrollo_id, enabled")
  .in("desarrollo_id", ["pasaje-alamos", "la-vista-residencial"]);

if (!playbookSeedError) {
  const count = playbookRows?.length ?? 0;
  console.log(`Playbooks piloto en BD: ${count}/2`);
  if (count < 2) {
    allOk = false;
    console.log("  → Falta seed playbook; reaplica 038_crm_playbook.sql");
  }
}

process.exit(allOk ? 0 : 1);

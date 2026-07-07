/**
 * Estado operativo del piloto cadencia + playbook.
 *   npm run cadencia:pilot-status
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const PILOTS = ["pasaje-alamos", "la-vista-residencial", "mision-la-gavia"];

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const probe = async (table) => {
  const { error } = await supabase.from(table).select("*").limit(1);
  return !error;
};

const cadenciaOk = await probe("prospecto_cadencia");
const guardiasOk = await probe("guardia_marcajes");
const playbookOk = await probe("crm_playbook_configs");

console.log("\n=== Infra piloto CRM ===");
console.log(`prospecto_cadencia (045): ${cadenciaOk ? "OK" : "FALTA — aplica 045 en Supabase"}`);
console.log(`guardia_marcajes (044):   ${guardiasOk ? "OK" : "FALTA — aplica 044 en Supabase"}`);
console.log(`crm_playbook_configs:     ${playbookOk ? "OK" : "FALTA"}`);

if (!cadenciaOk) {
  process.exit(1);
}

const { data: configs } = await supabase
  .from("crm_playbook_configs")
  .select("desarrollo_id, enabled")
  .in("desarrollo_id", PILOTS);

const configMap = new Map((configs ?? []).map((row) => [row.desarrollo_id, row.enabled]));

console.log("\n=== Playbook piloto ===");
for (const id of PILOTS) {
  const enabled = configMap.get(id);
  console.log(`${id}: ${enabled === true ? "activo" : enabled === false ? "desactivado" : "sin config"}`);
}

console.log("\n=== Cadencia por desarrollo ===");
for (const desarrolloId of PILOTS) {
  const { count: nuevos } = await supabase
    .from("prospectos")
    .select("id", { count: "exact", head: true })
    .eq("desarrollo_id", desarrolloId)
    .eq("etapa", "nuevo")
    .eq("activo", true);

  const { data: cadencias } = await supabase
    .from("prospecto_cadencia")
    .select("status")
    .eq("desarrollo_id", desarrolloId);

  const rows = cadencias ?? [];
  const active = rows.filter((r) => r.status === "active").length;
  const paused = rows.filter((r) => r.status === "paused").length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const expired = rows.filter((r) => r.status === "expired").length;

  const { count: pendingTouches } = await supabase
    .from("prospecto_cadencia_touches")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .in(
      "cadencia_id",
      (
        await supabase
          .from("prospecto_cadencia")
          .select("id")
          .eq("desarrollo_id", desarrolloId)
          .eq("status", "active")
      ).data?.map((r) => r.id) ?? ["__none__"],
    );

  console.log(
    `${desarrolloId}: ${nuevos ?? 0} nuevos activos · cadencias activas ${active} (pausadas ${paused}, cerradas ${completed}, expiradas ${expired}) · toques pendientes ${pendingTouches ?? 0}`,
  );
}

console.log("\nListo.\n");

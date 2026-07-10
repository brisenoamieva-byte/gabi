import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocalIntoProcess } from "./resolve-supabase-db-url.mjs";

loadEnvLocalIntoProcess();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const probe = async (table, column) => {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
};

const checks = [
  { id: "019", table: "campanas", column: "id", file: "019_campanas.sql" },
  { id: "020", table: "prospectos", column: "calificacion", file: "020_xperience_lead_fields.sql" },
  { id: "021", table: "prospectos", column: "nivel_interes", file: "021_prospecto_nivel_interes.sql" },
  { id: "022", table: "expediente_documentos", column: "id", file: "022_expediente_ventas.sql" },
  { id: "023", table: "solicitudes_comision", column: "precio_venta", file: "023_expediente_comisiones.sql" },
  { id: "024", table: "lead_captura_logs", column: "id", file: "024_lead_captura_logs.sql" },
  { id: "033", table: "propuestas_overrides", column: "slug", file: "033_propuestas_overrides.sql" },
  { id: "034", table: "corredor_desarrollo_overrides", column: "desarrollo_id", file: "034_corredor_overrides.sql" },
  { id: "035", table: "comercial_objetivos_anuales", column: "id", file: "035_comercial_objetivos_anuales.sql" },
  { id: "036", table: "asesores", column: "telefono", file: "036_asesores_telefono.sql" },
  { id: "037", table: "prospecto_encuestas", column: "tipo", file: "037_prospecto_qa_satisfaccion.sql" },
  { id: "038", table: "crm_playbook_configs", column: "desarrollo_id", file: "038_crm_playbook.sql" },
  { id: "039", table: "guardia_asignaciones", column: "turno", file: "039_guardias_calendario.sql" },
  { id: "041", table: "lead_carousel_state", column: "desarrollo_id", file: "041_whatsapp_lead_notifications.sql" },
  { id: "042", table: "compliance_digest_log", column: "desarrollo_id", file: "042_crm_compliance_digest.sql" },
  { id: "043", table: "compliance_digest_log", column: "channel", file: "043_crm_compliance_gavia.sql" },
  { id: "044", table: "guardia_marcajes", column: "id", file: "044_guardia_marcajes.sql" },
  { id: "045", table: "prospecto_cadencia", column: "prospecto_id", file: "045_cadencia_perfilamiento.sql" },
  { id: "046", table: "prospectos", column: "visita_agendada_on", file: "046_prospecto_fechas_visita.sql" },
  { id: "048", table: "prospectos", column: "perfil_presupuesto_disponible", file: "048_prospecto_perfilamiento_visita.sql" },
  { id: "050", table: "solicitudes_apartado", column: "id", file: "050_solicitudes_apartado.sql" },
  { id: "051", table: "guardia_caseta_config", column: "desarrollo_id", file: "051_guardia_caseta_pasaje_alamos.sql" },
  { id: "052", table: "guardia_caseta_config", column: "puntos_extra", file: "052_guardia_caseta_puntos_extra.sql" },
  { id: "055", table: "desarrollos_catalog", column: "hub_hero_image", file: "055_desarrollo_hub_hero.sql" },
  { id: "057", table: "prospectos", column: "perfil_calificacion_lead", file: "057_prospecto_perfil_calificacion_lead.sql" },
  { id: "058", table: "guardia_salida_cuestionarios", column: "atendio_citas_visitas", file: "058_guardia_salida_cuestionario.sql" },
  { id: "059", table: "prospectos", column: "etapa", file: "059_quitar_etapa_negociacion.sql" },
];

const fails = [];

for (const check of checks) {
  const ok = await probe(check.table, check.column);
  console.log(`${ok ? "OK" : "FAIL"} ${check.id}: ${check.table}.${check.column}`);
  if (!ok) {
    fails.push({ ...check, reason: "schema" });
  }
}

const { data: laVista } = await supabase
  .from("desarrollos_catalog")
  .select("activo")
  .eq("id", "la-vista-residencial")
  .maybeSingle();
const ok053 = laVista?.activo === false;
console.log(`${ok053 ? "OK" : "FAIL"} 053: la-vista-residencial activo=false`);
if (!ok053) {
  fails.push({ id: "053", file: "053_la_vista_pausado.sql", reason: "seed" });
}

const { data: buckets } = await supabase.storage.listBuckets();
const ok054 = buckets?.some((bucket) => bucket.id === "gabi-assets");
console.log(`${ok054 ? "OK" : "FAIL"} 054: storage bucket gabi-assets`);
if (!ok054) {
  fails.push({ id: "054", file: "054_gabi_assets_storage.sql", reason: "bucket" });
}

const { error: masterPlanError } = await supabase
  .from("documentos")
  .select("tipo")
  .eq("tipo", "master_plan")
  .limit(1);
const ok056 = !masterPlanError;
console.log(`${ok056 ? "OK" : "FAIL"} 056: documentos.tipo master_plan`);
if (!ok056) {
  fails.push({ id: "056", file: "056_documento_master_plan.sql", reason: "constraint" });
}

const { data: playbook } = await supabase
  .from("crm_playbook_configs")
  .select("steps")
  .eq("desarrollo_id", "pasaje-alamos")
  .maybeSingle();
const steps = playbook?.steps ?? [];
const ok047 = Array.isArray(steps) && steps.some((step) => step?.id === "recorrido" && step?.kind === "manual");
console.log(`${ok047 ? "OK" : "WARN"} 047: playbook recorrido manual (dato/seed)`);

const { error: citaError } = await supabase.from("prospectos").select("etapa").eq("etapa", "cita").limit(1);
const ok049 = !citaError;
console.log(`${ok049 ? "OK" : "FAIL"} 049: prospectos.etapa cita`);
if (!ok049) {
  fails.push({ id: "049", file: "049_etapa_cita_reemplaza_cotizo.sql", reason: "constraint" });
}

const { data: pasajeCaseta } = await supabase
  .from("guardia_caseta_config")
  .select("puntos_extra, lat")
  .eq("desarrollo_id", "pasaje-alamos")
  .maybeSingle();
if (pasajeCaseta) {
  const hasExtra = Array.isArray(pasajeCaseta.puntos_extra) && pasajeCaseta.puntos_extra.length > 0;
  console.log(`${hasExtra ? "OK" : "WARN"} 052: seed puntos_extra Pasaje (${pasajeCaseta.puntos_extra?.length ?? 0} punto(s))`);
}

console.log("\n--- Resumen ---");
if (!fails.length) {
  console.log("Todas las migraciones verificables (019–056) están aplicadas en producción.");
  process.exit(0);
}

console.log(`${fails.length} migración(es) pendiente(s):`);
for (const item of fails) {
  console.log(`  • ${item.id} → supabase/migrations/${item.file}`);
}
process.exit(1);

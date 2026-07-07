/**
 * Crea un lead demo en etapa nuevo para probar playbook en /mis-leads.
 * No usar en producción: ensucia la bandeja "Hoy toca". Limpiar con:
 *   npm run leads:cleanup-playbook-demo
 *   npm run leads:seed-playbook-demo
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const asesorId = process.argv[2]?.trim() || "rbriseno";
const desarrolloId = process.argv[3]?.trim() || "pasaje-alamos";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const nombre = "Demo Playbook GABI";

const { data: existing } = await supabase
  .from("prospectos")
  .select("id")
  .eq("desarrollo_id", desarrolloId)
  .eq("asesor_id", asesorId)
  .eq("nombre", nombre)
  .maybeSingle();

const payload = {
  desarrollo_id: desarrolloId,
  asesor_id: asesorId,
  nombre,
  email: "demo.playbook@gabi.mx",
  telefono: "+525551234567",
  etapa: "nuevo",
  notas: "Lead de prueba para cola Siguiente paso.",
  activo: true,
  updated_at: new Date().toISOString(),
};

if (existing?.id) {
  const { error } = await supabase.from("prospectos").update(payload).eq("id", existing.id);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`Demo actualizado: ${existing.id}`);
} else {
  const { data, error } = await supabase.from("prospectos").insert(payload).select("id").single();
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(`Demo creado: ${data.id}`);
}

console.log(`Asesor ${asesorId} · ${desarrolloId} · etapa nuevo → prueba /mis-leads`);

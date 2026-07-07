/**
 * Cierra cadencia y desactiva el lead de prueba del playbook (no debe aparecer en producción).
 *   npm run leads:cleanup-playbook-demo
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const DEMO_NOMBRE = "Demo Playbook GABI";
const DEMO_EMAIL = "demo.playbook@gabi.mx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: leads, error } = await supabase
  .from("prospectos")
  .select("id, desarrollo_id, nombre, activo")
  .or(`nombre.eq.${DEMO_NOMBRE},email.eq.${DEMO_EMAIL}`);

if (error) {
  console.error(error.message);
  process.exit(1);
}

if (!leads?.length) {
  console.log("No hay leads demo que limpiar.");
  process.exit(0);
}

const now = new Date().toISOString();

for (const lead of leads) {
  const { data: cadencia } = await supabase
    .from("prospecto_cadencia")
    .select("id, status")
    .eq("prospecto_id", lead.id)
    .in("status", ["active", "paused"])
    .maybeSingle();

  if (cadencia) {
    await supabase
      .from("prospecto_cadencia")
      .update({
        status: "completed",
        completed_at: now,
        pause_reason: "lead_demo_retirado",
        updated_at: now,
      })
      .eq("id", cadencia.id);

    await supabase
      .from("prospecto_cadencia_touches")
      .update({ status: "skipped" })
      .eq("cadencia_id", cadencia.id)
      .eq("status", "pending");

    console.log(`Cadencia ${cadencia.id} cerrada (${lead.desarrollo_id})`);
  }

  await supabase
    .from("prospectos")
    .update({
      activo: false,
      etapa: "perdido",
      notas: "Lead de prueba playbook — retirado de operación.",
      updated_at: now,
    })
    .eq("id", lead.id);

  console.log(`Lead demo desactivado: ${lead.id} · ${lead.nombre}`);
}

console.log("Listo.");

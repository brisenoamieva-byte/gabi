/**
 * Smoke test: cola de playbook para un asesor con leads en Pasaje.
 *   npm run db:smoke:playbook-queue
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

const { data: prospecto, error } = await supabase
  .from("prospectos")
  .select("asesor_id, desarrollo_id, nombre")
  .eq("desarrollo_id", "pasaje-alamos")
  .not("asesor_id", "is", null)
  .limit(1)
  .maybeSingle();

let asesorId = prospecto?.asesor_id;

if (!asesorId) {
  const { data: asesor } = await supabase
    .from("asesores")
    .select("id, desarrollos_ids")
    .contains("desarrollos_ids", ["pasaje-alamos"])
    .eq("activo", true)
    .limit(1)
    .maybeSingle();
  asesorId = asesor?.id;
}

if (!asesorId) {
  console.error("No hay asesor con acceso a Pasaje. Ejecuta: npm run leads:assign-pilot");
  process.exit(1);
}

const baseUrl = env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
const params = new URLSearchParams({
  asesorId,
  desarrolloId: "pasaje-alamos",
});

const response = await fetch(`${baseUrl}/api/asesores/crm-playbook/queue?${params}`);
const data = await response.json();

if (!response.ok) {
  console.error("FAIL queue API:", data.error ?? response.status);
  process.exit(1);
}

const queue = data.queue ?? [];
console.log(`Asesor: ${asesorId}`);
console.log(`Cola playbook: ${queue.length} lead(s) con paso pendiente`);
if (queue[0]) {
  console.log(`Prioridad: ${queue[0].nombre} → ${queue[0].nextStep?.label ?? "—"}`);
}
console.log("Smoke queue OK");

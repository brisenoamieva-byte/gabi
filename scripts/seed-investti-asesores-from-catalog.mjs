/**
 * Crea/actualiza asesores Investti en GABI desde xperience-catalog.json.
 *
 *   npm run leads:seed-investti-asesores
 */
import { createClient } from "@supabase/supabase-js";
import { scryptSync, randomBytes } from "node:crypto";
import { loadEnvLocal } from "./load-env-local.mjs";
import { loadXperienceCatalog, gabiAsesorIdFromEmail } from "./xperience-asesor-resolver.mjs";

loadEnvLocal();

const hashPin = (pin) => {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
};

const INVESTTI_DESARROLLOS = [
  "canadas-la-porta",
  "canadas-del-arroyo",
  "simate",
  "canadas-del-valle",
];

const catalog = loadXperienceCatalog();
const emails = Object.keys(catalog.asesorIdsByEmail ?? {});
const displayNames = catalog.asesorDisplayNamesByEmail ?? {};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

let upserted = 0;

for (const email of emails) {
  const id = gabiAsesorIdFromEmail(email);
  const nombre = displayNames[email] ?? email.split("@")[0];

  const { data: existing } = await supabase.from("asesores").select("id").eq("id", id).maybeSingle();

  const payload = {
    id,
    nombre,
    email,
    rol: "asesor",
    activo: true,
    desarrollos_ids: INVESTTI_DESARROLLOS,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase.from("asesores").update(payload).eq("id", id);
    if (error) {
      console.error(`Error actualizando ${id}:`, error.message);
      continue;
    }
    console.log(`Actualizado: ${id} (${nombre})`);
  } else {
    const { error } = await supabase.from("asesores").insert({
      ...payload,
      pin_hash: hashPin("0000"),
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error(`Error creando ${id}:`, error.message);
      continue;
    }
    console.log(`Creado: ${id} (${nombre}) · PIN inicial 0000`);
  }
  upserted += 1;
}

console.log(`\nInvestti asesores listos: ${upserted}/${emails.length}`);

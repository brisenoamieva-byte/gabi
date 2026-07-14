/**
 * Desactiva prospectos en "apartado" que ya tienen gemelo en "vendido"
 * en el mismo desarrollo (teléfono, email o nombre normalizado).
 *
 *   node scripts/cleanup-apartado-vendido-duplicates.mjs           # dry-run
 *   node scripts/cleanup-apartado-vendido-duplicates.mjs --apply
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const APPLY = process.argv.includes("--apply");

const normalizeEmail = (value) => value?.trim().toLowerCase() || null;
const normalizePhone = (value) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return null;
  return digits.slice(-10);
};

const normalizeName = (value) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Variantes de nombre útiles para match (quita notas y partes tras " / "). */
const nameVariants = (value) => {
  const base = normalizeName(value);
  if (!base) return [];
  const variants = new Set([base]);
  for (const part of base.split("/")) {
    const trimmed = part.trim();
    if (trimmed) variants.add(trimmed);
  }
  return Array.from(variants);
};

const nameTokens = (name) =>
  name
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !["del", "de", "los", "las", "la", "el"].includes(t));

const namesMatch = (aNombre, vNombre) => {
  const aVars = nameVariants(aNombre);
  const vVars = nameVariants(vNombre);
  if (!aVars.length || !vVars.length) return null;

  for (const a of aVars) {
    for (const v of vVars) {
      if (a === v) return `n:${a}`;
      if (a.length >= 10 && v.includes(a)) return `contains:${a}`;
      if (v.length >= 10 && a.includes(v)) return `contains:${v}`;

      const at = nameTokens(a);
      const vt = nameTokens(v);
      if (at.length < 2 || vt.length < 2) continue;
      const shared = at.filter((t) => vt.includes(t));
      // Mismo nombre de pila + al menos un apellido (evita García Quintana ≠ María del Pilar García Quintana)
      if (at[0] === vt[0] && shared.length >= 2) {
        return `tokens:${shared.join("+")}`;
      }
      if (shared.length >= 3) {
        return `tokens:${shared.join("+")}`;
      }
    }
  }
  return null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const pageSize = 1000;
const rows = [];
for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase
    .from("prospectos")
    .select("id, desarrollo_id, nombre, email, telefono, etapa, created_at")
    .eq("activo", true)
    .in("etapa", ["apartado", "vendido"])
    .order("created_at", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < pageSize) break;
}

const byDesarrollo = new Map();
for (const row of rows) {
  const list = byDesarrollo.get(row.desarrollo_id) ?? [];
  list.push(row);
  byDesarrollo.set(row.desarrollo_id, list);
}

const twins = [];
const apartadoIds = new Set();

for (const [desarrolloId, list] of byDesarrollo) {
  const vendidos = list.filter((r) => r.etapa === "vendido");
  const vendidosByContact = new Map();
  for (const v of vendidos) {
    const email = normalizeEmail(v.email);
    const phone = normalizePhone(v.telefono);
    if (email) {
      const arr = vendidosByContact.get(`e:${email}`) ?? [];
      arr.push(v);
      vendidosByContact.set(`e:${email}`, arr);
    }
    if (phone) {
      const arr = vendidosByContact.get(`p:${phone}`) ?? [];
      arr.push(v);
      vendidosByContact.set(`p:${phone}`, arr);
    }
  }

  for (const apartado of list.filter((r) => r.etapa === "apartado")) {
    if (apartadoIds.has(apartado.id)) continue;

    let match = null;
    let vendido = null;

    const email = normalizeEmail(apartado.email);
    const phone = normalizePhone(apartado.telefono);
    if (email && vendidosByContact.get(`e:${email}`)?.[0]) {
      match = `e:${email}`;
      vendido = vendidosByContact.get(`e:${email}`)[0];
    } else if (phone && vendidosByContact.get(`p:${phone}`)?.[0]) {
      match = `p:${phone}`;
      vendido = vendidosByContact.get(`p:${phone}`)[0];
    } else {
      for (const v of vendidos) {
        const nameMatch = namesMatch(apartado.nombre, v.nombre);
        if (nameMatch) {
          match = nameMatch;
          vendido = v;
          break;
        }
      }
    }

    if (!match || !vendido) continue;

    apartadoIds.add(apartado.id);
    twins.push({
      desarrolloId,
      match,
      apartado: {
        id: apartado.id,
        nombre: apartado.nombre,
        telefono: apartado.telefono,
        email: apartado.email,
      },
      vendido: {
        id: vendido.id,
        nombre: vendido.nombre,
        telefono: vendido.telefono,
        email: vendido.email,
      },
    });
  }
}

console.log(
  JSON.stringify(
    {
      mode: APPLY ? "apply" : "dry-run",
      totalApartado: rows.filter((r) => r.etapa === "apartado").length,
      totalVendido: rows.filter((r) => r.etapa === "vendido").length,
      apartadosConGemeloVendido: twins.length,
      twins,
    },
    null,
    2,
  ),
);

if (!twins.length) {
  console.log("No hay duplicados apartado+vendido.");
  process.exit(0);
}

if (!APPLY) {
  console.log(`\nDry-run: ${twins.length} en apartado con gemelo vendido.`);
  console.log("Ejecuta con --apply para desactivarlos (activo=false).");
  process.exit(0);
}

const ids = Array.from(apartadoIds);
const now = new Date().toISOString();
const note =
  "Desactivado: ya existe prospecto en etapa vendido (mismo contacto/nombre). Limpieza apartado→venta.";

let deactivated = 0;
const chunkSize = 40;
for (let i = 0; i < ids.length; i += chunkSize) {
  const chunk = ids.slice(i, i + chunkSize);
  const { data, error } = await supabase
    .from("prospectos")
    .update({
      activo: false,
      notas: note,
      updated_at: now,
    })
    .in("id", chunk)
    .eq("activo", true)
    .eq("etapa", "apartado")
    .select("id");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  deactivated += data?.length ?? 0;
}

const { error: solError } = await supabase
  .from("solicitudes_apartado")
  .update({
    estatus: "cancelada",
    updated_at: now,
  })
  .in("prospecto_id", ids)
  .eq("estatus", "pendiente");

if (solError && !/does not exist|column/i.test(solError.message)) {
  console.warn("solicitudes_apartado:", solError.message);
}

console.log(`Desactivados ${deactivated} prospecto(s) en apartado.`);

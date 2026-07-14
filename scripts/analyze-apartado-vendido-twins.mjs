/**
 * Análisis de posibles gemelos apartado/vendido (teléfono, email o nombre).
 *   node scripts/analyze-apartado-vendido-twins.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal } from "./load-env-local.mjs";

loadEnvLocal();

const normalizeEmail = (value) => value?.trim().toLowerCase() || null;
const normalizePhone = (value) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) return null;
  return digits.slice(-10);
};
const normalizeName = (value) =>
  (value || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const pageSize = 1000;
const rows = [];
for (let from = 0; ; from += pageSize) {
  const { data, error } = await supabase
    .from("prospectos")
    .select("id, desarrollo_id, nombre, email, telefono, etapa, created_at")
    .eq("activo", true)
    .in("etapa", ["apartado", "vendido"])
    .range(from, from + pageSize - 1);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < pageSize) break;
}

const counts = { apartado: 0, vendido: 0 };
for (const row of rows) counts[row.etapa] = (counts[row.etapa] ?? 0) + 1;

const byDev = new Map();
for (const row of rows) {
  const list = byDev.get(row.desarrollo_id) ?? [];
  list.push(row);
  byDev.set(row.desarrollo_id, list);
}

const findTwins = (matchFn) => {
  const twins = [];
  const seen = new Set();
  for (const [desarrolloId, list] of byDev) {
    const vendidos = list.filter((r) => r.etapa === "vendido");
    const index = new Map();
    for (const v of vendidos) {
      for (const key of matchFn(v)) {
        if (!key) continue;
        const arr = index.get(key) ?? [];
        arr.push(v);
        index.set(key, arr);
      }
    }
    for (const a of list.filter((r) => r.etapa === "apartado")) {
      for (const key of matchFn(a)) {
        const hits = index.get(key);
        if (!hits?.length) continue;
        if (seen.has(a.id)) break;
        seen.add(a.id);
        twins.push({
          desarrolloId,
          match: key,
          apartado: {
            id: a.id,
            nombre: a.nombre,
            telefono: a.telefono,
            email: a.email,
          },
          vendido: {
            id: hits[0].id,
            nombre: hits[0].nombre,
            telefono: hits[0].telefono,
            email: hits[0].email,
          },
        });
        break;
      }
    }
  }
  return twins;
};

const byContact = findTwins((r) => {
  const keys = [];
  const e = normalizeEmail(r.email);
  const p = normalizePhone(r.telefono);
  if (e) keys.push(`e:${e}`);
  if (p) keys.push(`p:${p}`);
  return keys;
});

const byName = findTwins((r) => {
  const n = normalizeName(r.nombre);
  return n ? [`n:${n}`] : [];
});

// Also check operaciones: apartado prospectos that already have vendido sembrado?
const apartadoIds = rows.filter((r) => r.etapa === "apartado").map((r) => r.id);
const operacionHits = [];
if (apartadoIds.length) {
  const { data: ops, error: opsError } = await supabase
    .from("operaciones")
    .select("id, prospecto_id, estatus, unidad_id")
    .in("prospecto_id", apartadoIds);
  if (opsError) {
    console.warn("operaciones:", opsError.message);
  } else {
    for (const op of ops ?? []) {
      operacionHits.push(op);
    }
  }
}

console.log(
  JSON.stringify(
    {
      counts,
      byContact: byContact.length,
      byName: byName.length,
      contactTwins: byContact,
      nameTwins: byName,
      operacionesEnApartados: operacionHits,
      apartadosSinTelYEmail: rows
        .filter((r) => r.etapa === "apartado" && !normalizePhone(r.telefono) && !normalizeEmail(r.email))
        .map((r) => ({ id: r.id, nombre: r.nombre, desarrollo_id: r.desarrollo_id })),
    },
    null,
    2,
  ),
);

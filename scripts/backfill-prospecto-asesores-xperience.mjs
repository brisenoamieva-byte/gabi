/**
 * Reasigna asesor_id en prospectos existentes usando export Xperience.
 *
 *   npm run leads:backfill-asesores
 *   npm run leads:backfill-asesores -- "C:/ruta/leads.xlsx"
 */
import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";
import { loadXperienceCatalog, resolveXperienceAsesorId } from "./xperience-asesor-resolver.mjs";

loadEnvLocal();

const xlsxPath = resolve(process.argv[2] ?? "C:/Users/brise/Downloads/leads_xperience.xlsx");

if (!existsSync(xlsxPath)) {
  console.error(`Archivo no encontrado: ${xlsxPath}`);
  process.exit(1);
}

const catalog = loadXperienceCatalog();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: asesores } = await supabase.from("asesores").select("id, nombre, email");
const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets.Data ?? wb.Sheets[wb.SheetNames[0]]);

let updated = 0;
let unchanged = 0;
let skipped = 0;
const unmappedVendedores = new Map();

for (const row of rows) {
  const xperienceId = Number(row.id);
  if (!xperienceId) {
    skipped += 1;
    continue;
  }

  const producto = String(row.Producto ?? "").trim();
  const desarrolloId =
    catalog.productNameToDesarrolloId?.[producto] ??
    Object.entries(catalog.productNameToDesarrolloId ?? {}).find(
      ([name]) => name.toLowerCase() === producto.toLowerCase(),
    )?.[1];

  const asesorId = resolveXperienceAsesorId(row.Vendedor, asesores ?? [], {
    desarrolloId,
    catalog,
  });

  if (!asesorId) {
    const v = String(row.Vendedor ?? "").trim() || "(vacío)";
    unmappedVendedores.set(v, (unmappedVendedores.get(v) ?? 0) + 1);
    skipped += 1;
    continue;
  }

  const { data: existing } = await supabase
    .from("prospectos")
    .select("id, asesor_id")
    .eq("xperience_id", xperienceId)
    .maybeSingle();

  if (!existing?.id) {
    skipped += 1;
    continue;
  }

  if (existing.asesor_id === asesorId) {
    unchanged += 1;
    continue;
  }

  const { error } = await supabase
    .from("prospectos")
    .update({ asesor_id: asesorId, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (error) {
    console.error(`Error ${xperienceId}:`, error.message);
    skipped += 1;
  } else {
    updated += 1;
  }
}

console.log("\n[backfill asesores]");
console.log(`  Actualizados: ${updated}`);
console.log(`  Sin cambio:   ${unchanged}`);
console.log(`  Omitidos:     ${skipped}`);

if (unmappedVendedores.size) {
  console.log("\n  Vendedores sin mapeo (añade a vendedorToAsesorEmail):");
  for (const [name, count] of [...unmappedVendedores.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    - ${name} (${count})`);
  }
}

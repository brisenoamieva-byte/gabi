/**
 * Lista vendedores y productos en un export Xperience para ampliar el catálogo.
 *
 *   npm run leads:analyze-xperience -- "C:/ruta/leads.xlsx"
 */
import XLSX from "xlsx";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";
import { createClient } from "@supabase/supabase-js";

loadEnvLocal();

const xlsx = resolve(process.argv[2] ?? "C:/Users/brise/Downloads/leads_xperience.xlsx");
if (!existsSync(xlsx)) {
  console.error("No file:", xlsx);
  process.exit(1);
}

const wb = XLSX.readFile(xlsx);
const rows = XLSX.utils.sheet_to_json(wb.Sheets.Data ?? wb.Sheets[wb.SheetNames[0]]);

const vendedores = new Map();
const productos = new Map();
for (const row of rows) {
  const v = String(row.Vendedor ?? "").trim() || "(vacío)";
  vendedores.set(v, (vendedores.get(v) ?? 0) + 1);
  const p = String(row.Producto ?? "").trim() || "(vacío)";
  productos.set(p, (productos.get(p) ?? 0) + 1);
}

console.log("Vendedores:", [...vendedores.entries()].sort((a, b) => b[1] - a[1]));
console.log("Productos:", [...productos.entries()].sort((a, b) => b[1] - a[1]));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const { data: asesores } = await supabase.from("asesores").select("id, nombre, email");
console.log("GABI asesores:", asesores);

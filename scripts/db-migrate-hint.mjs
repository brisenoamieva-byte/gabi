import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

console.log(
  "\nAplica estas migraciones en Supabase (SQL Editor → New query), en orden:\n",
);
for (const file of files) {
  console.log(`  supabase/migrations/${file}`);
}
console.log(
  "\nSi catalog:sync falla por columnas (ej. cajones), falta 017_pasaje_unidad_detalles.sql.\n",
);

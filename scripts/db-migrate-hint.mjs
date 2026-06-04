import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".sql") && !name.includes(".deprecated"))
  .sort();

console.log(
  "\nAplica estas migraciones en Supabase (SQL Editor → New query), en orden:\n",
);
for (const file of files) {
  const skip =
    file === "023_expediente_checklist_comisiones.sql" ||
    file.startsWith("023_expediente_checklist");
  if (skip) continue;
  console.log(`  supabase/migrations/${file}`);
}
console.log(
  "\nComercial (si falta algo en /admin): 018 → 019 → 020 → 021 → 022 → 023_expediente_comisiones → 024 → 025 (solo si corriste el 023 viejo).",
);
console.log(
  "Detalle: supabase/migrations/README.md\n",
);
console.log(
  "Si catalog:sync falla por columnas (ej. cajones), falta 017_pasaje_unidad_detalles.sql.\n",
);

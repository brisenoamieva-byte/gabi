/**
 * Imprime SQL de migraciones para pegar en Supabase SQL Editor.
 *
 *   npm run db:print:037-038
 *   node scripts/print-apply-sql.mjs 037 038
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ids = process.argv.slice(2);
if (!ids.length) {
  console.error("Uso: node scripts/print-apply-sql.mjs 037 038");
  process.exit(1);
}

const dir = resolve(process.cwd(), "supabase/migrations");
const files = readdirSync(dir).filter((name) => name.endsWith(".sql") && !name.includes(".deprecated"));

for (const id of ids) {
  const match = files.find((name) => name.startsWith(`${id}_`));
  if (!match) {
    console.error(`No se encontró migración ${id}_*.sql`);
    process.exit(1);
  }
  const path = resolve(dir, match);
  console.log(`-- ===== ${match} =====\n`);
  console.log(readFileSync(path, "utf8"));
  console.log("\n");
}

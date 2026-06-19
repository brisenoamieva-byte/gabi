/**
 * Aplica migraciones SQL vía Postgres (037, 038, o lista custom).
 */
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadEnvLocalIntoProcess,
  printDbUrlSetupHint,
  resolveSupabaseDbUrl,
} from "./resolve-supabase-db-url.mjs";

loadEnvLocalIntoProcess();

const dbUrl = resolveSupabaseDbUrl();
if (!dbUrl) {
  printDbUrlSetupHint();
  process.exit(1);
}

const migrationIds = process.argv.slice(2);
if (!migrationIds.length) {
  console.error("Uso: node scripts/apply-sql-migrations.mjs 037 038");
  process.exit(1);
}

const dir = resolve(process.cwd(), "supabase/migrations");
const allFiles = readdirSync(dir).filter((name) => name.endsWith(".sql") && !name.includes(".deprecated"));

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Instala pg: npm install pg --save-dev");
  process.exit(1);
}

const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const id of migrationIds) {
    const match = allFiles.find((name) => name.startsWith(`${id}_`));
    if (!match) {
      throw new Error(`Migración ${id} no encontrada`);
    }
    const sql = readFileSync(resolve(dir, match), "utf8");
    await client.query(sql);
    console.log(`OK: ${match}`);
  }
  console.log("Migraciones aplicadas.");
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}

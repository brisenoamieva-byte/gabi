/**
 * Aplica 037_prospecto_qa_satisfaccion.sql vía conexión Postgres directa.
 * Requiere SUPABASE_DB_URL en .env.local (Settings → Database → Connection string URI).
 *
 *   npm run db:apply:037
 */
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

const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL;
if (!dbUrl) {
  console.error("\nFalta SUPABASE_DB_URL en .env.local.");
  console.error("Obtén la URI en Supabase → Project Settings → Database → Connection string.");
  console.error("Luego ejecuta: npm run db:apply:037\n");
  console.error("Alternativa manual: SQL Editor → supabase/migrations/037_prospecto_qa_satisfaccion.sql\n");
  process.exit(1);
}

const sqlPath = resolve(process.cwd(), "supabase/migrations/037_prospecto_qa_satisfaccion.sql");
const sql = readFileSync(sqlPath, "utf8");

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
  await client.query(sql);
  console.log("OK: migración 037 aplicada.");
} catch (error) {
  console.error("Error aplicando 037:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}

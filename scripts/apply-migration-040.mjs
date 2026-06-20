/**
 * Aplica 040_prospecto_encuestas_rls.sql vía Postgres.
 *   npm run db:apply:040
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 040`, { stdio: "inherit" });

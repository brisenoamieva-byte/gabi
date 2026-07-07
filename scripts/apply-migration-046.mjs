/**
 * Aplica 046_prospecto_fechas_visita.sql vía Postgres.
 *   npm run db:apply:046
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 046`, { stdio: "inherit" });

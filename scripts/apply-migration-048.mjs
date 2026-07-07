/**
 * Aplica 048_prospecto_perfilamiento_visita.sql vía Postgres.
 *   npm run db:apply:048
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 048`, { stdio: "inherit" });

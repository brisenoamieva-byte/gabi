/**
 * Aplica 045_cadencia_perfilamiento.sql vía Postgres.
 *   npm run db:apply:045
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 045`, { stdio: "inherit" });

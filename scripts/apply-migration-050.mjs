/**
 * Aplica 050_solicitudes_apartado.sql vía Postgres.
 *   npm run db:apply:050
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 050`, { stdio: "inherit" });

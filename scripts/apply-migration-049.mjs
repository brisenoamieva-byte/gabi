/**
 * Aplica 049_etapa_cita_reemplaza_cotizo.sql vía Postgres.
 *   npm run db:apply:049
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 049`, { stdio: "inherit" });

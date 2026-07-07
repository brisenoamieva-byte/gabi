/**
 * Aplica 047_playbook_recorrido_manual.sql vía Postgres.
 *   npm run db:apply:047
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 047`, { stdio: "inherit" });

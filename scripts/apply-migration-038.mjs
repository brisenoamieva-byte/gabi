/**
 * Aplica 038_crm_playbook.sql vía Postgres.
 *   npm run db:apply:038
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 038`, { stdio: "inherit" });

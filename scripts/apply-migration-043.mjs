/**
 * Aplica 043_crm_compliance_gavia.sql vía Postgres.
 *   npm run db:apply:043
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 043`, { stdio: "inherit" });

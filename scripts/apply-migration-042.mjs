/**
 * Aplica 042_crm_compliance_digest.sql vía Postgres.
 *   npm run db:apply:042
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 042`, { stdio: "inherit" });

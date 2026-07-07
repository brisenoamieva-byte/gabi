/**
 * Aplica 044_guardia_marcajes.sql vía Postgres.
 *   npm run db:apply:044
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 044`, { stdio: "inherit" });

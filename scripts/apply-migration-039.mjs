/**
 * Aplica 039_guardias_calendario.sql vía Postgres.
 *   npm run db:apply:039
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 039`, { stdio: "inherit" });

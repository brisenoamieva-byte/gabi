/**
 * Aplica 037 y 038 en orden (QA + Playbook CRM).
 *
 *   npm run db:apply:037-038
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve(process.cwd(), "scripts/apply-sql-migrations.mjs");
execSync(`node "${script}" 037 038`, { stdio: "inherit" });

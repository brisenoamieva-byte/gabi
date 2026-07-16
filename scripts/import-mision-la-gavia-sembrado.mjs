/**
 * @deprecated Usa `npm run sembrado:import:gavia` → scripts/import-sembrado.mjs
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const xlsx = process.argv[2];
const args = ["scripts/import-sembrado.mjs", "mision-la-gavia"];
if (xlsx) args.push(xlsx);

const result = spawnSync(process.execPath, args, {
  cwd: resolve(process.cwd()),
  stdio: "inherit",
  shell: false,
});
process.exit(result.status ?? 1);

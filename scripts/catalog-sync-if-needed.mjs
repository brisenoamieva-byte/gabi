import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { loadEnvLocal } from "./load-env-local.mjs";

const ROOT = process.cwd();
const STATE_DIR = resolve(ROOT, ".gabi");
const STATE_FILE = resolve(STATE_DIR, "sync-fingerprint.json");

const WATCH_FILES = [
  "src/lib/data.ts",
  "src/lib/catalog/recorrido-content.ts",
  "src/lib/catalog/pasaje-alamos.generated.ts",
  "scripts/pasaje-alamos-catalog.json",
];

const hashFile = (relativePath) => {
  const absolute = resolve(ROOT, relativePath);
  if (!existsSync(absolute)) {
    return `${relativePath}:missing`;
  }
  const content = readFileSync(absolute);
  return createHash("sha256").update(content).digest("hex");
};

const computeFingerprint = () =>
  createHash("sha256")
    .update(WATCH_FILES.map((file) => `${file}:${hashFile(file)}`).join("|"))
    .digest("hex");

const readState = () => {
  if (!existsSync(STATE_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return null;
  }
};

const writeState = (fingerprint) => {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        fingerprint,
        syncedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
};

const runSync = () => {
  console.log("\n[gabi] Sincronizando catálogo con Supabase (cambios detectados)...\n");
  const result = spawnSync("npm run catalog:sync", {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  return result.status === 0;
};

loadEnvLocal();

if (process.env.GABI_SKIP_AUTO_SYNC === "1") {
  console.log("[gabi] Auto-sync desactivado (GABI_SKIP_AUTO_SYNC=1).");
  process.exit(0);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!url || !service) {
  console.log(
    "[gabi] Sin Supabase en .env.local: se usará data.ts local. Configura Supabase para alinear con producción.",
  );
  process.exit(0);
}

const fingerprint = computeFingerprint();
const state = readState();

if (state?.fingerprint === fingerprint) {
  console.log("[gabi] Catálogo al día con Supabase.");
  process.exit(0);
}

const ok = runSync();
if (ok) {
  writeState(fingerprint);
  console.log("\n[gabi] Listo. Puedes seguir con npm run dev.\n");
  process.exit(0);
}

console.warn(
  "\n[gabi] No se pudo sincronizar Supabase. Revisa el error arriba o ejecuta: npm run sync\n",
);
process.exit(0);

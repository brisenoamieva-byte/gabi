import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Resuelve URI Postgres para aplicar migraciones localmente.
 * Orden: SUPABASE_DB_URL → DATABASE_URL → construir con SUPABASE_DB_PASSWORD + project ref.
 */
export const resolveSupabaseDbUrl = (env = process.env) => {
  const direct = env.SUPABASE_DB_URL?.trim() || env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  const password = env.SUPABASE_DB_PASSWORD?.trim() || env.POSTGRES_PASSWORD?.trim();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!password || !supabaseUrl) {
    return null;
  }

  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  if (!ref) {
    return null;
  }

  const encoded = encodeURIComponent(password);
  return `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;
};

export const loadEnvLocalIntoProcess = () => {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return false;
  }

  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, "\n");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  return true;
};

export const printDbUrlSetupHint = () => {
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1];
  console.error("\nFalta conexión Postgres en .env.local.");
  console.error("Opción A — URI completa:");
  console.error("  SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[ref].supabase.co:5432/postgres");
  console.error("Opción B — solo contraseña (más simple):");
  console.error("  SUPABASE_DB_PASSWORD=[PASSWORD]");
  if (ref) {
    console.error(`  → Se usará db.${ref}.supabase.co`);
  }
  console.error("\nContraseña: Supabase → Project Settings → Database → Database password");
  console.error("Luego: npm run db:apply:037-038\n");
  console.error("Alternativa manual: SQL Editor → supabase/migrations/_bundle_037_038_apply_once.sql\n");
};

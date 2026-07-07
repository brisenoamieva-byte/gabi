import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { resolveSupabaseDbUrl } from "@/lib/admin/resolve-supabase-db-url";

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");

const AUTO_APPLY_MIGRATION_IDS = new Set(["037", "038", "039", "040", "041", "042", "043", "044", "045", "046", "047", "048", "049", "050", "051", "052"]);

export const getAutoApplyableMigrationIds = (): string[] => Array.from(AUTO_APPLY_MIGRATION_IDS);

export const readMigrationSql = (migrationId: string): string | null => {
  if (!AUTO_APPLY_MIGRATION_IDS.has(migrationId)) {
    return null;
  }

  const allFiles = readdirSync(MIGRATIONS_DIR).filter(
    (name) => name.endsWith(".sql") && !name.includes(".deprecated") && !name.startsWith("_"),
  );

  const match = allFiles.find((name) => name.startsWith(`${migrationId}_`));
  if (!match) {
    return null;
  }

  return readFileSync(join(MIGRATIONS_DIR, match), "utf8");
};

export const applySqlMigrations = async (migrationIds: string[]): Promise<string[]> => {
  const dbUrl = resolveSupabaseDbUrl();
  if (!dbUrl) {
    throw new Error(
      "Sin conexión Postgres en el servidor. Configura SUPABASE_DB_URL o SUPABASE_DB_PASSWORD en Vercel.",
    );
  }

  const allFiles = readdirSync(MIGRATIONS_DIR).filter(
    (name) => name.endsWith(".sql") && !name.includes(".deprecated") && !name.startsWith("_"),
  );

  const applied: string[] = [];

  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    for (const id of migrationIds) {
      if (!AUTO_APPLY_MIGRATION_IDS.has(id)) {
        throw new Error(`Migración ${id} no permitida para auto-aplicar.`);
      }

      const match = allFiles.find((name) => name.startsWith(`${id}_`));
      if (!match) {
        throw new Error(`Archivo de migración ${id} no encontrado.`);
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, match), "utf8");
      await client.query(sql);
      applied.push(match);
    }
  } finally {
    await client.end();
  }

  return applied;
};

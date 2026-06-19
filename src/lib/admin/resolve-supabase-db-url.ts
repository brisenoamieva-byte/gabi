/**
 * Resuelve URI Postgres para aplicar migraciones desde el servidor (Vercel o local).
 */
export const resolveSupabaseDbUrl = (): string | null => {
  const direct = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (direct) {
    return direct;
  }

  const password = process.env.SUPABASE_DB_PASSWORD?.trim() || process.env.POSTGRES_PASSWORD?.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
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

export const canApplySupabaseMigrations = (): boolean => resolveSupabaseDbUrl() !== null;

export const getSupabaseProjectRef = (): string | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) {
    return null;
  }
  return supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? null;
};

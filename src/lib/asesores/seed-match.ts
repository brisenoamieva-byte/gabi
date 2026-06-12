import { asesores as seedAsesores } from "@/lib/data";
import type { Asesor } from "@/lib/data";

/** IDs en Supabase que deben heredar el seed de data.ts (p. ej. producción vs demo). */
export const ASESOR_SEED_ID_ALIASES: Record<string, string> = {
  rbriseno: "ricardo",
};

/** IDs legacy en localStorage → fila real en Supabase. */
export const ASESOR_SUPABASE_ID_ALIASES: Record<string, string> = {
  ricardo: "rbriseno",
};

export const resolveSeedAsesorId = (asesorId: string): string =>
  ASESOR_SEED_ID_ALIASES[asesorId] ?? asesorId;

export const resolveSupabaseAsesorId = (asesorId: string): string =>
  ASESOR_SUPABASE_ID_ALIASES[asesorId] ?? asesorId;

export const asesorSessionLookupIds = (asesorId: string): string[] =>
  Array.from(new Set([asesorId, resolveSupabaseAsesorId(asesorId), resolveSeedAsesorId(asesorId)]));

export const findSeedAsesor = (
  asesorId: string,
  email?: string | null,
): Asesor | undefined => {
  const resolvedId = resolveSeedAsesorId(asesorId);
  const byId = seedAsesores.find((item) => item.id === resolvedId && item.activo);
  if (byId) {
    return byId;
  }

  if (email) {
    const normalized = email.trim().toLowerCase();
    return seedAsesores.find(
      (item) => item.activo && item.email.trim().toLowerCase() === normalized,
    );
  }

  return undefined;
};

export const mergeAsesorDesarrollosWithSeed = (
  asesorId: string,
  desarrollosIds: string[],
  email?: string | null,
): string[] => {
  const seed = findSeedAsesor(asesorId, email);
  if (!seed) {
    return desarrollosIds;
  }

  return Array.from(new Set([...desarrollosIds, ...seed.desarrollosIds]));
};

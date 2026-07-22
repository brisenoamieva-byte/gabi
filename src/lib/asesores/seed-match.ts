import { asesores as seedAsesores } from "@/lib/data";
import type { Asesor } from "@/lib/data";
import { GABI_OPERADOR } from "@/lib/gabi/ecosystem";

/** IDs en Supabase que deben heredar el seed de data.ts (p. ej. producción vs demo). */
export const ASESOR_SEED_ID_ALIASES: Record<string, string> = {
  rbriseno: "ricardo",
};

/** IDs legacy en localStorage → fila real en Supabase. */
export const ASESOR_SUPABASE_ID_ALIASES: Record<string, string> = {
  ricardo: "rbriseno",
};

/**
 * Correos del operador / Ricardo que deben heredar el seed `ricardo`
 * aunque la fila en Supabase tenga otro id o email.
 */
const ASESOR_SEED_EMAIL_ALIASES: Record<string, string> = {
  "ricardo@bbrhabitarea.com": "ricardo",
  "rbriseno@bbrhabitarea.com": "ricardo",
  [GABI_OPERADOR.email.toLowerCase()]: "ricardo",
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
    const aliasedId = ASESOR_SEED_EMAIL_ALIASES[normalized];
    if (aliasedId) {
      const byAlias = seedAsesores.find((item) => item.id === aliasedId && item.activo);
      if (byAlias) {
        return byAlias;
      }
    }

    return seedAsesores.find(
      (item) => item.activo && item.email.trim().toLowerCase() === normalized,
    );
  }

  return undefined;
};

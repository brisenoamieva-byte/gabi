import type { AsesorSession } from "@/lib/asesores/types";
import { GABI_DESARROLLO_KEY } from "@/lib/session/keys";

export const pickCampoDesarrolloId = (
  asesor: AsesorSession,
  preferredId?: string | null,
): string | null => {
  const ids = asesor.desarrollosIds ?? [];
  if (preferredId && ids.includes(preferredId)) {
    return preferredId;
  }
  if (ids.length === 1) {
    return ids[0] ?? null;
  }
  return null;
};

export const resolveCampoCrmPath = (
  asesor: AsesorSession,
  preferredDesarrolloId?: string | null,
): string => {
  const desarrolloId = pickCampoDesarrolloId(asesor, preferredDesarrolloId);
  return desarrolloId ? "/dashboard" : "/desarrollos";
};

/** Guarda desarrollo en sesión local y devuelve la ruta de entrada al CRM de asesores. */
export const prepareCampoCrmEntry = (
  asesor: AsesorSession,
  preferredDesarrolloId?: string | null,
): string => {
  const desarrolloId = pickCampoDesarrolloId(asesor, preferredDesarrolloId);
  if (desarrolloId) {
    localStorage.setItem(GABI_DESARROLLO_KEY, desarrolloId);
  } else {
    localStorage.removeItem(GABI_DESARROLLO_KEY);
  }
  return resolveCampoCrmPath(asesor, preferredDesarrolloId);
};

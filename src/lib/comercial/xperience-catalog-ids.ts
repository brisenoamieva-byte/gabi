import type { Desarrollo } from "@/lib/data";
import catalog from "@/lib/comercial/xperience-catalog.json";

/**
 * IDs de producto en Xperience/Adryo (badge "Id: …" en grid Desarrollos).
 * Fuente: src/lib/comercial/xperience-catalog.json
 */
export const XPERIENCE_DESARROLLO_PRODUCT_IDS: Record<string, number> =
  catalog.desarrolloProductIds;

export const XPERIENCE_PRODUCT_NAME_TO_DESARROLLO_ID: Record<string, string> =
  catalog.productNameToDesarrolloId;

/** Portadas wide para hub admin (no logos cuadrados). */
export const DESARROLLO_HUB_HERO_IMAGES: Record<string, string> = {
  "la-vista-residencial": "/desarrollos/la-vista/master-plan.png",
  "pasaje-alamos": "/propuestas/desarrollos-alianzas/pasaje-alamos.png",
  "mision-la-gavia": "/propuestas/desarrollos-alianzas/mision-la-gavia.png",
};

export const XPERIENCE_ASESOR_IDS_BY_EMAIL: Record<string, number> =
  catalog.asesorIdsByEmail;

export const getDesarrolloXperienceProductId = (desarrolloId: string): number | null =>
  XPERIENCE_DESARROLLO_PRODUCT_IDS[desarrolloId] ?? null;

export const resolveDesarrolloIdFromXperienceProductName = (productoNombre: string): string | null => {
  const trimmed = productoNombre.trim();
  if (!trimmed) {
    return null;
  }
  const direct = XPERIENCE_PRODUCT_NAME_TO_DESARROLLO_ID[trimmed];
  if (direct) {
    return direct;
  }
  const normalized = trimmed.toLowerCase();
  const match = Object.entries(XPERIENCE_PRODUCT_NAME_TO_DESARROLLO_ID).find(
    ([name]) => name.toLowerCase() === normalized,
  );
  return match?.[1] ?? null;
};

/** Badge numérico del grid Desarrollos (null = sin badge Xperience). */
export const desarrolloXperienceDisplayId = (desarrollo: Desarrollo): string | null => {
  const id = getDesarrolloXperienceProductId(desarrollo.id);
  return id != null ? String(id) : null;
};

export const formatXperienceLeadId = (xperienceId: number | null | undefined): string | null => {
  if (xperienceId == null || Number.isNaN(xperienceId)) {
    return null;
  }
  return String(xperienceId);
};

export const getAsesorXperienceDisplayId = (email: string): number | null => {
  const key = email.trim().toLowerCase();
  return XPERIENCE_ASESOR_IDS_BY_EMAIL[key] ?? null;
};

const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Oculta UUIDs de Supabase; muestra solo IDs cortos de seed local. */
export const formatGabiInternalAsesorId = (asesorId: string): string | null => {
  const value = asesorId.trim();
  if (!value || UUID_LIKE.test(value)) {
    return null;
  }
  return value.length > 12 ? value.slice(0, 8) : value;
};

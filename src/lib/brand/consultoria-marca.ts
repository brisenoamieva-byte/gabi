import { DMB_CONTACT } from "@/lib/dmb/ecosystem";

/** Marca con la que se presenta un entregable de consultoría (logo, pie, share gate). */
export type ConsultoriaMarcaPresentacion = "bbr" | "dmb";

export const CONSULTORIA_MARCA_META_KEY = "_presentacionMarca";

export const DEFAULT_CONSULTORIA_MARCA: ConsultoriaMarcaPresentacion = "bbr";

export const CONSULTORIA_MARCA_LABELS: Record<ConsultoriaMarcaPresentacion, string> = {
  bbr: "BBR Habitarea",
  dmb: "DMB Consultoría",
};

export const CONSULTORIA_MARCA_SHORT: Record<ConsultoriaMarcaPresentacion, string> = {
  bbr: "BBR",
  dmb: "DMB",
};

export const CONSULTORIA_MARCA_CONTACT: Record<
  ConsultoriaMarcaPresentacion,
  { email: string; web: string; elaboradoDefault: string }
> = {
  bbr: {
    email: "contacto@bbrhabitarea.com",
    web: "bbrhabitarea.com",
    elaboradoDefault: "BBR Habitarea",
  },
  dmb: {
    email: DMB_CONTACT.email,
    web: DMB_CONTACT.web,
    elaboradoDefault: "DMB Consultoría",
  },
};

export const CONSULTORIA_MARCA_STORAGE_KEY = "consultoria-marca-investti";

export function parseConsultoriaMarca(raw: unknown): ConsultoriaMarcaPresentacion {
  return raw === "dmb" ? "dmb" : "bbr";
}

export function resolveConsultoriaMarca(
  stored: ConsultoriaMarcaPresentacion | null | undefined,
): ConsultoriaMarcaPresentacion {
  return stored ? parseConsultoriaMarca(stored) : DEFAULT_CONSULTORIA_MARCA;
}

export function splitPresentacionMarcaFromMeta<T extends Record<string, string>>(
  meta: T | null | undefined,
): { meta?: T; presentacionMarca?: ConsultoriaMarcaPresentacion } {
  if (!meta) return {};
  const record = meta as Record<string, string>;
  const { [CONSULTORIA_MARCA_META_KEY]: marcaRaw, ...rest } = record;
  const presentacionMarca =
    marcaRaw !== undefined ? parseConsultoriaMarca(marcaRaw) : undefined;
  const cleaned = Object.fromEntries(
    Object.entries(rest).map(([key, value]) => [key, String(value ?? "").trim()]),
  ) as T;
  return {
    meta: Object.keys(cleaned).length ? cleaned : undefined,
    presentacionMarca,
  };
}

export function mergePresentacionMarcaIntoMeta(
  meta: Record<string, string> | null | undefined,
  presentacionMarca: ConsultoriaMarcaPresentacion | undefined,
): Record<string, string> | null {
  const base = meta ? { ...meta } : {};
  if (presentacionMarca) {
    base[CONSULTORIA_MARCA_META_KEY] = presentacionMarca;
  } else {
    delete base[CONSULTORIA_MARCA_META_KEY];
  }
  return Object.keys(base).length ? base : null;
}

import type { ProspectoRecord } from "@/lib/comercial/sembrado-status";
import { calificacionEsSpam } from "@/lib/comercial/xperience-leads";

export const normalizeLeadEmail = (value?: string | null) => value?.trim().toLowerCase() || null;

export const normalizeLeadPhone = (value?: string | null) => {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (digits.length < 10) {
    return null;
  }
  return digits.slice(-10);
};

export const leadContactKeys = (
  prospecto: Pick<ProspectoRecord, "email" | "telefono">,
): string[] => {
  const keys: string[] = [];
  const email = normalizeLeadEmail(prospecto.email);
  if (email) {
    keys.push(`e:${email}`);
  }
  const phone = normalizeLeadPhone(prospecto.telefono);
  if (phone) {
    keys.push(`p:${phone}`);
  }
  return keys;
};

const ETAPA_ISCORE: Record<string, number> = {
  contactado: 5,
  cita: 10,
  visita: 12,
  apartado: 15,
  vendido: 18,
};

export const computeIscore = (
  prospecto: Pick<
    ProspectoRecord,
    | "email"
    | "telefono"
    | "calificacion"
    | "es_spam"
    | "etapa"
    | "campana_id"
    | "asesor_id"
    | "origen_ciudad"
    | "es_duplicado"
    | "nivel_interes"
  >,
): number => {
  if (calificacionEsSpam(prospecto.calificacion) || prospecto.es_spam || prospecto.es_duplicado) {
    return 0;
  }

  let score = 0;

  if (normalizeLeadEmail(prospecto.email)) {
    score += 3;
  }
  if (normalizeLeadPhone(prospecto.telefono)) {
    score += 3;
  }
  if (normalizeLeadEmail(prospecto.email) && normalizeLeadPhone(prospecto.telefono)) {
    score += 2;
  }

  const cal = prospecto.calificacion?.trim().toLowerCase() ?? "";
  if (cal.includes("interesado")) {
    score += 8;
  } else if (cal.includes("visita")) {
    score += 10;
  } else if (cal.includes("seguimiento")) {
    score += 5;
  }

  score += ETAPA_ISCORE[prospecto.etapa === "negociacion" ? "cita" : prospecto.etapa] ?? 0;

  if (prospecto.campana_id) {
    score += 2;
  }
  if (prospecto.asesor_id) {
    score += 3;
  }
  if (prospecto.origen_ciudad?.trim()) {
    score += 1;
  }

  if (prospecto.nivel_interes === "alto") {
    score += 6;
  } else if (prospecto.nivel_interes === "bajo") {
    score += 2;
  }

  return Math.min(score, 30);
};

export const computeSellerScore = (
  prospecto: Pick<
    ProspectoRecord,
    "asesor_id" | "etapa" | "calificacion" | "es_spam" | "es_duplicado"
  >,
): number => {
  if (calificacionEsSpam(prospecto.calificacion) || prospecto.es_spam || prospecto.es_duplicado) {
    return 0;
  }

  let score = prospecto.asesor_id ? 5 : 0;
  score += ETAPA_ISCORE[prospecto.etapa === "negociacion" ? "cita" : prospecto.etapa] ?? 0;

  const cal = prospecto.calificacion?.trim().toLowerCase() ?? "";
  if (cal.includes("visita")) {
    score += 6;
  } else if (cal.includes("interesado")) {
    score += 4;
  }

  return Math.min(score, 25);
};

/** Marca como duplicados los registros más recientes que comparten email o teléfono. */
export const pickDuplicateIds = (prospectos: ProspectoRecord[]): Set<string> => {
  const byKey = new Map<string, ProspectoRecord[]>();

  for (const prospecto of prospectos) {
    for (const key of leadContactKeys(prospecto)) {
      const group = byKey.get(key) ?? [];
      group.push(prospecto);
      byKey.set(key, group);
    }
  }

  const duplicateIds = new Set<string>();

  for (const group of Array.from(byKey.values())) {
    const unique = Array.from(new Map(group.map((item) => [item.id, item])).values());
    if (unique.length < 2) {
      continue;
    }

    unique.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    for (let index = 1; index < unique.length; index += 1) {
      duplicateIds.add(unique[index].id);
    }
  }

  return duplicateIds;
};

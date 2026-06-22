import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  mergePresentacionMarcaIntoMeta,
  parseConsultoriaMarca,
  resolveConsultoriaMarca,
  splitPresentacionMarcaFromMeta,
} from "@/lib/brand/consultoria-marca";
import { mergePropuestaComercialData } from "@/lib/propuestas/merge-propuesta";
import type {
  PropuestaEditableOverrides,
  PropuestaOverridesPublishMeta,
} from "@/lib/propuestas/overrides-types";
import { getPropuestaBySlug, isPropuestaSlug } from "@/lib/propuestas/registry";
import type { PropuestaComercialData, PropuestaEstado } from "@/lib/propuestas/types";
import type { ConsultoriaMarcaPresentacion } from "@/lib/brand/consultoria-marca";

const VALID_ESTADOS: PropuestaEstado[] = ["borrador", "enviada", "firmada", "archivada"];

function parseJsonField<T extends object>(raw: unknown): T | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as T) : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as T;
  return null;
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item ?? "").trim()).filter(Boolean);
}

function normalizeOverrides(raw: PropuestaEditableOverrides): PropuestaEditableOverrides {
  const estado =
    raw.estado && VALID_ESTADOS.includes(raw.estado) ? raw.estado : undefined;

  const presentacionMarca =
    raw.presentacionMarca !== undefined ?
      parseConsultoriaMarca(raw.presentacionMarca)
    : undefined;

  const meta = raw.meta
    ? Object.fromEntries(
        Object.entries(raw.meta).map(([key, value]) => [key, String(value ?? "").trim()]),
      )
    : undefined;

  const narrativa = raw.narrativa
    ? {
        ...raw.narrativa,
        quienesSomos: raw.narrativa.quienesSomos?.trim(),
        clasificacionLotes: raw.narrativa.clasificacionLotes?.trim(),
        estrategia: raw.narrativa.estrategia
          ? normalizeStringList(raw.narrativa.estrategia)
          : undefined,
      }
    : undefined;

  const propuestaBbr = raw.propuestaBbr
    ? {
        ...raw.propuestaBbr,
        pagoComision: raw.propuestaBbr.pagoComision?.trim(),
        equipo: raw.propuestaBbr.equipo
          ? normalizeStringList(raw.propuestaBbr.equipo)
          : undefined,
      }
    : undefined;

  return { estado, presentacionMarca, meta, narrativa, propuestaBbr };
}

type OverridesRow = {
  slug: string;
  estado: string | null;
  meta: unknown;
  narrativa: unknown;
  propuesta_bbr: unknown;
  updated_at: string;
};

async function readRow(slug: string): Promise<OverridesRow | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("propuestas_overrides")
    .select("slug, estado, meta, narrativa, propuesta_bbr, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (/propuestas_overrides|42P01|relation/i.test(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  return (data as OverridesRow | null) ?? null;
}

function rowToOverrides(row: OverridesRow | null): PropuestaEditableOverrides | null {
  if (!row) return null;

  const parsedMeta = parseJsonField<NonNullable<PropuestaEditableOverrides["meta"]>>(row.meta);
  const { meta, presentacionMarca: marcaFromMeta } = splitPresentacionMarcaFromMeta(parsedMeta ?? undefined);
  const narrativa = parseJsonField<NonNullable<PropuestaEditableOverrides["narrativa"]>>(
    row.narrativa,
  );
  const propuestaBbr = parseJsonField<NonNullable<PropuestaEditableOverrides["propuestaBbr"]>>(
    row.propuesta_bbr,
  );

  const hasContent =
    Boolean(row.estado) ||
    meta !== undefined ||
    narrativa !== null ||
    propuestaBbr !== null ||
    marcaFromMeta !== undefined;

  if (!hasContent) {
    return null;
  }

  return normalizeOverrides({
    estado: VALID_ESTADOS.includes(row.estado as PropuestaEstado)
      ? (row.estado as PropuestaEstado)
      : undefined,
    presentacionMarca: marcaFromMeta,
    meta: meta ?? undefined,
    narrativa: narrativa ?? undefined,
    propuestaBbr: propuestaBbr ?? undefined,
  });
}

export async function getPropuestaOverrides(
  slug: string,
): Promise<PropuestaEditableOverrides | null> {
  const row = await readRow(slug);
  return rowToOverrides(row);
}

export async function getResolvedPropuestaComercial(
  slug: string,
): Promise<{
  data: PropuestaComercialData;
  meta: PropuestaOverridesPublishMeta;
  presentacionMarca: ConsultoriaMarcaPresentacion;
} | null> {
  const base = getPropuestaBySlug(slug);
  if (!base) {
    return null;
  }

  const row = await readRow(slug);
  const overrides = rowToOverrides(row);

  return {
    data: mergePropuestaComercialData(base, overrides),
    meta: {
      updatedAt: row?.updated_at ?? new Date(0).toISOString(),
      origin: overrides ? "supabase" : "static",
      published: Boolean(overrides),
    },
    presentacionMarca: resolveConsultoriaMarca(overrides?.presentacionMarca),
  };
}

export async function publishPropuestaOverrides(
  slug: string,
  input: PropuestaEditableOverrides,
  adminProfileId: string | null,
): Promise<PropuestaOverridesPublishMeta> {
  if (!isPropuestaSlug(slug)) {
    throw new Error("Propuesta no registrada.");
  }

  const overrides = normalizeOverrides(input);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error(
      "Supabase no configurado. Aplica la migración 033 y define SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const now = new Date().toISOString();

  const payload = {
    slug,
    estado: overrides.estado ?? null,
    meta: mergePresentacionMarcaIntoMeta(
      overrides.meta ?? null,
      overrides.presentacionMarca,
    ),
    narrativa: overrides.narrativa ?? null,
    propuesta_bbr: overrides.propuestaBbr ?? null,
    updated_at: now,
    updated_by: adminProfileId,
  };

  const { data, error } = await supabase
    .from("propuestas_overrides")
    .upsert(payload, { onConflict: "slug" })
    .select("updated_at")
    .single();

  if (error) {
    if (/propuestas_overrides|42P01|relation/i.test(error.message)) {
      throw new Error(
        "Falta la migración 033_propuestas_overrides.sql en Supabase.",
      );
    }
    throw new Error(error.message);
  }

  return {
    updatedAt: (data?.updated_at as string) ?? now,
    origin: "supabase",
    published: true,
  };
}

export async function deletePropuestaOverrides(slug: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const { error } = await supabase.from("propuestas_overrides").delete().eq("slug", slug);

  if (error && !/propuestas_overrides|42P01|relation/i.test(error.message)) {
    throw new Error(error.message);
  }
}

export function extractEditableFromPropuesta(
  data: PropuestaComercialData,
): PropuestaEditableOverrides {
  return {
    estado: data.estado,
    presentacionMarca: resolveConsultoriaMarca(undefined),
    meta: { ...data.meta },
    narrativa: {
      quienesSomos: data.narrativa.quienesSomos,
      estrategia: [...data.narrativa.estrategia],
      clasificacionLotes: data.narrativa.clasificacionLotes,
    },
    propuestaBbr: {
      ...data.propuestaBbr,
      equipo: [...data.propuestaBbr.equipo],
    },
  };
}

export async function getPropuestaPresentacionMarca(
  slug: string,
): Promise<ConsultoriaMarcaPresentacion> {
  const overrides = await getPropuestaOverrides(slug);
  return resolveConsultoriaMarca(overrides?.presentacionMarca);
}

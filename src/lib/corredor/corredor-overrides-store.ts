import { mergeCorredorDesarrollo, isCorredorDesarrolloOculto } from "@/lib/corredor/merge-desarrollo";
import {
  type CorredorCatalogMeta,
  type CorredorDesarrolloEditableOverrides,
  type CorredorOverridesPublishMeta,
} from "@/lib/corredor/overrides-types";
import type { CorredorDesarrollo } from "@/lib/corredor/types";
import {
  CORREDOR_DESARROLLOS,
  getCorredorDesarrolloById,
  isCorredorDesarrolloId,
} from "@/lib/corredor/zona-sur-seed";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

function normalizeNullableNumber(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

export function normalizeCorredorOverrides(
  raw: CorredorDesarrolloEditableOverrides,
): CorredorDesarrolloEditableOverrides {
  return {
    oculto: raw.oculto === true,
    destacado: raw.destacado === true,
    notas: raw.notas?.trim() || undefined,
    guiaAsesor: raw.guiaAsesor?.trim() || undefined,
    argumentosVenta: raw.argumentosVenta
      ? normalizeStringList(raw.argumentosVenta)
      : undefined,
    loteMinM2: normalizeNumber(raw.loteMinM2),
    loteMaxM2: normalizeNumber(raw.loteMaxM2),
    precioMinM2: normalizeNumber(raw.precioMinM2),
    precioMaxM2: normalizeNumber(raw.precioMaxM2),
    ticketDesde: normalizeNumber(raw.ticketDesde),
    absorcionMes: normalizeNullableNumber(raw.absorcionMes),
    totalLotes: normalizeNullableNumber(raw.totalLotes),
    enganchePct: normalizeNullableNumber(raw.enganchePct),
    plazoMeses: normalizeNullableNumber(raw.plazoMeses),
    amenidades: raw.amenidades ? normalizeStringList(raw.amenidades) : undefined,
  };
}

type OverridesRow = {
  desarrollo_id: string;
  overrides: unknown;
  updated_at: string;
};

async function readAllRows(): Promise<OverridesRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("corredor_desarrollo_overrides")
    .select("desarrollo_id, overrides, updated_at");

  if (error) {
    if (/corredor_desarrollo_overrides|42P01|relation/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return (data as OverridesRow[]) ?? [];
}

async function readRow(desarrolloId: string): Promise<OverridesRow | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("corredor_desarrollo_overrides")
    .select("desarrollo_id, overrides, updated_at")
    .eq("desarrollo_id", desarrolloId)
    .maybeSingle();

  if (error) {
    if (/corredor_desarrollo_overrides|42P01|relation/i.test(error.message)) {
      return null;
    }
    throw new Error(error.message);
  }

  return (data as OverridesRow | null) ?? null;
}

function rowToOverrides(row: OverridesRow | null): CorredorDesarrolloEditableOverrides | null {
  if (!row) return null;

  const parsed = parseJsonField<CorredorDesarrolloEditableOverrides>(row.overrides);
  if (!parsed) return null;

  const normalized = normalizeCorredorOverrides(parsed);
  const hasContent = Object.values(normalized).some(
    (value) => value !== undefined && value !== false,
  );

  return hasContent ? normalized : null;
}

function buildOverrideMap(rows: OverridesRow[]): Map<string, CorredorDesarrolloEditableOverrides> {
  const map = new Map<string, CorredorDesarrolloEditableOverrides>();
  for (const row of rows) {
    const overrides = rowToOverrides(row);
    if (overrides) {
      map.set(row.desarrollo_id, overrides);
    }
  }
  return map;
}

function catalogMetaFromRows(rows: OverridesRow[]): CorredorCatalogMeta {
  const latest = rows.reduce(
    (max, row) => (row.updated_at > max ? row.updated_at : max),
    new Date(0).toISOString(),
  );

  return {
    updatedAt: rows.length ? latest : new Date(0).toISOString(),
    origin: rows.length ? "supabase" : "static",
    overrideCount: rows.length,
  };
}

export async function getCorredorDesarrolloOverrides(
  desarrolloId: string,
): Promise<CorredorDesarrolloEditableOverrides | null> {
  const row = await readRow(desarrolloId);
  return rowToOverrides(row);
}

export async function getResolvedCorredorCatalog(options?: {
  includeHidden?: boolean;
}): Promise<{ desarrollos: CorredorDesarrollo[]; meta: CorredorCatalogMeta }> {
  const rows = await readAllRows();
  const overrideMap = buildOverrideMap(rows);

  const desarrollos = CORREDOR_DESARROLLOS.filter((base) => {
    if (options?.includeHidden) return true;
    return !isCorredorDesarrolloOculto(overrideMap.get(base.id));
  }).map((base) => mergeCorredorDesarrollo(base, overrideMap.get(base.id)));

  return {
    desarrollos,
    meta: catalogMetaFromRows(rows),
  };
}

export async function getResolvedCorredorDesarrollo(
  desarrolloId: string,
  options?: { includeHidden?: boolean },
): Promise<{ data: CorredorDesarrollo; meta: CorredorOverridesPublishMeta } | null> {
  const base = getCorredorDesarrolloById(desarrolloId);
  if (!base) {
    return null;
  }

  const row = await readRow(desarrolloId);
  const overrides = rowToOverrides(row);

  if (!options?.includeHidden && isCorredorDesarrolloOculto(overrides)) {
    return null;
  }

  return {
    data: mergeCorredorDesarrollo(base, overrides),
    meta: {
      updatedAt: row?.updated_at ?? new Date(0).toISOString(),
      origin: overrides ? "supabase" : "static",
      published: Boolean(overrides),
    },
  };
}

export async function publishCorredorDesarrolloOverrides(
  desarrolloId: string,
  input: CorredorDesarrolloEditableOverrides,
  adminProfileId: string | null,
): Promise<CorredorOverridesPublishMeta> {
  if (!isCorredorDesarrolloId(desarrolloId)) {
    throw new Error("Desarrollo no registrado en el corredor.");
  }

  const overrides = normalizeCorredorOverrides(input);
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error(
      "Supabase no configurado. Aplica la migración 034 y define SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("corredor_desarrollo_overrides")
    .upsert(
      {
        desarrollo_id: desarrolloId,
        overrides,
        updated_at: now,
        updated_by: adminProfileId,
      },
      { onConflict: "desarrollo_id" },
    )
    .select("updated_at")
    .single();

  if (error) {
    if (/corredor_desarrollo_overrides|42P01|relation/i.test(error.message)) {
      throw new Error("Falta la migración 034_corredor_overrides.sql en Supabase.");
    }
    throw new Error(error.message);
  }

  return {
    updatedAt: (data?.updated_at as string) ?? now,
    origin: "supabase",
    published: true,
  };
}

export async function deleteCorredorDesarrolloOverrides(desarrolloId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("corredor_desarrollo_overrides")
    .delete()
    .eq("desarrollo_id", desarrolloId);

  if (error && !/corredor_desarrollo_overrides|42P01|relation/i.test(error.message)) {
    throw new Error(error.message);
  }
}

export { extractEditableFromDesarrollo } from "@/lib/corredor/overrides-types";

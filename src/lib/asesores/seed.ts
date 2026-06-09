import { asesores as seedAsesores, desarrollos } from "@/lib/data";
import { INVESTTI_CATALOG_DESARROLLO_IDS } from "@/lib/catalog/investti-desarrollos";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AsesoresSeedResult = {
  updated: number;
  skipped: number;
};

const BBR_DESARROLLO_IDS = new Set<string>(
  desarrollos.filter((item) => item.comercializador === "BBR Habitarea").map((item) => item.id),
);

const INVESTTI_IDS = new Set<string>(INVESTTI_CATALOG_DESARROLLO_IDS);

const mergeUniqueIds = (current: string[], additions: string[]) => {
  const merged = new Set([...current, ...additions]);
  return Array.from(merged);
};

const isBbrAsesor = (desarrollosIds: string[]) =>
  desarrollosIds.some((id) => BBR_DESARROLLO_IDS.has(id) && !INVESTTI_IDS.has(id));

/**
 * Alinea desarrollos_ids en Supabase con data.ts:
 * - Asesores demo conocidos: reemplaza por la lista de data.ts.
 * - Resto de asesores BBR: agrega desarrollos Investti si faltan.
 */
export const syncAsesoresDesarrollosFromData = async (): Promise<AsesoresSeedResult> => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa las variables de entorno.");
  }

  const seedById = new Map(seedAsesores.map((item) => [item.id, item.desarrollosIds]));

  const { data, error } = await supabase
    .from("asesores")
    .select("id, desarrollos_ids")
    .eq("activo", true);

  if (error) {
    throw new Error(`No se pudieron leer asesores: ${error.message}`);
  }

  let updated = 0;
  let skipped = 0;

  for (const row of data ?? []) {
    const current = (row.desarrollos_ids ?? []) as string[];
    const seedIds = seedById.get(row.id);

    let nextIds: string[] | null = null;

    if (seedIds) {
      const same =
        seedIds.length === current.length && seedIds.every((id) => current.includes(id));
      if (!same) {
        nextIds = seedIds;
      }
    } else if (isBbrAsesor(current)) {
      const merged = mergeUniqueIds(current, [...INVESTTI_CATALOG_DESARROLLO_IDS]);
      const same =
        merged.length === current.length && merged.every((id) => current.includes(id));
      if (!same) {
        nextIds = merged;
      }
    }

    if (!nextIds) {
      skipped += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("asesores")
      .update({
        desarrollos_ids: nextIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(`No se pudo actualizar asesor ${row.id}: ${updateError.message}`);
    }

    updated += 1;
  }

  return { updated, skipped };
};

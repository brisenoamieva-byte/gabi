import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import type { ProspectoListRow } from "@/lib/admin/prospectos-service";
import { resolveProspectoMedioLabel } from "@/lib/admin/reporte-semanal/funnel-medio";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type CotizacionFunnelRow = {
  id: string;
  clusterId: string | null;
  medioLabel: string;
};

const medioFromProspectoJoin = (raw: unknown): string => {
  if (!raw || typeof raw !== "object") {
    return "Sin medio";
  }

  const row = raw as Record<string, unknown>;
  const campana = row.campana as { nombre?: string | null; canal?: string | null } | null;

  return resolveProspectoMedioLabel({
    campanaNombre: campana?.nombre ?? null,
    campanaCanal: campana?.canal ?? null,
    medio_publicitario: (row.medio_publicitario as string | null) ?? null,
    medio_contacto: (row.medio_contacto as string | null) ?? null,
  } as ProspectoListRow);
};

export async function listCotizacionesFunnelSemana(
  filters: { desarrolloId: string; desde: string; hasta: string },
  profile?: AdminProfile,
): Promise<CotizacionFunnelRow[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const { data, error } = await supabase
    .from("cotizaciones")
    .select(
      "id, cluster_id, prospecto_id, prospectos(medio_publicitario, medio_contacto, campana:campanas(nombre, canal))",
    )
    .eq("desarrollo_id", filters.desarrolloId)
    .gte("created_at", `${filters.desde}T00:00:00.000Z`)
    .lte("created_at", `${filters.hasta}T23:59:59.999Z`);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      clusterId: (record.cluster_id as string | null) ?? null,
      medioLabel: medioFromProspectoJoin(record.prospectos),
    };
  });
}

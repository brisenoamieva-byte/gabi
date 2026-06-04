import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type AsesorKpi = {
  asesorId: string;
  leads: number;
  cotizaciones: number;
  apartados: number;
  vendidos: number;
  /** Leads válidos → cotizaciones (0–100). */
  conversionPct: number | null;
};

export type AsesoresKpisResult = {
  periodo: { desde?: string; hasta?: string };
  porAsesor: Record<string, AsesorKpi>;
  totales: Omit<AsesorKpi, "asesorId">;
};

const emptyKpi = (asesorId: string): AsesorKpi => ({
  asesorId,
  leads: 0,
  cotizaciones: 0,
  apartados: 0,
  vendidos: 0,
  conversionPct: null,
});

const computeConversion = (leads: number, cotizaciones: number): number | null => {
  if (leads <= 0) {
    return null;
  }
  return Math.round((cotizaciones / leads) * 100);
};

const mergeTotals = (items: AsesorKpi[]): Omit<AsesorKpi, "asesorId"> => {
  const totals = items.reduce(
    (acc, item) => ({
      leads: acc.leads + item.leads,
      cotizaciones: acc.cotizaciones + item.cotizaciones,
      apartados: acc.apartados + item.apartados,
      vendidos: acc.vendidos + item.vendidos,
    }),
    { leads: 0, cotizaciones: 0, apartados: 0, vendidos: 0 },
  );

  return {
    ...totals,
    conversionPct: computeConversion(totals.leads, totals.cotizaciones),
  };
};

export const getAsesoresKpis = async (
  filters: {
    desarrolloId: string;
    desde?: string;
    hasta?: string;
    asesorIds?: string[];
  },
  profile?: AdminProfile,
): Promise<AsesoresKpisResult> => {
  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    const porAsesor = Object.fromEntries(
      (filters.asesorIds ?? []).map((id) => [id, emptyKpi(id)]),
    );
    return {
      periodo: { desde: filters.desde, hasta: filters.hasta },
      porAsesor,
      totales: mergeTotals(Object.values(porAsesor)),
    };
  }

  const porAsesorMap = new Map<string, AsesorKpi>();
  for (const asesorId of filters.asesorIds ?? []) {
    porAsesorMap.set(asesorId, emptyKpi(asesorId));
  }

  let prospectosQuery = supabase
    .from("prospectos")
    .select("asesor_id, etapa, es_spam, es_duplicado")
    .eq("desarrollo_id", filters.desarrolloId);

  if (filters.desde) {
    prospectosQuery = prospectosQuery.gte("created_at", `${filters.desde}T00:00:00.000Z`);
  }
  if (filters.hasta) {
    prospectosQuery = prospectosQuery.lte("created_at", `${filters.hasta}T23:59:59.999Z`);
  }
  if (filters.asesorIds?.length) {
    prospectosQuery = prospectosQuery.in("asesor_id", filters.asesorIds);
  }

  const { data: prospectos, error: prospectosError } = await prospectosQuery;
  if (prospectosError) {
    throw new Error(prospectosError.message);
  }

  for (const row of prospectos ?? []) {
    if (!row.asesor_id) {
      continue;
    }

    const kpi = porAsesorMap.get(row.asesor_id) ?? emptyKpi(row.asesor_id);
    porAsesorMap.set(row.asesor_id, kpi);

    if (!row.es_spam && !row.es_duplicado) {
      kpi.leads += 1;
    }
    if (row.etapa === "apartado") {
      kpi.apartados += 1;
    }
    if (row.etapa === "vendido") {
      kpi.vendidos += 1;
    }
  }

  let cotizacionesQuery = supabase
    .from("cotizaciones")
    .select("asesor_id")
    .eq("desarrollo_id", filters.desarrolloId);

  if (filters.desde) {
    cotizacionesQuery = cotizacionesQuery.gte("created_at", `${filters.desde}T00:00:00.000Z`);
  }
  if (filters.hasta) {
    cotizacionesQuery = cotizacionesQuery.lte("created_at", `${filters.hasta}T23:59:59.999Z`);
  }
  if (filters.asesorIds?.length) {
    cotizacionesQuery = cotizacionesQuery.in("asesor_id", filters.asesorIds);
  }

  const { data: cotizaciones, error: cotizacionesError } = await cotizacionesQuery;
  if (cotizacionesError) {
    throw new Error(cotizacionesError.message);
  }

  for (const row of cotizaciones ?? []) {
    if (!row.asesor_id) {
      continue;
    }

    const kpi = porAsesorMap.get(row.asesor_id) ?? emptyKpi(row.asesor_id);
    kpi.cotizaciones += 1;
    porAsesorMap.set(row.asesor_id, kpi);
  }

  Array.from(porAsesorMap.values()).forEach((kpi) => {
    kpi.conversionPct = computeConversion(kpi.leads, kpi.cotizaciones);
  });

  const porAsesor = Object.fromEntries(porAsesorMap.entries());

  return {
    periodo: { desde: filters.desde, hasta: filters.hasta },
    porAsesor,
    totales: mergeTotals(Array.from(porAsesorMap.values())),
  };
};

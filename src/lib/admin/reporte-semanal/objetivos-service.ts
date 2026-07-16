import { canAccessDesarrollo } from "@/lib/admin/permissions";
import type { AdminProfile } from "@/lib/admin/types";
import {
  getObjetivosSegmentoSeed,
  type ReporteObjetivosAnuales,
} from "@/lib/admin/reporte-semanal/objetivos-config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ComercialObjetivoRecord = {
  id: string;
  desarrollo_id: string;
  segmento_id: string;
  anio: number;
  ventas_unidades: number;
  apartados_objetivo: number;
  ingresos_totales: number;
  ingresos_mes: number;
  precio_m2_objetivo: number;
  total_unidades: number;
  updated_at: string;
};

export type ComercialObjetivoInput = {
  desarrolloId: string;
  segmentoId: string;
  anio: number;
  ventasUnidades: number;
  apartadosObjetivo: number;
  ingresosTotales: number;
  ingresosMes: number;
  precioM2Objetivo: number;
  totalUnidades: number;
};

const mapRow = (row: ComercialObjetivoRecord): ReporteObjetivosAnuales => ({
  ventasUnidades: Number(row.ventas_unidades),
  apartadosObjetivo: Number(row.apartados_objetivo),
  ingresosTotales: Number(row.ingresos_totales),
  ingresosMes: Number(row.ingresos_mes),
  precioM2Objetivo: Number(row.precio_m2_objetivo),
  totalUnidades: row.total_unidades,
});

export async function listObjetivosAnuales(
  filters: { desarrolloId: string; anio: number },
  profile?: AdminProfile,
): Promise<ComercialObjetivoRecord[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return [];
  }

  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const { data, error } = await supabase
    .from("comercial_objetivos_anuales")
    .select("*")
    .eq("desarrollo_id", filters.desarrolloId)
    .eq("anio", filters.anio)
    .order("segmento_id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ComercialObjetivoRecord[];
}

export async function loadObjetivosAnualesMap(
  desarrolloId: string,
  anio: number,
  segmentoIds: string[],
  profile?: AdminProfile,
): Promise<Map<string, ReporteObjetivosAnuales>> {
  const rows = await listObjetivosAnuales({ desarrolloId, anio }, profile);
  const map = new Map<string, ReporteObjetivosAnuales>();

  for (const row of rows) {
    map.set(row.segmento_id, mapRow(row));
  }

  for (const segmentoId of segmentoIds) {
    if (!map.has(segmentoId)) {
      const seed = getObjetivosSegmentoSeed(desarrolloId, segmentoId);
      if (seed) {
        map.set(segmentoId, seed);
      }
    }
  }

  return map;
}

export function resolveObjetivosOrigen(
  dbRows: ComercialObjetivoRecord[],
  segmentoIds: string[],
  desarrolloId: string,
): "db" | "seed" | "none" {
  if (dbRows.length > 0) {
    return "db";
  }
  const hasSeed = segmentoIds.some((id) => Boolean(getObjetivosSegmentoSeed(desarrolloId, id)));
  return hasSeed ? "seed" : "none";
}

export async function upsertObjetivoAnual(
  input: ComercialObjetivoInput,
  profile?: AdminProfile,
): Promise<ComercialObjetivoRecord> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    throw new Error("Supabase no configurado.");
  }

  if (profile && !canAccessDesarrollo(profile, input.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const { data, error } = await supabase
    .from("comercial_objetivos_anuales")
    .upsert(
      {
        desarrollo_id: input.desarrolloId,
        segmento_id: input.segmentoId,
        anio: input.anio,
        ventas_unidades: input.ventasUnidades,
        apartados_objetivo: input.apartadosObjetivo,
        ingresos_totales: input.ingresosTotales,
        ingresos_mes: input.ingresosMes,
        precio_m2_objetivo: input.precioM2Objetivo,
        total_unidades: input.totalUnidades,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "desarrollo_id,segmento_id,anio" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ComercialObjetivoRecord;
}

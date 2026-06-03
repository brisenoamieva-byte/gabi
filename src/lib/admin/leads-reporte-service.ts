import { listProspectos } from "@/lib/admin/prospectos-service";
import type { AdminProfile } from "@/lib/admin/types";
import { calificacionLabel } from "@/lib/comercial/xperience-leads";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { canAccessDesarrollo } from "@/lib/admin/permissions";

export type LeadsReporteDia = {
  fecha: string;
  total: number;
};

export type LeadsReporteAsesor = {
  asesorId: string | null;
  asesorNombre: string;
  total: number;
};

export type LeadsReporte = {
  total: number;
  cotizaciones: number;
  spam: number;
  duplicados: number;
  porEtapa: Record<string, number>;
  porCalificacion: Record<string, number>;
  porDia: LeadsReporteDia[];
  porAsesor: LeadsReporteAsesor[];
};

const eachDayInRange = (desde: string, hasta: string) => {
  const days: string[] = [];
  const start = new Date(`${desde}T12:00:00.000Z`);
  const end = new Date(`${hasta}T12:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return days;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
};

export const getLeadsReporte = async (
  filters: {
    desarrolloId: string;
    desde?: string;
    hasta?: string;
    asesorId?: string;
    campanaId?: string;
  },
  profile?: AdminProfile,
): Promise<LeadsReporte> => {
  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const prospectos = await listProspectos(
    {
      desarrolloId: filters.desarrolloId,
      asesorId: filters.asesorId,
      desde: filters.desde,
      hasta: filters.hasta,
      campanaId: filters.campanaId,
      spam: "include",
      duplicados: "include",
    },
    profile,
  );

  const porEtapa: Record<string, number> = {};
  const porCalificacion: Record<string, number> = {};
  const porDiaMap = new Map<string, number>();
  const porAsesorMap = new Map<string, LeadsReporteAsesor>();
  let spam = 0;
  let duplicados = 0;

  for (const prospecto of prospectos) {
    porEtapa[prospecto.etapa] = (porEtapa[prospecto.etapa] ?? 0) + 1;

    const calKey = calificacionLabel(prospecto.calificacion);
    porCalificacion[calKey] = (porCalificacion[calKey] ?? 0) + 1;

    if (prospecto.es_spam) {
      spam += 1;
    }
    if (prospecto.es_duplicado) {
      duplicados += 1;
    }

    const fecha = prospecto.created_at.slice(0, 10);
    porDiaMap.set(fecha, (porDiaMap.get(fecha) ?? 0) + 1);

    const asesorKey = prospecto.asesor_id ?? "__sin_asesor__";
    const existing = porAsesorMap.get(asesorKey);
    if (existing) {
      existing.total += 1;
    } else {
      porAsesorMap.set(asesorKey, {
        asesorId: prospecto.asesor_id,
        asesorNombre: prospecto.asesorNombre ?? "Sin asesor",
        total: 1,
      });
    }
  }

  let porDia: LeadsReporteDia[];

  if (filters.desde && filters.hasta) {
    porDia = eachDayInRange(filters.desde, filters.hasta).map((fecha) => ({
      fecha,
      total: porDiaMap.get(fecha) ?? 0,
    }));
  } else {
    porDia = Array.from(porDiaMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha, total }));
  }

  let cotizaciones = 0;
  const supabase = createSupabaseServiceClient();

  if (supabase) {
    let cotizacionesQuery = supabase
      .from("cotizaciones")
      .select("id", { count: "exact", head: true })
      .eq("desarrollo_id", filters.desarrolloId);

    if (filters.desde) {
      cotizacionesQuery = cotizacionesQuery.gte("created_at", `${filters.desde}T00:00:00.000Z`);
    }
    if (filters.hasta) {
      cotizacionesQuery = cotizacionesQuery.lte("created_at", `${filters.hasta}T23:59:59.999Z`);
    }
    if (filters.asesorId) {
      cotizacionesQuery = cotizacionesQuery.eq("asesor_id", filters.asesorId);
    }

    const { count, error } = await cotizacionesQuery;
    if (error) {
      throw new Error(error.message);
    }
    cotizaciones = count ?? 0;
  }

  return {
    total: prospectos.filter((item) => !item.es_spam && !item.es_duplicado).length,
    cotizaciones,
    spam,
    duplicados,
    porEtapa,
    porCalificacion,
    porDia,
    porAsesor: Array.from(porAsesorMap.values()).sort((a, b) => b.total - a.total),
  };
};

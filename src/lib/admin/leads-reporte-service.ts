import { listProspectos } from "@/lib/admin/prospectos-service";
import type { AdminProfile } from "@/lib/admin/types";
import { calificacionLabel } from "@/lib/comercial/xperience-leads";
import { nivelInteresLabelOrDefault } from "@/lib/comercial/prospecto-interes";
import { prospectoEtapaLabel, normalizeProspectoEtapaValue, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import { motivoDescarteLabel } from "@/lib/comercial/motivo-descarte";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { canAccessDesarrollo } from "@/lib/admin/permissions";
import { fetchLeadsQaResumen, type LeadsQaResumen } from "@/lib/admin/qa-satisfaccion-service";
import {
  mexicoEstadoNombre,
  resolveOrigenEstado,
  type MexicoEstadoId,
} from "@/lib/comercial/mexico-estados";

export type LeadsReporteDia = {
  fecha: string;
  total: number;
  validos: number;
  duplicados: number;
};

export type LeadsReporteMes = {
  mes: string;
  label: string;
  total: number;
  validos: number;
  duplicados: number;
};

export type LeadsReporteAsesor = {
  asesorId: string | null;
  asesorNombre: string;
  total: number;
};

export type LeadsReporteCampana = {
  campanaId: string | null;
  campanaNombre: string;
  canal: string | null;
  total: number;
  validos: number;
};

export type LeadsReporteRegion = {
  region: string;
  total: number;
};

export type LeadsReporteEstado = {
  estadoId: MexicoEstadoId;
  estadoNombre: string;
  total: number;
};

export type LeadsCalificacionResumen = {
  total: number;
  calificados: number;
  noCalificados: number;
};

export type LeadsInteraccionesResumen = {
  conCorreo: number;
  conLlamada: number;
  conWhatsapp: number;
  conCrm: number;
  totalCorreo: number;
  totalLlamada: number;
  totalWhatsapp: number;
};

export type LeadsEmbudoEtapa = {
  etapa: string;
  label: string;
  total: number;
  pctDelTotal: number;
};

export type LeadsReporteMotivoDescarte = {
  motivoId: string;
  label: string;
  total: number;
  pctDeDescartados: number;
};

export type LeadsReporte = {
  totalBruto: number;
  total: number;
  cotizaciones: number;
  spam: number;
  duplicados: number;
  duplicadosSpam: number;
  calificacion: LeadsCalificacionResumen;
  interacciones: LeadsInteraccionesResumen;
  embudo: LeadsEmbudoEtapa[];
  porEtapa: Record<string, number>;
  porMotivoDescarte: LeadsReporteMotivoDescarte[];
  descartadosTotal: number;
  porCalificacion: Record<string, number>;
  porInteres: Record<string, number>;
  porDia: LeadsReporteDia[];
  porMes: LeadsReporteMes[];
  porCampana: LeadsReporteCampana[];
  porRegion: LeadsReporteRegion[];
  porEstado: LeadsReporteEstado[];
  qa: LeadsQaResumen;
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

const monthLabel = (mes: string) => {
  const [year, month] = mes.split("-").map(Number);
  if (!year || !month) {
    return mes;
  }
  return new Date(year, month - 1, 1).toLocaleDateString("es-MX", {
    month: "short",
    year: "numeric",
  });
};

const eachMonthInRange = (desde: string, hasta: string) => {
  const months: string[] = [];
  const start = new Date(`${desde.slice(0, 7)}-01T12:00:00.000Z`);
  const end = new Date(`${hasta.slice(0, 7)}-01T12:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return months;
  }

  const cursor = new Date(start);
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
};

const esCalificado = (calificacion?: string | null) =>
  calificacionLabel(calificacion) !== "Sin Calificar";

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
  const embudoMap: Record<string, number> = {};
  const porCalificacion: Record<string, number> = {};
  const porInteres: Record<string, number> = {};
  const porMotivoDescarteMap = new Map<string, number>();
  const porDiaMap = new Map<string, { total: number; validos: number; duplicados: number }>();
  const porMesMap = new Map<string, { total: number; validos: number; duplicados: number }>();
  const porAsesorMap = new Map<string, LeadsReporteAsesor>();
  const porCampanaMap = new Map<string, LeadsReporteCampana>();
  const porRegionMap = new Map<string, number>();
  const porEstadoMap = new Map<MexicoEstadoId, number>();

  let spam = 0;
  let duplicados = 0;
  let duplicadosSpam = 0;
  let validos = 0;
  let calificados = 0;
  let noCalificados = 0;
  let descartadosTotal = 0;

  const interacciones: LeadsInteraccionesResumen = {
    conCorreo: 0,
    conLlamada: 0,
    conWhatsapp: 0,
    conCrm: 0,
    totalCorreo: 0,
    totalLlamada: 0,
    totalWhatsapp: 0,
  };

  for (const prospecto of prospectos) {
    const etapa = normalizeProspectoEtapaValue(prospecto.etapa) ?? prospecto.etapa;
    porEtapa[etapa] = (porEtapa[etapa] ?? 0) + 1;

    if (etapa === "perdido") {
      descartadosTotal += 1;
      const motivoKey = prospecto.motivo_descarte?.trim() || "__sin_motivo__";
      porMotivoDescarteMap.set(motivoKey, (porMotivoDescarteMap.get(motivoKey) ?? 0) + 1);
    }

    const esValido = !prospecto.es_spam && !prospecto.es_duplicado;
    if (esValido) {
      validos += 1;
      embudoMap[etapa] = (embudoMap[etapa] ?? 0) + 1;
    }

    const calKey = calificacionLabel(prospecto.calificacion);
    porCalificacion[calKey] = (porCalificacion[calKey] ?? 0) + 1;

    if (esCalificado(prospecto.calificacion)) {
      calificados += 1;
    } else {
      noCalificados += 1;
    }

    const interesKey = nivelInteresLabelOrDefault(prospecto.nivel_interes);
    porInteres[interesKey] = (porInteres[interesKey] ?? 0) + 1;

    if (prospecto.es_spam) {
      spam += 1;
    }
    if (prospecto.es_duplicado) {
      duplicados += 1;
    }
    if (prospecto.es_duplicado && prospecto.es_spam) {
      duplicadosSpam += 1;
    }

    const fecha = prospecto.created_at.slice(0, 10);
    const mes = prospecto.created_at.slice(0, 7);
    const dayBucket = porDiaMap.get(fecha) ?? { total: 0, validos: 0, duplicados: 0 };
    dayBucket.total += 1;
    if (prospecto.es_duplicado) {
      dayBucket.duplicados += 1;
    }
    if (esValido) {
      dayBucket.validos += 1;
    }
    porDiaMap.set(fecha, dayBucket);

    const monthBucket = porMesMap.get(mes) ?? { total: 0, validos: 0, duplicados: 0 };
    monthBucket.total += 1;
    if (prospecto.es_duplicado) {
      monthBucket.duplicados += 1;
    }
    if (esValido) {
      monthBucket.validos += 1;
    }
    porMesMap.set(mes, monthBucket);

    const campanaKey = prospecto.campana_id ?? "__sin_campana__";
    const campanaExisting = porCampanaMap.get(campanaKey);
    if (campanaExisting) {
      campanaExisting.total += 1;
      if (esValido) {
        campanaExisting.validos += 1;
      }
    } else {
      porCampanaMap.set(campanaKey, {
        campanaId: prospecto.campana_id,
        campanaNombre: prospecto.campanaNombre ?? "Sin campaña",
        canal: prospecto.campanaCanal ?? prospecto.medio_contacto ?? null,
        total: 1,
        validos: esValido ? 1 : 0,
      });
    }

    const region = prospecto.origen_ciudad?.trim() || "Sin región";
    porRegionMap.set(region, (porRegionMap.get(region) ?? 0) + 1);

    const estadoId = resolveOrigenEstado(prospecto.origen_ciudad);
    porEstadoMap.set(estadoId, (porEstadoMap.get(estadoId) ?? 0) + 1);

    const asesorKey = prospecto.asesor_id ?? "__sin_asesor__";
    const existingAsesor = porAsesorMap.get(asesorKey);
    if (existingAsesor) {
      existingAsesor.total += 1;
    } else {
      porAsesorMap.set(asesorKey, {
        asesorId: prospecto.asesor_id,
        asesorNombre: prospecto.asesorNombre ?? "Sin asesor",
        total: 1,
      });
    }

    if ((prospecto.bandera_correo ?? 0) > 0) {
      interacciones.conCorreo += 1;
      interacciones.totalCorreo += prospecto.bandera_correo ?? 0;
    }
    if ((prospecto.bandera_llamada ?? 0) > 0) {
      interacciones.conLlamada += 1;
      interacciones.totalLlamada += prospecto.bandera_llamada ?? 0;
    }
    if ((prospecto.bandera_whatsapp ?? 0) > 0) {
      interacciones.conWhatsapp += 1;
      interacciones.totalWhatsapp += prospecto.bandera_whatsapp ?? 0;
    }
    if ((prospecto.bandera_crm ?? 0) > 0) {
      interacciones.conCrm += 1;
    }
  }

  let porDia: LeadsReporteDia[];

  if (filters.desde && filters.hasta) {
    porDia = eachDayInRange(filters.desde, filters.hasta).map((fecha) => {
      const bucket = porDiaMap.get(fecha) ?? { total: 0, validos: 0, duplicados: 0 };
      return { fecha, ...bucket };
    });
  } else {
    porDia = Array.from(porDiaMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, bucket]) => ({ fecha, ...bucket }));
  }

  let porMes: LeadsReporteMes[];

  if (filters.desde && filters.hasta) {
    porMes = eachMonthInRange(filters.desde, filters.hasta).map((mes) => {
      const bucket = porMesMap.get(mes) ?? { total: 0, validos: 0, duplicados: 0 };
      return { mes, label: monthLabel(mes), ...bucket };
    });
  } else {
    porMes = Array.from(porMesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, bucket]) => ({ mes, label: monthLabel(mes), ...bucket }));
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

  const embudoEtapas: ProspectoEtapa[] = [
    "nuevo",
    "contactado",
    "cita",
    "apartado",
    "vendido",
    "cancelado",
    "perdido",
  ];

  const embudo: LeadsEmbudoEtapa[] = embudoEtapas.map((etapa) => {
    const total = embudoMap[etapa] ?? 0;
    return {
      etapa,
      label: prospectoEtapaLabel[etapa],
      total,
      pctDelTotal: validos > 0 ? Math.round((total / validos) * 100) : 0,
    };
  });

  const porMotivoDescarte: LeadsReporteMotivoDescarte[] = Array.from(
    porMotivoDescarteMap.entries(),
  )
    .map(([motivoId, total]) => ({
      motivoId,
      label:
        motivoId === "__sin_motivo__"
          ? "Sin motivo registrado"
          : motivoDescarteLabel(motivoId),
      total,
      pctDeDescartados:
        descartadosTotal > 0 ? Math.round((total / descartadosTotal) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const qa = await fetchLeadsQaResumen({
    desarrolloId: filters.desarrolloId,
    desde: filters.desde,
    hasta: filters.hasta,
    asesorId: filters.asesorId,
  });

  return {
    totalBruto: prospectos.length,
    total: validos,
    cotizaciones,
    spam,
    duplicados,
    duplicadosSpam,
    calificacion: {
      total: prospectos.length,
      calificados,
      noCalificados,
    },
    interacciones,
    embudo,
    porEtapa,
    porMotivoDescarte,
    descartadosTotal,
    porCalificacion,
    porInteres,
    porDia,
    porMes,
    porCampana: Array.from(porCampanaMap.values()).sort((a, b) => b.total - a.total),
    porRegion: Array.from(porRegionMap.entries())
      .map(([region, total]) => ({ region, total }))
      .sort((a, b) => b.total - a.total),
    porEstado: Array.from(porEstadoMap.entries())
      .map(([estadoId, total]) => ({
        estadoId,
        estadoNombre: mexicoEstadoNombre(estadoId),
        total,
      }))
      .sort((a, b) => b.total - a.total),
    qa,
    porAsesor: Array.from(porAsesorMap.values()).sort((a, b) => b.total - a.total),
  };
};

import type { CotizacionFunnelRow } from "@/lib/admin/reporte-semanal/cotizaciones-periodo";
import type { ProspectoListRow } from "@/lib/admin/prospectos-service";
import type { ReporteSemanalFunnelMedio, ReporteSemanalFunnelSegmento } from "@/lib/admin/reporte-semanal/types";
import type { OperacionComercialRecord, SembradoUnidadRow } from "@/lib/comercial/sembrado-status";

const VENTA_ESTATUS = new Set(["Vendidas Cobradas"]);

export function normalizeMedioPublicitario(raw: string | null | undefined): string {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "Sin medio";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tik") && value.includes("tok")) return "Tik Tok";
  if (value.includes("google") || value.includes("web") || value.includes("página")) {
    return "Página Web/GOOGLE";
  }
  if (value.includes("inmobiliar") || value.includes("asesor externo")) {
    return "Inmobiliarias/Asesor Externo";
  }
  if (value.includes("contacto directo")) return "Contacto Directo";
  if (value.includes("evento") || value.includes("promocion")) return "Eventos/Promociones";
  if (value.includes("cross")) return "Crosseling";
  if (value.includes("espectacular")) return "Espectacular";
  if (value.includes("portal")) return "Portales";
  if (value.includes("oficina")) return "Oficina de Ventas";
  return raw!.trim();
}

/** Prioriza campaña digital CRM; si no hay, normaliza medio publicitario libre. */
export function resolveProspectoMedioLabel(prospecto: ProspectoListRow): string {
  const campana = prospecto.campanaNombre?.trim();
  if (campana) {
    const canal = prospecto.campanaCanal?.trim();
    return canal ? `${campana} (${canal})` : campana;
  }
  return normalizeMedioPublicitario(prospecto.medio_publicitario ?? prospecto.medio_contacto);
}

function isDateInRange(value: string | null | undefined, desde: string, hasta: string) {
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= desde && day <= hasta;
}

const APARTADO_ESTATUS = new Set([
  "Apartado",
  "Vendido Cobrado 1er Parte",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
  "Vendidas Cobradas",
]);

export function buildFunnelSegmento(input: {
  segmentoId: string;
  label: string;
  clusterId: string;
  rows: SembradoUnidadRow[];
  prospectosSemana: ProspectoListRow[];
  cotizacionesSemana: CotizacionFunnelRow[];
  citasSemana: number;
  periodo: { desde: string; hasta: string };
}): ReporteSemanalFunnelSegmento {
  const segmentRows =
    input.clusterId === "__all__"
      ? input.rows
      : input.rows.filter((r) => r.clusterId === input.clusterId);

  let apartadosVigentes = 0;
  let apartadosPeriodo = 0;
  let ventasPeriodo = 0;
  let asignacionesPeriodo = 0;
  let cotizaciones = 0;
  const medioMap = new Map<string, ReporteSemanalFunnelMedio>();

  const ensureMedio = (medio: string): ReporteSemanalFunnelMedio => {
    const existing = medioMap.get(medio);
    if (existing) return existing;
    const entry: ReporteSemanalFunnelMedio = {
      medio,
      afluencia: 0,
      cotizaciones: 0,
      citas: 0,
      apartados: 0,
      ventas: 0,
      asignaciones: 0,
    };
    medioMap.set(medio, entry);
    return entry;
  };

  for (const p of input.prospectosSemana) {
    if (p.es_spam || p.es_duplicado) continue;
    const medio = resolveProspectoMedioLabel(p);
    ensureMedio(medio).afluencia += 1;
  }

  for (const cotizacion of input.cotizacionesSemana) {
    if (input.clusterId !== "__all__" && cotizacion.clusterId !== input.clusterId) {
      continue;
    }
    cotizaciones += 1;
    ensureMedio(cotizacion.medioLabel).cotizaciones += 1;
  }

  for (const row of segmentRows) {
    const op = row.operacion;
    if (!op || op.cancelada) continue;
    const medio = normalizeMedioPublicitario(op.medio_publicitario);
    const entry = ensureMedio(medio);

    if (op.estatus_sembrado === "Asignado") {
      if (isDateInRange(op.fecha_apartado, input.periodo.desde, input.periodo.hasta)) {
        asignacionesPeriodo += 1;
        entry.asignaciones += 1;
      }
    }
    if (
      VENTA_ESTATUS.has(op.estatus_sembrado) &&
      isDateInRange(op.fecha_cierre, input.periodo.desde, input.periodo.hasta)
    ) {
      ventasPeriodo += 1;
      entry.ventas += 1;
    }
    if (isDateInRange(op.fecha_apartado, input.periodo.desde, input.periodo.hasta)) {
      apartadosPeriodo += 1;
      entry.apartados += 1;
    }
    if (APARTADO_ESTATUS.has(op.estatus_sembrado)) {
      apartadosVigentes += 1;
    }
  }

  const porMedio = Array.from(medioMap.values()).sort((a, b) => b.afluencia - a.afluencia);

  return {
    segmentoId: input.segmentoId,
    label: input.label,
    etapas: {
      afluencia: input.prospectosSemana.filter((p) => !p.es_spam && !p.es_duplicado).length,
      cotizaciones,
      citas: input.citasSemana,
      apartadosPeriodo,
      apartadosVigentes,
      ventasPeriodo,
      asignacionesPeriodo,
    },
    porMedio,
  };
}

export function buildVisitasInmobiliarias(
  prospectos: ProspectoListRow[],
  periodo: { desde: string; hasta: string },
): { inmobiliaria: string; fecha: string; prospecto: string | null }[] {
  return prospectos
    .filter((p) => {
      if (p.es_spam || p.es_duplicado) return false;
      const medio = normalizeMedioPublicitario(p.medio_publicitario ?? p.medio_contacto);
      if (medio !== "Inmobiliarias/Asesor Externo") return false;
      const day = p.created_at.slice(0, 10);
      return day >= periodo.desde && day <= periodo.hasta;
    })
    .slice(0, 30)
    .map((p) => ({
      inmobiliaria: p.promotor_nombre ?? p.equipo_venta ?? "Inmobiliaria",
      fecha: p.created_at.slice(0, 10),
      prospecto: p.nombre,
    }));
}

export function sumCobranzaMes(
  rows: SembradoUnidadRow[],
  mesStart: string,
  mesEnd: string,
): number {
  let total = 0;
  for (const row of rows) {
    if (!row.operacion || row.operacion.cancelada) continue;
    total += row.totalCobrado;
  }
  void mesStart;
  void mesEnd;
  return total;
}

export type { OperacionComercialRecord };

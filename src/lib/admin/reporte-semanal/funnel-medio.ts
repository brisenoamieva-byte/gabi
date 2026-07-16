import type { ProspectoListRow } from "@/lib/admin/prospectos-service";
import type { ReporteSemanalFunnelMedio, ReporteSemanalFunnelSegmento } from "@/lib/admin/reporte-semanal/types";
import type { SembradoUnidadRow } from "@/lib/comercial/sembrado-status";

const VENTA_ESTATUS = new Set(["Vendidas Cobradas"]);

export function normalizeMedioPublicitario(raw: string | null | undefined): string {
  const value = (raw ?? "").trim().toLowerCase();
  if (!value) return "Sin medio";
  if (value.includes("facebook")) return "Facebook";
  if (value.includes("instagram")) return "Instagram";
  if (value.includes("tik") && value.includes("tok")) return "Tik Tok";
  if (value.includes("google") || value.includes("web") || value.includes("página") || value.includes("pagina")) {
    return "Página Web/GOOGLE";
  }
  if (
    value.includes("inmobiliar") ||
    value.includes("asesor externo") ||
    value.includes("broker") ||
    value.includes("inmo")
  ) {
    return "Inmobiliarias/Asesor Externo";
  }
  if (
    value.includes("contacto directo") ||
    value.includes("teléfono") ||
    value.includes("telefono") ||
    value.includes("llamada")
  ) {
    return "Contacto Directo";
  }
  if (value.includes("evento") || value.includes("promocion")) return "Eventos/Promociones";
  if (value.includes("cross")) return "Crosseling";
  if (value.includes("espectacular")) return "Espectacular";
  if (value.includes("portal")) return "Portales";
  if (value.includes("oficina")) return "Oficina de Ventas";
  return raw!.trim();
}

/** Canal de campaña → medio canónico; si no, medio_publicitario / nombre de campaña. */
export function resolveProspectoMedioLabel(prospecto: ProspectoListRow): string {
  const canal = prospecto.campanaCanal?.trim();
  if (canal) return normalizeMedioPublicitario(canal);
  const medio = prospecto.medio_publicitario?.trim();
  if (medio) return normalizeMedioPublicitario(medio);
  const campana = prospecto.campanaNombre?.trim();
  if (campana) return normalizeMedioPublicitario(campana);
  return normalizeMedioPublicitario(prospecto.medio_contacto);
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
  /** Prospectos con visita_realizada_on en el periodo (citas/visitas reales). */
  prospectosCitasPeriodo: ProspectoListRow[];
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
  const medioMap = new Map<string, ReporteSemanalFunnelMedio>();

  const ensureMedio = (medio: string): ReporteSemanalFunnelMedio => {
    const existing = medioMap.get(medio);
    if (existing) return existing;
    const entry: ReporteSemanalFunnelMedio = {
      medio,
      afluencia: 0,
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

  for (const p of input.prospectosCitasPeriodo) {
    if (p.es_spam || p.es_duplicado) continue;
    const medio = resolveProspectoMedioLabel(p);
    ensureMedio(medio).citas += 1;
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

  const porMedio = Array.from(medioMap.values()).sort(
    (a, b) => b.afluencia + b.citas - (a.afluencia + a.citas),
  );

  const citasValidas = input.prospectosCitasPeriodo.filter(
    (p) => !p.es_spam && !p.es_duplicado,
  ).length;

  return {
    segmentoId: input.segmentoId,
    label: input.label,
    etapas: {
      afluencia: input.prospectosSemana.filter((p) => !p.es_spam && !p.es_duplicado).length,
      citas: citasValidas,
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
    inmobiliaria:
      p.partnerNombre ?? p.promotor_nombre ?? p.equipo_venta ?? p.asesorNombre ?? "Inmobiliaria",
      fecha: p.created_at.slice(0, 10),
      prospecto: p.nombre,
    }));
}

export function filterProspectosConVisitaEnPeriodo(
  prospectos: ProspectoListRow[],
  periodo: { desde: string; hasta: string },
): ProspectoListRow[] {
  return prospectos.filter((p) => {
    if (p.es_spam || p.es_duplicado) return false;
    return isDateInRange(p.visita_realizada_on, periodo.desde, periodo.hasta);
  });
}

export function prospectosVisitasPorMes(
  prospectos: ProspectoListRow[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of prospectos) {
    if (p.es_spam || p.es_duplicado) continue;
    const key = p.visita_realizada_on?.slice(0, 7);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
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

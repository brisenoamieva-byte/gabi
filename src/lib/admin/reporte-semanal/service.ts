import type { AdminProfile } from "@/lib/admin/types";
import { listProspectos } from "@/lib/admin/prospectos-service";
import { listSembradoUnidades } from "@/lib/admin/operaciones-service";
import {
  getReporteSemanalSegments,
  type ReporteSemanalSegmentConfig,
} from "@/lib/admin/reporte-semanal/segment-config";
import type {
  ReporteComercialSemanal,
  ReporteSemanalAbsorcionModelo,
  ReporteSemanalMatrizCelda,
  ReporteSemanalMedio,
  ReporteSemanalOperacionLinea,
  ReporteSemanalProspectoInteresado,
  ReporteSemanalSeguimiento,
  ReporteSemanalSegmento,
} from "@/lib/admin/reporte-semanal/types";
import {
  isDateInRange,
  monthRangeForDate,
  resolveReportePeriodo,
} from "@/lib/admin/reporte-semanal/week-utils";
import { canAccessDesarrollo } from "@/lib/admin/permissions";
import { estatusSembradoLabel } from "@/lib/comercial/sembrado-status";
import type { OperacionComercialRecord, SembradoUnidadRow } from "@/lib/comercial/sembrado-status";
import { nivelInteresLabelOrDefault } from "@/lib/comercial/prospecto-interes";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const VENTA_ESTATUS = new Set(["Vendidas Cobradas"]);
const APARTADO_ESTATUS = new Set([
  "Apartado",
  "Vendido Cobrado 1er Parte",
  "Vendidas listas para cobro",
  "Vendidas en espera de cobro",
  "Vendidas Cobradas",
]);

function normalizeMedio(raw: string | null | undefined): string {
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

function modeloLabel(row: SembradoUnidadRow): string {
  if (row.prototipoId) {
    const parts = row.prototipoId.split("-");
    return parts[parts.length - 1]?.toUpperCase() ?? row.prototipoId;
  }
  return row.tipo || "—";
}

function precioM2(row: SembradoUnidadRow, operacion: OperacionComercialRecord | null): number | null {
  const m2 = row.superficieConstruccionM2 ?? row.superficieTerrenoM2;
  const precio = operacion?.precio_venta ?? operacion?.precio_lista ?? row.precio;
  if (!m2 || !precio) return null;
  return Math.round(precio / m2);
}

function toOperacionLinea(
  row: SembradoUnidadRow,
  operacion: OperacionComercialRecord,
): ReporteSemanalOperacionLinea {
  return {
    cliente: operacion.cliente_nombre,
    unidad: row.unidad,
    precioM2: precioM2(row, operacion),
    precioLista: operacion.precio_lista,
    precioVenta: operacion.precio_venta,
    lista: operacion.lista_precios,
    plazo: operacion.esquema_pago,
    asesor: operacion.promotor_nombre ?? operacion.equipo_venta,
    fecha: operacion.fecha_apartado ?? operacion.fecha_cierre,
    medio: operacion.medio_publicitario,
    estatus: estatusSembradoLabel[operacion.estatus_sembrado] ?? operacion.estatus_sembrado,
  };
}

function buildSegmentoReporte(
  config: ReporteSemanalSegmentConfig,
  rows: SembradoUnidadRow[],
  periodo: { desde: string; hasta: string },
  mes: { desde: string; hasta: string },
): ReporteSemanalSegmento {
  const segmentRows =
    config.clusterId === "__all__"
      ? rows
      : rows.filter((row) => row.clusterId === config.clusterId);
  const activas = segmentRows.filter((row) => row.operacion && !row.operacion.cancelada);

  let ventasSemana = 0;
  let apartadosSemana = 0;
  let cancelacionesSemana = 0;
  let asignadosActuales = 0;
  let apartadosVigentes = 0;
  let ventasMes = 0;
  let apartadosMes = 0;
  let cajaSemana = 0;
  let comprometidos = 0;
  let ventasMesMonto = 0;

  const ventasMesLineas: ReporteSemanalOperacionLinea[] = [];
  const apartadosVigentesLineas: ReporteSemanalOperacionLinea[] = [];
  const canceladosLineas: ReporteSemanalOperacionLinea[] = [];

  const modeloMap = new Map<string, ReporteSemanalAbsorcionModelo>();
  const matrizMap = new Map<string, ReporteSemanalMatrizCelda>();

  let m2RealSum = 0;
  let m2RealCount = 0;
  let m2InvSum = 0;
  let m2InvCount = 0;
  let areaVendida = 0;

  for (const row of segmentRows) {
    const op = row.operacion;
    const lista = row.listaPrecios ?? op?.lista_precios ?? "Sin lista";
    const modelo = modeloLabel(row);

    if (!op || op.cancelada) {
      if (row.estatusInventario === "disponible") {
        const m2 = precioM2(row, null);
        if (m2) {
          m2InvSum += m2;
          m2InvCount += 1;
        }
        const key = `${lista}::${modelo}`;
        const cell = matrizMap.get(key) ?? { lista, modelo, disponibles: 0 };
        cell.disponibles += 1;
        matrizMap.set(key, cell);
      }
      continue;
    }

    const estatus = op.estatus_sembrado;
    const modeloEntry = modeloMap.get(modelo) ?? {
      modelo,
      apartados: 0,
      ventas: 0,
      asignados: 0,
    };

    if (estatus === "Asignado") {
      asignadosActuales += 1;
      modeloEntry.asignados += 1;
    }

    if (APARTADO_ESTATUS.has(estatus)) {
      apartadosVigentes += 1;
      apartadosVigentesLineas.push(toOperacionLinea(row, op));
      comprometidos += Number(op.precio_venta ?? op.precio_lista ?? 0);
      if (!VENTA_ESTATUS.has(estatus)) {
        modeloEntry.apartados += 1;
      }
    }

    if (VENTA_ESTATUS.has(estatus)) {
      modeloEntry.ventas += 1;
      const m2 = row.superficieConstruccionM2 ?? row.superficieTerrenoM2;
      if (m2) areaVendida += m2;
      const pm2 = precioM2(row, op);
      if (pm2) {
        m2RealSum += pm2;
        m2RealCount += 1;
      }
    }

    if (isDateInRange(op.fecha_apartado, periodo.desde, periodo.hasta)) {
      apartadosSemana += 1;
    }
    if (isDateInRange(op.fecha_cierre, periodo.desde, periodo.hasta) && VENTA_ESTATUS.has(estatus)) {
      ventasSemana += 1;
    }
    if (op.cancelada && isDateInRange(op.cancelada_at, periodo.desde, periodo.hasta)) {
      cancelacionesSemana += 1;
      canceladosLineas.push(toOperacionLinea(row, op));
    }

    if (isDateInRange(op.fecha_cierre, mes.desde, mes.hasta) && VENTA_ESTATUS.has(estatus)) {
      ventasMes += 1;
      ventasMesMonto += Number(op.precio_venta ?? 0);
      ventasMesLineas.push(toOperacionLinea(row, op));
    }
    if (isDateInRange(op.fecha_apartado, mes.desde, mes.hasta)) {
      apartadosMes += 1;
    }

    cajaSemana += row.totalCobrado;
    modeloMap.set(modelo, modeloEntry);
  }

  const objetivoUnidades = segmentRows.length;
  const absorcionPct =
    objetivoUnidades > 0
      ? Math.round((activas.length / objetivoUnidades) * 10000) / 100
      : null;

  return {
    id: config.id,
    label: config.label,
    kpis: {
      ventasSemana,
      apartadosSemana,
      cancelacionesSemana,
      asignadosActuales,
      apartadosVigentes,
      ventasMes,
      apartadosMes,
      absorcionPct,
    },
    precios: {
      m2PromedioReal: m2RealCount ? Math.round(m2RealSum / m2RealCount) : null,
      m2PromedioInventario: m2InvCount ? Math.round(m2InvSum / m2InvCount) : null,
      areaVendidaM2: areaVendida || null,
    },
    ingresos: {
      cajaSemana: Math.round(cajaSemana),
      comprometidos: Math.round(comprometidos),
      ventasMesMonto: Math.round(ventasMesMonto),
    },
    ventasMes: ventasMesLineas.slice(0, 50),
    apartadosVigentes: apartadosVigentesLineas.slice(0, 80),
    canceladosSemana: canceladosLineas.slice(0, 30),
    matrizInventario: Array.from(matrizMap.values()).sort(
      (a, b) => a.lista.localeCompare(b.lista) || a.modelo.localeCompare(b.modelo),
    ),
    absorcionPorModelo: Array.from(modeloMap.values()).sort((a, b) => b.ventas - a.ventas),
  };
}

function buildGeneralSegmento(
  rows: SembradoUnidadRow[],
  periodo: { desde: string; hasta: string },
  mes: { desde: string; hasta: string },
): ReporteSemanalSegmento {
  return buildSegmentoReporte(
    { id: "general", label: "General", clusterId: "__all__" },
    rows,
    periodo,
    mes,
  );
}

function buildMedios(
  prospectosSemana: Awaited<ReturnType<typeof listProspectos>>,
  prospectosMes: Awaited<ReturnType<typeof listProspectos>>,
  prospectosAcum: Awaited<ReturnType<typeof listProspectos>>,
): ReporteSemanalMedio[] {
  const countBy = (items: typeof prospectosSemana) => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (item.es_spam || item.es_duplicado) continue;
      const medio = normalizeMedio(item.medio_publicitario ?? item.medio_contacto);
      map.set(medio, (map.get(medio) ?? 0) + 1);
    }
    return map;
  };

  const semana = countBy(prospectosSemana);
  const mes = countBy(prospectosMes);
  const acum = countBy(prospectosAcum);
  const medios = new Set([
    ...Array.from(semana.keys()),
    ...Array.from(mes.keys()),
    ...Array.from(acum.keys()),
  ]);
  const totalSemana = Array.from(semana.values()).reduce((a, b) => a + b, 0) || 1;

  return Array.from(medios)
    .map((medio) => ({
      medio,
      semana: semana.get(medio) ?? 0,
      mes: mes.get(medio) ?? 0,
      acumulado: acum.get(medio) ?? 0,
      pctSemana: Math.round(((semana.get(medio) ?? 0) / totalSemana) * 1000) / 10,
    }))
    .sort((a, b) => b.semana - a.semana);
}

function buildSeguimiento(
  prospectosSemana: Awaited<ReturnType<typeof listProspectos>>,
  prospectosMes: Awaited<ReturnType<typeof listProspectos>>,
): ReporteSemanalSeguimiento[] {
  const bucket = (p: (typeof prospectosSemana)[number]): string => {
    if (p.etapa === "perdido") return "No comprará";
    if (p.etapa === "apartado" || p.etapa === "vendido") return "Apartó / Compró / Asignaciones";
    if (p.etapa === "negociacion") return "Posib. compra inmediata";
    if (p.etapa === "cotizo") return "En seguimiento";
    if (p.etapa === "contactado") return "Llamar más adelante";
    return "En seguimiento";
  };

  const semanaMap = new Map<string, number>();
  const mesMap = new Map<string, number>();

  for (const p of prospectosSemana) {
    if (p.es_spam || p.es_duplicado) continue;
    const key = bucket(p);
    semanaMap.set(key, (semanaMap.get(key) ?? 0) + 1);
  }
  for (const p of prospectosMes) {
    if (p.es_spam || p.es_duplicado) continue;
    const key = bucket(p);
    mesMap.set(key, (mesMap.get(key) ?? 0) + 1);
  }

  const keys = new Set([...Array.from(semanaMap.keys()), ...Array.from(mesMap.keys())]);
  return Array.from(keys).map((estatus) => ({
    estatus,
    semana: semanaMap.get(estatus) ?? 0,
    mes: mesMap.get(estatus) ?? 0,
  }));
}

function buildProspectosInteresados(
  prospectos: Awaited<ReturnType<typeof listProspectos>>,
): ReporteSemanalProspectoInteresado[] {
  return prospectos
    .filter(
      (p) =>
        !p.es_spam &&
        !p.es_duplicado &&
        (p.etapa === "negociacion" ||
          p.etapa === "cotizo" ||
          p.nivel_interes === "alto"),
    )
    .slice(0, 25)
    .map((p) => ({
      nombre: p.nombre,
      unidad: p.producto_nombre,
      tipo: p.tipo_inversion,
      asesor: p.promotor_nombre,
      plazo: nivelInteresLabelOrDefault(p.nivel_interes),
      observaciones: p.notas,
    }));
}

export async function getReporteComercialSemanal(
  filters: { desarrolloId: string; desde?: string; hasta?: string },
  profile?: AdminProfile,
): Promise<ReporteComercialSemanal> {
  if (profile && !canAccessDesarrollo(profile, filters.desarrolloId)) {
    throw new Error("No tienes permiso para este desarrollo.");
  }

  const periodo = resolveReportePeriodo(filters.desde, filters.hasta);
  const mes = monthRangeForDate(periodo.hasta);

  const [rows, prospectosSemana, prospectosMes, prospectosAcum, visitasCount] =
    await Promise.all([
      listSembradoUnidades({ desarrolloId: filters.desarrolloId }, profile),
      listProspectos(
        {
          desarrolloId: filters.desarrolloId,
          desde: periodo.desde,
          hasta: periodo.hasta,
          spam: "exclude",
          duplicados: "exclude",
        },
        profile,
      ),
      listProspectos(
        {
          desarrolloId: filters.desarrolloId,
          desde: mes.desde,
          hasta: mes.hasta,
          spam: "exclude",
          duplicados: "exclude",
        },
        profile,
      ),
      listProspectos(
        {
          desarrolloId: filters.desarrolloId,
          spam: "exclude",
          duplicados: "exclude",
        },
        profile,
      ),
      countVisitasPeriodo(filters.desarrolloId, periodo.desde, periodo.hasta),
    ]);

  const segmentConfigs = getReporteSemanalSegments(filters.desarrolloId);
  const segmentos = segmentConfigs
    ? segmentConfigs.map((config) => buildSegmentoReporte(config, rows, periodo, mes))
    : [buildGeneralSegmento(rows, periodo, mes)];

  let apartadosDeptos = 0;
  let apartadosOficinas = 0;
  if (segmentConfigs) {
    for (const seg of segmentos) {
      const cfg = segmentConfigs.find((c) => c.id === seg.id);
      if (cfg?.resumenKey === "departamentos") apartadosDeptos = seg.kpis.apartadosVigentes;
      if (cfg?.resumenKey === "oficinas") apartadosOficinas = seg.kpis.apartadosVigentes;
    }
  } else {
    apartadosDeptos = segmentos[0]?.kpis.apartadosVigentes ?? 0;
  }

  return {
    desarrolloId: filters.desarrolloId,
    periodo,
    resumen: {
      afluencia: prospectosSemana.length,
      citasVisitas: visitasCount,
      apartadosDeptos,
      apartadosOficinas,
    },
    medios: buildMedios(prospectosSemana, prospectosMes, prospectosAcum),
    seguimiento: buildSeguimiento(prospectosSemana, prospectosMes),
    prospectosInteresados: buildProspectosInteresados(prospectosSemana),
    segmentos,
    meta: {
      generadoAt: new Date().toISOString(),
      fuentes: [
        "disponibilidad_unidades",
        "operaciones_comerciales",
        "cobranza_mensual",
        "prospectos",
        "visitas_comerciales",
      ],
    },
  };
}

async function countVisitasPeriodo(
  desarrolloId: string,
  desde: string,
  hasta: string,
): Promise<number> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("visitas_comerciales")
    .select("*", { count: "exact", head: true })
    .eq("desarrollo_id", desarrolloId)
    .gte("occurred_at", `${desde}T00:00:00.000Z`)
    .lte("occurred_at", `${hasta}T23:59:59.999Z`);

  if (error) return 0;
  return count ?? 0;
}

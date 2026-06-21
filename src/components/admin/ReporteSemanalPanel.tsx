"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, Loader2, Printer, RefreshCw, ShieldCheck } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ReporteComercialSemanal, ReporteSemanalSegmento } from "@/lib/admin/reporte-semanal/types";
import { defaultWeekContaining } from "@/lib/admin/reporte-semanal/week-utils";
import { hasSegmentedReporteSemanal } from "@/lib/catalog/desarrollos-registry";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";
import {
  AbsorcionMensualChart,
  AbsorcionModeloChart,
  AvanceObjetivosChart,
  FunnelPorMedioChart,
  IngresosColumnasTable,
  InventarioHeatmap,
  MediosDonutChart,
  ObjetivoIngresosChart,
  PrecioM2Chart,
  SeguimientoChart,
} from "@/components/admin/ReporteSemanalCharts";
import { ObjetivosComercialesEditor } from "@/components/admin/ObjetivosComercialesEditor";

type Props = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function SectionHeading({ n, title, desc }: { n: number; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gabi-forest text-sm font-black text-white">
        {n}
      </span>
      <div>
        <h3 className="text-lg font-black text-gabi-forest">{title}</h3>
        {desc ? <p className="text-sm text-slate-500">{desc}</p> : null}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string | number;
  dark?: boolean;
}) {
  return (
    <div
      className={
        dark
          ? "rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
          : "rounded-xl border border-gabi-forest/10 bg-white p-4 shadow-sm"
      }
    >
      <p
        className={`text-[10px] font-bold uppercase tracking-wide ${dark ? "text-white/60" : "text-slate-400"}`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-black tabular-nums ${dark ? "text-white" : "text-gabi-forest"}`}
      >
        {value}
      </p>
    </div>
  );
}

function OperacionesTable({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: ReporteSemanalSegmento["ventasMes"];
  empty: string;
}) {
  if (!rows.length) {
    return (
      <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
        <h4 className="font-bold text-gabi-forest">{title}</h4>
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gabi-forest/10 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h4 className="font-bold text-gabi-forest">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Unidad</th>
              <th className="px-4 py-2">$/m²</th>
              <th className="px-4 py-2">Venta</th>
              <th className="px-4 py-2">Lista</th>
              <th className="px-4 py-2">Plazo</th>
              <th className="px-4 py-2">Asesor</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Medio</th>
              <th className="px-4 py-2">Estatus</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.unidad}-${index}`} className="border-t border-slate-100">
                <td className="px-4 py-2 font-medium">{row.cliente}</td>
                <td className="px-4 py-2">{row.unidad}</td>
                <td className="px-4 py-2 tabular-nums">{formatMoney(row.precioM2)}</td>
                <td className="px-4 py-2 tabular-nums">{formatMoney(row.precioVenta)}</td>
                <td className="px-4 py-2">{row.lista ?? "—"}</td>
                <td className="px-4 py-2">{row.plazo ?? "—"}</td>
                <td className="px-4 py-2">{row.asesor ?? "—"}</td>
                <td className="px-4 py-2 whitespace-nowrap">{row.fecha ?? "—"}</td>
                <td className="px-4 py-2">{row.medio ?? "—"}</td>
                <td className="px-4 py-2">{row.estatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SegmentoDetalle({ segmento }: { segmento: ReporteSemanalSegmento }) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-gradient-to-r from-gabi-forest/5 to-transparent p-5">
        <h3 className="text-xl font-black text-gabi-forest">{segmento.label}</h3>
        <p className="text-sm text-slate-500">
          Detalle comercial del segmento — alineado al formato Pasaje Álamos
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Ventas semana" value={segmento.kpis.ventasSemana} />
          <KpiTile label="Apartados semana" value={segmento.kpis.apartadosSemana} />
          <KpiTile label="Apartados vigentes" value={segmento.kpis.apartadosVigentes} />
          <KpiTile label="Cancelaciones semana" value={segmento.kpis.cancelacionesSemana} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AvanceObjetivosChart avance={segmento.avance} />
        <PrecioM2Chart
          real={segmento.precios.m2PromedioReal}
          objetivo={segmento.precios.m2PromedioObjetivo}
          inventario={segmento.precios.m2PromedioInventario}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {segmento.objetivoIngresos ? (
          <ObjetivoIngresosChart obj={segmento.objetivoIngresos} />
        ) : null}
        <IngresosColumnasTable cols={segmento.ingresosColumnas} />
      </div>

      <AbsorcionModeloChart items={segmento.absorcionPorModelo} />

      <OperacionesTable
        title="Ventas del mes"
        rows={segmento.ventasMes}
        empty="Sin ventas cerradas en el mes del periodo."
      />
      <OperacionesTable
        title="Apartados vigentes"
        rows={segmento.apartadosVigentes}
        empty="Sin apartados vigentes en este segmento."
      />
      <OperacionesTable
        title="Cancelados en la semana"
        rows={segmento.canceladosSemana}
        empty="Sin cancelaciones en el periodo."
      />

      <InventarioHeatmap celdas={segmento.matrizInventario} />
    </div>
  );
}

export function ReporteSemanalPanel({ desarrollos, scopeLabel }: Props) {
  const defaultWeek = useMemo(() => defaultWeekContaining(), []);
  const segmentedFallback = desarrollos.find((d) => hasSegmentedReporteSemanal(d.id))?.id;
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos, {
    fallbackDesarrolloId: segmentedFallback,
  });
  const [desde, setDesde] = useState(defaultWeek.desde);
  const [hasta, setHasta] = useState(defaultWeek.hasta);
  const [reporte, setReporte] = useState<ReporteComercialSemanal | null>(null);
  const [segmentoActivo, setSegmentoActivo] = useState("");
  const [funnelActivo, setFunnelActivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const desarrolloNombre = desarrollos.find((d) => d.id === desarrolloId)?.nombre ?? desarrolloId;
  const reporteAnio = useMemo(
    () => new Date(`${hasta}T12:00:00`).getFullYear(),
    [hasta],
  );

  const load = useCallback(async () => {
    if (!desarrolloId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ desarrolloId, desde, hasta });
      const res = await fetch(`/api/admin/reportes/semanal?${params}`);
      const data = (await res.json()) as { reporte?: ReporteComercialSemanal; error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el reporte.");
      setReporte(data.reporte ?? null);
      const firstSeg = data.reporte?.segmentos[0]?.id ?? "";
      setSegmentoActivo(firstSeg);
      setFunnelActivo(data.reporte?.funnels[0]?.segmentoId ?? firstSeg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
      setReporte(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, desde, hasta]);

  useEffect(() => {
    void load();
  }, [load]);

  const segmento = reporte?.segmentos.find((item) => item.id === segmentoActivo);
  const funnel = reporte?.funnels.find((f) => f.segmentoId === funnelActivo);

  const handlePrint = () => {
    window.print();
  };

  if (!desarrollos.length) {
    return null;
  }

  return (
    <div id="reporte-semanal" className="reporte-semanal space-y-8 print:space-y-6">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #reporte-semanal,
          #reporte-semanal * {
            visibility: visible;
          }
          #reporte-semanal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .reporte-semanal section {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">
              Inteligencia comercial
            </p>
            <h2 className="mt-2 text-2xl font-black text-gabi-forest">Reporte comercial semanal</h2>
            {scopeLabel ? (
              <p className="mt-2 inline-flex rounded-full bg-gabi-forest/5 px-3 py-1 text-xs font-semibold text-gabi-forest">
                Alcance: {scopeLabel}
              </p>
            ) : null}
            <p className="mt-3 max-w-3xl text-sm text-slate-500">
              Informe ejecutivo con funnel por medio, absorción histórica, objetivos comerciales e
              inventario. Estructura alineada al reporte Pasaje Álamos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/15 px-4 py-2 text-sm font-semibold text-gabi-forest"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-semibold text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
            <select
              value={desarrolloId}
              onChange={(e) => setDesarrolloId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {desarrollos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                  {hasSegmentedReporteSemanal(d.id) ? " · completo" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading && !reporte ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generando reporte…
        </div>
      ) : null}

      {reporte ? (
        <>
          {reporte.saludCrm.enabled ? (
            <section className="no-print rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Confianza del CRM
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Los embudos de este reporte reflejan actividad comercial; la confianza indica qué
                    porcentaje del pipeline activo está documentado al día.
                  </p>
                </div>
                <Link
                  href={`/admin/crm-compliance?desarrolloId=${encodeURIComponent(desarrolloId)}`}
                  className="text-sm font-semibold text-gabi-forest hover:underline"
                >
                  Abrir Salud CRM
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiTile label="Cumplimiento playbook" value={`${reporte.saludCrm.compliancePct}%`} />
                <KpiTile label="Confianza de datos" value={`${reporte.saludCrm.confidencePct}%`} />
                <KpiTile label="Pipeline confiable" value={reporte.saludCrm.pipelineReliableCount} />
                <KpiTile
                  label="Excluidos del embudo"
                  value={reporte.saludCrm.pipelineExcludedCount}
                />
              </div>
              {reporte.saludCrm.asesoresEnRiesgo.length > 0 ? (
                <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
                  {reporte.saludCrm.asesoresEnRiesgo.map((item) => (
                    <li
                      key={item.asesorNombre}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <span className="font-medium text-gabi-forest">{item.asesorNombre}</span>
                      <span className="text-slate-500">
                        {item.compliancePct}% · {item.overdueIssues} vencido(s)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          <header className="rounded-2xl border border-gabi-forest/10 bg-gradient-to-br from-gabi-forest to-[#1a3a32] p-6 text-white shadow-lg print:shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
                  Reporte comercial semanal
                </p>
                <h1 className="mt-1 text-2xl font-black">{desarrolloNombre}</h1>
                <div className="mt-3 flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 opacity-70" />
                  <span className="text-lg font-bold">{reporte.periodo.label}</span>
                </div>
              </div>
              <div className="text-right text-xs text-white/60">
                <p>Generado {new Date(reporte.meta.generadoAt).toLocaleString("es-MX")}</p>
                {reporte.meta.objetivosOrigen === "db" ? (
                  <p className="mt-1">Objetivos: base de datos ({reporteAnio})</p>
                ) : reporte.meta.objetivosOrigen === "seed" ? (
                  <p className="mt-1">Objetivos: valores seed ({reporteAnio})</p>
                ) : null}
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <KpiTile dark label="Afluencia" value={reporte.resumen.afluencia} />
              <KpiTile dark label="Cotizaciones" value={reporte.resumen.cotizaciones} />
              <KpiTile dark label="Citas / visitas" value={reporte.resumen.citasVisitas} />
              <KpiTile dark label="Apart. periodo" value={reporte.resumen.apartadosPeriodo} />
              <KpiTile dark label="Apartados deptos." value={reporte.resumen.apartadosDeptos} />
              <KpiTile dark label="Apartados oficinas" value={reporte.resumen.apartadosOficinas} />
              <KpiTile dark label="Apartados vigentes" value={reporte.resumen.apartadosTotal} />
            </div>
          </header>

          <div className="space-y-6">
            <SectionHeading
              n={1}
              title="Funnel comercial por segmento"
              desc="Embudo semanal desglosado por medio publicitario"
            />
            {reporte.funnels.length > 1 ? (
              <div className="no-print flex flex-wrap gap-2">
                {reporte.funnels.map((f) => (
                  <button
                    key={f.segmentoId}
                    type="button"
                    onClick={() => setFunnelActivo(f.segmentoId)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      funnelActivo === f.segmentoId
                        ? "bg-gabi-forest text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            ) : null}
            {funnel ? <FunnelPorMedioChart funnel={funnel} /> : null}
            {reporte.funnels.length > 1
              ? reporte.funnels
                  .filter((f) => f.segmentoId !== funnelActivo)
                  .map((f) => (
                    <div key={f.segmentoId} className="hidden print:block">
                      <FunnelPorMedioChart funnel={f} />
                    </div>
                  ))
              : null}
          </div>

          <div className="space-y-6">
            <SectionHeading n={2} title="Seguimiento de prospectos" />
            <SeguimientoChart items={reporte.seguimiento} />
          </div>

          <div className="space-y-6">
            <SectionHeading
              n={3}
              title="Absorción mensual"
              desc="Serie histórica de apartados, afluencia y citas"
            />
            <AbsorcionMensualChart series={reporte.absorcionMensual} />
          </div>

          <div className="space-y-6">
            <SectionHeading n={4} title="Medición de medios" />
            <MediosDonutChart medios={reporte.medios} />
          </div>

          {reporte.visitasInmobiliarias.length ? (
            <div className="space-y-4">
              <SectionHeading n={5} title="Visitas inmobiliarias" />
              <section className="overflow-hidden rounded-2xl border border-gabi-forest/10 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Inmobiliaria</th>
                        <th className="px-4 py-2 text-left">Fecha</th>
                        <th className="px-4 py-2 text-left">Prospecto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.visitasInmobiliarias.map((v, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-4 py-2 font-medium">{v.inmobiliaria}</td>
                          <td className="px-4 py-2">{v.fecha}</td>
                          <td className="px-4 py-2">{v.prospecto ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}

          {reporte.prospectosInteresados.length ? (
            <div className="space-y-4">
              <SectionHeading n={6} title="Prospectos interesados" />
              <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="py-2 pr-4">Nombre</th>
                        <th className="py-2 pr-4">Unidad</th>
                        <th className="py-2 pr-4">Tipo</th>
                        <th className="py-2 pr-4">Asesor</th>
                        <th className="py-2 pr-4">Plazo</th>
                        <th className="py-2">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporte.prospectosInteresados.map((p, index) => (
                        <tr key={`${p.nombre}-${index}`} className="border-t border-slate-100">
                          <td className="py-2 pr-4 font-semibold">{p.nombre}</td>
                          <td className="py-2 pr-4">{p.unidad ?? "—"}</td>
                          <td className="py-2 pr-4">{p.tipo ?? "—"}</td>
                          <td className="py-2 pr-4">{p.asesor ?? "—"}</td>
                          <td className="py-2 pr-4">{p.plazo ?? "—"}</td>
                          <td className="py-2 text-slate-600">{p.observaciones ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}

          <div className="border-t border-gabi-forest/10 pt-8">
            <SectionHeading
              n={7}
              title="Detalle por segmento"
              desc="Apartados, ventas, precios, ingresos e inventario"
            />

            {reporte.segmentos.length > 1 ? (
              <div className="no-print mt-4 flex flex-wrap gap-2">
                {reporte.segmentos.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setSegmentoActivo(seg.id)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      segmentoActivo === seg.id
                        ? "bg-gabi-forest text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {seg.label}
                  </button>
                ))}
              </div>
            ) : null}

            {segmento ? <div className="mt-6"><SegmentoDetalle segmento={segmento} /></div> : null}

            {reporte.segmentos.length > 1
              ? reporte.segmentos
                  .filter((s) => s.id !== segmentoActivo)
                  .map((seg) => (
                    <div key={seg.id} className="mt-8 hidden print:block">
                      <SegmentoDetalle segmento={seg} />
                    </div>
                  ))
              : null}
          </div>

          {hasSegmentedReporteSemanal(desarrolloId) ? (
            <ObjetivosComercialesEditor
              desarrolloId={desarrolloId}
              anio={reporteAnio}
              onSaved={() => void load()}
            />
          ) : null}

          <footer className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            <p>
              <strong>Fuentes:</strong> {reporte.meta.fuentes.join(", ")}.
            </p>
            <p className="mt-1">
              Medios: campaña CRM cuando existe; si no, medio publicitario del prospecto. Afluencia =
              prospectos válidos en el periodo. Apart. periodo = apartados con fecha en la semana;
              vigentes = stock actual en sembrado.
            </p>
          </footer>
        </>
      ) : null}
    </div>
  );
}

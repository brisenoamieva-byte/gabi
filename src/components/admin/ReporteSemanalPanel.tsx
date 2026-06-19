"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, Loader2, RefreshCw } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ReporteComercialSemanal, ReporteSemanalSegmento } from "@/lib/admin/reporte-semanal/types";
import { defaultWeekContaining } from "@/lib/admin/reporte-semanal/week-utils";
import { REPORTE_SEMANAL_DESARROLLOS } from "@/lib/admin/reporte-semanal/segment-config";

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

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-gabi-forest/10 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-gabi-forest">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SegmentoPanel({ segmento }: { segmento: ReporteSemanalSegmento }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-black text-gabi-forest">{segmento.label}</h3>
        <p className="text-sm text-slate-500">KPIs del periodo y estado comercial actual</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ventas semana" value={segmento.kpis.ventasSemana} />
        <KpiCard label="Apartados semana" value={segmento.kpis.apartadosSemana} />
        <KpiCard label="Apartados vigentes" value={segmento.kpis.apartadosVigentes} />
        <KpiCard label="Cancelaciones semana" value={segmento.kpis.cancelacionesSemana} />
        <KpiCard label="Ventas del mes" value={segmento.kpis.ventasMes} />
        <KpiCard label="Asignados" value={segmento.kpis.asignadosActuales} />
        <KpiCard
          label="Precio/m² real"
          value={segmento.precios.m2PromedioReal ? formatMoney(segmento.precios.m2PromedioReal) : "—"}
        />
        <KpiCard
          label="Precio/m² inventario"
          value={
            segmento.precios.m2PromedioInventario
              ? formatMoney(segmento.precios.m2PromedioInventario)
              : "—"
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Cobranza acumulada (vigentes)" value={formatMoney(segmento.ingresos.cajaSemana)} />
        <KpiCard label="Comprometidos" value={formatMoney(segmento.ingresos.comprometidos)} />
        <KpiCard label="Ventas mes ($)" value={formatMoney(segmento.ingresos.ventasMesMonto)} />
      </div>

      {segmento.absorcionPorModelo.length ? (
        <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-gabi-forest">Absorción por modelo</h4>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {segmento.absorcionPorModelo.map((item) => (
              <div
                key={item.modelo}
                className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
              >
                <p className="font-bold text-gabi-forest">{item.modelo}</p>
                <p className="text-slate-600">
                  {item.ventas} ventas · {item.apartados} apart. · {item.asignados} asign.
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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

      {segmento.matrizInventario.length ? (
        <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
          <h4 className="font-bold text-gabi-forest">Inventario disponible (lista × modelo)</h4>
          <div className="mt-4 flex flex-wrap gap-2">
            {segmento.matrizInventario.slice(0, 40).map((cell) => (
              <span
                key={`${cell.lista}-${cell.modelo}`}
                className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900"
              >
                {cell.lista} · {cell.modelo}: {cell.disponibles}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ReporteSemanalPanel({ desarrollos, scopeLabel }: Props) {
  const defaultWeek = useMemo(() => defaultWeekContaining(), []);
  const [desarrolloId, setDesarrolloId] = useState(
    () =>
      desarrollos.find((d) => REPORTE_SEMANAL_DESARROLLOS.includes(d.id as "pasaje-alamos"))?.id ??
      desarrollos[0]?.id ??
      "",
  );
  const [desde, setDesde] = useState(defaultWeek.desde);
  const [hasta, setHasta] = useState(defaultWeek.hasta);
  const [reporte, setReporte] = useState<ReporteComercialSemanal | null>(null);
  const [segmentoActivo, setSegmentoActivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setSegmentoActivo(data.reporte?.segmentos[0]?.id ?? "");
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

  if (!desarrollos.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
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
              Vista en tiempo real desde sembrado, prospectos y visitas. Pasaje Álamos incluye
              segmentos Departamentos y Oficinas como el Excel semanal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/15 px-4 py-2 text-sm font-semibold text-gabi-forest"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
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
                  {REPORTE_SEMANAL_DESARROLLOS.includes(d.id as "pasaje-alamos") ? " · completo" : ""}
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
          <div className="rounded-2xl border border-gabi-forest/10 bg-gradient-to-br from-gabi-forest to-[#1a3a32] p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <CalendarRange className="h-6 w-6 opacity-80" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                  Periodo
                </p>
                <h3 className="text-xl font-black">{reporte.periodo.label}</h3>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Afluencia (prospectos)" value={reporte.resumen.afluencia} />
              <KpiCard label="Citas / visitas" value={reporte.resumen.citasVisitas} />
              <KpiCard label="Apartados deptos." value={reporte.resumen.apartadosDeptos} />
              <KpiCard label="Apartados oficinas" value={reporte.resumen.apartadosOficinas} />
            </div>
          </div>

          {reporte.medios.length ? (
            <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-gabi-forest">Medición de medios</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4">Medio</th>
                      <th className="py-2 pr-4">Semana</th>
                      <th className="py-2 pr-4">Mes</th>
                      <th className="py-2 pr-4">Acum.</th>
                      <th className="py-2">% semana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.medios.map((medio) => (
                      <tr key={medio.medio} className="border-t border-slate-100">
                        <td className="py-2 pr-4 font-medium">{medio.medio}</td>
                        <td className="py-2 pr-4 tabular-nums">{medio.semana}</td>
                        <td className="py-2 pr-4 tabular-nums">{medio.mes}</td>
                        <td className="py-2 pr-4 tabular-nums">{medio.acumulado}</td>
                        <td className="py-2 tabular-nums">{medio.pctSemana}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {reporte.seguimiento.length ? (
            <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-gabi-forest">Resumen de seguimiento</h3>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {reporte.seguimiento.map((item) => (
                  <div key={item.estatus} className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-gabi-forest">{item.estatus}</p>
                    <p className="text-slate-600">
                      Semana {item.semana} · Mes {item.mes}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {reporte.prospectosInteresados.length ? (
            <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-gabi-forest">Prospectos interesados</h3>
              <ul className="mt-4 space-y-2 text-sm">
                {reporte.prospectosInteresados.map((p, index) => (
                  <li key={`${p.nombre}-${index}`} className="rounded-xl border border-slate-100 px-3 py-2">
                    <p className="font-semibold">{p.nombre}</p>
                    <p className="text-slate-600">
                      {[p.unidad, p.tipo, p.asesor, p.plazo].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {p.observaciones ? (
                      <p className="mt-1 text-xs text-slate-500">{p.observaciones}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {reporte.segmentos.length > 1 ? (
            <div className="flex flex-wrap gap-2">
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

          {segmento ? <SegmentoPanel segmento={segmento} /> : null}

          <p className="text-xs text-slate-400">
            Generado {new Date(reporte.meta.generadoAt).toLocaleString("es-MX")} · Fuentes:{" "}
            {reporte.meta.fuentes.join(", ")}. Objetivos e histórico mensual: próxima fase.
          </p>
        </>
      ) : null}
    </div>
  );
}

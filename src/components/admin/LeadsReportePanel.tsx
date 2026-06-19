"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Mail, MapPin, MessageCircle, Phone, Star, Users } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { LeadsEmbudoEtapa, LeadsReporte } from "@/lib/admin/leads-reporte-service";
import { downloadLeadsReporteCsv } from "@/lib/admin/leads-reporte-export";
import {
  ChartCard,
  LeadsCalificacionChart,
  LeadsCampanaChart,
  LeadsInteraccionesDonut,
  LeadsRegionChart,
  LeadsScoreDistribucionChart,
  LeadsTimeSeriesChart,
} from "@/components/admin/LeadsReporteCharts";
import { LeadsMexicoMap } from "@/components/admin/LeadsMexicoMap";
import { buildQaWebhookUrl } from "@/lib/comercial/qa-webhook-auth";
import {
  PROSPECTO_ETAPAS,
  prospectoEtapaLabel,
} from "@/lib/comercial/prospecto-etapas";
import { LeadsAnualPanel } from "@/components/admin/LeadsAnualPanel";

type LeadsReportePanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  initialDesarrolloId?: string;
};

type AsesorOption = { id: string; nombre: string };
type CampanaOption = { id: string; nombre: string };
type LeadsSubTab = "leads" | "calificaciones" | "regiones" | "interacciones" | "qa" | "anuales";
type TimeSeriesMode = "dia" | "mes";

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
};

function KpiCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        accent
          ? "border-gabi-forest/20 bg-gabi-forest text-white"
          : "border-gabi-forest/10 bg-white"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wide ${
          accent ? "text-white/70" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p className={`mt-2 text-3xl font-black tabular-nums ${accent ? "text-white" : "text-gabi-forest"}`}>
        {value}
      </p>
    </div>
  );
}

function LeadsEmbudoChart({ embudo, cotizaciones }: { embudo: LeadsEmbudoEtapa[]; cotizaciones: number }) {
  const max = Math.max(...embudo.map((item) => item.total), cotizaciones, 1);

  return (
    <div className="mt-6 space-y-3">
      {embudo.map((item) => (
        <div key={item.etapa}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-semibold text-gabi-forest">{item.label}</span>
            <span className="tabular-nums text-slate-600">
              {item.total}{" "}
              <span className="text-xs text-slate-400">({item.pctDelTotal}%)</span>
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gabi-forest transition-all"
              style={{ width: `${Math.max((item.total / max) * 100, item.total ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ))}
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-semibold text-violet-800">Cotizaciones (periodo)</span>
          <span className="tabular-nums text-slate-600">{cotizaciones}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-violet-50">
          <div
            className="h-full rounded-full bg-violet-500"
            style={{ width: `${Math.max((cotizaciones / max) * 100, cotizaciones ? 4 : 0)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function LeadsReportePanel({
  desarrollos,
  scopeLabel,
  initialDesarrolloId,
}: LeadsReportePanelProps) {
  const monthRange = useMemo(() => currentMonthRange(), []);
  const [subTab, setSubTab] = useState<LeadsSubTab>("leads");
  const [timeMode, setTimeMode] = useState<TimeSeriesMode>("dia");
  const [desarrolloId, setDesarrolloId] = useState(
    initialDesarrolloId && desarrollos.some((item) => item.id === initialDesarrolloId)
      ? initialDesarrolloId
      : (desarrollos[0]?.id ?? ""),
  );
  const [desde, setDesde] = useState(monthRange.desde);
  const [hasta, setHasta] = useState(monthRange.hasta);
  const [asesorFilter, setAsesorFilter] = useState("");
  const [campanaFilter, setCampanaFilter] = useState("");
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [campanas, setCampanas] = useState<CampanaOption[]>([]);
  const [reporte, setReporte] = useState<LeadsReporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedDesarrollo = useMemo(
    () => desarrollos.find((item) => item.id === desarrolloId),
    [desarrolloId, desarrollos],
  );

  const loadAsesores = useCallback(async () => {
    if (!desarrolloId) return;
    try {
      const params = new URLSearchParams({ desarrolloId });
      const response = await fetch(`/api/admin/asesores?${params.toString()}`);
      const data = (await response.json()) as { asesores?: AsesorOption[] };
      setAsesores(data.asesores ?? []);
    } catch {
      setAsesores([]);
    }
  }, [desarrolloId]);

  const loadCampanas = useCallback(async () => {
    if (!desarrolloId) return;
    try {
      const params = new URLSearchParams({ desarrolloId, activoOnly: "1" });
      const response = await fetch(`/api/admin/campanas?${params.toString()}`);
      const data = (await response.json()) as { campanas?: CampanaOption[] };
      setCampanas(data.campanas ?? []);
    } catch {
      setCampanas([]);
    }
  }, [desarrolloId]);

  const loadReporte = useCallback(async () => {
    if (!desarrolloId) {
      setReporte(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId, desde, hasta });
      if (asesorFilter) params.set("asesorId", asesorFilter);
      if (campanaFilter) params.set("campanaId", campanaFilter);

      const response = await fetch(`/api/admin/reportes/leads?${params.toString()}`);
      const data = (await response.json()) as { reporte?: LeadsReporte; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el reporte.");
      }

      setReporte(data.reporte ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setReporte(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, desde, hasta, asesorFilter, campanaFilter]);

  useEffect(() => {
    void loadAsesores();
    void loadCampanas();
    setAsesorFilter("");
    setCampanaFilter("");
  }, [loadAsesores, loadCampanas]);

  useEffect(() => {
    void loadReporte();
  }, [loadReporte]);

  const interaccionesDonut = useMemo(() => {
    if (!reporte) return [];
    return [
      { name: "Correo", value: reporte.interacciones.conCorreo },
      { name: "Llamada", value: reporte.interacciones.conLlamada },
      { name: "WhatsApp", value: reporte.interacciones.conWhatsapp },
      { name: "CRM", value: reporte.interacciones.conCrm },
    ];
  }, [reporte]);

  const topRegion = reporte?.porRegion[0];
  const topEstado = reporte?.porEstado.find(
    (item) => item.estadoId !== "unk" && item.estadoId !== "ext",
  );
  const avgRegion =
    reporte && reporte.porRegion.length
      ? Math.round(reporte.totalBruto / reporte.porRegion.length)
      : 0;

  if (!desarrollos.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">Reportes</p>
            <h2 className="mt-2 text-2xl font-black text-gabi-forest">Leads & marketing</h2>
            {scopeLabel ? (
              <p className="mt-2 inline-flex rounded-full bg-gabi-forest/5 px-3 py-1 text-xs font-semibold text-gabi-forest">
                Alcance: {scopeLabel}
              </p>
            ) : null}
            <p className="mt-3 max-w-3xl text-sm text-slate-500">
              Paridad con Xperience: volumen, campañas, calificaciones, regiones e interacciones —
              más embudo comercial y cotizaciones integradas.
            </p>
          </div>
          {reporte && selectedDesarrollo ? (
            <button
              type="button"
              onClick={() =>
                downloadLeadsReporteCsv(reporte, {
                  desarrollo: selectedDesarrollo.nombre,
                  desde,
                  hasta,
                })
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest hover:bg-gabi-forest/5"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          {(
            [
              { id: "leads" as const, label: "Leads" },
              { id: "calificaciones" as const, label: "Calificaciones" },
              { id: "regiones" as const, label: "Regiones" },
              { id: "interacciones" as const, label: "Interacciones" },
              { id: "qa" as const, label: "QA / Satisfacción" },
              { id: "anuales" as const, label: "Anuales" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSubTab(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                subTab === item.id
                  ? "bg-gabi-forest text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-[200px] text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block min-w-[180px] text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Asesor</span>
            <select
              value={asesorFilter}
              onChange={(event) => setAsesorFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todos</option>
              {asesores.map((asesor) => (
                <option key={asesor.id} value={asesor.id}>
                  {asesor.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[180px] text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Campaña</span>
            <select
              value={campanaFilter}
              onChange={(event) => setCampanaFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todas</option>
              {campanas.map((campana) => (
                <option key={campana.id} value={campana.id}>
                  {campana.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadReporte()}
            className="rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white"
          >
            Aplicar
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-gabi-forest/10 bg-white p-12 text-gabi-forest">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Cargando reporte…</span>
        </div>
      ) : reporte ? (
        <>
          {subTab === "leads" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard label="Leads totales" value={reporte.totalBruto} accent />
                <KpiCard label="Leads válidos" value={reporte.total} />
                <KpiCard label="Spam" value={reporte.spam} />
                <KpiCard label="Duplicados" value={reporte.duplicados} />
                <KpiCard label="Dup. marcados spam" value={reporte.duplicadosSpam} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <KpiCard label="Cotizaciones (periodo)" value={reporte.cotizaciones} />
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {selectedDesarrollo?.nombre}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Periodo {desde} → {hasta}. Válidos excluyen spam y duplicados.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <ChartCard
                  title="Leads en el tiempo"
                  subtitle="Válidos + duplicados apilados (como Xperience)"
                >
                  <div className="flex h-full flex-col">
                    <div className="mb-3 flex gap-2">
                      {(["dia", "mes"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTimeMode(mode)}
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${
                            timeMode === mode
                              ? "bg-gabi-forest text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {mode === "dia" ? "Por día" : "Por mes"}
                        </button>
                      ))}
                    </div>
                    <div className="min-h-0 flex-1">
                      <LeadsTimeSeriesChart
                        series={timeMode === "dia" ? reporte.porDia : reporte.porMes}
                        mode={timeMode}
                      />
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="Campañas" subtitle="Volumen por campaña de captación">
                  <LeadsCampanaChart campanas={reporte.porCampana} />
                </ChartCard>
              </div>

              <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-gabi-forest">Embudo comercial</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Distribución de leads válidos — ventaja sobre Xperience.
                </p>
                <LeadsEmbudoChart embudo={reporte.embudo} cotizaciones={reporte.cotizaciones} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-gabi-forest">Por etapa</h3>
                  <div className="mt-4 space-y-2">
                    {PROSPECTO_ETAPAS.filter((etapa) => (reporte.porEtapa[etapa] ?? 0) > 0).map(
                      (etapa) => (
                        <div
                          key={etapa}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <span className="text-sm font-semibold text-gabi-forest">
                            {prospectoEtapaLabel[etapa]}
                          </span>
                          <span className="text-sm font-bold text-gabi-sand">
                            {reporte.porEtapa[etapa]}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-gabi-forest">Por asesor</h3>
                  {reporte.porAsesor.length ? (
                    <div className="mt-4 space-y-2">
                      {reporte.porAsesor.map((item) => (
                        <div
                          key={item.asesorId ?? "sin-asesor"}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <span className="text-sm font-semibold text-gabi-forest">
                            {item.asesorNombre}
                          </span>
                          <span className="text-sm font-bold text-gabi-sand">{item.total}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Sin leads en el periodo.</p>
                  )}
                </div>
              </div>
            </>
          ) : null}

          {subTab === "calificaciones" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard label="Leads totales" value={reporte.calificacion.total} accent />
                <KpiCard label="Calificados" value={reporte.calificacion.calificados} />
                <KpiCard label="No calificados" value={reporte.calificacion.noCalificados} />
              </div>

              <ChartCard title="Calificaciones" subtitle="Distribución por estatus comercial">
                <LeadsCalificacionChart porCalificacion={reporte.porCalificacion} />
              </ChartCard>

              <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-gabi-forest">Por interés</h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Object.entries(reporte.porInteres)
                    .sort((a, b) => b[1] - a[1])
                    .map(([interes, total]) => (
                      <div
                        key={interes}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <span className="text-sm font-semibold text-gabi-forest">{interes}</span>
                        <span className="text-sm font-bold text-gabi-sand">{total}</span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          ) : null}

          {subTab === "regiones" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <KpiCard label="Total leads" value={reporte.totalBruto} accent />
                <KpiCard label="Promedio por región" value={avgRegion} />
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Estado con más leads
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-xl font-black text-gabi-forest">
                    <MapPin className="h-5 w-5 shrink-0 text-gabi-sand" />
                    {topEstado?.estadoNombre ?? topRegion?.region ?? "—"}
                  </p>
                  {(topEstado ?? topRegion) ? (
                    <p className="mt-1 text-sm text-slate-500">
                      {(topEstado ?? topRegion)?.total} leads
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-gabi-forest">Mapa de México</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Origen geográfico normalizado desde origen_ciudad (paridad Xperience)
                </p>
                <div className="mt-4">
                  <LeadsMexicoMap estados={reporte.porEstado} />
                </div>
              </div>

              <ChartCard
                title="Leads por región"
                subtitle="Desde origen_ciudad (visita o import Xperience)"
              >
                <LeadsRegionChart regiones={reporte.porRegion} />
              </ChartCard>

              <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-black text-gabi-forest">Detalle por estado</h3>
                <div className="mt-4 space-y-2">
                  {reporte.porEstado.map((item) => (
                    <div
                      key={item.estadoId}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-gabi-forest">
                        {item.estadoNombre}
                      </span>
                      <span className="text-sm font-bold text-gabi-sand">{item.total}</span>
                    </div>
                  ))}
                  {!reporte.porEstado.length ? (
                    <p className="text-sm text-slate-500">Sin datos de región en el periodo.</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {subTab === "qa" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Star className="h-4 w-4" />
                    <p className="text-xs font-bold uppercase">Encuestas QA</p>
                  </div>
                  <p className="mt-2 text-3xl font-black text-gabi-forest">
                    {reporte.qa.qaRespondidas}
                  </p>
                  <p className="text-xs text-slate-400">
                    Promedio{" "}
                    {reporte.qa.promedioQa != null ? `${reporte.qa.promedioQa}/10` : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Star className="h-4 w-4 text-amber-500" />
                    <p className="text-xs font-bold uppercase">Satisfacción</p>
                  </div>
                  <p className="mt-2 text-3xl font-black text-gabi-forest">
                    {reporte.qa.satisfaccionRespondidas}
                  </p>
                  <p className="text-xs text-slate-400">
                    Promedio{" "}
                    {reporte.qa.promedioSatisfaccion != null
                      ? `${reporte.qa.promedioSatisfaccion}/10`
                      : "—"}
                  </p>
                </div>
                <KpiCard label="Total respuestas" value={reporte.qa.totalEncuestas} />
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Canal principal
                  </p>
                  <p className="mt-2 text-xl font-black capitalize text-gabi-forest">
                    {Object.entries(reporte.qa.porCanal).sort((a, b) => b[1] - a[1])[0]?.[0] ??
                      "—"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">WhatsApp / ADRYO</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Distribución QA" subtitle="Escala 0–10 por rangos">
                  <LeadsScoreDistribucionChart
                    distribucion={reporte.qa.distribucionQa}
                    emptyLabel="Sin encuestas QA en el periodo."
                  />
                </ChartCard>
                <ChartCard title="Distribución satisfacción" subtitle="Post-atención / cierre">
                  <LeadsScoreDistribucionChart
                    distribucion={reporte.qa.distribucionSatisfaccion}
                    emptyLabel="Sin encuestas de satisfacción en el periodo."
                  />
                </ChartCard>
              </div>

              <ChartCard title="Respuestas por canal" subtitle="QA + satisfacción">
                <LeadsInteraccionesDonut
                  items={Object.entries(reporte.qa.porCanal).map(([name, value]) => ({
                    name: name.charAt(0).toUpperCase() + name.slice(1),
                    value,
                  }))}
                />
              </ChartCard>

              <div className="rounded-2xl border border-gabi-forest/10 bg-slate-50 p-5 text-sm text-slate-700">
                <p className="font-semibold text-gabi-forest">Integración ADRYO / WhatsApp</p>
                <p className="mt-2">
                  Configura ADRYO para enviar POST al webhook con{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">xperienceId</code> o{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">prospectoId</code>,{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">tipo</code> (
                  <code className="text-xs">qa</code> |{" "}
                  <code className="text-xs">satisfaccion</code>) y{" "}
                  <code className="rounded bg-white px-1 py-0.5 text-xs">score</code> (0–10).
                </p>
                <p className="mt-3 break-all font-mono text-xs text-slate-500">
                  {buildQaWebhookUrl()}
                </p>
              </div>
            </>
          ) : null}

          {subTab === "anuales" && selectedDesarrollo ? (
            <LeadsAnualPanel
              desarrolloId={desarrolloId}
              desarrolloNombre={selectedDesarrollo.nombre}
            />
          ) : null}

          {subTab === "interacciones" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="h-4 w-4" />
                    <p className="text-xs font-bold uppercase">Correo</p>
                  </div>
                  <p className="mt-2 text-3xl font-black text-gabi-forest">
                    {reporte.interacciones.conCorreo}
                  </p>
                  <p className="text-xs text-slate-400">
                    {reporte.interacciones.totalCorreo} eventos
                  </p>
                </div>
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="h-4 w-4" />
                    <p className="text-xs font-bold uppercase">Llamadas</p>
                  </div>
                  <p className="mt-2 text-3xl font-black text-gabi-forest">
                    {reporte.interacciones.conLlamada}
                  </p>
                  <p className="text-xs text-slate-400">
                    {reporte.interacciones.totalLlamada} eventos
                  </p>
                </div>
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MessageCircle className="h-4 w-4" />
                    <p className="text-xs font-bold uppercase">WhatsApp</p>
                  </div>
                  <p className="mt-2 text-3xl font-black text-gabi-forest">
                    {reporte.interacciones.conWhatsapp}
                  </p>
                  <p className="text-xs text-slate-400">
                    {reporte.interacciones.totalWhatsapp} eventos
                  </p>
                </div>
                <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Users className="h-4 w-4" />
                    <p className="text-xs font-bold uppercase">CRM</p>
                  </div>
                  <p className="mt-2 text-3xl font-black text-gabi-forest">
                    {reporte.interacciones.conCrm}
                  </p>
                  <p className="text-xs text-slate-400">leads con actividad CRM</p>
                </div>
              </div>

              <ChartCard
                title="Leads con interacción"
                subtitle="Banderas importadas de Xperience (bandera_correo, llamada, whatsapp)"
              >
                <LeadsInteraccionesDonut items={interaccionesDonut} />
              </ChartCard>

              <div className="rounded-2xl border border-gabi-forest/10 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-gabi-forest">Interacciones</p>
                <p className="mt-1">
                  Banderas sincronizadas desde import Xperience. Encuestas QA y satisfacción están
                  en la pestaña dedicada (webhook ADRYO).
                </p>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

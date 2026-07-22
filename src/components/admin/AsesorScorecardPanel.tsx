"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Download,
  Loader2,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import {
  ASESOR_SCORE_MIN_SAMPLE,
  ASESOR_SCORE_WEIGHTS,
  ASESOR_SCORE_VERSION,
  asesorScoreBandLabel,
  defaultScorecardPeriod,
  filterScorecardByAsesor,
  formatSpeedMinutesLabel,
  type AsesorScoreBand,
  type DesarrolloAsesorScorecardReport,
} from "@/lib/comercial/asesor-scorecard-shared";

type Props = {
  desarrolloId: string | null;
  asesorId?: string | null;
  onSelectAsesor?: (asesorId: string) => void;
};

const bandStyles: Record<AsesorScoreBand, string> = {
  elite: "bg-emerald-600 text-white",
  solido: "bg-sky-600 text-white",
  riesgo: "bg-amber-500 text-white",
  critico: "bg-red-600 text-white",
  insuficiente: "bg-slate-400 text-white",
};

const pctLabel = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${value}%`;

const scoreLabel = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : String(value);

export function AsesorScorecardPanel({ desarrolloId, asesorId, onSelectAsesor }: Props) {
  const defaults = useMemo(() => defaultScorecardPeriod(), []);
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [report, setReport] = useState<DesarrolloAsesorScorecardReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const periodInvalid = Boolean(desde && hasta && desde > hasta);

  const load = useCallback(async () => {
    if (!desarrolloId || periodInvalid) {
      if (!desarrolloId) setReport(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        desarrolloId,
        desde,
        hasta,
      });
      const response = await fetch(`/api/admin/crm-compliance/scorecard?${params}`);
      const data = (await response.json()) as {
        report?: DesarrolloAsesorScorecardReport;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el scorecard.");
      }

      setReport(data.report ?? null);
    } catch (loadError) {
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, desde, hasta, periodInvalid]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (report ? filterScorecardByAsesor(report, asesorId) : null),
    [asesorId, report],
  );

  const exportCsv = () => {
    if (!desarrolloId || periodInvalid) return;
    const params = new URLSearchParams({ desarrolloId, desde, hasta });
    window.open(`/api/admin/crm-compliance/scorecard/export?${params}`, "_blank");
  };

  if (!desarrolloId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
        Selecciona un desarrollo para ver el scorecard.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gabi-cream-dark bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Trophy className="mt-0.5 h-5 w-5 text-gabi-sand" />
            <div>
              <h2 className="text-sm font-bold text-gabi-forest">Desempeño de asesores</h2>
              <p className="mt-1 max-w-2xl text-xs text-slate-500">
                Score 0–100 (v{ASESOR_SCORE_VERSION}): contacto{" "}
                {Math.round(ASESOR_SCORE_WEIGHTS.contact * 100)}% · speed-to-lead{" "}
                {Math.round(ASESOR_SCORE_WEIGHTS.speed * 100)}% · funnel{" "}
                {Math.round(ASESOR_SCORE_WEIGHTS.funnel * 100)}% · playbook{" "}
                {Math.round(ASESOR_SCORE_WEIGHTS.compliance * 100)}% · cadencia{" "}
                {Math.round(ASESOR_SCORE_WEIGHTS.cadencia * 100)}% · activity score{" "}
                {Math.round(ASESOR_SCORE_WEIGHTS.quality * 100)}%. Spam/duplicados fuera. Si
                falta un componente, se redistribuyen pesos. Mín. {ASESOR_SCORE_MIN_SAMPLE}{" "}
                leads para bandear.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || periodInvalid || !report}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-cream-dark bg-white px-4 py-2 text-sm font-semibold text-gabi-forest transition hover:bg-gabi-cream disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || periodInvalid}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-cream-dark bg-white px-4 py-2 text-sm font-semibold text-gabi-forest transition hover:bg-gabi-cream disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20"
            />
          </label>
          <div className="flex items-end">
            <p className="text-xs text-slate-500">
              Periodo por fecha de alta. Playbook y cadencia usan cartera viva actual.
            </p>
          </div>
        </div>

        {periodInvalid ? (
          <p className="mt-3 text-xs font-semibold text-red-700">
            La fecha desde no puede ser posterior a hasta.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          {(
            [
              ["elite", "≥80"],
              ["solido", "65–79"],
              ["riesgo", "50–64"],
              ["critico", "<50"],
              ["insuficiente", `<${ASESOR_SCORE_MIN_SAMPLE} leads`],
            ] as const
          ).map(([band, range]) => (
            <span
              key={band}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${bandStyles[band]}`}
            >
              {asesorScoreBandLabel[band]}
              <span className="opacity-80">{range}</span>
            </span>
          ))}
        </div>
      </section>

      {loading && !filtered ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gabi-cream-dark bg-white p-6 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-gabi-sand" />
          Calculando scorecard…
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {filtered ? (
        <>
          {filtered.kpis.unassignedLeads > 0 && !asesorId ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {filtered.kpis.unassignedLeads} lead(s) sin asesor en el periodo — no entran al
              ranking pero sí a los KPIs del desarrollo.
            </div>
          ) : null}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <KpiCard
              label="Leads del periodo"
              value={String(filtered.kpis.totalLeads)}
              hint={
                asesorId
                  ? "Asignados al asesor"
                  : `${filtered.kpis.assignedLeads} asignados · ${filtered.kpis.unassignedLeads} sin asesor`
              }
            />
            <KpiCard
              label="% en contacto"
              value={pctLabel(filtered.kpis.contactRatePct)}
              hint="Etapa contactado o superior"
            />
            <KpiCard
              label="Speed-to-lead (mediana)"
              value={formatSpeedMinutesLabel(filtered.kpis.speed.medianMinutes)}
              hint={`${pctLabel(filtered.kpis.speed.pctUnder60Min)} en <60 min · cobertura ${pctLabel(filtered.kpis.speed.coveragePct)}`}
            />
            <KpiCard
              label="% funnel (cita+)"
              value={pctLabel(filtered.kpis.funnelRatePct)}
              hint="Cita, visita, apartado o vendido"
            />
            <KpiCard
              label="% aún nuevo"
              value={pctLabel(filtered.kpis.nuevoRatePct)}
              hint="Leads sin avanzar de etapa"
            />
            <KpiCard
              label="Activity score prom."
              value={scoreLabel(filtered.kpis.avgActivityScore)}
              hint={`Calidad del AsesorScore · techo ${filtered.activityScoreReferenceMax}`}
            />
            <KpiCard
              label="Perfil A/B/C"
              value={`${filtered.kpis.perfilAbc.a}/${filtered.kpis.perfilAbc.b}/${filtered.kpis.perfilAbc.c}`}
              hint={`${pctLabel(filtered.kpis.perfilAbc.perfiladosPct)} perfilados · ${filtered.kpis.perfilAbc.sin} sin`}
            />
            <KpiCard
              label="iScore (legacy)"
              value={scoreLabel(filtered.kpis.avgIscore)}
              hint={`${pctLabel(filtered.kpis.discardRatePct)} descartados`}
            />
            <KpiCard
              label="Speed score"
              value={pctLabel(filtered.kpis.speed.speedScorePct)}
              hint={`${pctLabel(filtered.kpis.speed.pctUnder5Min)} en <5 min (élite)`}
            />
            <KpiCard
              label="Score equipo*"
              value={scoreLabel(filtered.kpis.avgScoreReliable)}
              hint={`*Solo asesores con ≥${ASESOR_SCORE_MIN_SAMPLE} leads`}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-gabi-cream-dark bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gabi-cream-dark px-4 py-3">
              <Users className="h-4 w-4 text-gabi-sand" />
              <h3 className="text-sm font-bold text-gabi-forest">Ranking por AsesorScore</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Asesor</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Banda</th>
                    <th className="px-3 py-2">Asignados</th>
                    <th className="px-3 py-2">Carga</th>
                    <th className="px-3 py-2">Contacto</th>
                    <th className="px-3 py-2">Speed</th>
                    <th className="px-3 py-2">&lt;60 min</th>
                    <th className="px-3 py-2">Funnel</th>
                    <th className="px-3 py-2">Nuevo</th>
                    <th className="px-3 py-2">Descarte</th>
                    <th className="px-3 py-2">Playbook</th>
                    <th className="px-3 py-2">Cadencia</th>
                    <th className="px-3 py-2">Activity</th>
                    <th className="px-3 py-2">A/B/C</th>
                    <th className="px-3 py-2">iScore</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.asesores.length === 0 ? (
                    <tr>
                      <td colSpan={17} className="px-4 py-8 text-center text-slate-500">
                        Sin asesores con leads en este periodo.
                      </td>
                    </tr>
                  ) : (
                    filtered.asesores.map((row, index) => {
                      const vsTeam =
                        report?.kpis.avgScoreReliable != null && row.sampleReliable
                          ? row.score - report.kpis.avgScoreReliable
                          : null;
                      return (
                        <tr
                          key={row.asesorId}
                          className="border-t border-slate-100 hover:bg-gabi-cream/40"
                        >
                          <td className="px-3 py-2.5 text-slate-400">{index + 1}</td>
                          <td className="px-3 py-2.5">
                            {onSelectAsesor ? (
                              <button
                                type="button"
                                onClick={() => onSelectAsesor(row.asesorId)}
                                className="font-semibold text-gabi-forest hover:underline"
                              >
                                {row.asesorNombre}
                              </button>
                            ) : (
                              <span className="font-semibold text-gabi-forest">
                                {row.asesorNombre}
                              </span>
                            )}
                            {vsTeam !== null ? (
                              <p className="text-[10px] text-slate-500">
                                {vsTeam >= 0 ? "+" : ""}
                                {vsTeam} vs equipo
                              </p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 font-black tabular-nums text-gabi-forest">
                            {row.score}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${bandStyles[row.band]}`}
                            >
                              {asesorScoreBandLabel[row.band]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{row.assignedCount}</td>
                          <td className="px-3 py-2.5 tabular-nums">{pctLabel(row.loadSharePct)}</td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {pctLabel(row.contactRatePct)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {formatSpeedMinutesLabel(row.speedMedianMinutes)}
                            {row.speedCoveragePct < 100 && row.assignedCount > 0 ? (
                              <span className="ml-1 text-[10px] text-slate-400">
                                ({row.speedCoveragePct}%)
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {pctLabel(row.speedUnder60Pct)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {pctLabel(row.funnelRatePct)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{row.nuevoCount}</td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {pctLabel(row.discardRatePct)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {pctLabel(row.compliancePct)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {pctLabel(row.cadenciaHealthPct)}
                            {row.overdueCadencia > 0 ? (
                              <span className="ml-1 text-[10px] text-amber-700">
                                ({row.overdueCadencia} venc.)
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">
                            {scoreLabel(row.avgActivityScore)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-[11px] text-slate-600">
                            {row.perfilAbc.a}/{row.perfilAbc.b}/{row.perfilAbc.c}
                            {row.perfilAbc.sin > 0 ? (
                              <span className="text-slate-400"> ·{row.perfilAbc.sin}</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-400">
                            {scoreLabel(row.avgIscore)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {!asesorId ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="overflow-hidden rounded-2xl border border-gabi-cream-dark bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gabi-cream-dark px-4 py-3">
                  <BarChart3 className="h-4 w-4 text-gabi-sand" />
                  <h3 className="text-sm font-bold text-gabi-forest">Eficiencia por canal</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Canal</th>
                        <th className="px-3 py-2">Leads</th>
                        <th className="px-3 py-2">Contacto</th>
                        <th className="px-3 py-2">Funnel</th>
                        <th className="px-3 py-2">Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.canales.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                            Sin leads en el periodo.
                          </td>
                        </tr>
                      ) : (
                        filtered.canales.map((row) => (
                          <tr key={row.canal} className="border-t border-slate-100">
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {row.canal}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{row.leads}</td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {pctLabel(row.contactRatePct)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {pctLabel(row.funnelRatePct)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {scoreLabel(row.avgActivityScore)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-gabi-cream-dark bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-gabi-cream-dark px-4 py-3">
                  <BarChart3 className="h-4 w-4 text-gabi-sand" />
                  <h3 className="text-sm font-bold text-gabi-forest">Top campañas</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Campaña</th>
                        <th className="px-3 py-2">Canal</th>
                        <th className="px-3 py-2">Leads</th>
                        <th className="px-3 py-2">Contacto</th>
                        <th className="px-3 py-2">Funnel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.campanas.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                            Sin campañas en el periodo.
                          </td>
                        </tr>
                      ) : (
                        filtered.campanas.map((row) => (
                          <tr
                            key={row.campanaId ?? row.campanaNombre}
                            className="border-t border-slate-100"
                          >
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {row.campanaNombre}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{row.canal}</td>
                            <td className="px-3 py-2.5 tabular-nums">{row.leads}</td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {pctLabel(row.contactRatePct)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {pctLabel(row.funnelRatePct)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-gabi-cream-dark bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-gabi-forest">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

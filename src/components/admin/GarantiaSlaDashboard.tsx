"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { GarantiaSlaReport, SlaStatus } from "@/lib/comercial/garantia-sla";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";

type Props = {
  report: GarantiaSlaReport | null;
  loading: boolean;
  error: string;
  desarrolloId: string | null;
  canOpenLeads: boolean;
  onRefresh: () => void;
  onOpenConfig?: () => void;
  canConfigurePlaybook?: boolean;
};

const sealStyles: Record<
  GarantiaSlaReport["seal"],
  { wrap: string; badge: string; icon: typeof ShieldCheck }
> = {
  verde: {
    wrap: "border-emerald-200 bg-emerald-50/80",
    badge: "bg-emerald-600 text-white",
    icon: CheckCircle2,
  },
  riesgo: {
    wrap: "border-amber-200 bg-amber-50/80",
    badge: "bg-amber-600 text-white",
    icon: AlertTriangle,
  },
  rojo: {
    wrap: "border-red-200 bg-red-50/80",
    badge: "bg-red-700 text-white",
    icon: AlertTriangle,
  },
  inactivo: {
    wrap: "border-slate-200 bg-slate-50",
    badge: "bg-slate-500 text-white",
    icon: ShieldCheck,
  },
};

const statusStyles: Record<SlaStatus, string> = {
  met: "border-emerald-100 bg-emerald-50/70 text-emerald-900",
  at_risk: "border-amber-100 bg-amber-50/70 text-amber-900",
  breached: "border-red-100 bg-red-50/70 text-red-900",
  unavailable: "border-slate-100 bg-slate-50 text-slate-600",
};

const statusLabel: Record<SlaStatus, string> = {
  met: "Cumple",
  at_risk: "En riesgo",
  breached: "Incumplido",
  unavailable: "N/A",
};

export function GarantiaSlaDashboard({
  report,
  loading,
  error,
  desarrolloId,
  canOpenLeads,
  onRefresh,
  onOpenConfig,
  canConfigurePlaybook,
}: Props) {
  const SealIcon = report ? sealStyles[report.seal].icon : ShieldCheck;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Producto comercial
          </p>
          <h2 className="mt-1 text-lg font-black text-gabi-ink">Garantía de seguimiento</h2>
          <p className="mt-1 max-w-2xl text-sm text-gabi-sand">
            SLA que puedes mostrar al dueño del desarrollo: el CRM no solo existe — se cumple.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || !desarrolloId}
          className="inline-flex items-center gap-2 rounded-xl border border-gabi-cream-dark bg-white px-4 py-2 text-sm font-semibold text-gabi-ink disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading && !report ? (
        <div className="flex items-center gap-2 text-sm text-gabi-sand">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando garantía SLA…
        </div>
      ) : null}

      {report ? (
        <>
          <section
            className={`rounded-2xl border p-5 shadow-sm ${sealStyles[report.seal].wrap}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <SealIcon className="mt-0.5 h-8 w-8 shrink-0 text-gabi-forest" />
                <div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${sealStyles[report.seal].badge}`}
                  >
                    {report.sealLabel}
                  </span>
                  <p className="mt-2 max-w-xl text-sm font-medium text-gabi-ink">
                    {report.sealMessage}
                  </p>
                  {report.playbookEnabled ? (
                    <p className="mt-2 text-xs text-gabi-sand">
                      Score de garantía:{" "}
                      <span className="font-black tabular-nums text-gabi-ink">
                        {report.garantiaScorePct}%
                      </span>{" "}
                      · {report.compliance.activeLeads} leads activos en playbook
                    </p>
                  ) : null}
                </div>
              </div>
              {report.playbookEnabled ? (
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gabi-sand">
                    Score
                  </p>
                  <p className="text-4xl font-black tabular-nums text-gabi-ink">
                    {report.garantiaScorePct}
                    <span className="text-lg">%</span>
                  </p>
                </div>
              ) : null}
            </div>

            {!report.playbookEnabled && canConfigurePlaybook && onOpenConfig ? (
              <button
                type="button"
                onClick={onOpenConfig}
                className="mt-4 text-sm font-bold text-[#201044] underline-offset-2 hover:underline"
              >
                Activar playbook en Configurar pasos →
              </button>
            ) : null}
          </section>

          {report.playbookEnabled ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {report.checks.map((check) => (
                  <article
                    key={check.id}
                    className={`rounded-2xl border p-4 shadow-sm ${statusStyles[check.status]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 shrink-0 opacity-70" />
                        <h3 className="text-sm font-black">{check.label}</h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        {statusLabel[check.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs opacity-80">{check.promise}</p>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                          Actual
                        </p>
                        <p className="text-2xl font-black tabular-nums">{check.actualLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-60">
                          Meta
                        </p>
                        <p className="text-sm font-bold tabular-nums">{check.targetLabel}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] opacity-70">{check.detail}</p>
                  </article>
                ))}
              </div>

              {report.cadencia ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    icon={Clock}
                    label="Toques hoy"
                    value={String(report.cadencia.dueTodayTotal)}
                  />
                  <MiniStat
                    icon={AlertTriangle}
                    label="Cadencia vencida"
                    value={String(report.cadencia.overdueTouchesTotal)}
                    alert={report.cadencia.overdueTouchesTotal > 0}
                  />
                  <MiniStat
                    icon={CheckCircle2}
                    label="Tasa respuesta cadencia"
                    value={`${report.cadencia.responseRatePct}%`}
                  />
                </div>
              ) : null}

              <section className="rounded-2xl border border-gabi-cream-dark bg-white shadow-sm">
                <div className="border-b border-gabi-cream-dark px-5 py-4">
                  <h3 className="text-sm font-bold text-gabi-ink">Ranking asesores (garantía)</h3>
                  <p className="text-xs text-gabi-sand">
                    Ordenado del más crítico al más sano — base para coaching de gerencia
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gabi-cream-dark text-left text-xs uppercase tracking-wide text-gabi-sand">
                        <th className="px-5 py-3">Asesor</th>
                        <th className="px-5 py-3">Cumplimiento</th>
                        <th className="px-5 py-3">Confianza</th>
                        <th className="px-5 py-3">Activos</th>
                        <th className="px-5 py-3">Vencidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.asesores.map((row) => (
                        <tr key={row.asesorId} className="border-b border-gabi-cream-dark/70">
                          <td className="px-5 py-3 font-medium">{row.asesorNombre}</td>
                          <td className="px-5 py-3">
                            <PctBadge pct={row.compliancePct} />
                          </td>
                          <td className="px-5 py-3 tabular-nums">{row.confidencePct}%</td>
                          <td className="px-5 py-3 tabular-nums">{row.activeLeads}</td>
                          <td className="px-5 py-3 tabular-nums text-red-700">
                            {row.overdueIssues}
                          </td>
                        </tr>
                      ))}
                      {!report.asesores.length ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-6 text-center text-gabi-sand">
                            Sin asesores con leads activos.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl border border-gabi-cream-dark bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gabi-cream-dark px-5 py-4">
                  <div>
                    <h3 className="text-sm font-bold text-gabi-ink">Excepciones a cerrar hoy</h3>
                    <p className="text-xs text-gabi-sand">
                      Leads que rompen o amenazan la garantía
                    </p>
                  </div>
                  {canOpenLeads && desarrolloId ? (
                    <Link
                      href={`/admin/leads?desarrolloId=${encodeURIComponent(desarrolloId)}`}
                      className="text-sm font-semibold text-[#201044] hover:underline"
                    >
                      Abrir leads
                    </Link>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gabi-cream-dark text-left text-xs uppercase tracking-wide text-gabi-sand">
                        <th className="px-5 py-3">Prospecto</th>
                        <th className="px-5 py-3">Asesor</th>
                        <th className="px-5 py-3">Etapa</th>
                        <th className="px-5 py-3">Problema</th>
                        <th className="px-5 py-3">Confianza</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.topExceptions.map((row) => {
                        const issue = row.issues[0];
                        return (
                          <tr key={row.prospectoId} className="border-b border-gabi-cream-dark/70">
                            <td className="px-5 py-3 font-medium">{row.nombre}</td>
                            <td className="px-5 py-3">{row.asesorNombre ?? "—"}</td>
                            <td className="px-5 py-3">{prospectoEtapaLabel[row.etapa]}</td>
                            <td className="px-5 py-3">
                              {issue?.status === "overdue" ? (
                                <span className="text-red-700">
                                  Vencido: {issue.stepLabel}
                                  {issue.hoursOverdue > 0
                                    ? ` (${Math.round(issue.hoursOverdue)}h)`
                                    : ""}
                                </span>
                              ) : (
                                <span className="text-amber-700">
                                  Pendiente: {issue?.stepLabel ?? "—"}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 tabular-nums">{row.confidencePct}%</td>
                          </tr>
                        );
                      })}
                      {!report.topExceptions.length ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-8 text-center">
                            <span className="inline-flex items-center gap-2 text-emerald-700">
                              <CheckCircle2 className="h-4 w-4" />
                              Sin excepciones — garantía limpia
                            </span>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </section>

              <p className="text-xs text-gabi-sand">
                Compromisos SLA Gabi · actualizado{" "}
                {new Date(report.generatedAt).toLocaleString("es-MX")}. Usa esta vista en demos y
                reportes al desarrollador.
              </p>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        alert ? "border-red-200" : "border-gabi-cream-dark"
      }`}
    >
      <div className="flex items-center gap-2 text-gabi-sand">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p
        className={`mt-1 text-2xl font-black tabular-nums ${
          alert ? "text-red-700" : "text-gabi-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PctBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 95 ? "bg-emerald-100 text-emerald-800" : pct >= 85 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${tone}`}>
      {pct}%
    </span>
  );
}

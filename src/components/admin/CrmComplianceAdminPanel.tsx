"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type CrmComplianceAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

const pilotDesarrollos = (desarrollos: Desarrollo[]) => desarrollos;

export function CrmComplianceAdminPanel({
  desarrollos,
  scopeLabel,
}: CrmComplianceAdminPanelProps) {
  const options = pilotDesarrollos(desarrollos);
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(options);
  const [report, setReport] = useState<DesarrolloComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!desarrolloId) {
      setReport(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/crm-compliance?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as {
        report?: DesarrolloComplianceReport;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar salud CRM.");
      }

      setReport(data.report ?? null);
    } catch (loadError) {
      setReport(null);
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  const healthTone = useMemo(() => {
    if (!report?.playbookEnabled) {
      return "neutral";
    }
    if (report.compliancePct >= 85 && report.confidencePct >= 80) {
      return "good";
    }
    if (report.compliancePct >= 70) {
      return "warn";
    }
    return "bad";
  }, [report]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Cumplimiento
          </p>
          <h1 className="text-2xl font-black tracking-tight text-gabi-ink">Salud CRM</h1>
          <p className="mt-1 max-w-2xl text-sm text-gabi-sand">
            Auditoría automática del playbook: pasos vencidos, datos incompletos y leads excluidos
            del embudo confiable.
            {scopeLabel ? ` · ${scopeLabel}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !desarrolloId}
          className="inline-flex items-center gap-2 rounded-xl border border-gabi-cream-dark bg-white px-4 py-2 text-sm font-semibold text-gabi-ink transition hover:bg-gabi-cream disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {options.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
          No hay desarrollos piloto con playbook CRM en tu alcance.
        </div>
      ) : (
        <div className="rounded-2xl border border-gabi-cream-dark bg-white p-4 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wide text-gabi-sand">
            Desarrollo
          </label>
          <select
            value={desarrolloId ?? ""}
            onChange={(event) => setDesarrolloId(event.target.value)}
            className="mt-2 w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#201044] focus:outline-none focus:ring-2 focus:ring-[#201044]/15"
          >
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading && !report ? (
        <div className="flex items-center gap-2 text-sm text-gabi-sand">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando cumplimiento…
        </div>
      ) : null}

      {report?.playbookEnabled ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Cumplimiento"
              value={`${report.compliancePct}%`}
              hint={`${report.compliantLeads}/${report.activeLeads} leads sin vencidos`}
              tone={healthTone}
            />
            <MetricCard
              label="Confianza de datos"
              value={`${report.confidencePct}%`}
              hint="Contacto + playbook al día"
            />
            <MetricCard
              label="Pipeline confiable"
              value={String(report.pipelineReliableCount)}
              hint={`${report.pipelineExcludedCount} excluidos del embudo`}
            />
            <MetricCard
              label="Excepciones"
              value={String(report.exceptionCount)}
              hint={`${report.overdueCount} paso(s) vencido(s)`}
              tone={report.overdueCount > 0 ? "bad" : "good"}
            />
          </div>

          <section className="rounded-2xl border border-gabi-cream-dark bg-white shadow-sm">
            <div className="border-b border-gabi-cream-dark px-5 py-4">
              <h2 className="text-sm font-bold text-gabi-ink">Por asesor</h2>
              <p className="text-xs text-gabi-sand">Ordenado por menor cumplimiento</p>
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
                    <th className="px-5 py-3">Pendientes</th>
                  </tr>
                </thead>
                <tbody>
                  {report.asesores.map((row) => (
                    <tr key={row.asesorId} className="border-b border-gabi-cream-dark/70">
                      <td className="px-5 py-3 font-medium">{row.asesorNombre}</td>
                      <td className="px-5 py-3">
                        <ComplianceBadge pct={row.compliancePct} />
                      </td>
                      <td className="px-5 py-3">{row.confidencePct}%</td>
                      <td className="px-5 py-3 tabular-nums">{row.activeLeads}</td>
                      <td className="px-5 py-3 tabular-nums text-red-700">{row.overdueIssues}</td>
                      <td className="px-5 py-3 tabular-nums text-amber-700">{row.pendingIssues}</td>
                    </tr>
                  ))}
                  {report.asesores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-6 text-center text-gabi-sand">
                        Sin leads activos en playbook.
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
                <h2 className="text-sm font-bold text-gabi-ink">Excepciones prioritarias</h2>
                <p className="text-xs text-gabi-sand">
                  Leads con pasos pendientes o vencidos — revisar antes del reporte comercial
                </p>
              </div>
              <Link
                href={`/admin/leads?desarrolloId=${encodeURIComponent(desarrolloId ?? "")}`}
                className="text-sm font-semibold text-[#201044] hover:underline"
              >
                Abrir leads
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gabi-cream-dark text-left text-xs uppercase tracking-wide text-gabi-sand">
                    <th className="px-5 py-3">Prospecto</th>
                    <th className="px-5 py-3">Asesor</th>
                    <th className="px-5 py-3">Etapa</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Paso</th>
                    <th className="px-5 py-3">Confianza</th>
                  </tr>
                </thead>
                <tbody>
                  {report.exceptions.slice(0, 50).map((row) => {
                    const issue = row.issues[0];
                    return (
                      <tr key={row.prospectoId} className="border-b border-gabi-cream-dark/70">
                        <td className="px-5 py-3 font-medium">{row.nombre}</td>
                        <td className="px-5 py-3">{row.asesorNombre ?? "—"}</td>
                        <td className="px-5 py-3">{prospectoEtapaLabel[row.etapa]}</td>
                        <td className="px-5 py-3">
                          {issue?.status === "overdue" ? (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Vencido
                              {issue.hoursOverdue > 0
                                ? ` (${Math.round(issue.hoursOverdue)}h)`
                                : ""}
                            </span>
                          ) : (
                            <span className="text-amber-700">Pendiente</span>
                          )}
                        </td>
                        <td className="px-5 py-3">{issue?.stepLabel ?? "—"}</td>
                        <td className="px-5 py-3">{row.confidencePct}%</td>
                      </tr>
                    );
                  })}
                  {report.exceptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center">
                        <span className="inline-flex items-center gap-2 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Sin excepciones — CRM al día
                        </span>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-gabi-sand">
            Actualizado: {new Date(report.generatedAt).toLocaleString("es-MX")}. Los digest diarios
            se envían vía cron si <code className="text-[11px]">CRON_SECRET</code> y Resend están
            configurados.
          </p>
        </>
      ) : report && !report.playbookEnabled ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
          Playbook CRM no activo para este desarrollo. Actívalo en{" "}
          <Link href="/admin/crm-playbook" className="font-semibold text-[#201044] hover:underline">
            Playbook CRM
          </Link>
          .
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const border =
    tone === "good"
      ? "border-emerald-200"
      : tone === "warn"
        ? "border-amber-200"
        : tone === "bad"
          ? "border-red-200"
          : "border-gabi-cream-dark";

  return (
    <div className={`rounded-2xl border ${border} bg-white p-4 shadow-sm`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-gabi-sand">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-gabi-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gabi-sand">{hint}</p> : null}
    </div>
  );
}

function ComplianceBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 85 ? "bg-emerald-100 text-emerald-800" : pct >= 70 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${tone}`}>
      {pct}%
    </span>
  );
}

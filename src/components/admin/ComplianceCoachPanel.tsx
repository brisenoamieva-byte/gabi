"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Loader2,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type ComplianceCoachPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  canOpenLeads?: boolean;
};

export function ComplianceCoachPanel({
  desarrollos,
  scopeLabel,
  canOpenLeads = false,
}: ComplianceCoachPanelProps) {
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos);
  const [report, setReport] = useState<DesarrolloComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [testLoading, setTestLoading] = useState(false);

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
        throw new Error(data.error ?? "No se pudo cargar excepciones.");
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

  const overdueExceptions = useMemo(
    () => report?.exceptions.filter((row) => row.overdueCount > 0) ?? [],
    [report],
  );

  const exportCsv = () => {
    if (!desarrolloId) return;
    window.open(
      `/api/admin/crm-compliance/export?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      "_blank",
    );
  };

  const sendWhatsAppTest = async () => {
    if (!desarrolloId || !testPhone.trim()) {
      setTestStatus("Indica un teléfono de prueba.");
      return;
    }

    setTestLoading(true);
    setTestStatus("");

    try {
      const response = await fetch("/api/admin/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          telefono: testPhone.trim(),
          template: "compliance",
        }),
      });
      const data = (await response.json()) as { error?: string; ok?: boolean; messageId?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo enviar la prueba.");
      }

      setTestStatus(data.messageId ? `Enviado (id: ${data.messageId})` : "Enviado.");
    } catch (sendError) {
      setTestStatus(sendError instanceof Error ? sendError.message : "Error al enviar.");
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Auditoría CRM
          </p>
          <h1 className="text-2xl font-black tracking-tight text-gabi-forest">Compliance Coach</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Lista de excepciones para revisión operativa: pasos vencidos y pendientes antes del
            reporte comercial. Sin acceso a edición de leads — solo auditoría y exportación.
            {scopeLabel ? ` · ${scopeLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!desarrolloId || !report?.playbookEnabled}
            className="inline-flex items-center gap-2 rounded-xl border border-gabi-cream-dark bg-white px-4 py-2 text-sm font-semibold text-gabi-forest transition hover:bg-gabi-cream disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || !desarrolloId}
            className="inline-flex items-center gap-2 rounded-xl border border-gabi-cream-dark bg-white px-4 py-2 text-sm font-semibold text-gabi-forest transition hover:bg-gabi-cream disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </header>

      {desarrollos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
          No hay desarrollos en tu alcance.
        </div>
      ) : (
        <div className="rounded-2xl border border-gabi-cream-dark bg-white p-4 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Desarrollo
          </label>
          <select
            value={desarrolloId ?? ""}
            onChange={(event) => setDesarrolloId(event.target.value)}
            className="mt-2 w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20"
          >
            {desarrollos.map((item) => (
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
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando excepciones…
        </div>
      ) : null}

      {report?.playbookEnabled ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CoachMetric label="Cumplimiento" value={`${report.compliancePct}%`} />
            <CoachMetric label="Vencidos" value={String(report.overdueCount)} tone="bad" />
            <CoachMetric label="Excepciones" value={String(report.exceptionCount)} />
            <CoachMetric
              label="Excluidos embudo"
              value={String(report.pipelineExcludedCount)}
              hint={`${report.pipelineReliableCount} confiables`}
            />
          </div>

          {overdueExceptions.length > 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <p className="font-semibold">
                {overdueExceptions.length} lead(s) con pasos vencidos — prioridad de revisión hoy.
              </p>
            </div>
          ) : null}

          <section className="rounded-2xl border border-gabi-cream-dark bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gabi-cream-dark px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-gabi-forest">Excepciones ({report.exceptions.length})</h2>
                <p className="text-xs text-slate-500">
                  Vencidos primero; leads excluidos del embudo confiable marcados
                </p>
              </div>
              {canOpenLeads ? (
                <Link
                  href={`/admin/leads?desarrolloId=${encodeURIComponent(desarrolloId ?? "")}`}
                  className="text-sm font-semibold text-gabi-forest hover:underline"
                >
                  Abrir leads
                </Link>
              ) : null}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gabi-cream-dark text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Prospecto</th>
                    <th className="px-5 py-3">Asesor</th>
                    <th className="px-5 py-3">Etapa</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Paso</th>
                    <th className="px-5 py-3">Confianza</th>
                    <th className="px-5 py-3">Embudo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.exceptions.map((row) => {
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
                        <td className="px-5 py-3">
                          {row.excludedFromPipeline ? (
                            <span className="text-red-700">Excluido</span>
                          ) : (
                            <span className="text-emerald-700">Confiable</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {report.exceptions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center">
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

          <section className="rounded-2xl border border-gabi-cream-dark bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 text-gabi-sand" />
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gabi-forest">Probar WhatsApp compliance</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Envía la plantilla <code className="text-[11px]">gabi_crm_pendiente_asesor</code> a
                  un teléfono de prueba (asesor o tú).
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="min-w-[12rem] flex-1">
                    <span className="text-xs font-semibold text-slate-500">Teléfono (+52…)</span>
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(event) => setTestPhone(event.target.value)}
                      placeholder="+525512345678"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void sendWhatsAppTest()}
                    disabled={testLoading || !desarrolloId}
                    className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-semibold text-white hover:bg-gabi-forest-light disabled:opacity-50"
                  >
                    {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Enviar prueba
                  </button>
                </div>
                {testStatus ? (
                  <p className="mt-2 text-xs text-slate-500">{testStatus}</p>
                ) : null}
              </div>
            </div>
          </section>

          <p className="text-xs text-slate-500">
            Actualizado: {new Date(report.generatedAt).toLocaleString("es-MX")}. Gerentes pueden ver
            el panel completo en{" "}
            <Link href="/admin/crm-compliance" className="font-semibold text-gabi-forest hover:underline">
              Salud CRM
            </Link>
            .
          </p>
        </>
      ) : report && !report.playbookEnabled ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
          Playbook CRM no activo para este desarrollo. Un gerente debe activarlo en Playbook CRM.
        </div>
      ) : null}
    </div>
  );
}

function CoachMetric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "bad";
}) {
  const border = tone === "bad" ? "border-red-200" : "border-gabi-cream-dark";

  return (
    <div className={`rounded-2xl border ${border} bg-white p-4 shadow-sm`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-gabi-forest">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

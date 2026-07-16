"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MessageCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Target,
  Wrench,
} from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";
import type { GarantiaSlaReport } from "@/lib/comercial/garantia-sla";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";
import { CadenciaAdminPanel } from "@/components/admin/CadenciaAdminPanel";
import { CrmPlaybookAdminPanel } from "@/components/admin/CrmPlaybookAdminPanel";
import { GarantiaSlaDashboard } from "@/components/admin/GarantiaSlaDashboard";

type CrmComplianceAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  canConfigurePlaybook?: boolean;
  canOpenLeads?: boolean;
};

type SaludCrmTab = "garantia" | "playbook" | "cadencia" | "config" | "herramientas";

const pilotDesarrollos = (desarrollos: Desarrollo[]) => desarrollos;

const parseTab = (value: string | null, canConfigure: boolean): SaludCrmTab => {
  if (value === "playbook" || value === "cumplimiento") return "playbook";
  if (value === "cadencia") return "cadencia";
  if (value === "herramientas") return "herramientas";
  if (value === "config" && canConfigure) return "config";
  return "garantia";
};

export function CrmComplianceAdminPanel({
  desarrollos,
  scopeLabel,
  canConfigurePlaybook = false,
  canOpenLeads = false,
}: CrmComplianceAdminPanelProps) {
  const options = pilotDesarrollos(desarrollos);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(options);
  const [tab, setTab] = useState<SaludCrmTab>(() =>
    parseTab(searchParams.get("tab"), canConfigurePlaybook),
  );
  const [report, setReport] = useState<DesarrolloComplianceReport | null>(null);
  const [garantia, setGarantia] = useState<GarantiaSlaReport | null>(null);
  const [garantiaLoading, setGarantiaLoading] = useState(false);
  const [garantiaError, setGarantiaError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testStatus, setTestStatus] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    setTab(parseTab(searchParams.get("tab"), canConfigurePlaybook));
  }, [searchParams, canConfigurePlaybook]);

  const setActiveTab = (next: SaludCrmTab) => {
    if (next === "config" && !canConfigurePlaybook) return;
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "garantia") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    if (desarrolloId) {
      params.set("desarrolloId", desarrolloId);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

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

  const loadGarantia = useCallback(async () => {
    if (!desarrolloId) {
      setGarantia(null);
      return;
    }

    setGarantiaLoading(true);
    setGarantiaError("");

    try {
      const response = await fetch(
        `/api/admin/crm-compliance/garantia?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as {
        report?: GarantiaSlaReport;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la garantía SLA.");
      }

      setGarantia(data.report ?? null);
    } catch (loadError) {
      setGarantia(null);
      setGarantiaError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setGarantiaLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    if (tab === "playbook") {
      void load();
    }
    if (tab === "garantia") {
      void loadGarantia();
    }
  }, [load, loadGarantia, tab]);

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
            Supervisión comercial
          </p>
          <h1 className="text-2xl font-black tracking-tight text-gabi-forest">Salud CRM</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Garantía de seguimiento, playbook, cadencia y configuración — lo que vendes al dueño del
            desarrollo es el cumplimiento, no solo el CRM.
            {scopeLabel ? ` · ${scopeLabel}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === "playbook" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!desarrolloId) return;
                  window.open(
                    `/api/admin/crm-compliance/export?desarrolloId=${encodeURIComponent(desarrolloId)}`,
                    "_blank",
                  );
                }}
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
            </>
          ) : null}
          {canOpenLeads ? (
            <Link
              href={`/admin/leads${desarrolloId ? `?desarrolloId=${encodeURIComponent(desarrolloId)}` : ""}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-semibold text-white transition hover:bg-gabi-forest-light"
            >
              Ir a Leads
            </Link>
          ) : null}
        </div>
      </header>

      {options.length === 0 ? (
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
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-gabi-cream-dark pb-px">
        <TabButton
          active={tab === "garantia"}
          icon={Target}
          label="Garantía SLA"
          onClick={() => setActiveTab("garantia")}
        />
        <TabButton
          active={tab === "playbook"}
          icon={ShieldCheck}
          label="Playbook al día"
          onClick={() => setActiveTab("playbook")}
        />
        <TabButton
          active={tab === "cadencia"}
          icon={Clock}
          label="Contacto 8 días"
          onClick={() => setActiveTab("cadencia")}
        />
        {canConfigurePlaybook ? (
          <TabButton
            active={tab === "config"}
            icon={Settings2}
            label="Configurar pasos"
            onClick={() => setActiveTab("config")}
          />
        ) : null}
        <TabButton
          active={tab === "herramientas"}
          icon={Wrench}
          label="Herramientas"
          onClick={() => setActiveTab("herramientas")}
        />
      </div>

      {tab === "garantia" ? (
        <GarantiaSlaDashboard
          report={garantia}
          loading={garantiaLoading}
          error={garantiaError}
          desarrolloId={desarrolloId}
          canOpenLeads={canOpenLeads}
          onRefresh={() => void loadGarantia()}
          canConfigurePlaybook={canConfigurePlaybook}
          onOpenConfig={() => setActiveTab("config")}
        />
      ) : null}

      {tab === "cadencia" ? (
        <CadenciaAdminPanel desarrollos={desarrollos} scopeLabel={scopeLabel} embedded />
      ) : null}

      {tab === "config" && canConfigurePlaybook ? (
        <CrmPlaybookAdminPanel desarrollos={desarrollos} scopeLabel={scopeLabel} embedded />
      ) : null}

      {tab === "herramientas" ? (
        <section className="rounded-2xl border border-gabi-cream-dark bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <MessageCircle className="mt-0.5 h-5 w-5 text-gabi-sand" />
            <div className="flex-1">
              <h2 className="text-sm font-bold text-gabi-forest">Probar WhatsApp de alerta CRM</h2>
              <p className="mt-1 text-xs text-slate-500">
                Envía la plantilla <code className="text-[11px]">gabi_crm_pendiente_asesor</code> a
                un teléfono de prueba para verificar recordatorios de pasos pendientes.
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
                  className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {testLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  Enviar prueba
                </button>
              </div>
              {testStatus ? <p className="mt-2 text-xs text-slate-500">{testStatus}</p> : null}
            </div>
          </div>
        </section>
      ) : null}

      {tab === "playbook" ? (
        <>
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          {loading && !report ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando cumplimiento…
            </div>
          ) : null}

          {report?.playbookEnabled ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label="Playbook al día"
                  value={`${report.compliancePct}%`}
                  hint={`${report.compliantLeads}/${report.activeLeads} leads sin pasos vencidos`}
                  tone={healthTone}
                />
                <MetricCard
                  label="Datos / embudo"
                  value={`${report.confidencePct}%`}
                  hint="Contacto + playbook completos"
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
                  <h2 className="text-sm font-bold text-gabi-forest">Por asesor</h2>
                  <p className="text-xs text-slate-500">Quién tiene más pasos pendientes o vencidos</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gabi-cream-dark text-left text-xs uppercase tracking-wide text-slate-500">
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
                          <td colSpan={6} className="px-5 py-6 text-center text-slate-500">
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
                    <h2 className="text-sm font-bold text-gabi-forest">Excepciones prioritarias</h2>
                    <p className="text-xs text-slate-500">
                      Leads con pasos pendientes o vencidos — prioriza seguimiento antes del reporte
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

              <p className="text-xs text-slate-500">
                Actualizado: {new Date(report.generatedAt).toLocaleString("es-MX")}. El digest diario
                resume esta misma vista para gerencia.
              </p>
            </>
          ) : report && !report.playbookEnabled ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600">
              Playbook CRM no activo para este desarrollo.
              {canConfigurePlaybook ? (
                <>
                  {" "}
                  Actívalo en la pestaña{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("config")}
                    className="font-semibold text-gabi-forest underline-offset-2 hover:underline"
                  >
                    Configurar pasos
                  </button>
                  .
                </>
              ) : (
                " Pide a gerencia activarlo."
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof ShieldCheck;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-gabi-forest text-gabi-forest"
          : "border-transparent text-slate-500 hover:text-gabi-forest"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-gabi-forest">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function ComplianceBadge({ pct }: { pct: number }) {
  const tone =
    pct >= 85
      ? "bg-emerald-100 text-emerald-800"
      : pct >= 70
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";

  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-bold ${tone}`}>
      {pct}%
    </span>
  );
}

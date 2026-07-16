"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Kanban,
  Loader2,
  Plus,
  UserRound,
} from "lucide-react";
import type { ProspectoListRow, ProspectosResumen } from "@/lib/admin/prospectos-service";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
import { prospectoContactoOHistorialLabel } from "@/lib/comercial/apartado-cancelado-historial";
import {
  type CrmPlaybookConfig,
  type PlaybookQueueItem,
} from "@/lib/comercial/crm-playbook";
import { useCrmPlaybookEnabled } from "@/lib/comercial/use-crm-playbook-enabled";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";
import type { CadenciaHoyItem, AsesorCadenciaBrief } from "@/lib/comercial/cadencia-service";
import { AsesorCadenciaHoyPanel } from "@/components/asesor/AsesorCadenciaHoyPanel";

type AsesorDashboardCrmHeroProps = {
  asesorId: string;
  desarrolloId: string;
  desarrolloNombre: string;
};

const ETAPA_ACCENT: Partial<Record<ProspectoEtapa, string>> = {
  nuevo: "bg-sky-500/15 text-sky-100",
  contactado: "bg-violet-500/15 text-violet-100",
  cita: "bg-violet-500/15 text-violet-100",
  apartado: "bg-emerald-500/15 text-emerald-100",
  vendido: "bg-white/10 text-white/80",
};

export function AsesorDashboardCrmHero({
  asesorId,
  desarrolloId,
  desarrolloNombre,
}: AsesorDashboardCrmHeroProps) {
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<ProspectosResumen | null>(null);
  const [prospectos, setProspectos] = useState<ProspectoListRow[]>([]);
  const [playbookQueue, setPlaybookQueue] = useState<PlaybookQueueItem[]>([]);
  const [playbookConfig, setPlaybookConfig] = useState<CrmPlaybookConfig | null>(null);
  const [compliancePct, setCompliancePct] = useState<number | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);
  const [topExceptions, setTopExceptions] = useState<ProspectoComplianceRow[]>([]);
  const [cadenciaHoy, setCadenciaHoy] = useState<CadenciaHoyItem[]>([]);
  const [cadenciaBrief, setCadenciaBrief] = useState<AsesorCadenciaBrief | null>(null);

  const playbookEnabledHook = useCrmPlaybookEnabled(asesorId, desarrolloId);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        asesorId,
        desarrolloId,
        resumen: "1",
      });

      const [leadsRes, playbookRes, complianceRes, cadenciaRes] = await Promise.all([
        fetch(`/api/asesores/prospectos?${params.toString()}`),
        playbookEnabledHook
          ? fetch(
              `/api/asesores/crm-playbook/queue?asesorId=${encodeURIComponent(asesorId)}&desarrolloId=${encodeURIComponent(desarrolloId)}`,
            )
          : Promise.resolve(null),
        playbookEnabledHook
          ? fetch(
              `/api/asesores/crm-compliance/summary?asesorId=${encodeURIComponent(asesorId)}&desarrolloId=${encodeURIComponent(desarrolloId)}`,
            )
          : Promise.resolve(null),
        playbookEnabledHook
          ? fetch(
              `/api/asesores/cadencia/hoy?asesorId=${encodeURIComponent(asesorId)}&desarrolloId=${encodeURIComponent(desarrolloId)}`,
            )
          : Promise.resolve(null),
      ]);

      const leadsData = (await leadsRes.json()) as {
        prospectos?: ProspectoListRow[];
        resumen?: ProspectosResumen;
      };

      if (leadsRes.ok) {
        setProspectos(leadsData.prospectos ?? []);
        setResumen(leadsData.resumen ?? null);
      }

      if (playbookRes) {
        const playbookData = (await playbookRes.json()) as {
          queue?: PlaybookQueueItem[];
          config?: CrmPlaybookConfig | null;
        };
        if (playbookRes.ok) {
          setPlaybookQueue(playbookData.queue ?? []);
          setPlaybookConfig(playbookData.config ?? null);
        }
      }

      if (complianceRes) {
        const complianceData = (await complianceRes.json()) as {
          summary?: {
            compliancePct?: number;
            overdueCount?: number;
            topExceptions?: ProspectoComplianceRow[];
          };
          cadencia?: AsesorCadenciaBrief;
        };
        if (complianceRes.ok) {
          setCompliancePct(complianceData.summary?.compliancePct ?? null);
          setOverdueCount(complianceData.summary?.overdueCount ?? 0);
          setTopExceptions(complianceData.summary?.topExceptions ?? []);
          setCadenciaBrief(complianceData.cadencia ?? null);
        }
      }

      if (cadenciaRes) {
        const cadenciaData = (await cadenciaRes.json()) as { items?: CadenciaHoyItem[] };
        if (cadenciaRes.ok) {
          setCadenciaHoy(cadenciaData.items ?? []);
        }
      }
    } catch {
      setResumen(null);
      setProspectos([]);
      setPlaybookQueue([]);
      setCompliancePct(null);
      setOverdueCount(0);
      setTopExceptions([]);
      setCadenciaHoy([]);
      setCadenciaBrief(null);
    } finally {
      setLoading(false);
    }
  }, [asesorId, desarrolloId, playbookEnabledHook]);

  useEffect(() => {
    void load();
  }, [load]);

  const playbookEnabled = playbookEnabledHook && playbookConfig?.enabled;

  const stats = useMemo(() => {
    const porEtapa = resumen?.porEtapa ?? {};
    const nuevos = porEtapa.nuevo ?? 0;
    const contactados = porEtapa.contactado ?? 0;
    const cita = porEtapa.cita ?? 0;
    const apartado = porEtapa.apartado ?? 0;
    const activos = nuevos + contactados + cita + apartado;

    return {
      total: resumen?.total ?? 0,
      nuevos,
      activos,
      pendientesPlaybook: playbookQueue.length,
    };
  }, [resumen, playbookQueue.length]);

  const priority = playbookEnabled ? playbookQueue[0] : null;
  const recentLeads = prospectos.slice(0, 4);

  const firstOverdue = topExceptions.find((row) => row.overdueCount > 0);
  const overdueLeadHref = firstOverdue
    ? `/mis-leads?prospecto=${encodeURIComponent(firstOverdue.prospectoId)}`
    : priority
      ? `/mis-leads?prospecto=${encodeURIComponent(priority.prospectoId)}`
      : "/mis-leads";

  return (
    <section
      className="overflow-hidden rounded-2xl border border-[#201044]/90 bg-[#201044] text-white shadow-[0_12px_32px_rgba(32,16,68,0.18)]"
      aria-label="Seguimiento de prospectos"
    >
      <div className="border-b border-white/10 px-5 py-4 md:px-6 md:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
              Pipeline
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight md:text-xl">
              Seguimiento de prospectos
            </h2>
            <p className="mt-0.5 truncate text-sm text-white/55">{desarrolloNombre}</p>
          </div>
          <Link
            href="/mis-leads"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-[#201044] transition hover:bg-white/95 active:scale-[0.98]"
          >
            <Kanban className="h-4 w-4" strokeWidth={2} />
            Mis prospectos
          </Link>
        </div>
      </div>

      <div className="px-5 py-4 md:px-6 md:py-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando tu bandeja…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <StatChip label="Total" value={stats.total} />
              <StatChip label="Nuevos" value={stats.nuevos} />
              <StatChip label="En proceso" value={stats.activos} highlight />
              {playbookEnabled ? (
                <StatChip
                  label="Hoy toca"
                  value={cadenciaHoy.length}
                  highlight={cadenciaHoy.length > 0}
                  href={cadenciaHoy.length > 0 ? "/mis-leads" : undefined}
                  title={
                    cadenciaHoy.length > 0
                      ? "Contactos de perfilamiento pendientes hoy"
                      : undefined
                  }
                />
              ) : null}
              {playbookEnabled ? (
                <StatChip
                  label={overdueCount > 0 ? "Vencidos" : "Cumplimiento"}
                  value={overdueCount > 0 ? overdueCount : (compliancePct ?? stats.pendientesPlaybook)}
                  alert={overdueCount > 0}
                  highlight={overdueCount === 0 && compliancePct !== null && compliancePct >= 85}
                  href={overdueCount > 0 ? overdueLeadHref : "/mis-leads"}
                  title={overdueCount > 0 ? "Abrir lead con paso vencido" : undefined}
                />
              ) : (
                <StatChip label="Con cita" value={resumen?.porEtapa.cita ?? 0} />
              )}
            </div>

            {playbookEnabled && (cadenciaBrief?.expiredCount ?? 0) > 0 ? (
              <Link
                href="/mis-leads"
                className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-50 transition hover:bg-amber-400/15"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} />
                <span className="flex-1 leading-snug">
                  {cadenciaBrief?.expiredCount} cadencia(s) expirada(s) sin respuesta — revisa si
                  deben pasar a {prospectoEtapaLabel.perdido}.
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-200/80" />
              </Link>
            ) : null}

            {playbookEnabled && overdueCount > 0 ? (
              <Link
                href={overdueLeadHref}
                className="mt-3 flex items-center gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-50 transition hover:bg-amber-400/15"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} />
                <span className="flex-1 leading-snug">
                  {overdueCount} seguimiento(s) por poner al día — un WhatsApp rápido protege tu comisión.
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-200/80" />
              </Link>
            ) : null}

            {playbookEnabled ? (
              <AsesorCadenciaHoyPanel
                asesorId={asesorId}
                desarrolloId={desarrolloId}
                items={cadenciaHoy}
                onRefresh={() => void load()}
              />
            ) : null}

            {priority ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
                      Siguiente paso
                    </p>
                    <p className="mt-1 truncate text-base font-semibold">{priority.nombre}</p>
                    <p className="mt-1 text-sm text-white/75">
                      {priority.nextStep?.label ?? "Revisa el playbook del lead"}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {prospectoEtapaLabel[priority.etapa]}
                      {priority.pendingRequired > 0
                        ? ` · ${priority.pendingRequired} requerido(s)`
                        : ""}
                    </p>
                  </div>
                  <Link
                    href={`/mis-leads?prospecto=${encodeURIComponent(priority.prospectoId)}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#201044]"
                  >
                    Abrir
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : stats.total === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-white/90">Aún no tienes prospectos</p>
                <p className="mt-1 text-sm text-white/50">
                  Registra visitas y leads para llevar el seguimiento desde aquí.
                </p>
                <Link
                  href="/mis-leads"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Crear primer prospecto
                </Link>
              </div>
            ) : playbookEnabled ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3.5 py-2.5 text-sm text-emerald-50">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={2} />
                Playbook al día en tus leads activos.
              </div>
            ) : null}

            {recentLeads.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40">
                  Recientes
                </p>
                <ul className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  {recentLeads.map((lead, index) => {
                    const etapa = lead.etapa as ProspectoEtapa;
                    const chipClass = ETAPA_ACCENT[etapa] ?? "bg-white/10 text-white/70";

                    return (
                      <li
                        key={lead.id}
                        className={index > 0 ? "border-t border-white/[0.07]" : undefined}
                      >
                        <Link
                          href={`/mis-leads?prospecto=${encodeURIComponent(lead.id)}`}
                          className="flex items-center justify-between gap-3 px-3.5 py-3 transition hover:bg-white/[0.04]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/70">
                              <UserRound className="h-3.5 w-3.5" strokeWidth={2} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{lead.nombre}</p>
                              <p className="truncate text-xs text-white/40">
                                {prospectoContactoOHistorialLabel(lead)}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${chipClass}`}
                          >
                            {prospectoEtapaLabel[etapa]}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

function StatChip({
  label,
  value,
  highlight,
  alert,
  href,
  title,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  alert?: boolean;
  href?: string;
  title?: string;
}) {
  const className = [
    "rounded-xl border px-3 py-2.5",
    alert
      ? "border-amber-400/30 bg-amber-400/10"
      : highlight
        ? "border-white/20 bg-white/[0.1]"
        : "border-white/10 bg-white/[0.05]",
    href ? "transition hover:bg-white/[0.12]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-white/45">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} title={title}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

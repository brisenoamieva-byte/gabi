"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Kanban,
  Loader2,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { ProspectoListRow, ProspectosResumen } from "@/lib/admin/prospectos-service";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
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
  nuevo: "bg-sky-500/20 text-sky-100",
  contactado: "bg-violet-500/20 text-violet-100",
  cita: "bg-violet-500/20 text-violet-100",
  apartado: "bg-emerald-500/20 text-emerald-100",
  vendido: "bg-white/15 text-white/90",
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
      className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#201044] via-[#2a1860] to-[#1a0f38] p-5 text-white shadow-xl shadow-[#201044]/20 md:p-6"
      aria-label="Seguimiento de prospectos"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#6cc24a]/12 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#6cc24a]">
            Tu CRM
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight md:text-2xl">
            Seguimiento de prospectos
          </h2>
          <p className="mt-1 text-sm text-white/65">{desarrolloNombre}</p>
        </div>
        <Link
          href="/mis-leads"
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#6cc24a] px-4 py-2.5 text-sm font-bold text-[#201044] shadow-lg shadow-[#6cc24a]/25 transition hover:bg-[#7dd35a] active:scale-[0.98]"
        >
          <Kanban className="h-4 w-4" />
          Mis prospectos
        </Link>
      </div>

      {loading ? (
        <div className="relative mt-5 flex items-center gap-2 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando tu bandeja…
        </div>
      ) : (
        <>
          <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            <StatChip label="Total" value={stats.total} />
            <StatChip label="Nuevos" value={stats.nuevos} accent="sky" />
            <StatChip label="En proceso" value={stats.activos} accent="lime" />
            {playbookEnabled ? (
              <StatChip
                label="Hoy toca"
                value={cadenciaHoy.length}
                accent={cadenciaHoy.length > 0 ? "sky" : undefined}
                href={cadenciaHoy.length > 0 ? "/mis-leads" : undefined}
                title={cadenciaHoy.length > 0 ? "Contactos de perfilamiento pendientes hoy" : undefined}
              />
            ) : null}
            {playbookEnabled ? (
              <StatChip
                label={overdueCount > 0 ? "Vencidos" : "Cumplimiento"}
                value={overdueCount > 0 ? overdueCount : compliancePct ?? stats.pendientesPlaybook}
                accent={overdueCount > 0 ? "amber" : compliancePct !== null && compliancePct >= 85 ? "lime" : "amber"}
                href={overdueCount > 0 ? overdueLeadHref : "/mis-leads"}
                title={overdueCount > 0 ? "Abrir lead con paso vencido" : undefined}
              />
            ) : (
              <StatChip label="Con cita" value={resumen?.porEtapa.cita ?? 0} accent="amber" />
            )}
          </div>

          {playbookEnabled && (cadenciaBrief?.expiredCount ?? 0) > 0 ? (
            <Link
              href="/mis-leads"
              className="relative mt-4 flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 transition hover:bg-amber-500/25"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="flex-1">
                {cadenciaBrief?.expiredCount} cadencia(s) expirada(s) sin respuesta — revisa si deben
                pasar a Perdido.
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-200" />
            </Link>
          ) : null}

          {playbookEnabled && overdueCount > 0 ? (
            <Link
              href={overdueLeadHref}
              className="relative mt-4 flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-50 transition hover:bg-amber-500/25"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="flex-1">
                {overdueCount} paso(s) vencido(s) en tu CRM — toca para atender antes del reporte
                comercial.
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-200" />
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
            <div className="relative mt-4 rounded-2xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6cc24a]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Siguiente paso del playbook
                  </p>
                  <p className="mt-1 truncate text-lg font-black">{priority.nombre}</p>
                  <p className="mt-1 text-sm text-white/80">
                    {priority.nextStep?.label ?? "Revisa el playbook del lead"}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    {prospectoEtapaLabel[priority.etapa]}
                    {priority.pendingRequired > 0
                      ? ` · ${priority.pendingRequired} requerido(s)`
                      : ""}
                  </p>
                </div>
                <Link
                  href={`/mis-leads?prospecto=${encodeURIComponent(priority.prospectoId)}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-bold text-[#201044]"
                >
                  Abrir
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : stats.total === 0 ? (
            <div className="relative mt-4 rounded-2xl border border-dashed border-white/20 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white/90">Aún no tienes prospectos asignados</p>
              <p className="mt-1 text-sm text-white/60">
                Registra visitas y leads para llevar seguimiento desde aquí.
              </p>
              <Link
                href="/mis-leads"
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#6cc24a]"
              >
                <Plus className="h-4 w-4" />
                Crear primer prospecto
              </Link>
            </div>
          ) : playbookEnabled ? (
            <div className="relative mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-300" />
              Playbook al día en tus leads activos.
            </div>
          ) : null}

          {recentLeads.length > 0 ? (
            <div className="relative mt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                Recientes
              </p>
              <ul className="divide-y divide-white/8 rounded-xl border border-white/10 bg-black/15">
                {recentLeads.map((lead) => {
                  const etapa = lead.etapa as ProspectoEtapa;
                  const chipClass = ETAPA_ACCENT[etapa] ?? "bg-white/10 text-white/80";

                  return (
                    <li key={lead.id}>
                      <Link
                        href={`/mis-leads?prospecto=${encodeURIComponent(lead.id)}`}
                        className="flex items-center justify-between gap-3 px-3.5 py-3 transition hover:bg-white/5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white/80">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{lead.nombre}</p>
                            <p className="truncate text-xs text-white/50">
                              {lead.telefono || lead.email || "Sin contacto"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${chipClass}`}
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
    </section>
  );
}

function StatChip({
  label,
  value,
  accent,
  href,
  title,
}: {
  label: string;
  value: number;
  accent?: "sky" | "lime" | "amber";
  href?: string;
  title?: string;
}) {
  const accentBorder =
    accent === "sky"
      ? "border-sky-400/30"
      : accent === "lime"
        ? "border-[#6cc24a]/35"
        : accent === "amber"
          ? "border-amber-400/30"
          : "border-white/12";

  const className = `rounded-xl border ${accentBorder} bg-white/6 px-3 py-2.5 backdrop-blur-sm ${
    href ? "transition hover:bg-white/12 hover:ring-1 hover:ring-white/20" : ""
  }`;

  const content = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-0.5 text-2xl font-black tabular-nums tracking-tight">{value}</p>
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

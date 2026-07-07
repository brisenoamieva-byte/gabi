"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator,
  Kanban,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { LeadsKanbanBoard } from "@/components/admin/LeadsKanbanBoard";
import { RegistrarApartadoModal } from "@/components/admin/RegistrarApartadoModal";
import { AsesorExpedienteApartadoPanel } from "@/components/asesor/AsesorExpedienteApartadoPanel";
import { CrmPlaybookBanner } from "@/components/asesor/CrmPlaybookBanner";
import { CrmPlaybookChecklist } from "@/components/asesor/CrmPlaybookChecklist";
import { AsesorCadenciaLeadPanel } from "@/components/asesor/AsesorCadenciaLeadPanel";
import { formatPrice } from "@/lib/data";
import type { ProspectoDetail, ProspectoListRow, ProspectosResumen } from "@/lib/admin/prospectos-service";
import { prefillCotizadorFromProspecto } from "@/lib/asesores/prefill-cotizador-client";
import {
  ETAPAS_ASESOR,
  prospectoEtapaEditableByAsesor,
} from "@/lib/asesores/prospectos-client";
import {
  formatLeadActivity,
  formatLeadDate,
  formatLeadDateOnly,
  leadPeriodToRange,
  type LeadPeriodFilter,
} from "@/lib/comercial/format-lead-date";
import {
  canAdvancePlaybookEtapa,
  type CrmPlaybookConfig,
  type PlaybookQueueItem,
} from "@/lib/comercial/crm-playbook";
import { useCrmPlaybookEnabled } from "@/lib/comercial/use-crm-playbook-enabled";
import type { ProspectoPlaybookState } from "@/lib/comercial/crm-playbook-service";
import type { CadenciaStatus } from "@/lib/comercial/cadencia-perfilamiento";
import {
  isProspectoEtapa,
  PROSPECTO_ETAPAS,
  prospectoEtapaColor,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";

type AsesorLeadsPanelProps = {
  asesorId: string;
  desarrolloId: string;
  desarrolloNombre: string;
  initialProspectoId?: string;
};

type ViewMode = "lista" | "tablero";

const PERIOD_OPTIONS: Array<{ id: LeadPeriodFilter; label: string }> = [
  { id: "", label: "Toda actividad" },
  { id: "7d", label: "Activos 7 días" },
  { id: "30d", label: "Activos 30 días" },
  { id: "month", label: "Activos este mes" },
];

const MEDIO_CONTACTO_OPTIONS = [
  { value: "contacto-directo", label: "Contacto Directo" },
  { value: "referido", label: "Referido" },
  { value: "medios-digitales", label: "Medios Digitales" },
  { value: "pase", label: "Pase" },
  { value: "inmobiliaria-externo", label: "Inmobiliaria/externo" },
  { value: "espectacular", label: "Espectacular" },
  { value: "cross-selling", label: "Cross Selling" },
] as const;

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#201044] focus:outline-none focus:ring-2 focus:ring-[#201044]/15";

function AsesorLeadDrawer({
  asesorId,
  prospectoId,
  onClose,
  onUpdated,
}: {
  asesorId: string;
  prospectoId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [detail, setDetail] = useState<ProspectoDetail | null>(null);
  const [playbook, setPlaybook] = useState<ProspectoPlaybookState | null>(null);
  const [cadenciaStatus, setCadenciaStatus] = useState<CadenciaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [etapa, setEtapa] = useState<ProspectoEtapa>("nuevo");
  const [notas, setNotas] = useState("");
  const [apartadoModalOpen, setApartadoModalOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/asesores/prospectos/${prospectoId}?asesorId=${encodeURIComponent(asesorId)}`,
      );
      const data = (await response.json()) as {
        prospecto?: ProspectoDetail;
        playbook?: ProspectoPlaybookState;
        cadencia?: { status: CadenciaStatus | null } | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el prospecto.");
      }

      if (data.prospecto) {
        setDetail(data.prospecto);
        setPlaybook(data.playbook ?? null);
        setCadenciaStatus(data.cadencia?.status ?? null);
        setEtapa(isProspectoEtapa(data.prospecto.etapa) ? data.prospecto.etapa : "nuevo");
        setNotas(data.prospecto.notas ?? "");
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [asesorId, prospectoId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const etapaEditable = detail ? prospectoEtapaEditableByAsesor(detail.etapa) : false;
  const puedeReportarApartado =
    detail != null && detail.etapa !== "vendido" && detail.etapa !== "perdido";

  const isEtapaOptionAllowed = (target: ProspectoEtapa) => {
    if (!detail || !playbook?.config?.enabled || !playbook.config.blockEtapa) {
      return true;
    }
    const current = isProspectoEtapa(detail.etapa) ? detail.etapa : "nuevo";
    const completedIds = new Set(playbook.completedStepIds);
    return canAdvancePlaybookEtapa(playbook.config, current, target, completedIds).ok;
  };

  const handleCompleteStep = async (stepId: string, stepDate?: string) => {
    setCompletingStepId(stepId);
    setError("");

    try {
      const response = await fetch(`/api/asesores/prospectos/${prospectoId}/playbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asesorId, stepId, stepDate }),
      });

      const data = (await response.json()) as {
        playbook?: ProspectoPlaybookState;
        prospecto?: ProspectoDetail;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo completar el paso.");
      }

      setPlaybook(data.playbook ?? null);
      if (data.prospecto && detail) {
        setDetail({ ...detail, ...data.prospecto });
      }
      onUpdated();
    } catch (completeError) {
      setError(completeError instanceof Error ? completeError.message : "Error al completar paso.");
    } finally {
      setCompletingStepId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/asesores/prospectos/${prospectoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asesorId,
          etapa: etapaEditable ? etapa : undefined,
          notas,
        }),
      });

      const data = (await response.json()) as {
        prospecto?: ProspectoDetail;
        playbook?: ProspectoPlaybookState;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      if (data.prospecto) {
        setDetail(data.prospecto);
      }
      if (data.playbook) {
        setPlaybook(data.playbook);
      }
      onUpdated();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6cc24a]">
              Seguimiento
            </p>
            <h3 className="text-xl font-black text-[#201044]">{detail?.nombre ?? "Cargando…"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium">{detail.email ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Teléfono</span>
                  <span>{detail.telefono ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Medio</span>
                  <span>{detail.medio_publicitario ?? detail.medio_contacto ?? "—"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Última actividad</span>
                  <span>{formatLeadDate(detail.updated_at)}</span>
                </div>
                {detail.visita_agendada_on ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Visita agendada</span>
                    <span className="font-medium">{formatLeadDateOnly(detail.visita_agendada_on)}</span>
                  </div>
                ) : null}
                {detail.visita_realizada_on ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Visita realizada</span>
                    <span className="font-medium">{formatLeadDateOnly(detail.visita_realizada_on)}</span>
                  </div>
                ) : null}
              </div>

              {!etapaEditable ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Cliente en{" "}
                  <strong>{prospectoEtapaLabel[detail.etapa as ProspectoEtapa] ?? detail.etapa}</strong>
                  . Gerencia administra apartado y venta; tú puedes dejar notas.
                </div>
              ) : null}

              <AsesorExpedienteApartadoPanel
                asesorId={asesorId}
                prospectoId={detail.id}
                etapa={detail.etapa}
              />

              {cadenciaStatus === "expired" && detail.etapa === "nuevo" ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p className="font-bold">Cadencia agotada (8 días sin respuesta)</p>
                  <p className="mt-1 text-xs text-amber-900">
                    Si el prospecto no mostró interés, cambia la etapa a{" "}
                    <strong>Perdido</strong> para liberar tu bandeja.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEtapa("perdido")}
                    className="mt-2 text-xs font-bold text-[#201044] underline-offset-2 hover:underline"
                  >
                    Marcar como Perdido
                  </button>
                </div>
              ) : null}

              {playbook?.config?.enabled ? (
                <CrmPlaybookChecklist
                  etapa={isProspectoEtapa(detail.etapa) ? detail.etapa : "nuevo"}
                  playbook={playbook}
                  completingStepId={completingStepId}
                  visitaAgendadaOn={detail.visita_agendada_on}
                  visitaRealizadaOn={detail.visita_realizada_on}
                  onCompleteStep={(stepId, stepDate) => void handleCompleteStep(stepId, stepDate)}
                />
              ) : null}

              {playbook?.config?.enabled ? (
                <AsesorCadenciaLeadPanel
                  asesorId={asesorId}
                  prospectoId={detail.id}
                  etapa={detail.etapa}
                />
              ) : null}

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-600">Etapa</span>
                <select
                  value={etapa}
                  disabled={!etapaEditable}
                  onChange={(event) => setEtapa(event.target.value as ProspectoEtapa)}
                  className={inputClass}
                >
                  {ETAPAS_ASESOR.map((item) => (
                    <option key={item} value={item} disabled={!isEtapaOptionAllowed(item)}>
                      {prospectoEtapaLabel[item]}
                    </option>
                  ))}
                </select>
                {playbook?.config?.blockEtapa && !playbook.canAdvanceEtapa ? (
                  <p className="mt-1 text-xs text-amber-700">{playbook.blockReason}</p>
                ) : null}
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-slate-600">Notas de seguimiento</span>
                <textarea
                  value={notas}
                  onChange={(event) => setNotas(event.target.value)}
                  className={`${inputClass} min-h-[120px]`}
                  placeholder="Próximo paso, objeciones, recordatorios…"
                />
              </label>

              <div>
                <h4 className="mb-3 text-sm font-bold text-[#201044]">
                  Cotizaciones ({detail.cotizaciones.length})
                </h4>
                {detail.cotizaciones.length ? (
                  <div className="space-y-2">
                    {detail.cotizaciones.map((cotizacion) => (
                      <div
                        key={cotizacion.id}
                        className="rounded-xl border border-slate-100 px-4 py-3 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-[#201044]">
                              {cotizacion.unidad_numero
                                ? `Unidad ${cotizacion.unidad_numero}`
                                : "Cotización"}
                            </p>
                            <p className="text-slate-500">{cotizacion.esquema_pago ?? "—"}</p>
                          </div>
                          <p className="font-bold tabular-nums">
                            {cotizacion.precio_total
                              ? formatPrice(Number(cotizacion.precio_total))
                              : "—"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin cotizaciones aún.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {detail ? (
          <div className="space-y-2 border-t border-slate-100 p-5">
            {puedeReportarApartado ? (
              <button
                type="button"
                onClick={() => setApartadoModalOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900"
              >
                <ShoppingBag className="h-4 w-4" />
                Reportar apartado
              </button>
            ) : null}
            <Link
              href="/cotizador"
              onClick={() => prefillCotizadorFromProspecto(detail)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#201044]/15 bg-white px-4 py-3 text-sm font-bold text-[#201044]"
            >
              <Calculator className="h-4 w-4" />
              Cotizar
            </Link>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar seguimiento
            </button>
          </div>
        ) : null}
      </div>

      {apartadoModalOpen && detail ? (
        <RegistrarApartadoModal
          channel="asesor"
          asesorId={asesorId}
          desarrolloId={detail.desarrollo_id}
          prospectoId={prospectoId}
          onClose={() => setApartadoModalOpen(false)}
          onSuccess={() => {
            setApartadoModalOpen(false);
            void loadDetail();
            onUpdated();
          }}
        />
      ) : null}
    </div>
  );
}

export function AsesorLeadsPanel({
  asesorId,
  desarrolloId,
  desarrolloNombre,
  initialProspectoId,
}: AsesorLeadsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [periodFilter, setPeriodFilter] = useState<LeadPeriodFilter>("");
  const [etapaFilter, setEtapaFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [prospectos, setProspectos] = useState<ProspectoListRow[]>([]);
  const [resumen, setResumen] = useState<ProspectosResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newMedioContacto, setNewMedioContacto] = useState("contacto-directo");
  const [newNotas, setNewNotas] = useState("");
  const [playbookQueue, setPlaybookQueue] = useState<PlaybookQueueItem[]>([]);
  const [playbookConfig, setPlaybookConfig] = useState<CrmPlaybookConfig | null>(null);
  const [complianceOverdue, setComplianceOverdue] = useState(0);
  const playbookEnabledApi = useCrmPlaybookEnabled(asesorId, desarrolloId);
  const playbookEnabled = playbookEnabledApi && playbookConfig?.enabled;

  const periodRange = useMemo(() => leadPeriodToRange(periodFilter), [periodFilter]);

  const loadPlaybookQueue = useCallback(async () => {
    if (!playbookEnabledApi) {
      setPlaybookQueue([]);
      setPlaybookConfig(null);
      return;
    }

    try {
      const [playbookRes, complianceRes] = await Promise.all([
        fetch(
          `/api/asesores/crm-playbook/queue?asesorId=${encodeURIComponent(asesorId)}&desarrolloId=${encodeURIComponent(desarrolloId)}`,
        ),
        fetch(
          `/api/asesores/crm-compliance/summary?asesorId=${encodeURIComponent(asesorId)}&desarrolloId=${encodeURIComponent(desarrolloId)}`,
        ),
      ]);

      const data = (await playbookRes.json()) as {
        queue?: PlaybookQueueItem[];
        config?: CrmPlaybookConfig | null;
        error?: string;
      };

      if (!playbookRes.ok) {
        throw new Error(data.error ?? "No se pudo cargar la cola de playbook.");
      }

      setPlaybookQueue(data.queue ?? []);
      setPlaybookConfig(data.config ?? null);

      if (complianceRes.ok) {
        const complianceData = (await complianceRes.json()) as {
          summary?: { overdueCount?: number };
        };
        setComplianceOverdue(complianceData.summary?.overdueCount ?? 0);
      } else {
        setComplianceOverdue(0);
      }
    } catch {
      setPlaybookQueue([]);
      setPlaybookConfig(null);
      setComplianceOverdue(0);
    }
  }, [asesorId, desarrolloId, playbookEnabledApi]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        asesorId,
        desarrolloId,
        resumen: "1",
      });
      if (viewMode === "lista" && etapaFilter) {
        params.set("etapa", etapaFilter);
      }
      if (search) {
        params.set("search", search);
      }
      if (periodRange.desde) {
        params.set("desde", periodRange.desde);
      }
      if (periodRange.hasta) {
        params.set("hasta", periodRange.hasta);
      }

      const response = await fetch(`/api/asesores/prospectos?${params.toString()}`);
      const data = (await response.json()) as {
        prospectos?: ProspectoListRow[];
        resumen?: ProspectosResumen;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar tus prospectos.");
      }

      setProspectos(data.prospectos ?? []);
      setResumen(data.resumen ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setProspectos([]);
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [asesorId, desarrolloId, viewMode, etapaFilter, search, periodRange.desde, periodRange.hasta]);

  useEffect(() => {
    void loadLeads();
    void loadPlaybookQueue();
  }, [loadLeads, loadPlaybookQueue]);

  useEffect(() => {
    if (initialProspectoId) {
      setSelectedId(initialProspectoId);
    }
  }, [initialProspectoId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleMoveEtapa = async (prospectoId: string, etapa: ProspectoEtapa) => {
    const response = await fetch(`/api/asesores/prospectos/${prospectoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asesorId, etapa }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(data.error ?? "No se pudo mover el prospecto.");
      throw new Error(data.error ?? "No se pudo mover el prospecto.");
    }

    setProspectos((prev) =>
      prev.map((row) => (row.id === prospectoId ? { ...row, etapa } : row)),
    );
    void loadLeads();
    void loadPlaybookQueue();
  };

  const resetNewLeadForm = () => {
    setNewNombre("");
    setNewEmail("");
    setNewTelefono("");
    setNewMedioContacto("contacto-directo");
    setNewNotas("");
  };

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newNombre.trim()) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/asesores/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asesorId,
          desarrolloId,
          nombre: newNombre.trim(),
          email: newEmail.trim() || undefined,
          telefono: newTelefono.trim() || undefined,
          medioContacto: newMedioContacto,
          notas: newNotas.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { prospecto?: ProspectoListRow; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el lead.");
      }

      setShowNewLead(false);
      resetNewLeadForm();
      if (data.prospecto?.id) {
        setSelectedId(data.prospecto.id);
      }
      void loadLeads();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear.");
    } finally {
      setCreating(false);
    }
  };

  const etapasActivas = useMemo(
    () =>
      Object.entries(resumen?.porEtapa ?? {})
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [resumen],
  );

  return (
    <div className="space-y-4">
      {playbookEnabled ? (
        <CrmPlaybookBanner
          queue={playbookQueue}
          overdueCount={complianceOverdue}
          onSelectLead={(prospectoId) => setSelectedId(prospectoId)}
        />
      ) : null}

      <div className="rounded-2xl border border-[#201044]/8 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6cc24a]">
              Mis prospectos
            </p>
            <h2 className="text-xl font-black text-[#201044]">{desarrolloNombre}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {resumen?.total ?? 0} leads asignados a ti
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                viewMode === "lista"
                  ? "bg-[#201044] text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tablero")}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                viewMode === "tablero"
                  ? "bg-[#201044] text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              <Kanban className="h-4 w-4" />
              Tablero
            </button>
            <button
              type="button"
              onClick={() => {
                resetNewLeadForm();
                setShowNewLead(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#201044]/15 bg-white px-4 py-2 text-sm font-bold text-[#201044]"
            >
              <Plus className="h-4 w-4" />
              Nuevo lead
            </button>
            <button
              type="button"
              onClick={() => void loadLeads()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#201044] px-4 py-2 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id || "all"}
              type="button"
              onClick={() => setPeriodFilter(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                periodFilter === option.id
                  ? "bg-[#6cc24a] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {viewMode === "lista" ? (
          <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEtapaFilter("")}
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              !etapaFilter ? "bg-[#201044] text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Todos ({resumen?.total ?? 0})
          </button>
          {etapasActivas.map(([etapa, count]) => (
            <button
              key={etapa}
              type="button"
              onClick={() => setEtapaFilter(etapa === etapaFilter ? "" : etapa)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                etapaFilter === etapa ? "bg-[#201044] text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {prospectoEtapaLabel[etapa as ProspectoEtapa] ?? etapa} ({count})
            </button>
          ))}
          </div>
        ) : null}

        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar por nombre, email o teléfono"
            className={`${inputClass} pl-10`}
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando prospectos…
          </div>
        ) : !prospectos.length ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">
            Aún no tienes prospectos registrados. Crea uno con{" "}
            <strong className="font-semibold text-[#201044]">Nuevo lead</strong>, haz un recorrido o
            cotiza para que aparezcan aquí.
          </p>
        ) : viewMode === "tablero" ? (
          <LeadsKanbanBoard
            prospectos={prospectos}
            etapas={PROSPECTO_ETAPAS}
            movableEtapas={ETAPAS_ASESOR}
            formatActivity={formatLeadActivity}
            onSelect={setSelectedId}
            onMoveEtapa={handleMoveEtapa}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {prospectos.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(row.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#201044]/6 text-[#201044]">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#201044]">{row.nombre}</p>
                    <p className="truncate text-sm text-slate-500">
                      {row.email ?? row.telefono ?? "Sin contacto"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatLeadActivity(row.updated_at)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                      prospectoEtapaColor[row.etapa as ProspectoEtapa] ??
                      "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {prospectoEtapaLabel[row.etapa as ProspectoEtapa] ?? row.etapa}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedId ? (
        <AsesorLeadDrawer
          asesorId={asesorId}
          prospectoId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => {
            void loadLeads();
            void loadPlaybookQueue();
          }}
        />
      ) : null}

      {showNewLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(event) => void handleCreateLead(event)}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-black text-[#201044]">Nuevo lead</h3>
            <p className="mt-1 text-sm text-slate-500">
              Registro manual asignado a ti en {desarrolloNombre}.
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Nombre *</span>
              <input
                required
                autoFocus
                value={newNombre}
                onChange={(event) => setNewNombre(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Email</span>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Teléfono</span>
              <input
                type="tel"
                value={newTelefono}
                onChange={(event) => setNewTelefono(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Medio de contacto</span>
              <select
                value={newMedioContacto}
                onChange={(event) => setNewMedioContacto(event.target.value)}
                className={inputClass}
              >
                {MEDIO_CONTACTO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Notas</span>
              <textarea
                value={newNotas}
                onChange={(event) => setNewNotas(event.target.value)}
                className={`${inputClass} min-h-[80px]`}
                placeholder="Contexto inicial, referido, próximo paso…"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewLead(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-[#201044] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {creating ? "Guardando…" : "Crear lead"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

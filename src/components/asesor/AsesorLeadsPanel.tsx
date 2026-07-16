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
import { SolicitarApartadoModal } from "@/components/asesor/SolicitarApartadoModal";
import { AsesorExpedienteApartadoPanel } from "@/components/asesor/AsesorExpedienteApartadoPanel";
import { PerfilCalificacionLeadBadge } from "@/components/asesor/PerfilCalificacionLeadBadge";
import { CrmPlaybookBanner } from "@/components/asesor/CrmPlaybookBanner";
import { CrmPlaybookChecklist } from "@/components/asesor/CrmPlaybookChecklist";
import { PerfilamientoVisitaPanel } from "@/components/asesor/PerfilamientoVisitaPanel";
import { AsesorCadenciaLeadPanel } from "@/components/asesor/AsesorCadenciaLeadPanel";
import { formatPrice } from "@/lib/data";
import type { ProspectoDetail, ProspectoListRow, ProspectosResumen } from "@/lib/admin/prospectos-service";
import { prefillCotizadorFromProspecto } from "@/lib/asesores/prefill-cotizador-client";
import {
  ETAPAS_ASESOR,
  prospectoAsesorPuedeCotizarOSolicitarApartado,
  prospectoEtapaEditableByAsesor,
} from "@/lib/asesores/prospectos-client";
import {
  asesorRolLabel,
  isLeadershipAsesorRol,
  type AsesorRol,
} from "@/lib/asesores/types";
import { partnerTipoLabel, type PartnerTipo } from "@/lib/admin/partners-types";
import {
  formatLeadActivity,
  formatLeadDate,
  formatLeadDateOnly,
  leadPeriodToRange,
  type LeadPeriodFilter,
} from "@/lib/comercial/format-lead-date";
import {
  canAdvancePlaybookEtapa,
  getNecesidadesPerfilDesarrolloHint,
  type CrmPlaybookConfig,
  type PlaybookQueueItem,
} from "@/lib/comercial/crm-playbook";
import { useCrmPlaybookEnabled } from "@/lib/comercial/use-crm-playbook-enabled";
import type { ProspectoPlaybookState } from "@/lib/comercial/crm-playbook-service";
import type { CadenciaStatus } from "@/lib/comercial/cadencia-perfilamiento";
import {
  PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS,
  readPerfilamientoVisitaFromProspecto,
  resolvePerfilCalificacionLead,
  perfilCalificacionLeadBannerClass,
  perfilCalificacionLeadDescription,
  type PerfilamientoVisitaAnswers,
} from "@/lib/comercial/perfilamiento-post-visita";
import {
  validateProspectoTelefono,
  formatProspectoTelefonoDisplay,
} from "@/lib/comercial/prospecto-telefono";
import {
  isProspectoEtapa,
  PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO,
  PROSPECTO_ETAPAS_EN_SEGUIMIENTO,
  PROSPECTO_ETAPAS,
  prospectoEtapaColor,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";

type AsesorLeadsPanelProps = {
  asesorId: string;
  asesorNombre: string;
  asesorRol: AsesorRol;
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
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#201044]/40 focus:outline-none focus:ring-2 focus:ring-[#201044]/10";

function AsesorLeadDrawer({
  asesorId,
  asesorNombre,
  desarrolloId,
  desarrolloNombre,
  canReassignProspectos,
  prospectoId,
  onClose,
  onUpdated,
}: {
  asesorId: string;
  asesorNombre: string;
  desarrolloId: string;
  desarrolloNombre: string;
  canReassignProspectos: boolean;
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
  const [assignedAsesorId, setAssignedAsesorId] = useState("");
  const [equipoAsesores, setEquipoAsesores] = useState<Array<{ id: string; nombre: string; rol: AsesorRol }>>(
    [],
  );
  const [apartadoModalOpen, setApartadoModalOpen] = useState(false);
  const [solicitudPendiente, setSolicitudPendiente] = useState(false);
  const [tieneOperacionActiva, setTieneOperacionActiva] = useState(false);

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
        setAssignedAsesorId(data.prospecto.asesor_id ?? "");
      }

      const solicitudRes = await fetch(
        `/api/asesores/prospectos/${prospectoId}/solicitud-apartado?asesorId=${encodeURIComponent(asesorId)}`,
      );
      if (solicitudRes.ok) {
        const solicitudData = (await solicitudRes.json()) as { solicitud?: { id: string } | null };
        setSolicitudPendiente(Boolean(solicitudData.solicitud));
      }

      const expedienteRes = await fetch(
        `/api/asesores/expedientes?asesorId=${encodeURIComponent(asesorId)}&prospectoId=${encodeURIComponent(prospectoId)}`,
      );
      if (expedienteRes.ok) {
        const expedienteData = (await expedienteRes.json()) as {
          expediente?: { operacionId: string } | null;
        };
        setTieneOperacionActiva(Boolean(expedienteData.expediente));
      } else {
        setTieneOperacionActiva(false);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [asesorId, prospectoId]);

  useEffect(() => {
    if (!canReassignProspectos) {
      setEquipoAsesores([]);
      return;
    }

    void (async () => {
      try {
        const params = new URLSearchParams({ asesorId, desarrolloId });
        const response = await fetch(`/api/asesores/equipo?${params.toString()}`);
        const data = (await response.json()) as {
          asesores?: Array<{ id: string; nombre: string; rol: AsesorRol }>;
        };
        if (response.ok) {
          setEquipoAsesores(data.asesores ?? []);
        }
      } catch {
        setEquipoAsesores([]);
      }
    })();
  }, [asesorId, canReassignProspectos, desarrolloId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const etapaEditable = detail ? prospectoEtapaEditableByAsesor(detail.etapa) : false;
  const puedeAccionesComerciales =
    detail != null &&
    prospectoAsesorPuedeCotizarOSolicitarApartado(detail.etapa) &&
    !tieneOperacionActiva;
  const puedeSolicitarApartado = puedeAccionesComerciales && !solicitudPendiente;
  const perfilCalificacion = detail ? resolvePerfilCalificacionLead(detail) : null;

  const isEtapaOptionAllowed = (target: ProspectoEtapa) => {
    if (!detail || !playbook?.config?.enabled || !playbook.config.blockEtapa) {
      return true;
    }
    const current = isProspectoEtapa(detail.etapa) ? detail.etapa : "nuevo";
    const completedIds = new Set(playbook.completedStepIds);
    return canAdvancePlaybookEtapa(playbook.config, current, target, completedIds).ok;
  };

  const handleCompleteStep = async (
    stepId: string,
    stepDate?: string,
    perfilamientoVisita?: PerfilamientoVisitaAnswers,
  ) => {
    setCompletingStepId(stepId);
    setError("");

    try {
      const response = await fetch(`/api/asesores/prospectos/${prospectoId}/playbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asesorId, stepId, stepDate, perfilamientoVisita }),
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
          assignedAsesorId: canReassignProspectos ? assignedAsesorId || null : undefined,
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
      <div className="flex h-full w-full max-w-lg flex-col bg-white pt-[env(safe-area-inset-top)] shadow-[0_0_40px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Seguimiento
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold tracking-tight text-[#201044] md:text-xl">
                {detail?.nombre ?? "Cargando…"}
              </h3>
              {perfilCalificacion ? (
                <PerfilCalificacionLeadBadge calificacion={perfilCalificacion} size="lg" />
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" strokeWidth={2} />
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
              {perfilCalificacion ? (
                <div
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${perfilCalificacionLeadBannerClass[perfilCalificacion]}`}
                >
                  <PerfilCalificacionLeadBadge calificacion={perfilCalificacion} size="lg" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Calificación del lead: {perfilCalificacion}</p>
                    <p className="mt-0.5 text-xs leading-relaxed opacity-90">
                      {perfilCalificacionLeadDescription[perfilCalificacion]}
                    </p>
                  </div>
                </div>
              ) : null}

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
                {detail.partnerNombre ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Aliado</span>
                    <span className="font-medium text-right">
                      {detail.partnerNombre}
                      {detail.partnerTipo
                        ? ` · ${partnerTipoLabel[detail.partnerTipo as PartnerTipo] ?? detail.partnerTipo}`
                        : ""}
                    </span>
                  </div>
                ) : null}
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
                {canReassignProspectos ? (
                  <div className="border-t border-slate-200 pt-3">
                    <label className="block text-xs font-semibold text-slate-600">
                      Asesor asignado
                      <select
                        value={assignedAsesorId}
                        onChange={(event) => setAssignedAsesorId(event.target.value)}
                        className={`${inputClass} mt-1`}
                      >
                        <option value="">Sin asesor</option>
                        {equipoAsesores.map((asesor) => (
                          <option key={asesor.id} value={asesor.id}>
                            {asesor.nombre} · {asesorRolLabel[asesor.rol]}
                          </option>
                        ))}
                        {assignedAsesorId &&
                        !equipoAsesores.some((asesor) => asesor.id === assignedAsesorId) &&
                        detail.asesorNombre ? (
                          <option value={assignedAsesorId}>{detail.asesorNombre}</option>
                        ) : null}
                      </select>
                    </label>
                    <p className="mt-1 text-xs text-slate-500">
                      Como gerencia puedes reasignar este prospecto a otro miembro del equipo.
                    </p>
                  </div>
                ) : detail.asesorNombre ? (
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">Asesor</span>
                    <span className="font-medium">{detail.asesorNombre}</span>
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
                    <strong>{prospectoEtapaLabel.perdido}</strong> para liberar tu bandeja.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEtapa("perdido")}
                    className="mt-2 text-xs font-bold text-[#201044] underline-offset-2 hover:underline"
                  >
                    Marcar como {prospectoEtapaLabel.perdido}
                  </button>
                </div>
              ) : null}

              {playbook?.config?.enabled ? (
                <PerfilamientoVisitaPanel
                  record={readPerfilamientoVisitaFromProspecto(detail)}
                  loading={
                    completingStepId !== null &&
                    PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS.has(completingStepId)
                  }
                  desarrolloHint={getNecesidadesPerfilDesarrolloHint(detail.desarrollo_id)}
                  onSubmit={(answers) =>
                    void handleCompleteStep("necesidades-perfiladas", undefined, answers)
                  }
                />
              ) : null}

              {playbook?.config?.enabled ? (
                <CrmPlaybookChecklist
                  etapa={isProspectoEtapa(detail.etapa) ? detail.etapa : "nuevo"}
                  playbook={playbook}
                  completingStepId={completingStepId}
                  contactContext={{
                    prospectoNombre: detail.nombre,
                    telefono: detail.telefono,
                    desarrolloNombre,
                    asesorNombre,
                  }}
                  visitaAgendadaOn={detail.visita_agendada_on}
                  visitaRealizadaOn={detail.visita_realizada_on}
                  perfilamientoVisita={readPerfilamientoVisitaFromProspecto(detail)}
                  onCompleteStep={(stepId, stepDate, perfilamientoVisita) =>
                    void handleCompleteStep(stepId, stepDate, perfilamientoVisita)
                  }
                />
              ) : null}

              {playbook?.config?.enabled && detail.etapa !== "nuevo" ? (
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
                          <div className="min-w-0">
                            <p className="font-bold text-[#201044]">
                              {cotizacion.unidad_numero
                                ? `Unidad ${cotizacion.unidad_numero}`
                                : "Cotización"}
                            </p>
                            <p className="text-slate-500">{cotizacion.esquema_pago ?? "—"}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {cotizacion.created_at ? (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(cotizacion.created_at).toLocaleDateString("es-MX", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                              ) : null}
                              {cotizacion.pdf_generado_at ? (
                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-100">
                                  PDF enviado
                                </span>
                              ) : (
                                <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-100">
                                  Cotizada
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="shrink-0 font-bold tabular-nums">
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
          <div className="space-y-2 border-t border-slate-100 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {puedeSolicitarApartado ? (
              <button
                type="button"
                onClick={() => setApartadoModalOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100/80"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={2} />
                Solicitar apartado a gerencia
              </button>
            ) : solicitudPendiente && puedeAccionesComerciales ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-900">
                Solicitud de apartado pendiente — gerencia la registrará en sembrado.
              </p>
            ) : null}
            {puedeAccionesComerciales ? (
              <Link
                href="/cotizador"
                onClick={() => prefillCotizadorFromProspecto(detail)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#201044] transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Calculator className="h-4 w-4" strokeWidth={2} />
                Cotizar
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-semibold text-white transition hover:bg-[#2a1760] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2} />}
              Guardar seguimiento
            </button>
          </div>
        ) : null}
      </div>

      {apartadoModalOpen && detail ? (
        <SolicitarApartadoModal
          asesorId={asesorId}
          desarrolloNombre={desarrolloNombre}
          prospectoId={prospectoId}
          onClose={() => setApartadoModalOpen(false)}
          onSuccess={() => {
            setApartadoModalOpen(false);
            setSolicitudPendiente(true);
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
  asesorNombre,
  asesorRol,
  desarrolloId,
  desarrolloNombre,
  initialProspectoId,
}: AsesorLeadsPanelProps) {
  const canManageAllProspectos = isLeadershipAsesorRol(asesorRol);
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [periodFilter, setPeriodFilter] = useState<LeadPeriodFilter>("");
  const [etapaFilter, setEtapaFilter] = useState(PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO);
  const [calificacionFilter, setCalificacionFilter] = useState<"" | "A" | "B" | "C" | "sin">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [prospectos, setProspectos] = useState<ProspectoListRow[]>([]);
  const [resumen, setResumen] = useState<ProspectosResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kanbanApartadoProspectoId, setKanbanApartadoProspectoId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newTelefonoError, setNewTelefonoError] = useState("");
  const [checkingTelefono, setCheckingTelefono] = useState(false);
  const [newMedioContacto, setNewMedioContacto] = useState("contacto-directo");
  const [newPartnerId, setNewPartnerId] = useState("");
  const [partners, setPartners] = useState<Array<{ id: string; nombre: string; tipo: PartnerTipo }>>(
    [],
  );
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [newNotas, setNewNotas] = useState("");
  const [playbookQueue, setPlaybookQueue] = useState<PlaybookQueueItem[]>([]);
  const [playbookConfig, setPlaybookConfig] = useState<CrmPlaybookConfig | null>(null);
  const [complianceOverdue, setComplianceOverdue] = useState(0);
  const playbookEnabledApi = useCrmPlaybookEnabled(asesorId, desarrolloId);
  const playbookEnabled = playbookEnabledApi && playbookConfig?.enabled;

  const periodRange = useMemo(() => leadPeriodToRange(periodFilter), [periodFilter]);
  const newTelefonoValidation = useMemo(() => validateProspectoTelefono(newTelefono), [newTelefono]);

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

  useEffect(() => {
    if (!showNewLead) {
      setNewTelefonoError("");
      setCheckingTelefono(false);
      return;
    }

    const validation = validateProspectoTelefono(newTelefono);
    if (!validation.ok) {
      setNewTelefonoError(newTelefono.trim() ? validation.error : "");
      setCheckingTelefono(false);
      return;
    }

    setCheckingTelefono(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            asesorId,
            desarrolloId,
            telefono: validation.telefono,
          });
          const response = await fetch(`/api/asesores/prospectos/check-telefono?${params}`);
          const data = (await response.json()) as { valid?: boolean; error?: string };

          if (!response.ok) {
            setNewTelefonoError(data.error ?? "No se pudo validar el teléfono.");
            return;
          }

          setNewTelefonoError(data.valid ? "" : data.error ?? "Teléfono no disponible.");
        } catch {
          setNewTelefonoError("");
        } finally {
          setCheckingTelefono(false);
        }
      })();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [asesorId, desarrolloId, newTelefono, showNewLead]);

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
    setNewTelefonoError("");
    setNewMedioContacto("contacto-directo");
    setNewPartnerId("");
    setNewNotas("");
  };

  const loadPartners = useCallback(async () => {
    setLoadingPartners(true);
    try {
      const params = new URLSearchParams({
        asesorId,
        desarrolloId,
      });
      const response = await fetch(`/api/asesores/partners?${params.toString()}`);
      const data = (await response.json()) as {
        partners?: Array<{ id: string; nombre: string; tipo: PartnerTipo }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar aliados.");
      }
      setPartners(data.partners ?? []);
    } catch {
      setPartners([]);
    } finally {
      setLoadingPartners(false);
    }
  }, [asesorId, desarrolloId]);

  useEffect(() => {
    if (showNewLead && newMedioContacto === "inmobiliaria-externo") {
      void loadPartners();
    }
  }, [showNewLead, newMedioContacto, loadPartners]);

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newNombre.trim()) {
      return;
    }

    if (newMedioContacto === "inmobiliaria-externo" && !newPartnerId) {
      setError("Selecciona la inmobiliaria o asesor externo que trajo el lead.");
      return;
    }

    const telefonoValidation = validateProspectoTelefono(newTelefono);
    if (!telefonoValidation.ok) {
      setNewTelefonoError(telefonoValidation.error);
      return;
    }

    if (newTelefonoError) {
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
          telefono: telefonoValidation.telefono,
          medioContacto: newMedioContacto,
          partnerId:
            newMedioContacto === "inmobiliaria-externo" ? newPartnerId || undefined : undefined,
          notas: newNotas.trim() || undefined,
        }),
      });

      const data = (await response.json()) as {
        prospecto?: ProspectoListRow & { asignadoAGerencia?: boolean };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el lead.");
      }

      setShowNewLead(false);
      resetNewLeadForm();
      if (data.prospecto?.asignadoAGerencia) {
        setError("");
        window.alert(
          "Lead registrado. Quedó asignado a gerencia para seguimiento (alianza inmobiliaria/externo).",
        );
      } else if (data.prospecto?.id) {
        setSelectedId(data.prospecto.id);
      }
      void loadLeads();
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : "Error al crear.";
      if (message.includes("teléfono") || message.includes("registrado") || message.includes("bandeja")) {
        setNewTelefonoError(message);
      }
      setError(message);
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

  const vigentesCount = useMemo(
    () =>
      PROSPECTO_ETAPAS_EN_SEGUIMIENTO.reduce(
        (sum, etapa) => sum + (resumen?.porEtapa?.[etapa] ?? 0),
        0,
      ),
    [resumen],
  );

  const calificacionCounts = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, sin: 0 };
    for (const row of prospectos) {
      const calificacion = resolvePerfilCalificacionLead(row);
      if (!calificacion) {
        counts.sin += 1;
      } else {
        counts[calificacion] += 1;
      }
    }
    return counts;
  }, [prospectos]);

  const visibleProspectos = useMemo(() => {
    if (!calificacionFilter) {
      return prospectos;
    }
    return prospectos.filter((row) => {
      const calificacion = resolvePerfilCalificacionLead(row);
      if (calificacionFilter === "sin") {
        return calificacion == null;
      }
      return calificacion === calificacionFilter;
    });
  }, [prospectos, calificacionFilter]);

  return (
    <div className="space-y-4">
      {playbookEnabled ? (
        <CrmPlaybookBanner
          queue={playbookQueue}
          overdueCount={complianceOverdue}
          onSelectLead={(prospectoId) => setSelectedId(prospectoId)}
        />
      ) : null}

      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              {canManageAllProspectos ? "Prospectos del desarrollo" : "Mis prospectos"}
            </p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-[#201044]">
              {desarrolloNombre}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {canManageAllProspectos
                ? `${resumen?.total ?? 0} leads en ${desarrolloNombre}`
                : `${resumen?.total ?? 0} leads asignados a ti`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-[#F7F6F2] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === "lista"
                    ? "bg-white text-[#201044] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" strokeWidth={2} />
                Lista
              </button>
              <button
                type="button"
                onClick={() => setViewMode("tablero")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  viewMode === "tablero"
                    ? "bg-white text-[#201044] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Kanban className="h-3.5 w-3.5" strokeWidth={2} />
                Tablero
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                resetNewLeadForm();
                setShowNewLead(true);
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[#201044] px-3.5 text-sm font-semibold text-white transition hover:bg-[#2a1760]"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo lead
            </button>
            <button
              type="button"
              onClick={() => void loadLeads()}
              aria-label="Actualizar"
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-[#201044]"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id || "all"}
              type="button"
              onClick={() => setPeriodFilter(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                periodFilter === option.id
                  ? "bg-[#201044] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {viewMode === "lista" ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setEtapaFilter(PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                etapaFilter === PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO
                  ? "bg-[#201044] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Por atender ({vigentesCount})
            </button>
            <button
              type="button"
              onClick={() => setEtapaFilter("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                !etapaFilter
                  ? "bg-[#201044] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              Todos ({resumen?.total ?? 0})
            </button>
            {etapasActivas.map(([etapa, count]) => (
              <button
                key={etapa}
                type="button"
                onClick={() =>
                  setEtapaFilter(
                    etapa === etapaFilter ? PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO : etapa,
                  )
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  etapaFilter === etapa
                    ? "bg-[#201044] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                {prospectoEtapaLabel[etapa as ProspectoEtapa] ?? etapa} ({count})
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {(
            [
              { id: "" as const, label: `Calif. todas (${prospectos.length})` },
              { id: "A" as const, label: `A (${calificacionCounts.A})` },
              { id: "B" as const, label: `B (${calificacionCounts.B})` },
              { id: "C" as const, label: `C (${calificacionCounts.C})` },
              { id: "sin" as const, label: `Sin calificar (${calificacionCounts.sin})` },
            ] as const
          ).map((option) => (
            <button
              key={option.id || "calif-all"}
              type="button"
              onClick={() => setCalificacionFilter(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                calificacionFilter === option.id
                  ? "bg-[#201044] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
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

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando prospectos…
          </div>
        ) : !visibleProspectos.length ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-slate-600">
              {calificacionFilter
                ? "No hay prospectos con esa calificación en la vista actual."
                : etapaFilter === PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO
                  ? "No hay prospectos por atender en este momento."
                  : canManageAllProspectos
                    ? "Aún no hay prospectos registrados en este desarrollo."
                    : "Aún no tienes prospectos registrados."}
            </p>
            {!calificacionFilter &&
            !canManageAllProspectos &&
            etapaFilter !== PROSPECTO_ETAPA_FILTER_EN_SEGUIMIENTO ? (
              <p className="mt-1 text-sm text-slate-500">
                Crea uno con <span className="font-semibold text-[#201044]">Nuevo lead</span>, haz un
                recorrido o cotiza.
              </p>
            ) : null}
          </div>
        ) : viewMode === "tablero" ? (
          <LeadsKanbanBoard
            prospectos={visibleProspectos}
            etapas={PROSPECTO_ETAPAS}
            movableEtapas={ETAPAS_ASESOR}
            formatActivity={formatLeadActivity}
            onSelect={setSelectedId}
            onMoveEtapa={handleMoveEtapa}
            onReportApartado={(prospectoId) => setKanbanApartadoProspectoId(prospectoId)}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleProspectos.map((row) => {
              const calificacion = resolvePerfilCalificacionLead(row);
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className="flex w-full items-center gap-3.5 px-5 py-3.5 text-left transition hover:bg-[#F7F6F2]/80"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#201044]/[0.06] text-[#201044]">
                      <UserRound className="h-4 w-4" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[#201044]">{row.nombre}</p>
                        {calificacion ? (
                          <PerfilCalificacionLeadBadge calificacion={calificacion} size="sm" />
                        ) : null}
                      </div>
                      <p className="truncate text-sm text-slate-500">
                        {row.email ?? row.telefono ?? "Sin contacto"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatLeadActivity(row.updated_at)}
                        {canManageAllProspectos && row.asesorNombre
                          ? ` · ${row.asesorNombre}`
                          : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        prospectoEtapaColor[row.etapa as ProspectoEtapa] ??
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {prospectoEtapaLabel[row.etapa as ProspectoEtapa] ?? row.etapa}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {selectedId ? (
        <AsesorLeadDrawer
          asesorId={asesorId}
          asesorNombre={asesorNombre}
          desarrolloId={desarrolloId}
          desarrolloNombre={desarrolloNombre}
          canReassignProspectos={canManageAllProspectos}
          prospectoId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => {
            void loadLeads();
            void loadPlaybookQueue();
          }}
        />
      ) : null}

      {kanbanApartadoProspectoId ? (
        <SolicitarApartadoModal
          asesorId={asesorId}
          desarrolloNombre={desarrolloNombre}
          prospectoId={kanbanApartadoProspectoId}
          onClose={() => setKanbanApartadoProspectoId(null)}
          onSuccess={() => {
            setKanbanApartadoProspectoId(null);
            void loadLeads();
            void loadPlaybookQueue();
          }}
        />
      ) : null}

      {showNewLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <form
            onSubmit={(event) => void handleCreateLead(event)}
            className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.2)]"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              Registro
            </p>
            <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-[#201044]">Nuevo lead</h3>
            <p className="mt-1 text-sm text-slate-500">
              {newMedioContacto === "inmobiliaria-externo" && !canManageAllProspectos
                ? `Alianza: se asignará a gerencia en ${desarrolloNombre}.`
                : `Asignado a ti en ${desarrolloNombre}.`}
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
              <span className="mb-1 block font-semibold text-slate-600">Teléfono *</span>
              <input
                type="tel"
                required
                inputMode="numeric"
                autoComplete="tel"
                maxLength={14}
                value={newTelefono}
                onChange={(event) => setNewTelefono(event.target.value)}
                placeholder="10 dígitos"
                className={`${inputClass} ${newTelefonoError ? "border-rose-300 ring-1 ring-rose-200" : ""}`}
              />
              {checkingTelefono ? (
                <p className="mt-1 text-xs text-slate-500">Verificando teléfono…</p>
              ) : null}
              {newTelefonoError ? (
                <p className="mt-1 text-xs font-medium text-rose-700">{newTelefonoError}</p>
              ) : newTelefonoValidation.ok && !checkingTelefono ? (
                <p className="mt-1 text-xs text-emerald-700">
                  Teléfono válido: {formatProspectoTelefonoDisplay(newTelefonoValidation.telefono)}
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">Obligatorio: 10 dígitos sin repetir en el desarrollo.</p>
              )}
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Medio de contacto</span>
              <select
                value={newMedioContacto}
                onChange={(event) => {
                  const next = event.target.value;
                  setNewMedioContacto(next);
                  if (next !== "inmobiliaria-externo") {
                    setNewPartnerId("");
                  }
                }}
                className={inputClass}
              >
                {MEDIO_CONTACTO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {newMedioContacto === "inmobiliaria-externo" ? (
              <label className="mt-3 block text-sm">
                <span className="mb-1 block font-semibold text-slate-600">
                  Inmobiliaria / asesor externo *
                </span>
                <select
                  required
                  value={newPartnerId}
                  onChange={(event) => setNewPartnerId(event.target.value)}
                  className={inputClass}
                  disabled={loadingPartners}
                >
                  <option value="">
                    {loadingPartners ? "Cargando aliados…" : "Selecciona aliado"}
                  </option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.nombre} · {partnerTipoLabel[partner.tipo]}
                    </option>
                  ))}
                </select>
                {!loadingPartners && partners.length === 0 ? (
                  <p className="mt-1 text-xs text-amber-700">
                    No hay aliados activos. Regístralos en Admin → Alianzas (por comercializadora).
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    Obligatorio para leads de inmobiliaria o externo. Gerencia da el seguimiento.
                  </p>
                )}
              </label>
            ) : null}
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
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  creating ||
                  checkingTelefono ||
                  Boolean(newTelefonoError) ||
                  (newMedioContacto === "inmobiliaria-externo" &&
                    (!newPartnerId || partners.length === 0))
                }
                className="rounded-lg bg-[#201044] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a1760] disabled:opacity-50"
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

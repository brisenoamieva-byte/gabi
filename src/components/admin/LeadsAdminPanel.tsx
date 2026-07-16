"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Kanban,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  UserRoundCog,
} from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ProspectoListRow, ProspectosResumen } from "@/lib/admin/prospectos-service";
import { CapturaLogsPanel } from "@/components/admin/CapturaLogsPanel";
import { LeadsComplianceBanner } from "@/components/admin/LeadsComplianceBanner";
import { SolicitudesApartadoBanner } from "@/components/admin/SolicitudesApartadoBanner";
import { LeadDetailDrawer } from "@/components/admin/LeadDetailDrawer";
import { LeadsKanbanBoard } from "@/components/admin/LeadsKanbanBoard";
import { exportLeadsCsv, LeadsXperienceTable } from "@/components/admin/LeadsXperienceTable";
import {
  PROSPECTO_ETAPAS,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import { NIVELES_INTERES, nivelInteresLabel } from "@/lib/comercial/prospecto-interes";
import { formatLeadsDateRangeLabel } from "@/lib/comercial/xperience-leads";
import type { DesarrolloComplianceReport } from "@/lib/comercial/crm-compliance-service";
import type { SolicitudApartadoRow } from "@/lib/comercial/solicitud-apartado-service";
import { resolveAdminDesarrolloId } from "@/lib/admin/admin-desarrollo-session";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type LeadsAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  initialDesarrolloId?: string;
  initialAsesorId?: string;
  initialDesde?: string;
  initialHasta?: string;
  initialProspectoId?: string;
};

type AsesorOption = {
  id: string;
  nombre: string;
};

type CampanaOption = {
  id: string;
  nombre: string;
  canal: string | null;
};

type PartnerOption = {
  id: string;
  nombre: string;
  tipo: string;
};

type ViewMode = "lista" | "tablero";
type LeadTab = "leads" | "spam" | "duplicados" | "captura";

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
};

export function LeadsAdminPanel({
  desarrollos,
  scopeLabel,
  initialDesarrolloId,
  initialAsesorId,
  initialDesde,
  initialHasta,
  initialProspectoId,
}: LeadsAdminPanelProps) {
  const monthDefault = currentMonthRange();
  const resolvedDesarrolloId = resolveAdminDesarrolloId(desarrollos, {
    urlDesarrolloId: initialDesarrolloId,
  });

  const [leadTab, setLeadTab] = useState<LeadTab>("leads");
  const [viewMode, setViewMode] = useState<ViewMode>("lista");

  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos, {
    urlDesarrolloId: initialDesarrolloId,
  });
  const [etapaFilter, setEtapaFilter] = useState("");
  const [asesorFilter, setAsesorFilter] = useState(initialAsesorId ?? "");
  const [campanaFilter, setCampanaFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [interesFilter, setInteresFilter] = useState("");
  const [desde, setDesde] = useState(initialDesde ?? monthDefault.desde);
  const [hasta, setHasta] = useState(initialHasta ?? monthDefault.hasta);

  const [applied, setApplied] = useState({
    desarrolloId: resolvedDesarrolloId,
    etapaFilter: "",
    asesorFilter: initialAsesorId ?? "",
    campanaFilter: "",
    partnerFilter: "",
    interesFilter: "",
    desde: initialDesde ?? monthDefault.desde,
    hasta: initialHasta ?? monthDefault.hasta,
    leadTab: "leads" as LeadTab,
  });

  const [prospectos, setProspectos] = useState<ProspectoListRow[]>([]);
  const [resumen, setResumen] = useState<ProspectosResumen | null>(null);
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [campanas, setCampanas] = useState<CampanaOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showNewLead, setShowNewLead] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [bulkReassignAsesorId, setBulkReassignAsesorId] = useState("");
  const [canDeleteProspectos, setCanDeleteProspectos] = useState(false);
  const [canReassignProspectos, setCanReassignProspectos] = useState(false);
  const [complianceReport, setComplianceReport] = useState<DesarrolloComplianceReport | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [solicitudesApartado, setSolicitudesApartado] = useState<SolicitudApartadoRow[]>([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const prevDesarrolloId = useRef<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const deepLinkHandled = useRef(false);

  const loadAsesores = useCallback(async () => {
    if (!desarrolloId) {
      setAsesores([]);
      return;
    }

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
    if (!desarrolloId) {
      setCampanas([]);
      return;
    }

    try {
      const params = new URLSearchParams({ desarrolloId, activoOnly: "1" });
      const response = await fetch(`/api/admin/campanas?${params.toString()}`);
      const data = (await response.json()) as { campanas?: CampanaOption[] };
      setCampanas(data.campanas ?? []);
    } catch {
      setCampanas([]);
    }
  }, [desarrolloId]);

  const loadPartners = useCallback(async () => {
    if (!desarrolloId) {
      setPartners([]);
      return;
    }

    try {
      const params = new URLSearchParams({ desarrolloId, activoOnly: "1" });
      const response = await fetch(`/api/admin/partners?${params.toString()}`);
      const data = (await response.json()) as { partners?: PartnerOption[] };
      setPartners(data.partners ?? []);
    } catch {
      setPartners([]);
    }
  }, [desarrolloId]);

  const loadCompliance = useCallback(async () => {
    if (!desarrolloId) {
      setComplianceReport(null);
      return;
    }

    setComplianceLoading(true);
    try {
      const response = await fetch(
        `/api/admin/crm-compliance?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as { report?: DesarrolloComplianceReport };
      if (response.ok) {
        setComplianceReport(data.report ?? null);
      } else {
        setComplianceReport(null);
      }
    } catch {
      setComplianceReport(null);
    } finally {
      setComplianceLoading(false);
    }
  }, [desarrolloId]);

  const loadSolicitudesApartado = useCallback(async () => {
    if (!desarrolloId) {
      setSolicitudesApartado([]);
      return;
    }

    setSolicitudesLoading(true);
    try {
      const response = await fetch(
        `/api/admin/solicitudes-apartado?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as {
        solicitudes?: SolicitudApartadoRow[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las solicitudes.");
      }

      setSolicitudesApartado(data.solicitudes ?? []);
    } catch {
      setSolicitudesApartado([]);
    } finally {
      setSolicitudesLoading(false);
    }
  }, [desarrolloId]);

  const openProspecto = useCallback((prospectoId: string) => {
    setLeadTab("leads");
    setSelectedId(prospectoId);
  }, []);

  const clearProspectoQueryParam = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (!url.searchParams.has("prospecto")) {
      return;
    }

    url.searchParams.delete("prospecto");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const loadLeads = useCallback(async () => {
    const active = applied;
    if (!active.desarrolloId) {
      setProspectos([]);
      setResumen(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSelectedIds(new Set());

    try {
      const params = new URLSearchParams({ desarrolloId: active.desarrolloId, resumen: "1" });
      if (viewMode === "lista" && active.etapaFilter) {
        params.set("etapa", active.etapaFilter);
      }
      if (active.asesorFilter) {
        params.set("asesorId", active.asesorFilter);
      }
      if (active.campanaFilter) {
        params.set("campanaId", active.campanaFilter);
      }
      if (active.partnerFilter) {
        params.set("partnerId", active.partnerFilter);
      }
      if (active.interesFilter) {
        params.set("nivelInteres", active.interesFilter);
      }
      params.set("spam", active.leadTab === "spam" ? "only" : "exclude");
      params.set(
        "duplicados",
        active.leadTab === "duplicados"
          ? "only"
          : active.leadTab === "spam"
            ? "include"
            : "exclude",
      );
      if (active.desde) {
        params.set("desde", active.desde);
      }
      if (active.hasta) {
        params.set("hasta", active.hasta);
      }

      const response = await fetch(`/api/admin/prospectos?${params.toString()}`);
      const data = (await response.json()) as {
        prospectos?: ProspectoListRow[];
        resumen?: ProspectosResumen;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los leads.");
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
  }, [applied, viewMode]);

  useEffect(() => {
    void fetch("/api/admin/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { canDeleteProspectos?: boolean; canReassignProspectos?: boolean } | null) => {
        if (!data) {
          return;
        }
        setCanDeleteProspectos(Boolean(data.canDeleteProspectos));
        setCanReassignProspectos(Boolean(data.canReassignProspectos));
      })
      .catch(() => {
        setCanDeleteProspectos(false);
        setCanReassignProspectos(false);
      });
  }, []);

  useEffect(() => {
    void loadAsesores();
    void loadCampanas();
    void loadPartners();
    void loadCompliance();
    void loadSolicitudesApartado();

    if (prevDesarrolloId.current !== null && prevDesarrolloId.current !== desarrolloId) {
      setAsesorFilter("");
      setCampanaFilter("");
      setPartnerFilter("");
    }
    prevDesarrolloId.current = desarrolloId;
  }, [loadAsesores, loadCampanas, loadPartners, loadCompliance, loadSolicitudesApartado, desarrolloId]);

  useEffect(() => {
    if (!initialProspectoId || deepLinkHandled.current) {
      return;
    }

    deepLinkHandled.current = true;

    const openDeepLink = async () => {
      try {
        if (!initialDesarrolloId) {
          const response = await fetch(`/api/admin/prospectos/${initialProspectoId}`);
          const data = (await response.json()) as {
            prospecto?: { desarrollo_id?: string };
          };

          if (response.ok && data.prospecto?.desarrollo_id) {
            const nextDesarrolloId = data.prospecto.desarrollo_id;
            setDesarrolloId(nextDesarrolloId);
            setApplied((prev) => ({ ...prev, desarrolloId: nextDesarrolloId }));
          }
        }

        openProspecto(initialProspectoId);
      } finally {
        clearProspectoQueryParam();
      }
    };

    void openDeepLink();
  }, [
    clearProspectoQueryParam,
    initialDesarrolloId,
    initialProspectoId,
    openProspecto,
    setDesarrolloId,
  ]);

  useEffect(() => {
    if (leadTab === "captura") {
      return;
    }
    void loadLeads();
  }, [loadLeads, leadTab]);

  const applyFilters = () => {
    setApplied({
      desarrolloId,
      etapaFilter,
      asesorFilter,
      campanaFilter,
      partnerFilter,
      interesFilter,
      desde,
      hasta,
      leadTab,
    });
  };

  useEffect(() => {
    setApplied((prev) => ({ ...prev, leadTab }));
  }, [leadTab]);

  useEffect(() => {
    if (!showExportMenu) {
      return;
    }
    const closeOnClick = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", closeOnClick);
    return () => document.removeEventListener("mousedown", closeOnClick);
  }, [showExportMenu]);

  const etapaOptions = useMemo(() => {
    if (!resumen) {
      return [];
    }
    return PROSPECTO_ETAPAS.filter((etapa) => (resumen.porEtapa[etapa] ?? 0) > 0);
  }, [resumen]);

  const dateRangeLabel = formatLeadsDateRangeLabel(applied.desde, applied.hasta);

  const handleMoveEtapa = async (prospectoId: string, etapa: ProspectoEtapa) => {
    const response = await fetch(`/api/admin/prospectos/${prospectoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "No se pudo mover el lead.");
    }

    setProspectos((prev) =>
      prev.map((row) => (row.id === prospectoId ? { ...row, etapa } : row)),
    );
    void loadLeads();
  };

  const handleSyncInteligencia = async () => {
    if (!applied.desarrolloId) {
      return;
    }

    setSyncing(true);
    setError("");

    try {
      const response = await fetch("/api/admin/prospectos/sync-inteligencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desarrolloId: applied.desarrolloId }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo sincronizar.");
      }

      void loadLeads();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Error al sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateLead = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newNombre.trim()) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response = await fetch("/api/admin/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          nombre: newNombre.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el lead.");
      }

      setNewNombre("");
      setShowNewLead(false);
      applyFilters();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear.");
    } finally {
      setCreating(false);
    }
  };

  const downloadCsv = (rows: ProspectoListRow[]) => {
    const csv = exportLeadsCsv(rows, desarrollos);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${applied.desarrolloId}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size || !canDeleteProspectos) {
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar ${selectedIds.size} lead(s) seleccionado(s)? Esta acción los archiva del listado.`,
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/admin/prospectos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });
      const data = (await response.json()) as { deleted?: number; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron eliminar los leads.");
      }
      setSelectedIds(new Set());
      void loadLeads();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkReassign = async () => {
    if (!selectedIds.size || !canReassignProspectos || !bulkReassignAsesorId) {
      return;
    }

    const asesorNombre =
      asesores.find((asesor) => asesor.id === bulkReassignAsesorId)?.nombre ?? "el asesor elegido";
    const confirmed = window.confirm(
      `¿Reasignar ${selectedIds.size} lead(s) a ${asesorNombre}?`,
    );
    if (!confirmed) {
      return;
    }

    setReassigning(true);
    setError("");

    try {
      const response = await fetch("/api/admin/prospectos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reassign",
          ids: Array.from(selectedIds),
          asesorId: bulkReassignAsesorId,
        }),
      });
      const data = (await response.json()) as { reassigned?: number; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron reasignar los leads.");
      }
      setSelectedIds(new Set());
      void loadLeads();
    } catch (reassignError) {
      setError(reassignError instanceof Error ? reassignError.message : "Error al reasignar.");
    } finally {
      setReassigning(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      if (ids.length && ids.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(ids);
    });
  };

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados para ver leads.
      </div>
    );
  }

  const filterInputClass =
    "w-full rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none focus:border-gabi-forest";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="shrink-0 overflow-hidden rounded-2xl border border-gabi-forest/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {(["leads", "spam", "duplicados", "captura"] as LeadTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeadTab(tab)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize transition ${
                  leadTab === tab
                    ? "bg-gabi-forest text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab === "captura" ? "Captura" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {leadTab !== "captura" ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <LeadsComplianceBanner
                compact
                report={complianceReport}
                loading={complianceLoading}
                desarrolloId={desarrolloId}
              />

              {leadTab === "leads" ? (
                <div className="flex rounded-lg border border-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("lista");
                      setEtapaFilter("");
                    }}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      viewMode === "lista" ? "bg-gabi-forest text-white" : "text-slate-600"
                    }`}
                  >
                    <LayoutList className="h-3 w-3" />
                    Tabla
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("tablero")}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      viewMode === "tablero" ? "bg-gabi-forest text-white" : "text-slate-600"
                    }`}
                  >
                    <Kanban className="h-3 w-3" />
                    Tablero
                  </button>
                </div>
              ) : null}

              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu((value) => !value)}
                  disabled={!prospectos.length}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 disabled:opacity-50"
                >
                  Exportar…
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showExportMenu ? (
                  <div className="absolute right-0 z-20 mt-1 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => downloadCsv(prospectos)}
                      className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      CSV (vista actual)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsv(
                          selectedIds.size
                            ? prospectos.filter((r) => selectedIds.has(r.id))
                            : prospectos,
                        )
                      }
                      disabled={!selectedIds.size}
                      className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      CSV (seleccionados)
                    </button>
                  </div>
                ) : null}
              </div>

              {canReassignProspectos ? (
                <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5">
                  <select
                    value={bulkReassignAsesorId}
                    onChange={(event) => setBulkReassignAsesorId(event.target.value)}
                    disabled={!selectedIds.size || reassigning}
                    className="max-w-[8rem] rounded-md border-0 bg-transparent px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Reasignar a…</option>
                    {asesores.map((asesor) => (
                      <option key={asesor.id} value={asesor.id}>
                        {asesor.nombre}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void handleBulkReassign()}
                    disabled={!selectedIds.size || !bulkReassignAsesorId || reassigning}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-gabi-forest disabled:opacity-50"
                  >
                    <UserRoundCog className="h-3 w-3" />
                    {reassigning ? "…" : "Aplicar"}
                  </button>
                </div>
              ) : null}

              {canDeleteProspectos ? (
                <button
                  type="button"
                  onClick={() => void handleBulkDelete()}
                  disabled={!selectedIds.size || deleting}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-[10px] font-bold text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  {deleting ? "…" : "Eliminar"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setShowNewLead(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-gabi-forest px-2 py-1 text-[10px] font-bold text-white"
              >
                <Plus className="h-3 w-3" />
                Lead
              </button>
            </div>
          ) : null}
        </div>

        {leadTab !== "captura" ? (
          <div
            className="border-b border-slate-100 px-3 py-2"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyFilters();
              }
            }}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 xl:items-end">
              <label className="block text-[10px]">
                <span className="mb-0.5 block font-semibold text-slate-500">Desde</span>
                <input
                  type="date"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                  className={filterInputClass}
                />
              </label>

              <label className="block text-[10px]">
                <span className="mb-0.5 block font-semibold text-slate-500">Hasta</span>
                <input
                  type="date"
                  value={hasta}
                  onChange={(event) => setHasta(event.target.value)}
                  className={filterInputClass}
                />
              </label>

              <label className="block text-[10px]">
                <span className="mb-0.5 block font-semibold text-slate-500">Desarrollo</span>
                <select
                  value={desarrolloId}
                  onChange={(event) => setDesarrolloId(event.target.value)}
                  className={filterInputClass}
                >
                  {desarrollos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px]">
                <span className="mb-0.5 block font-semibold text-slate-500">Campaña</span>
                <select
                  value={campanaFilter}
                  onChange={(event) => setCampanaFilter(event.target.value)}
                  className={filterInputClass}
                >
                  <option value="">Todas</option>
                  {campanas.map((campana) => (
                    <option key={campana.id} value={campana.id}>
                      {campana.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px]">
                <span className="mb-0.5 block font-semibold text-slate-500">Aliado</span>
                <select
                  value={partnerFilter}
                  onChange={(event) => setPartnerFilter(event.target.value)}
                  className={filterInputClass}
                >
                  <option value="">Todos</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[10px]">
                <span className="mb-0.5 block font-semibold text-slate-500">Asesor</span>
                <select
                  value={asesorFilter}
                  onChange={(event) => setAsesorFilter(event.target.value)}
                  className={filterInputClass}
                >
                  <option value="">Todos</option>
                  {asesores.map((asesor) => (
                    <option key={asesor.id} value={asesor.id}>
                      {asesor.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {viewMode === "lista" ? (
                <label className="block text-[10px]">
                  <span className="mb-0.5 block font-semibold text-slate-500">Etapa</span>
                  <select
                    value={etapaFilter}
                    onChange={(event) => setEtapaFilter(event.target.value)}
                    className={filterInputClass}
                  >
                    <option value="">Todas</option>
                    {etapaOptions.map((etapa) => (
                      <option key={etapa} value={etapa}>
                        {prospectoEtapaLabel[etapa]} ({resumen?.porEtapa[etapa] ?? 0})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="hidden xl:block" />
              )}

              <label className="block text-[10px]">
                <span className="mb-0.5 block font-semibold text-slate-500">Interés</span>
                <select
                  value={interesFilter}
                  onChange={(event) => setInteresFilter(event.target.value)}
                  className={filterInputClass}
                >
                  <option value="">Todos</option>
                  {NIVELES_INTERES.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivelInteresLabel[nivel]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="col-span-2 flex flex-wrap items-end gap-1.5 xl:col-span-1 xl:flex-col xl:items-stretch">
                <button
                  type="button"
                  onClick={applyFilters}
                  className="w-full rounded-lg bg-gabi-forest px-2 py-1 text-[10px] font-bold text-white"
                >
                  Aplicar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const range = currentMonthRange();
                    setDesde(range.desde);
                    setHasta(range.hasta);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600"
                >
                  Este mes
                </button>
              </div>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] text-slate-500">
                <span className="font-semibold text-gabi-forest">{dateRangeLabel}</span>
                {" · "}
                {resumen?.total ?? 0} en desarrollo · {prospectos.length} en vista
                {scopeLabel ? ` · ${scopeLabel}` : ""}
              </p>
              <button
                type="button"
                onClick={() => void handleSyncInteligencia()}
                disabled={syncing}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                iScore
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {leadTab === "captura" ? (
        <CapturaLogsPanel
          desarrolloId={desarrolloId}
          campanas={campanas}
          onOpenProspecto={(prospectoId) => {
            openProspecto(prospectoId);
          }}
        />
      ) : null}

      {leadTab !== "captura" && error ? (
        <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {leadTab === "leads" ? (
        <SolicitudesApartadoBanner
          solicitudes={solicitudesApartado}
          loading={solicitudesLoading}
          onOpenProspecto={openProspecto}
        />
      ) : null}

      {leadTab !== "captura" ? (
        <div className="flex min-h-[220px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {resumen && viewMode === "tablero" ? (
            <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-100 px-3 py-2">
              {PROSPECTO_ETAPAS.filter((etapa) => (resumen.porEtapa[etapa] ?? 0) > 0).map((etapa) => (
                <div
                  key={etapa}
                  className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1"
                >
                  <p className="text-sm font-black text-gabi-forest">{resumen.porEtapa[etapa]}</p>
                  <p className="text-[9px] font-semibold text-slate-500">{prospectoEtapaLabel[etapa]}</p>
                </div>
              ))}
            </div>
          ) : null}

          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando leads…
            </div>
          ) : !prospectos.length ? (
            <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
              No hay leads con el filtro actual. Ajusta fechas o pulsa Aplicar.
            </p>
          ) : leadTab === "leads" && viewMode === "tablero" ? (
            <div className="min-h-0 flex-1 overflow-auto p-3">
              <LeadsKanbanBoard
                prospectos={prospectos}
                onSelect={setSelectedId}
                onMoveEtapa={handleMoveEtapa}
              />
            </div>
          ) : (
            <LeadsXperienceTable
              prospectos={prospectos}
              desarrollos={desarrollos}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onSelect={setSelectedId}
              scrollable
            />
          )}
        </div>
      ) : null}

      {selectedId ? (
        <LeadDetailDrawer
          prospectoId={selectedId}
          onClose={() => {
            setSelectedId(null);
            void loadSolicitudesApartado();
          }}
          onUpdated={() => {
            void loadLeads();
            void loadSolicitudesApartado();
          }}
        />
      ) : null}

      {showNewLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(event) => void handleCreateLead(event)}
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <h3 className="text-lg font-black text-gabi-forest">Nuevo lead</h3>
            <p className="mt-1 text-sm text-slate-500">Registro manual para seguimiento comercial.</p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Nombre *</span>
              <input
                required
                autoFocus
                value={newNombre}
                onChange={(event) => setNewNombre(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
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
                className="rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
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

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  Kanban,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ProspectoListRow, ProspectosResumen } from "@/lib/admin/prospectos-service";
import { CapturaLogsPanel } from "@/components/admin/CapturaLogsPanel";
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

type LeadsAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  initialDesarrolloId?: string;
  initialAsesorId?: string;
  initialDesde?: string;
  initialHasta?: string;
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
}: LeadsAdminPanelProps) {
  const monthDefault = currentMonthRange();

  const [leadTab, setLeadTab] = useState<LeadTab>("leads");
  const [viewMode, setViewMode] = useState<ViewMode>("lista");

  const [desarrolloId, setDesarrolloId] = useState(
    initialDesarrolloId ?? desarrollos[0]?.id ?? "",
  );
  const [etapaFilter, setEtapaFilter] = useState("");
  const [asesorFilter, setAsesorFilter] = useState(initialAsesorId ?? "");
  const [campanaFilter, setCampanaFilter] = useState("");
  const [interesFilter, setInteresFilter] = useState("");
  const [desde, setDesde] = useState(initialDesde ?? monthDefault.desde);
  const [hasta, setHasta] = useState(initialHasta ?? monthDefault.hasta);

  const [applied, setApplied] = useState({
    desarrolloId: initialDesarrolloId ?? desarrollos[0]?.id ?? "",
    etapaFilter: "",
    asesorFilter: initialAsesorId ?? "",
    campanaFilter: "",
    interesFilter: "",
    desde: initialDesde ?? monthDefault.desde,
    hasta: initialHasta ?? monthDefault.hasta,
    leadTab: "leads" as LeadTab,
  });

  const [prospectos, setProspectos] = useState<ProspectoListRow[]>([]);
  const [resumen, setResumen] = useState<ProspectosResumen | null>(null);
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [campanas, setCampanas] = useState<CampanaOption[]>([]);
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
  const prevDesarrolloId = useRef<string | null>(null);

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
    void loadAsesores();
    void loadCampanas();

    if (prevDesarrolloId.current !== null && prevDesarrolloId.current !== desarrolloId) {
      setAsesorFilter("");
      setCampanaFilter("");
    }
    prevDesarrolloId.current = desarrolloId;
  }, [loadAsesores, loadCampanas, desarrolloId]);

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
      interesFilter,
      desde,
      hasta,
      leadTab,
    });
  };

  useEffect(() => {
    setApplied((prev) => ({ ...prev, leadTab }));
  }, [leadTab]);

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
    if (!selectedIds.size) {
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
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 md:px-5">
          <div className="flex items-center gap-1">
            {(["leads", "spam", "duplicados", "captura"] as LeadTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeadTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold capitalize transition ${
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
            <div className="flex flex-wrap items-center gap-2">
              {leadTab === "leads" ? (
                <div className="flex rounded-lg border border-slate-200 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("lista");
                      setEtapaFilter("");
                    }}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                      viewMode === "lista" ? "bg-gabi-forest text-white" : "text-slate-600"
                    }`}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    Tabla
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("tablero")}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                      viewMode === "tablero" ? "bg-gabi-forest text-white" : "text-slate-600"
                    }`}
                  >
                    <Kanban className="h-3.5 w-3.5" />
                    Tablero
                  </button>
                </div>
              ) : null}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowExportMenu((value) => !value)}
                  disabled={!prospectos.length}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                >
                  Exportar…
                  <ChevronDown className="h-3.5 w-3.5" />
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
                      onClick={() => downloadCsv(selectedIds.size ? prospectos.filter((r) => selectedIds.has(r.id)) : prospectos)}
                      disabled={!selectedIds.size}
                      className="block w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                    >
                      CSV (seleccionados)
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={!selectedIds.size || deleting}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Eliminando…" : "Eliminar leads"}
              </button>

              <button
                type="button"
                onClick={() => setShowNewLead(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-gabi-forest px-3 py-1.5 text-xs font-bold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Lead
              </button>
            </div>
          ) : null}
        </div>

        {leadTab !== "captura" ? (
          <div className="space-y-3 px-4 py-4 md:px-5">
            <p className="text-xs text-slate-500">
              Vista al estilo Xperience — filtros por desarrollo, campaña y asesor.
              {scopeLabel ? ` Alcance: ${scopeLabel}.` : ""}
            </p>

            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[160px] text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Rango</span>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-gabi-forest">
                  {dateRangeLabel}
                </p>
              </label>

              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Desde</span>
                <input
                  type="date"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5"
                />
              </label>

              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Hasta</span>
                <input
                  type="date"
                  value={hasta}
                  onChange={(event) => setHasta(event.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5"
                />
              </label>

              <label className="block min-w-[160px] text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Desarrollo</span>
                <select
                  value={desarrolloId}
                  onChange={(event) => setDesarrolloId(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                >
                  {desarrollos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-[160px] text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Campaña</span>
                <select
                  value={campanaFilter}
                  onChange={(event) => setCampanaFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                >
                  <option value="">Todas</option>
                  {campanas.map((campana) => (
                    <option key={campana.id} value={campana.id}>
                      {campana.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-[160px] text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Asesor</span>
                <select
                  value={asesorFilter}
                  onChange={(event) => setAsesorFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
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
                <label className="block min-w-[140px] text-xs">
                  <span className="mb-1 block font-semibold text-slate-500">Etapa</span>
                  <select
                    value={etapaFilter}
                    onChange={(event) => setEtapaFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                  >
                    <option value="">Todas</option>
                    {etapaOptions.map((etapa) => (
                      <option key={etapa} value={etapa}>
                        {prospectoEtapaLabel[etapa]} ({resumen?.porEtapa[etapa] ?? 0})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block min-w-[120px] text-xs">
                <span className="mb-1 block font-semibold text-slate-500">Interés</span>
                <select
                  value={interesFilter}
                  onChange={(event) => setInteresFilter(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5"
                >
                  <option value="">Todos</option>
                  {NIVELES_INTERES.map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivelInteresLabel[nivel]}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-gabi-forest px-4 py-2 text-xs font-bold text-white"
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
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Este mes
              </button>

              <button
                type="button"
                onClick={() => void handleSyncInteligencia()}
                disabled={syncing}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
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
            setLeadTab("leads");
            setSelectedId(prospectoId);
          }}
        />
      ) : null}

      {leadTab !== "captura" && resumen && viewMode === "tablero" ? (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PROSPECTO_ETAPAS.filter((etapa) => (resumen.porEtapa[etapa] ?? 0) > 0).map((etapa) => (
            <div
              key={etapa}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <p className="text-lg font-black text-gabi-forest">{resumen.porEtapa[etapa]}</p>
              <p className="text-[10px] font-semibold text-slate-500">{prospectoEtapaLabel[etapa]}</p>
            </div>
          ))}
        </div>
      ) : null}

      {leadTab !== "captura" && error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {leadTab !== "captura" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-base font-black text-gabi-forest">
                {viewMode === "tablero" ? "Tablero por etapa" : "Leads"}
              </h3>
              <p className="text-xs text-slate-500">
                {resumen?.total ?? 0} en desarrollo · {prospectos.length} en vista
              </p>
            </div>
            <a
              href="/admin/metricas"
              className="inline-flex items-center gap-1 text-xs font-bold text-gabi-forest hover:underline"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Reportes
            </a>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Cargando leads…
            </div>
          ) : !prospectos.length ? (
            <p className="px-6 py-12 text-center text-sm text-slate-500">
              No hay leads con el filtro actual. Ajusta fechas o pulsa Aplicar.
            </p>
          ) : leadTab === "leads" && viewMode === "tablero" ? (
            <LeadsKanbanBoard
              prospectos={prospectos}
              onSelect={setSelectedId}
              onMoveEtapa={handleMoveEtapa}
            />
          ) : (
            <LeadsXperienceTable
              prospectos={prospectos}
              desarrollos={desarrollos}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onSelect={setSelectedId}
            />
          )}
        </div>
      ) : null}

      {selectedId ? (
        <LeadDetailDrawer
          prospectoId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void loadLeads()}
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

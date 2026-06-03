"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Kanban, LayoutList, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ProspectoListRow, ProspectosResumen } from "@/lib/admin/prospectos-service";
import { LeadDetailDrawer } from "@/components/admin/LeadDetailDrawer";
import { LeadsKanbanBoard } from "@/components/admin/LeadsKanbanBoard";
import { exportLeadsCsv, LeadsXperienceTable } from "@/components/admin/LeadsXperienceTable";
import {
  PROSPECTO_ETAPAS,
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import { NIVELES_INTERES, nivelInteresLabel } from "@/lib/comercial/prospecto-interes";

type LeadsAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
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
type LeadTab = "leads" | "spam" | "duplicados";

const currentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    desde: start.toISOString().slice(0, 10),
    hasta: end.toISOString().slice(0, 10),
  };
};

export function LeadsAdminPanel({ desarrollos, scopeLabel }: LeadsAdminPanelProps) {
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [leadTab, setLeadTab] = useState<LeadTab>("leads");
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [etapaFilter, setEtapaFilter] = useState("");
  const [asesorFilter, setAsesorFilter] = useState("");
  const [campanaFilter, setCampanaFilter] = useState("");
  const [interesFilter, setInteresFilter] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [prospectos, setProspectos] = useState<ProspectoListRow[]>([]);
  const [resumen, setResumen] = useState<ProspectosResumen | null>(null);
  const [asesores, setAsesores] = useState<AsesorOption[]>([]);
  const [campanas, setCampanas] = useState<CampanaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
    if (!desarrolloId) {
      setProspectos([]);
      setResumen(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId, resumen: "1" });
      if (viewMode === "lista" && etapaFilter) {
        params.set("etapa", etapaFilter);
      }
      if (asesorFilter) {
        params.set("asesorId", asesorFilter);
      }
      if (campanaFilter) {
        params.set("campanaId", campanaFilter);
      }
      if (interesFilter) {
        params.set("nivelInteres", interesFilter);
      }
      params.set("spam", leadTab === "spam" ? "only" : "exclude");
      params.set(
        "duplicados",
        leadTab === "duplicados" ? "only" : leadTab === "spam" ? "include" : "exclude",
      );
      if (search) {
        params.set("search", search);
      }
      if (desde) {
        params.set("desde", desde);
      }
      if (hasta) {
        params.set("hasta", hasta);
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
  }, [desarrolloId, viewMode, etapaFilter, asesorFilter, campanaFilter, interesFilter, search, desde, hasta, leadTab]);

  useEffect(() => {
    void loadAsesores();
    void loadCampanas();
    setAsesorFilter("");
    setCampanaFilter("");
  }, [loadAsesores, loadCampanas]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const etapaOptions = useMemo(() => {
    if (!resumen) {
      return [];
    }
    return PROSPECTO_ETAPAS.filter((etapa) => (resumen.porEtapa[etapa] ?? 0) > 0);
  }, [resumen]);

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
    if (!desarrolloId) {
      return;
    }

    setSyncing(true);
    setError("");

    try {
      const response = await fetch("/api/admin/prospectos/sync-inteligencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desarrolloId }),
      });

      const data = (await response.json()) as {
        result?: { duplicados: number; scoresUpdated: number };
        error?: string;
      };

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
      void loadLeads();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear.");
    } finally {
      setCreating(false);
    }
  };

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados para ver leads.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">CRM</p>
            <h2 className="text-2xl font-black text-gabi-forest">Leads</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Vista compatible con Xperience — tabla detallada, tablero comercial o spam.
              {scopeLabel ? ` Alcance: ${scopeLabel}.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => setLeadTab("leads")}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  leadTab === "leads" ? "bg-gabi-forest text-white" : "text-slate-600"
                }`}
              >
                Leads
              </button>
              <button
                type="button"
                onClick={() => setLeadTab("spam")}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  leadTab === "spam" ? "bg-gabi-forest text-white" : "text-slate-600"
                }`}
              >
                Spam
              </button>
              <button
                type="button"
                onClick={() => setLeadTab("duplicados")}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  leadTab === "duplicados" ? "bg-gabi-forest text-white" : "text-slate-600"
                }`}
              >
                Duplicados
              </button>
            </div>
            {leadTab === "leads" ? (
            <div className="flex rounded-xl border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode("tablero");
                  setEtapaFilter("");
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  viewMode === "tablero"
                    ? "bg-gabi-forest text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Kanban className="h-4 w-4" />
                Tablero
              </button>
              <button
                type="button"
                onClick={() => setViewMode("lista")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition ${
                  viewMode === "lista"
                    ? "bg-gabi-forest text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <LayoutList className="h-4 w-4" />
                Lista
              </button>
            </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const csv = exportLeadsCsv(prospectos, desarrollos);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `leads-${desarrolloId}-${new Date().toISOString().slice(0, 10)}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              }}
              disabled={!prospectos.length}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
            <button
              type="button"
              onClick={() => void handleSyncInteligencia()}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Duplicados e iScore"}
            </button>
            <button
              type="button"
              onClick={() => setShowNewLead(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <Plus className="h-4 w-4" />
              Nuevo lead
            </button>
            <button
              type="button"
              onClick={() => void loadLeads()}
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desde</span>
            <input
              type="date"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>

          {viewMode === "lista" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Etapa</span>
              <select
                value={etapaFilter}
                onChange={(event) => setEtapaFilter(event.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2"
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

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Asesor</span>
            <select
              value={asesorFilter}
              onChange={(event) => setAsesorFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todos</option>
              {asesores.map((asesor) => (
                <option key={asesor.id} value={asesor.id}>
                  {asesor.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Campaña</span>
            <select
              value={campanaFilter}
              onChange={(event) => setCampanaFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todas</option>
              {campanas.map((campana) => (
                <option key={campana.id} value={campana.id}>
                  {campana.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Interés</span>
            <select
              value={interesFilter}
              onChange={(event) => setInteresFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todos</option>
              {NIVELES_INTERES.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {nivelInteresLabel[nivel]}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-[12rem] flex-1 text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Nombre, email o teléfono"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3"
              />
            </div>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const range = currentMonthRange();
              setDesde(range.desde);
              setHasta(range.hasta);
            }}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => {
              setDesde("");
              setHasta("");
            }}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Todas las fechas
          </button>
        </div>
      </div>

      {resumen ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {PROSPECTO_ETAPAS.filter((etapa) => (resumen.porEtapa[etapa] ?? 0) > 0).map((etapa) => (
            <button
              key={etapa}
              type="button"
              onClick={() => {
                if (viewMode === "lista") {
                  setEtapaFilter(etapa === etapaFilter ? "" : etapa);
                }
              }}
              disabled={viewMode === "tablero"}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                etapaFilter === etapa && viewMode === "lista"
                  ? "border-gabi-forest bg-gabi-forest/5"
                  : "border-slate-200 bg-white"
              } ${viewMode === "tablero" ? "cursor-default" : ""}`}
            >
              <p className="text-2xl font-black text-gabi-forest">{resumen.porEtapa[etapa]}</p>
              <p className="text-xs font-semibold text-slate-500">{prospectoEtapaLabel[etapa]}</p>
            </button>
          ))}
        </div>
      ) : null}

          {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {error.includes("es_spam") || error.includes("xperience_id") || error.includes("nivel_interes") ? (
            <p className="mt-1 text-xs">Aplica las migraciones 020 y 021 en Supabase.</p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-black text-gabi-forest">
            {viewMode === "tablero" ? "Tablero por etapa" : "Lista de prospectos"}
          </h3>
          <p className="text-sm text-slate-500">
            {resumen?.total ?? 0} leads en este desarrollo
            {prospectos.length !== resumen?.total ? ` · ${prospectos.length} con filtro actual` : ""}
            {viewMode === "tablero" ? " · Arrastra tarjetas entre columnas" : ""}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando leads…
          </div>
        ) : !prospectos.length ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            No hay leads con el filtro actual.
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
            onSelect={setSelectedId}
          />
        )}
      </div>

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
            <p className="mt-1 text-sm text-slate-500">
              Registro manual para seguimiento comercial.
            </p>
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

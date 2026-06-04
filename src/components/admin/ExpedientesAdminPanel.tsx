"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen, Loader2, RefreshCw, Search } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { ExpedienteListRow } from "@/lib/admin/expediente-service";
import { ComisionesAdminPanel } from "@/components/admin/ComisionesAdminPanel";
import { ExpedienteDrawer } from "@/components/admin/ExpedienteDrawer";
import { estatusSembradoLabel } from "@/lib/comercial/sembrado-status";
import { formatLeadDate } from "@/lib/comercial/format-lead-date";

type ExpedientesAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

function progresoColor(pct: number) {
  if (pct >= 100) {
    return "bg-emerald-100 text-emerald-800";
  }
  if (pct >= 50) {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

export function ExpedientesAdminPanel({ desarrollos, scopeLabel }: ExpedientesAdminPanelProps) {
  const [tab, setTab] = useState<"expedientes" | "comisiones">("expedientes");
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [expedientes, setExpedientes] = useState<ExpedienteListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOperacionId, setSelectedOperacionId] = useState<string | null>(null);

  const loadExpedientes = useCallback(async () => {
    if (!desarrolloId) {
      setExpedientes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId });
      const response = await fetch(`/api/admin/expedientes?${params.toString()}`);
      const data = (await response.json()) as { expedientes?: ExpedienteListRow[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los expedientes.");
      }

      setExpedientes(data.expedientes ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setExpedientes([]);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadExpedientes();
  }, [loadExpedientes]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return expedientes;
    }
    return expedientes.filter(
      (row) =>
        row.clienteNombre.toLowerCase().includes(query) ||
        row.unidadNumero.toLowerCase().includes(query),
    );
  }, [expedientes, search]);

  const resumen = useMemo(() => {
    const total = expedientes.length;
    const completos = expedientes.filter((row) => row.progresoPct >= 100).length;
    const pendientes = total - completos;
    return { total, completos, pendientes };
  }, [expedientes]);

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados para ver expedientes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("expedientes")}
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            tab === "expedientes"
              ? "border-gabi-forest text-gabi-forest"
              : "border-transparent text-slate-500 hover:text-gabi-forest"
          }`}
        >
          Expedientes
        </button>
        <button
          type="button"
          onClick={() => setTab("comisiones")}
          className={`border-b-2 px-4 py-3 text-sm font-bold transition ${
            tab === "comisiones"
              ? "border-gabi-forest text-gabi-forest"
              : "border-transparent text-slate-500 hover:text-gabi-forest"
          }`}
        >
          Solicitudes de comisión
        </button>
      </div>

      {tab === "comisiones" ? (
        <ComisionesAdminPanel desarrollos={desarrollos} scopeLabel={scopeLabel} focusPendientes />
      ) : (
        <>
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Post-venta
            </p>
            <h2 className="text-2xl font-black text-gabi-forest">Expedientes de venta</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Documentos del cliente por operación: contrato, identificación, comprobantes y
              escritura.{scopeLabel ? ` Alcance: ${scopeLabel}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadExpedientes()}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className={inputClass}
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[220px] flex-1 text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Buscar cliente o unidad</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, unidad…"
                className={`${inputClass} pl-10`}
              />
            </div>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {resumen.total} operaciones
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            {resumen.completos} expedientes completos
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            {resumen.pendientes} con documentos pendientes
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          {error.includes("022_expediente") ? (
            <p className="mt-2 text-xs">
              Ejecuta la migración{" "}
              <code className="rounded bg-red-100 px-1">022_expediente_ventas.sql</code> en Supabase.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando expedientes…
          </div>
        ) : !filtered.length ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">
            {expedientes.length
              ? "Ningún expediente coincide con la búsqueda."
              : "Aún no hay operaciones con cliente en este desarrollo. Registra un apartado en Sembrado."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Estatus</th>
                  <th className="px-4 py-3">Formalización</th>
                  <th className="px-4 py-3">Enganche</th>
                  <th className="px-4 py-3">Actualizado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.operacionId} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-semibold text-gabi-forest">{row.clienteNombre}</td>
                    <td className="px-4 py-3">{row.unidadNumero}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {estatusSembradoLabel[row.estatusSembrado as keyof typeof estatusSembradoLabel] ??
                        row.estatusSembrado}
                      {row.escriturado ? (
                        <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          Escriturado
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${progresoColor(row.formalizacionPct)}`}
                      >
                        {row.documentosSubidos}/{row.documentosRequeridos} · {row.formalizacionPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.engancheCubierto ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                          Cubierto
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatLeadDate(row.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOperacionId(row.operacionId)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gabi-forest/15 px-3 py-1.5 text-xs font-bold text-gabi-forest hover:bg-gabi-forest/5"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        Ver expediente
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOperacionId ? (
        <ExpedienteDrawer
          operacionId={selectedOperacionId}
          onClose={() => setSelectedOperacionId(null)}
          onUpdated={() => void loadExpedientes()}
        />
      ) : null}
        </>
      )}
    </div>
  );
}

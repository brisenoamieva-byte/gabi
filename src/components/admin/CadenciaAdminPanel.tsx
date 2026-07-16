"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Download, Loader2, RefreshCw, Users } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { DesarrolloCadenciaReport } from "@/lib/comercial/cadencia-service";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type CadenciaAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  /** Embebido en Salud CRM (sin header propio ni selector de desarrollo). */
  embedded?: boolean;
};

const statusLabel: Record<string, string> = {
  active: "Activa",
  paused: "Pausada",
  completed: "Completada",
  expired: "Expirada",
};

const statusClass: Record<string, string> = {
  active: "bg-sky-100 text-sky-800",
  paused: "bg-slate-100 text-slate-700",
  completed: "bg-emerald-100 text-emerald-800",
  expired: "bg-amber-100 text-amber-900",
};

export function CadenciaAdminPanel({
  desarrollos,
  scopeLabel,
  embedded = false,
}: CadenciaAdminPanelProps) {
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos);
  const [report, setReport] = useState<DesarrolloCadenciaReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!desarrolloId) {
      setReport(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/cadencia?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as {
        report?: DesarrolloCadenciaReport;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar cadencia.");
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

  const handleBackfill = async () => {
    if (!desarrolloId) return;
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cadencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desarrolloId, action: "backfill" }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo sincronizar.");
      }
      await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Error al sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  const activeProspectos = useMemo(
    () => report?.prospectos.filter((row) => row.cadenciaStatus === "active") ?? [],
    [report],
  );

  const actions = (
    <div className="flex flex-wrap items-center gap-2">
      {!embedded ? (
        <select
          value={desarrolloId ?? ""}
          onChange={(event) => setDesarrolloId(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gabi-forest"
        >
          {desarrollos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-gabi-forest disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Actualizar
      </button>
      <button
        type="button"
        onClick={() => void handleBackfill()}
        disabled={syncing || !desarrolloId}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-gabi-forest disabled:opacity-50"
      >
        {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Sincronizar leads
      </button>
      <button
        type="button"
        onClick={() => {
          if (!desarrolloId) return;
          window.open(
            `/api/admin/cadencia/export?desarrolloId=${encodeURIComponent(desarrolloId)}`,
            "_blank",
          );
        }}
        disabled={!desarrolloId}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-gabi-forest disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        Exportar CSV
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-2xl text-sm text-slate-500">
            Seguimiento de los 8 días BBR por prospecto: toques pendientes, vencidos y estado por
            asesor. Los leads en etapa Nuevo sin cadencia se crean al cargar este panel.
          </p>
          {actions}
        </div>
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Perfilamiento
            </p>
            <h1 className="text-2xl font-black tracking-tight text-gabi-forest">Cadencia de contacto</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Seguimiento de los 8 días BBR por prospecto: toques pendientes, vencidos y estado por
              asesor. Los leads en etapa Nuevo sin cadencia se crean al cargar este panel.
              {scopeLabel ? ` · ${scopeLabel}` : ""}
            </p>
          </div>
          {actions}
        </header>
      )}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading && !report ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando cadencias…
        </div>
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <MetricCard label="Activas" value={report.activeCount} />
            <MetricCard label="Tasa respuesta" value={report.responseRatePct} suffix="%" />
            <MetricCard label="Vencidos hoy" value={report.overdueTouchesTotal} tone="warn" />
            <MetricCard label="Pendientes hoy" value={report.dueTodayTotal} />
            <MetricCard label="Pausadas" value={report.pausedCount} />
            <MetricCard label="Expiradas (D7)" value={report.expiredCount} tone="warn" />
          </div>

          {report.expiredCount > 0 ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {report.expiredCount} cadencia(s) expirada(s) sin respuesta — revisar con asesores si
                deben pasar a <strong>{prospectoEtapaLabel.perdido}</strong>.
              </span>
            </div>
          ) : null}

          {report.asesores.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-gabi-forest">
                <Users className="h-4 w-4" />
                Por asesor (activas)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4">Asesor</th>
                      <th className="py-2 pr-4">Cadencias</th>
                      <th className="py-2 pr-4">Vencidos</th>
                      <th className="py-2">Hoy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.asesores.map((row) => (
                      <tr key={row.asesorId} className="border-b border-slate-100">
                        <td className="py-2.5 pr-4 font-semibold text-gabi-forest">{row.asesorNombre}</td>
                        <td className="py-2.5 pr-4 tabular-nums">{row.activeCadencias}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-amber-700">{row.overdueToday}</td>
                        <td className="py-2.5 tabular-nums">{row.dueToday}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black text-gabi-forest">
              <Clock className="h-4 w-4" />
              Prospectos en cadencia ({activeProspectos.length} activos)
            </h2>
            {report.prospectos.length === 0 ? (
              <p className="text-sm text-slate-500">No hay cadencias registradas en este desarrollo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3">Prospecto</th>
                      <th className="py-2 pr-3">Asesor</th>
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Día</th>
                      <th className="py-2 pr-3">Siguiente toque</th>
                      <th className="py-2 pr-3">Venc.</th>
                      <th className="py-2">Hechos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.prospectos.map((row) => (
                      <tr key={row.prospectoId} className="border-b border-slate-100">
                        <td className="py-2.5 pr-3">
                          <Link
                            href={`/admin/leads?desarrolloId=${encodeURIComponent(desarrolloId ?? "")}&prospecto=${encodeURIComponent(row.prospectoId)}`}
                            className="font-semibold text-gabi-forest hover:underline"
                          >
                            {row.prospectoNombre}
                          </Link>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-500">{row.asesorNombre}</td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass[row.cadenciaStatus] ?? "bg-slate-100"}`}
                          >
                            {statusLabel[row.cadenciaStatus] ?? row.cadenciaStatus}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums">{row.dayIndex}</td>
                        <td className="py-2.5 pr-3">
                          <span className="block font-medium text-gabi-forest">
                            {row.nextTouchLabel ?? "—"}
                          </span>
                          {row.nextTouchDueAt ? (
                            <span className="text-xs text-slate-500">
                              {new Date(row.nextTouchDueAt).toLocaleString("es-MX", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-amber-700">
                          {row.overdueTouches > 0 ? row.overdueTouches : "—"}
                        </td>
                        <td className="py-2.5 tabular-nums text-slate-500">
                          {row.completedTouches}/{row.completedTouches + row.pendingTouches}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: "warn";
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${
        tone === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${tone === "warn" ? "text-amber-800" : "text-gabi-forest"}`}>
        {value}
        {suffix ?? ""}
      </p>
    </div>
  );
}

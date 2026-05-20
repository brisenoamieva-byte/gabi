"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Loader2, Users } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { VisitasResumen } from "@/lib/visitas/types";
import { formatPrice } from "@/lib/data";

type MetricasAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

const tipoLabel = {
  lead_registrado: "Lead registrado",
  recorrido_completado: "Recorrido completado",
} as const;

export function MetricasAdminPanel({ desarrollos, scopeLabel }: MetricasAdminPanelProps) {
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resumen, setResumen] = useState<VisitasResumen | null>(null);

  const selectedDesarrollo = useMemo(
    () => desarrollos.find((item) => item.id === desarrolloId),
    [desarrolloId, desarrollos],
  );

  const loadResumen = useCallback(async () => {
    if (!desarrolloId) {
      setResumen(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        desarrolloId,
        days: String(days),
      });
      const response = await fetch(`/api/admin/visitas?${params}`);
      const data = (await response.json()) as VisitasResumen & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las métricas.");
      }

      setResumen(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, days]);

  useEffect(() => {
    void loadResumen();
  }, [loadResumen]);

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados para ver métricas comerciales.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
          Desempeño comercial
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#13315C]">Métricas de visitas</h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-[#13315C]/5 px-3 py-1 text-xs font-semibold text-[#13315C]">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Leads capturados y recorridos completados por tu equipo. Los datos se registran cuando
          los asesores usan gabi en visita.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-[220px]">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Desarrollo
            </span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="input-cotizador"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block min-w-[160px]">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Periodo
            </span>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="input-cotizador"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          {error.includes("visitas_comerciales") || error.includes("relation") ? (
            <p className="mt-2 text-xs">
              Aplica la migración <code>014_visitas_comerciales.sql</code> en Supabase.
            </p>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#13315C]/8 bg-white p-12 text-[#13315C]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-semibold">Cargando métricas...</span>
        </div>
      ) : resumen ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Leads registrados", value: resumen.leads, icon: Users },
              { label: "Recorridos completados", value: resumen.recorridosCompletados, icon: BarChart3 },
              { label: "Total eventos", value: resumen.total, icon: BarChart3 },
              { label: "CRM sincronizados", value: resumen.crmSincronizados, icon: Users },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#13315C]/8 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-3xl font-black text-[#13315C]">{item.value}</p>
                <p className="mt-1 text-xs text-slate-400">{selectedDesarrollo?.nombre}</p>
              </div>
            ))}
          </div>

          {resumen.porAsesor.length ? (
            <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-[#13315C]">Actividad por asesor</h3>
              <div className="mt-4 space-y-2">
                {resumen.porAsesor.map((item) => (
                  <div
                    key={item.asesorId}
                    className="flex items-center justify-between rounded-xl bg-[#13315C]/5 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-[#13315C]">{item.asesorNombre}</span>
                    <span className="text-sm font-bold text-[#2DD4BF]">{item.count} eventos</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-[#13315C]">Actividad reciente</h3>
            {resumen.recientes.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Tipo</th>
                      <th className="px-3 py-2">Asesor</th>
                      <th className="px-3 py-2">Prospecto</th>
                      <th className="px-3 py-2">Interés</th>
                      <th className="px-3 py-2">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.recientes.map((visita) => (
                      <tr key={visita.id} className="border-b border-slate-50">
                        <td className="px-3 py-3 text-slate-600">
                          {new Date(visita.occurredAt).toLocaleString("es-MX", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-3 py-3 font-semibold text-[#13315C]">
                          {tipoLabel[visita.tipo]}
                        </td>
                        <td className="px-3 py-3">{visita.asesorNombre ?? visita.asesorId}</td>
                        <td className="px-3 py-3">{visita.clienteNombre ?? "—"}</td>
                        <td className="px-3 py-3 text-slate-600">
                          {[visita.clusterNombre, visita.prototipoNombre].filter(Boolean).join(" · ") ||
                            "—"}
                        </td>
                        <td className="px-3 py-3">
                          {visita.precioFinal ? formatPrice(visita.precioFinal) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Aún no hay visitas registradas en este periodo. Los asesores deben completar
                recorridos en gabi para ver datos aquí.
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { SembradoReporte } from "@/lib/admin/operaciones-service";
import { estatusSembradoLabel } from "@/lib/comercial/sembrado-status";

type SembradoReportePanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

export function SembradoReportePanel({ desarrollos, scopeLabel }: SembradoReportePanelProps) {
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [reporte, setReporte] = useState<SembradoReporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReporte = useCallback(async () => {
    if (!desarrolloId) {
      setReporte(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId });
      const response = await fetch(`/api/admin/reportes/sembrado?${params.toString()}`);
      const data = (await response.json()) as { reporte?: SembradoReporte; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el reporte.");
      }

      setReporte(data.reporte ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setReporte(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadReporte();
  }, [loadReporte]);

  const estatusCards = useMemo(() => {
    if (!reporte) {
      return [];
    }
    return Object.entries(reporte.porEstatus)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [reporte]);

  if (!desarrollos.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">Reportes</p>
        <h2 className="mt-2 text-2xl font-black text-gabi-forest">Sembrado</h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-gabi-forest/5 px-3 py-1 text-xs font-semibold text-gabi-forest">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Inventario comercial por estatus: disponibles, apartados, cobranza y vendidas.
        </p>

        <label className="mt-5 block min-w-[200px] text-sm">
          <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
          <select
            value={desarrolloId}
            onChange={(event) => setDesarrolloId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {desarrollos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando reporte…
        </div>
      ) : reporte ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-black text-gabi-forest">{reporte.total}</p>
              <p className="text-sm font-semibold text-slate-500">Unidades en inventario</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-black text-gabi-forest">{reporte.conOperacion}</p>
              <p className="text-sm font-semibold text-slate-500">Con operación activa</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <p className="text-3xl font-black text-amber-900">{reporte.apartadosPendientes}</p>
              <p className="text-sm font-semibold text-amber-800">Apartados pendientes</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-3xl font-black text-emerald-800">
                {reporte.porEstatus["Vendidas Cobradas"] ?? 0}
              </p>
              <p className="text-sm font-semibold text-emerald-700">Vendidas cobradas</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-gabi-forest">Por estatus</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {estatusCards.map(([estatus, count]) => (
                <div
                  key={estatus}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="text-2xl font-black text-gabi-forest">{count}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {estatusSembradoLabel[estatus] ?? estatus}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {reporte.segmentos.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-gabi-forest">Por segmento</h3>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {reporte.segmentos.map((segmento) => (
                  <div
                    key={segmento.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gabi-forest" />
                      <h4 className="font-bold text-gabi-forest">{segmento.label}</h4>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {segmento.total} unidades · {segmento.conOperacion} con operación
                      {segmento.apartadosPendientes
                        ? ` · ${segmento.apartadosPendientes} pendiente${segmento.apartadosPendientes === 1 ? "" : "s"}`
                        : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(segmento.porEstatus)
                        .filter(([, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 4)
                        .map(([estatus, count]) => (
                          <span
                            key={estatus}
                            className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                          >
                            {estatusSembradoLabel[estatus] ?? estatus}: {count}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeadsAnualFila, LeadsReporteAnual } from "@/lib/admin/leads-reporte-anual-shared";
import { MES_LABELS_ANUAL, exportLeadsAnualCsv } from "@/lib/admin/leads-reporte-anual-shared";

function AnualTable({
  title,
  rows,
  totalesPorMes,
  granTotal,
}: {
  title: string;
  rows: LeadsAnualFila[];
  totalesPorMes?: number[];
  granTotal?: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gabi-forest/10 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h4 className="font-bold text-gabi-forest">{title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2">Concepto</th>
              {MES_LABELS_ANUAL.map((mes) => (
                <th key={mes} className="px-3 py-2 text-center tabular-nums">
                  {mes}
                </th>
              ))}
              <th className="px-4 py-2 text-center font-black">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`border-t border-slate-100 ${index % 2 ? "bg-slate-50/50" : ""}`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-4 py-2 font-semibold text-gabi-forest">
                  {row.label}
                </td>
                {row.meses.map((count, mesIndex) => (
                  <td key={mesIndex} className="px-3 py-2 text-center tabular-nums text-slate-700">
                    {count || "—"}
                  </td>
                ))}
                <td className="px-4 py-2 text-center font-bold tabular-nums text-gabi-forest">
                  {row.total}
                </td>
              </tr>
            ))}
            {totalesPorMes ? (
              <tr className="border-t-2 border-gabi-forest/20 bg-gabi-forest/5 font-bold">
                <td className="sticky left-0 z-10 bg-gabi-forest/5 px-4 py-2 text-gabi-forest">
                  Total
                </td>
                {totalesPorMes.map((count, mesIndex) => (
                  <td key={mesIndex} className="px-3 py-2 text-center tabular-nums">
                    {count || "—"}
                  </td>
                ))}
                <td className="px-4 py-2 text-center tabular-nums text-gabi-forest">
                  {granTotal ?? 0}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type LeadsAnualPanelProps = {
  desarrolloId: string;
  desarrolloNombre: string;
};

export function LeadsAnualPanel({ desarrolloId, desarrolloNombre }: LeadsAnualPanelProps) {
  const currentYear = new Date().getFullYear();
  const [anio, setAnio] = useState(currentYear);
  const [reporte, setReporte] = useState<LeadsReporteAnual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnual = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ anio: String(anio), desarrolloId });
      const response = await fetch(`/api/admin/reportes/leads/anual?${params.toString()}`);
      const data = (await response.json()) as { reporte?: LeadsReporteAnual; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el reporte anual.");
      }
      setReporte(data.reporte ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setReporte(null);
    } finally {
      setLoading(false);
    }
  }, [anio, desarrolloId]);

  useEffect(() => {
    void loadAnual();
  }, [loadAnual]);

  const exportCsv = () => {
    if (!reporte) return;
    const csv = exportLeadsAnualCsv(reporte);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leads-anual-${anio}-${desarrolloId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">Año</span>
          <select
            value={anio}
            onChange={(event) => setAnio(Number(event.target.value))}
            className="rounded-xl border border-slate-200 px-3 py-2"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        {reporte ? (
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Exportar Excel (CSV)
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500">Cargando matriz anual…</p>
      ) : reporte ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase text-slate-500">Desarrollo</p>
              <p className="mt-1 text-xl font-black text-gabi-forest">{desarrolloNombre}</p>
            </div>
            <div className="rounded-2xl border border-gabi-forest/10 bg-gabi-forest p-5 text-white shadow-sm">
              <p className="text-xs font-bold uppercase text-white/70">Total {anio}</p>
              <p className="mt-1 text-3xl font-black tabular-nums">{reporte.granTotal}</p>
            </div>
          </div>

          <AnualTable
            title="Leads por producto"
            rows={reporte.porProducto}
            totalesPorMes={reporte.totalesPorMes}
            granTotal={reporte.granTotal}
          />

          <AnualTable title="Leads por vendedor" rows={reporte.porAsesor} />
        </>
      ) : null}
    </div>
  );
}

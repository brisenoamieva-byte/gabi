"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatTicket } from "@/lib/data";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";
import {
  formatCeldaPresupuesto,
  getNuboPublicidadColumnasMes,
  getNuboPublicidadInversionAnual,
  getNuboPublicidadPresupuestoTotal,
  getNuboPublicidadTotales,
  getNuboPublicidadTotalesMensuales,
  NUBO_ESCENARIO_COMERCIAL,
  NUBO_PUBLICIDAD_META,
  NUBO_PUBLICIDAD_PARTIDAS,
} from "@/lib/estudios/nubo-publicidad-content";
import type { NuboPublicidadPartidaMensual } from "@/lib/estudios/nubo-publicidad-partidas";
import { SlideCanvas } from "@/components/propuestas/PropuestaSlideDeck";

export function NuboPublicidadSlide() {
  const [partidas, setPartidas] = useState<readonly NuboPublicidadPartidaMensual[]>(
    NUBO_PUBLICIDAD_PARTIDAS,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/estudios/nubo/publicidad");
        const data = (await res.json()) as {
          partidas?: NuboPublicidadPartidaMensual[];
        };
        if (!cancelled && res.ok && data.partidas?.length) {
          setPartidas(data.partidas);
        }
      } catch {
        /* fallback estático */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columnas = getNuboPublicidadColumnasMes();
  const totalesMes = useMemo(
    () => getNuboPublicidadTotalesMensuales(partidas),
    [partidas],
  );
  const inversionAnual = getNuboPublicidadInversionAnual(totalesMes);
  const presupuestoTotal = getNuboPublicidadPresupuestoTotal();
  const totales = useMemo(() => getNuboPublicidadTotales(partidas), [partidas]);

  return (
    <SlideCanvas className="!flex !flex-col !py-3 md:!py-4">
      <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-[Georgia,'Times_New_Roman',serif] text-2xl tabular-nums text-slate-300 md:text-3xl">
            {NUBO_PUBLICIDAD_META.num}
          </span>
          <div>
            <h2 className={`text-lg md:text-xl ${t.title}`}>{NUBO_PUBLICIDAD_META.titulo}</h2>
            <p className={`text-[11px] uppercase tracking-[0.12em] text-slate-400`}>
              {NUBO_PUBLICIDAD_META.mesInicioLabel} – Jul 2027 · 2.5% · {NUBO_ESCENARIO_COMERCIAL.totalLotes} lotes
            </p>
          </div>
        </div>
        <div className={`flex flex-wrap gap-x-5 gap-y-1 text-[11px] ${t.body}`}>
          <span>
            <strong className={t.bodyStrong}>Año 1:</strong> {formatTicket(inversionAnual)}
          </span>
          <span>
            <strong className={t.bodyStrong}>Campaña total (2.5%):</strong>{" "}
            {formatTicket(presupuestoTotal)}
          </span>
          <span>
            <strong className={t.bodyStrong}>Con IVA:</strong> {formatTicket(totales.total)}
          </span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando presupuesto…
          </div>
        ) : (
          <table className="w-max min-w-full border-collapse text-[10px] md:text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_#e2e8f0]">
              <tr className={`border-b border-slate-200 uppercase tracking-wide ${t.body}`}>
                <th className="sticky left-0 z-30 min-w-[220px] max-w-[280px] bg-slate-50 px-2 py-2 text-left font-medium md:min-w-[260px]">
                  Concepto
                </th>
                {columnas.map((col) => (
                  <th
                    key={col.indice}
                    className="min-w-[62px] px-1.5 py-2 text-right font-medium whitespace-nowrap"
                  >
                    {col.etiquetaCorta}
                  </th>
                ))}
                <th className="min-w-[72px] bg-slate-100 px-2 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {partidas.map((partida, rowIndex) => {
                const prevSegmento = partidas[rowIndex - 1]?.segmento;
                const segmentoBreak = prevSegmento && prevSegmento !== partida.segmento;

                return (
                  <tr
                    key={`${partida.proveedor}-${partida.concepto}-${rowIndex}`}
                    className={`border-b border-slate-100 hover:bg-slate-50/80 ${
                      segmentoBreak ? "border-t border-slate-200" : ""
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 bg-white px-2 py-1.5 align-top ${
                        segmentoBreak ? "border-t border-slate-200 pt-2.5" : ""
                      }`}
                    >
                      <span className={`block text-[9px] uppercase tracking-wide text-slate-400 ${t.body}`}>
                        {partida.segmento}
                      </span>
                      <span className={`mt-0.5 block text-[10px] text-slate-500`}>{partida.proveedor}</span>
                      <span className={`block leading-snug ${t.bodyStrong}`}>{partida.concepto}</span>
                    </td>
                    {partida.meses.map((monto, mesIndex) => (
                      <td
                        key={mesIndex}
                        className={`px-1.5 py-1.5 text-right tabular-nums align-top ${
                          monto === 0 ? "text-slate-300" : t.body
                        }`}
                      >
                        {formatCeldaPresupuesto(monto)}
                      </td>
                    ))}
                    <td className={`bg-slate-50/50 px-2 py-1.5 text-right tabular-nums align-top ${t.bodyStrong}`}>
                      {formatCeldaPresupuesto(partida.anual)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 shadow-[0_-1px_0_#e2e8f0]">
              <tr className="border-t-2 border-slate-900">
                <td className={`sticky left-0 z-30 bg-slate-100 px-2 py-2 ${t.bodyStrong}`}>
                  Subtotal mensual
                </td>
                {totalesMes.map((monto, index) => (
                  <td
                    key={index}
                    className={`px-1.5 py-2 text-right tabular-nums ${t.bodyStrong}`}
                  >
                    {formatCeldaPresupuesto(monto)}
                  </td>
                ))}
                <td className={`px-2 py-2 text-right tabular-nums ${t.bodyStrong}`}>
                  {formatCeldaPresupuesto(totales.subtotal)}
                </td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className={`sticky left-0 bg-slate-100 px-2 py-1.5 ${t.body}`}>IVA 16%</td>
                <td colSpan={columnas.length + 1} className={`px-2 py-1.5 text-right tabular-nums ${t.body}`}>
                  {formatCeldaPresupuesto(totales.iva)}
                </td>
              </tr>
              <tr>
                <td className={`sticky left-0 bg-slate-100 px-2 py-1.5 ${t.bodyStrong}`}>Total con IVA</td>
                <td colSpan={columnas.length + 1} className={`px-2 py-1.5 text-right tabular-nums ${t.bodyStrong}`}>
                  {formatCeldaPresupuesto(totales.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className={`mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 text-[10px] ${t.body}`}>
        <p className="italic">
          {NUBO_PUBLICIDAD_META.nota} · Desplaza horizontal y vertical para ver el detalle completo.
        </p>
        <Link
          href="/admin/estudios-nubo"
          className="gabi-no-print font-medium text-slate-500 underline-offset-2 hover:text-[#201044] hover:underline"
        >
          Editar estudio
        </Link>
      </div>
    </SlideCanvas>
  );
}

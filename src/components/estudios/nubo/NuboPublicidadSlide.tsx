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
  NUBO_PUBLICIDAD_CONCEPTO_COL_PX,
  NUBO_PUBLICIDAD_META,
  NUBO_PUBLICIDAD_MES_COL_PX,
  NUBO_PUBLICIDAD_PARTIDAS,
  NUBO_PUBLICIDAD_TOTAL_COL_PX,
} from "@/lib/estudios/nubo-publicidad-content";
import type { NuboPublicidadPartidaMensual } from "@/lib/estudios/nubo-publicidad-partidas";
import { BbrHabitareaSlideMark } from "@/components/brand/BbrHabitareaLogo";
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
        const res = await fetch("/api/estudios/nubo/publicidad", { cache: "no-store" });
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
  const slideTableWidth =
    NUBO_PUBLICIDAD_CONCEPTO_COL_PX +
    NUBO_PUBLICIDAD_TOTAL_COL_PX +
    NUBO_PUBLICIDAD_MES_COL_PX * columnas.length;
  const totalesMes = useMemo(
    () => getNuboPublicidadTotalesMensuales(partidas),
    [partidas],
  );
  const inversionAnual = getNuboPublicidadInversionAnual(totalesMes);
  const presupuestoTotal = getNuboPublicidadPresupuestoTotal();
  const totales = useMemo(() => getNuboPublicidadTotales(partidas), [partidas]);

  return (
    <SlideCanvas className="!flex !flex-col !py-3 md:!py-4" brandMark={<BbrHabitareaSlideMark />}>
      <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-baseline gap-3">
          <span className="font-[Georgia,'Times_New_Roman',serif] text-2xl tabular-nums text-slate-300 md:text-3xl">
            {NUBO_PUBLICIDAD_META.num}
          </span>
          <div>
            <h2 className={`text-xl md:text-2xl ${t.title}`}>{NUBO_PUBLICIDAD_META.titulo}</h2>
            <p className={`text-xs uppercase tracking-[0.12em] text-slate-400 md:text-[11px]`}>
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
          <table
            className="table-fixed border-collapse text-[10px]"
            style={{ width: slideTableWidth }}
          >
            <colgroup>
              <col style={{ width: NUBO_PUBLICIDAD_CONCEPTO_COL_PX }} />
              <col style={{ width: NUBO_PUBLICIDAD_TOTAL_COL_PX }} />
              {columnas.map((col) => (
                <col key={col.indice} style={{ width: NUBO_PUBLICIDAD_MES_COL_PX }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_#e2e8f0]">
              <tr className={`border-b border-slate-200 uppercase tracking-wide ${t.body}`}>
                <th className="sticky left-0 z-30 bg-slate-50 px-1.5 py-1.5 text-left text-[9px] font-medium">
                  Concepto
                </th>
                <th className="border-l border-slate-200 bg-slate-100 px-0.5 py-1.5 text-right text-[9px] font-medium">
                  Total
                </th>
                {columnas.map((col) => (
                  <th
                    key={col.indice}
                    className="px-0.5 py-1.5 text-right text-[9px] font-medium whitespace-nowrap"
                    title={col.etiquetaCorta}
                  >
                    {col.etiquetaCompacta}
                  </th>
                ))}
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
                      className={`sticky left-0 z-10 bg-white px-1.5 py-1 align-top ${
                        segmentoBreak ? "border-t border-slate-200 pt-2" : ""
                      }`}
                    >
                      <span className={`block text-[8px] uppercase tracking-wide text-slate-400 ${t.body}`}>
                        {partida.segmento}
                      </span>
                      <span className={`mt-0.5 block text-[9px] text-slate-500`}>{partida.proveedor}</span>
                      <span className={`block truncate text-[10px] leading-snug ${t.bodyStrong}`} title={partida.concepto}>
                        {partida.concepto}
                      </span>
                    </td>
                    <td
                      className={`border-l border-slate-200 bg-slate-50/50 px-0.5 py-1 text-right tabular-nums text-[10px] align-top ${t.bodyStrong}`}
                    >
                      {formatCeldaPresupuesto(partida.anual)}
                    </td>
                    {partida.meses.map((monto, mesIndex) => (
                      <td
                        key={mesIndex}
                        className={`px-0.5 py-1 text-right tabular-nums text-[10px] align-top ${
                          monto === 0 ? "text-slate-400" : t.body
                        }`}
                      >
                        {formatCeldaPresupuesto(monto)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-20 bg-slate-100 shadow-[0_-1px_0_#e2e8f0]">
              <tr className="border-t-2 border-slate-900">
                <td className={`sticky left-0 z-30 bg-slate-100 px-1.5 py-1.5 text-[10px] ${t.bodyStrong}`}>
                  Subtotal mensual
                </td>
                <td className={`border-l border-slate-200 bg-slate-100 px-0.5 py-1.5 text-right tabular-nums text-[10px] ${t.bodyStrong}`}>
                  {formatCeldaPresupuesto(totales.subtotal)}
                </td>
                {totalesMes.map((monto, index) => (
                  <td
                    key={index}
                    className={`px-0.5 py-1.5 text-right tabular-nums text-[10px] ${t.bodyStrong}`}
                  >
                    {formatCeldaPresupuesto(monto)}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-slate-200">
                <td className={`sticky left-0 bg-slate-100 px-1.5 py-1 text-[10px] ${t.body}`}>IVA 16%</td>
                <td
                  className={`border-l border-slate-200 bg-slate-100 px-0.5 py-1 text-right tabular-nums text-[10px] ${t.body}`}
                >
                  {formatCeldaPresupuesto(totales.iva)}
                </td>
                {columnas.map((col) => (
                  <td key={col.indice} className="bg-slate-100 px-0.5 py-1" />
                ))}
              </tr>
              <tr>
                <td className={`sticky left-0 bg-slate-100 px-1.5 py-1 text-[10px] ${t.bodyStrong}`}>
                  Total con IVA
                </td>
                <td
                  className={`border-l border-slate-200 bg-slate-100 px-0.5 py-1 text-right tabular-nums text-[10px] ${t.bodyStrong}`}
                >
                  {formatCeldaPresupuesto(totales.total)}
                </td>
                {columnas.map((col) => (
                  <td key={col.indice} className="bg-slate-100 px-0.5 py-1" />
                ))}
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
          href="/estudios/nubo/editar"
          className="gabi-no-print font-medium text-slate-500 underline-offset-2 hover:text-[#201044] hover:underline"
        >
          Editar estudio
        </Link>
      </div>
    </SlideCanvas>
  );
}

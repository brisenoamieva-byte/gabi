"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatTicket } from "@/lib/data";
import { nuboType } from "@/lib/estudios/nubo-slide-theme";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";
import {
  formatCeldaPresupuesto,
  getNuboPublicidadColumnasMes,
  getNuboPublicidadEtapa1ConIva,
  getNuboPublicidadRangoLabel,
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
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";

export function NuboPublicidadSlide({ showOperatorLinks = true }: { showOperatorLinks?: boolean }) {
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

  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(refitAllPropuestaSlides);
    }
  }, [loading, partidas]);

  const columnas = getNuboPublicidadColumnasMes();
  const slideTableWidth =
    NUBO_PUBLICIDAD_CONCEPTO_COL_PX +
    NUBO_PUBLICIDAD_TOTAL_COL_PX +
    NUBO_PUBLICIDAD_MES_COL_PX * columnas.length;
  const totalesMes = useMemo(
    () => getNuboPublicidadTotalesMensuales(partidas),
    [partidas],
  );
  const etapa1ConIva = getNuboPublicidadEtapa1ConIva();
  const totales = useMemo(() => getNuboPublicidadTotales(partidas), [partidas]);

  return (
    <SlideCanvas className="nubo-publicidad-slide !flex !flex-col !py-3 md:!py-4" brandMark={<BbrHabitareaSlideMark />}>
      <div className="nubo-publicidad-slide-header mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3 md:mb-4">
        <div className="flex items-start gap-4">
          <div className="nubo-publicidad-num-badge flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-[Georgia,'Times_New_Roman',serif] text-xl tabular-nums text-white ring-2 ring-[#6cc24a]/25 md:h-14 md:w-14 md:text-2xl">
            {NUBO_PUBLICIDAD_META.num}
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className={nuboType.h2}>{NUBO_PUBLICIDAD_META.titulo}</h2>
            <p className={`mt-1.5 ${nuboType.label}`}>
              {getNuboPublicidadRangoLabel()} · 2.5% · {NUBO_ESCENARIO_COMERCIAL.totalLotes} lotes
            </p>
          </div>
        </div>
        <div className="nubo-publicidad-kpis flex flex-wrap gap-2 text-[11px]">
          {[
            { label: "Porcentaje etapa 1", value: formatTicket(etapa1ConIva) },
            { label: "Proyectado", value: formatTicket(totales.subtotal) },
            { label: "Con IVA", value: formatTicket(totales.total), accent: true },
          ].map((item) => (
            <span
              key={item.label}
              className={`inline-flex flex-col rounded-lg border px-3 py-1.5 ${
                item.accent
                  ? "border-[#6cc24a]/35 bg-[#6cc24a]/8"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {item.label}
              </span>
              <span className={`mt-0.5 tabular-nums ${item.accent ? t.bodyStrong : t.body}`}>
                {item.value}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div
        className="nubo-publicidad-table-host relative min-h-0 flex-1 overflow-auto overscroll-contain border border-slate-200"
        style={{ ["--nubo-pub-concepto-w" as string]: `${NUBO_PUBLICIDAD_CONCEPTO_COL_PX}px` }}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando presupuesto…
          </div>
        ) : (
          <table
            className="nubo-publicidad-table border-separate border-spacing-0 text-[10px]"
            style={{ width: slideTableWidth }}
          >
            <colgroup>
              <col style={{ width: NUBO_PUBLICIDAD_CONCEPTO_COL_PX }} />
              <col style={{ width: NUBO_PUBLICIDAD_TOTAL_COL_PX }} />
              {columnas.map((col) => (
                <col key={col.indice} style={{ width: NUBO_PUBLICIDAD_MES_COL_PX }} />
              ))}
            </colgroup>
            <thead>
              <tr className={`border-b border-slate-200 uppercase tracking-wide ${t.body}`}>
                <th className="nubo-publicidad-table__corner px-1.5 py-1.5 text-left text-[9px] font-medium">
                  Concepto
                </th>
                <th className="nubo-publicidad-table__head px-0.5 py-1.5 text-right text-[9px] font-bold">
                  Total
                </th>
                {columnas.map((col) => (
                  <th
                    key={col.indice}
                    className="nubo-publicidad-table__head px-0.5 py-1.5 text-right text-[9px] font-medium whitespace-nowrap"
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
                      className={`nubo-publicidad-table__concept px-1.5 py-1 align-top ${
                        segmentoBreak ? "border-t border-slate-200 pt-2" : ""
                      }`}
                    >
                      <span className={`nubo-publicidad-cell-meta block text-[8px] uppercase tracking-wide text-slate-400 ${t.body}`}>
                        {partida.segmento}
                      </span>
                      <span className="nubo-publicidad-cell-meta mt-0.5 block text-[9px] text-slate-500">
                        {partida.proveedor}
                      </span>
                      <span className={`block truncate text-[10px] leading-snug ${t.bodyStrong}`} title={partida.concepto}>
                        {partida.concepto}
                      </span>
                    </td>
                    <td
                      className={`border-l border-slate-200 bg-slate-50/50 px-0.5 py-1 text-right tabular-nums text-[10px] font-bold align-top ${t.bodyStrong}`}
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
            <tfoot className="nubo-publicidad-table__foot">
              <tr className="border-t-2 border-slate-900">
                <td className={`nubo-publicidad-table__foot-corner px-1.5 py-1.5 text-[10px] ${t.bodyStrong}`}>
                  Subtotal mensual
                </td>
                <td className={`border-l border-slate-200 bg-slate-100 px-0.5 py-1.5 text-right tabular-nums text-[10px] font-bold ${t.bodyStrong}`}>
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
                <td className={`nubo-publicidad-table__foot-corner px-1.5 py-1 text-[10px] ${t.body}`}>IVA 16%</td>
                <td
                  className={`border-l border-slate-200 bg-slate-100 px-0.5 py-1 text-right tabular-nums text-[10px] font-bold ${t.body}`}
                >
                  {formatCeldaPresupuesto(totales.iva)}
                </td>
                {columnas.map((col) => (
                  <td key={col.indice} className="bg-slate-100 px-0.5 py-1" />
                ))}
              </tr>
              <tr>
                <td className={`nubo-publicidad-table__foot-corner px-1.5 py-1 text-[10px] ${t.bodyStrong}`}>
                  Total con IVA
                </td>
                <td
                  className={`border-l border-slate-200 bg-slate-100 px-0.5 py-1 text-right tabular-nums text-[10px] font-bold ${t.bodyStrong}`}
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

      <div className={`nubo-publicidad-footnote gabi-no-print mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 text-[10px] ${t.body}`}>
        <p className="italic text-slate-500">
          {NUBO_PUBLICIDAD_META.nota}
          {showOperatorLinks
            ? " · Desplaza horizontal y vertical para ver el detalle completo."
            : " · Valores en MXN."}
        </p>
        {showOperatorLinks ? (
          <Link
            href="/estudios/nubo/editar"
            className="gabi-no-print font-medium text-slate-500 underline-offset-2 hover:text-[#201044] hover:underline"
          >
            Editar estudio
          </Link>
        ) : null}
      </div>
    </SlideCanvas>
  );
}

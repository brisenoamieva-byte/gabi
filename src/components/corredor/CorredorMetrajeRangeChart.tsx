"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Maximize2, Minimize2, Ruler } from "lucide-react";
import {
  getDesarrolloIniciales,
  getDesarrolloLogoUrl,
} from "@/lib/corredor/desarrollo-logos";
import {
  CANADAS_DEL_VALLE_ID,
  INVESTTI_DESARROLLADOR_ID,
} from "@/lib/corredor/investti-analisis";
import {
  buildMetrajeScale,
  getMetrajeChartStats,
  getMetrajePromedio,
  metrajeToPercent,
  sortDesarrollosForMetrajeChart,
  type MetrajeChartSort,
} from "@/lib/corredor/metraje-chart";
import type { CorredorDesarrollo } from "@/lib/corredor/types";
import {
  InvesttiChartHeader,
  InvesttiFootnote,
  InvesttiLegendItem,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

export type MetrajeHighlightBand = {
  min: number;
  max: number;
  label: string;
};

type CorredorMetrajeRangeChartProps = {
  desarrollos: CorredorDesarrollo[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  highlightBand?: MetrajeHighlightBand;
  title?: string;
  subtitle?: string;
  linkToFicha?: boolean;
  presentation?: "default" | "report";
};

const SORT_OPTIONS: { id: MetrajeChartSort; label: string }[] = [
  { id: "km", label: "Por km" },
  { id: "min", label: "Desde menor m²" },
  { id: "amplitud", label: "Mayor rango" },
];

const LABEL_COL_W = "11.5rem";

function barStyle(d: CorredorDesarrollo, selected: boolean, report: boolean) {
  if (report) {
    if (d.id === CANADAS_DEL_VALLE_ID) {
      return selected ? "bg-[#201044]" : "bg-[#201044]/90";
    }
    if (d.desarrolladorId === INVESTTI_DESARROLLADOR_ID) {
      return selected ? "bg-[#5C7642]" : "bg-[#5C7642]/80";
    }
    return selected ? "bg-neutral-600" : "bg-neutral-400/90";
  }

  if (d.id === CANADAS_DEL_VALLE_ID) {
    return selected
      ? "bg-gradient-to-r from-[#6cc24a] to-[#5ab83f] ring-2 ring-[#201044]/30"
      : "bg-gradient-to-r from-[#6cc24a]/90 to-[#6cc24a]/70";
  }
  if (d.desarrolladorId === INVESTTI_DESARROLLADOR_ID) {
    return selected
      ? "bg-gradient-to-r from-[#201044] to-[#2d1a5c] ring-2 ring-[#6cc24a]/50"
      : "bg-gradient-to-r from-[#201044]/85 to-[#201044]/65";
  }
  if (d.destacado) {
    return "bg-gradient-to-r from-[#201044]/75 to-[#201044]/55 ring-1 ring-[#6cc24a]/30";
  }
  return selected
    ? "bg-gradient-to-r from-slate-600 to-slate-500 ring-2 ring-[#201044]/20"
    : "bg-gradient-to-r from-slate-400/80 to-slate-400/55";
}

export function CorredorMetrajeRangeChart({
  desarrollos,
  selectedId,
  onSelect,
  highlightBand,
  title = "Mapa de metrajes — corredor sur",
  subtitle,
  linkToFicha = true,
  presentation = "default",
}: CorredorMetrajeRangeChartProps) {
  const [sortBy, setSortBy] = useState<MetrajeChartSort>("km");
  const isReport = presentation === "report";

  const sorted = useMemo(
    () => sortDesarrollosForMetrajeChart(desarrollos, sortBy),
    [desarrollos, sortBy],
  );

  const scale = useMemo(() => buildMetrajeScale(desarrollos), [desarrollos]);
  const stats = useMemo(() => getMetrajeChartStats(desarrollos), [desarrollos]);

  const bandLeft = highlightBand ? metrajeToPercent(highlightBand.min, scale) : 0;
  const bandWidth = highlightBand
    ? metrajeToPercent(highlightBand.max, scale) - bandLeft
    : 0;

  if (desarrollos.length === 0) {
    return (
      <section
        className={
          isReport
            ? "border border-neutral-300/90 bg-white p-8 text-center text-sm text-neutral-500"
            : "rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
        }
      >
        Sin desarrollos para mostrar en el gráfico de metrajes.
      </section>
    );
  }

  const sortControls = (
    <div className={`gabi-no-print flex flex-wrap gap-1 ${isReport ? "mt-3" : ""}`}>
      {SORT_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setSortBy(opt.id)}
          className={
            isReport
              ? `px-2 py-0.5 text-[11px] transition ${
                  sortBy === opt.id
                    ? "font-semibold text-[#1C1830] underline decoration-[#201044] underline-offset-4"
                    : "text-neutral-500 hover:text-neutral-800"
                }`
              : `rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                  sortBy === opt.id
                    ? "bg-[#6cc24a] text-[#201044]"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                }`
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const legend = (
    <div
      className={
        isReport
          ? `${investtiReport.sans} flex flex-wrap items-center gap-4 border-b border-neutral-200 px-5 py-3 text-[10px] text-neutral-500 md:px-6`
          : "flex flex-wrap items-center gap-4 border-b border-slate-100 bg-[#F2F0E9]/40 px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 md:px-6"
      }
    >
      {isReport ? (
        <>
          <InvesttiLegendItem color="#201044" label="Cañadas del Valle" />
          <InvesttiLegendItem color="#5C7642" label="Grupo Investti" />
          <InvesttiLegendItem color="#A8A29E" label="Otros" />
          {highlightBand ? (
            <InvesttiLegendItem color="#201044" label={highlightBand.label} border />
          ) : null}
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-gradient-to-r from-[#6cc24a] to-[#5ab83f]" />
            Cañadas del Valle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-[#201044]" />
            Grupo Investti
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-6 rounded-full bg-slate-400" />
            Otros
          </span>
          {highlightBand ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded border border-dashed border-[#6cc24a] bg-[#6cc24a]/15" />
              {highlightBand.label}
            </span>
          ) : null}
        </>
      )}
    </div>
  );

  const chartBody = (
    <>
      {legend}

      <div className="overflow-x-auto px-3 py-4 md:px-5">
        <div className="min-w-[36rem]">
          <div
            className="grid items-end gap-x-2"
            style={{ gridTemplateColumns: `${LABEL_COL_W} 1fr` }}
          >
            <div />
            <div className="relative h-7">
              {scale.ticks.map((tick) => (
                <span
                  key={tick}
                  className={`absolute -translate-x-1/2 text-[10px] tabular-nums ${
                    isReport ? "text-neutral-400" : "font-semibold text-slate-400"
                  }`}
                  style={{ left: `${metrajeToPercent(tick, scale)}%` }}
                >
                  {tick}
                </span>
              ))}
              <span
                className={`absolute -right-1 top-0 text-[9px] ${isReport ? "text-neutral-400" : "font-bold text-slate-400"}`}
              >
                m²
              </span>
            </div>
          </div>

          <div className="relative mt-1">
            <div
              className="pointer-events-none absolute bottom-0 top-0 border-l border-slate-200/80"
              style={{ left: LABEL_COL_W, right: 0 }}
            >
              {scale.ticks.map((tick) => (
                <div
                  key={`grid-${tick}`}
                  className={`absolute bottom-0 top-0 w-px ${isReport ? "bg-neutral-100" : "bg-slate-100"}`}
                  style={{ left: `${metrajeToPercent(tick, scale)}%` }}
                />
              ))}
              {highlightBand ? (
                <div
                  className={
                    isReport
                      ? "absolute bottom-0 top-0 border-x border-dashed border-[#201044]/30 bg-[#201044]/[0.04]"
                      : "absolute bottom-0 top-0 border-x border-dashed border-[#6cc24a]/50 bg-[#6cc24a]/[0.07]"
                  }
                  style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
                />
              ) : null}
            </div>

            <ul className="relative z-10 space-y-1">
              {sorted.map((d) => {
                const left = metrajeToPercent(d.loteMinM2, scale);
                const right = metrajeToPercent(d.loteMaxM2, scale);
                const width = Math.max(0.8, right - left);
                const selected = selectedId === d.id;
                const logo = getDesarrolloLogoUrl(d);
                const iniciales = getDesarrolloIniciales(d.nombre);
                const promedio = getMetrajePromedio(d);
                const promLeft = metrajeToPercent(promedio, scale);

                const rowClass = `group grid items-center gap-x-2 px-1 py-0.5 transition ${
                  isReport ? "rounded-none" : "rounded-xl"
                } ${linkToFicha ? "cursor-pointer" : ""} ${
                  selected
                    ? isReport
                      ? "bg-neutral-50"
                      : "bg-[#6cc24a]/10 ring-1 ring-[#6cc24a]/30"
                    : isReport
                      ? "hover:bg-neutral-50/80"
                      : "hover:bg-slate-50"
                }`;

                const rowContent = (
                  <>
                    <div className="flex items-center gap-2 pr-2">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          className={`h-8 w-8 shrink-0 border border-neutral-200 bg-white object-contain p-0.5 ${
                            isReport ? "" : "rounded-lg"
                          }`}
                        />
                      ) : (
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center bg-[#201044] text-[9px] font-bold text-white ${
                            isReport ? "" : "rounded-lg"
                          }`}
                        >
                          {iniciales}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-xs ${isReport ? "font-medium text-[#1C1830]" : "font-bold text-[#201044]"}`}
                        >
                          {d.nombre}
                        </p>
                        <p className="truncate text-[10px] text-neutral-500">{d.kmLabel}</p>
                      </div>
                    </div>

                    <div className="relative h-9">
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 transition-all ${barStyle(d, selected, isReport)} ${
                          isReport
                            ? selected
                              ? "h-2.5"
                              : "h-2 group-hover:h-2.5"
                            : selected
                              ? "h-3.5 rounded-full shadow-sm"
                              : "h-3 rounded-full shadow-sm group-hover:h-3.5"
                        }`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                      <span
                        className="absolute top-1/2 text-[9px] tabular-nums text-neutral-500"
                        style={{
                          left: `${left}%`,
                          transform: "translate(calc(-100% - 3px), -50%)",
                        }}
                      >
                        {d.loteMinM2}
                      </span>
                      <span
                        className="absolute top-1/2 text-[9px] tabular-nums text-neutral-500"
                        style={{
                          left: `${left + width}%`,
                          transform: "translate(3px, -50%)",
                        }}
                      >
                        {d.loteMaxM2}
                      </span>
                      <span
                        className={`pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 border px-1 py-0.5 text-[8px] tabular-nums ${
                          isReport
                            ? "border-[#201044]/20 bg-white font-medium text-[#1C1830]"
                            : "rounded bg-white/95 font-bold text-[#201044] shadow-sm ring-1 ring-black/5"
                        }`}
                        style={{ left: `${promLeft}%` }}
                        title="Promedio de metraje"
                      >
                        ø {promedio}
                      </span>
                    </div>
                  </>
                );

                if (linkToFicha) {
                  return (
                    <li key={d.id}>
                      <Link
                        href={`/corredor/${d.id}`}
                        className={rowClass}
                        style={{ gridTemplateColumns: `${LABEL_COL_W} 1fr` }}
                        title={`Ver ficha de ${d.nombre}`}
                        onClick={() => onSelect?.(d.id)}
                      >
                        {rowContent}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => onSelect?.(d.id)}
                      className={`${rowClass} w-full text-left`}
                      style={{ gridTemplateColumns: `${LABEL_COL_W} 1fr` }}
                    >
                      {rowContent}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </>
  );

  if (isReport) {
    return (
      <figure>
        <div className={`border ${investtiReport.rule} bg-white`}>
          <InvesttiChartHeader
            title={title}
            subtitle={
              subtitle ??
              "Cada barra muestra el rango de superficie de lote (mín–máx) en el catálogo vigente."
            }
          />
          <div className={`${investtiReport.sans} border-b border-neutral-200 px-5 py-3 md:px-6`}>
            <p className="text-[12px] text-neutral-600">
              Rango corredor {stats.globalMin}–{stats.globalMax} m²
              {stats.masAmplio
                ? ` · Mayor amplitud: ${stats.masAmplio.nombre} (${stats.masAmplio.loteMaxM2 - stats.masAmplio.loteMinM2} m²)`
                : ""}
            </p>
            {sortControls}
          </div>
          {chartBody}
          <InvesttiFootnote>
            Extremos: m² mínimo y máximo del catálogo. El valor ø es el promedio de metraje — en
            Cañadas del Valle, del sembrado v.4; en los demás, (mín+máx)/2 del catálogo.
          </InvesttiFootnote>
        </div>
      </figure>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-[#201044]/10 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-br from-[#201044] to-[#2d1a5c] px-5 py-5 text-white md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#6cc24a]" />
              <h2 className="text-lg font-black md:text-xl">{title}</h2>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-white/70">
              {subtitle ??
                "Cada barra muestra el rango de superficie de lote (mín–máx). Compara de un vistazo quién ocupa cada nicho."}
            </p>
          </div>
          {sortControls}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
              Rango corredor
            </p>
            <p className="text-lg font-black tabular-nums">
              {stats.globalMin}–{stats.globalMax} m²
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/50">
              <Maximize2 className="h-3 w-3" />
              Mayor amplitud
            </p>
            <p className="truncate text-sm font-black">{stats.masAmplio?.nombre ?? "—"}</p>
            {stats.masAmplio ? (
              <p className="text-[11px] text-white/60">
                {stats.masAmplio.loteMaxM2 - stats.masAmplio.loteMinM2} m² de spread
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/50">
              <Minimize2 className="h-3 w-3" />
              Más compacto
            </p>
            <p className="truncate text-sm font-black">{stats.masCompacto?.nombre ?? "—"}</p>
            {stats.masCompacto ? (
              <p className="text-[11px] text-white/60">
                {stats.masCompacto.loteMinM2}–{stats.masCompacto.loteMaxM2} m²
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {chartBody}

      <div className="flex items-start gap-2 border-t border-slate-100 bg-[#F2F0E9]/30 px-5 py-3 text-xs text-slate-600 md:px-6">
        <Ruler className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6cc24a]" />
        <p>
          Extremos: <strong className="text-[#201044]">mín</strong> y{" "}
          <strong className="text-[#201044]">máx</strong> del catálogo.{" "}
          <strong className="text-[#201044]">ø</strong> = promedio de metraje (sembrado en CDV;
          (mín+máx)/2 en el resto).
        </p>
      </div>
    </section>
  );
}

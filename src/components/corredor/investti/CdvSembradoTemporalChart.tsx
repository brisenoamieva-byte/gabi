"use client";

import { CDV_SEMBRADO_TEMPORAL } from "@/lib/corredor/cdv-sembrado-temporal.generated";
import {
  METRAJE_RECOMENDADO_MAX,
  METRAJE_RECOMENDADO_MIN,
} from "@/lib/corredor/investti-analisis";
import {
  InvesttiChartHeader,
  InvesttiFigure,
  InvesttiFootnote,
  InvesttiLegendItem,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

const W = 760;
const H = 300;
const PAD = { top: 24, right: 48, bottom: 52, left: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const COLOR_VENTAS = "#201044";
const COLOR_APARTADOS = "#8B8580";

function labelMes(ym: string): string {
  const [y, m] = ym.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${meses[Number(m) - 1]} ${y.slice(2)}`;
}

function scaleX(i: number, n: number) {
  return PAD.left + (i / Math.max(n - 1, 1)) * PLOT_W;
}

function scaleY(v: number, min: number, max: number) {
  return PAD.top + PLOT_H - ((v - min) / (max - min)) * PLOT_H;
}

export function CdvSembradoTemporalChart() {
  const { insights, serieMensual, conclusiones, fuente } = CDV_SEMBRADO_TEMPORAL;
  const n = serieMensual.length;

  const maxOps = Math.max(...serieMensual.map((s) => s.total), 1);
  const m2Vals = serieMensual.flatMap((s) => [s.medianaM2, s.medianaM6]);
  const m2Min = Math.min(...m2Vals, METRAJE_RECOMENDADO_MIN) - 15;
  const m2Max = Math.max(...m2Vals, METRAJE_RECOMENDADO_MAX) + 15;

  const y220 = scaleY(220, m2Min, m2Max);
  const y260 = scaleY(260, m2Min, m2Max);
  const bandTop = Math.min(y220, y260);
  const bandH = Math.abs(y260 - y220);

  const tickEvery = n > 24 ? 3 : n > 14 ? 2 : 1;

  return (
    <InvesttiFigure caption="Por mes, según fecha del depósito de apartado. La línea negra es el tamaño típico vendido (promedio móvil 6 meses).">
      <InvesttiChartHeader
        title="Ventas mes a mes"
        subtitle={`${insights.periodoDesde} – ${insights.periodoHasta} · ${insights.totalMovimientos} operaciones con fecha`}
        legend={
          <>
            <InvesttiLegendItem color={COLOR_VENTAS} label="Ventas" />
            <InvesttiLegendItem color={COLOR_APARTADOS} label="Apartados" />
            <InvesttiLegendItem color="#1C1830" label="Mediana m² (6m)" border />
          </>
        }
      />

      <div className="grid gap-px border-b border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Tamaño típico (12 meses)"
          value={`${insights.medianaM2Ultimos12Meses} m²`}
          sub={`+${insights.deltaMediana12m} m² vs. año anterior`}
        />
        <Kpi
          label="Lotes ≥220 m² (12 meses)"
          value={`${insights.pct220oMasUltimos12}%`}
          sub={`+${insights.deltaPct220} pts vs. histórico`}
        />
        <Kpi
          label="Apartados (6 meses)"
          value={`${insights.apartadosUltimos6m}`}
          sub={`Típico: ${insights.medianaApartadosUltimos6m} m²`}
        />
        <Kpi
          label="Ritmo (6 meses)"
          value={`${insights.opsPromedioMensualUltimos6}/mes`}
          sub="Promedio de ventas"
        />
      </div>

      <div className="overflow-x-hidden px-2 py-4 md:px-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-[760px]"
          role="img"
          aria-label="Gráfica temporal de ventas, apartados y mediana de metraje"
        >
          <rect
            x={PAD.left}
            y={bandTop}
            width={PLOT_W}
            height={bandH}
            fill="#201044"
            fillOpacity={0.06}
          />
          <text x={PAD.left + 4} y={bandTop + 12} className="fill-neutral-500 text-[9px]">
            Propuesta {METRAJE_RECOMENDADO_MIN}–{METRAJE_RECOMENDADO_MAX} m²
          </text>

          {[m2Min, 190, 220, 260, m2Max]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((t) => (
              <g key={`my-${t}`}>
                <line
                  x1={PAD.left}
                  y1={scaleY(t, m2Min, m2Max)}
                  x2={PAD.left + PLOT_W}
                  y2={scaleY(t, m2Min, m2Max)}
                  stroke="#E7E5E4"
                  strokeWidth={0.5}
                  strokeDasharray={t === 220 || t === 260 ? "4 3" : undefined}
                />
                <text
                  x={W - PAD.right + 36}
                  y={scaleY(t, m2Min, m2Max) + 3}
                  textAnchor="end"
                  className="fill-neutral-400 text-[8px]"
                >
                  {t}
                </text>
              </g>
            ))}

          {serieMensual.map((s, i) => {
            const x = scaleX(i, n) - 6;
            const w = Math.max(4, PLOT_W / n - 2);
            const hV = (s.ventas / maxOps) * PLOT_H;
            const hA = (s.apartados / maxOps) * PLOT_H;
            return (
              <g key={s.ym}>
                <rect
                  x={x}
                  y={PAD.top + PLOT_H - hV - hA}
                  width={w}
                  height={hV}
                  fill={COLOR_VENTAS}
                />
                <rect
                  x={x}
                  y={PAD.top + PLOT_H - hA}
                  width={w}
                  height={hA}
                  fill={COLOR_APARTADOS}
                />
              </g>
            );
          })}

          <polyline
            fill="none"
            stroke="#1C1830"
            strokeWidth={1.5}
            points={serieMensual
              .map((s, i) => `${scaleX(i, n)},${scaleY(s.medianaM6, m2Min, m2Max)}`)
              .join(" ")}
          />

          {serieMensual.map((s, i) =>
            i % tickEvery === 0 || i === n - 1 ? (
              <text
                key={`tx-${s.ym}`}
                x={scaleX(i, n)}
                y={H - 16}
                textAnchor="middle"
                className="fill-neutral-500 text-[8px]"
              >
                {labelMes(s.ym)}
              </text>
            ) : null,
          )}

          <text
            x={PAD.left - 8}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            transform={`rotate(-90 ${PAD.left - 8} ${PAD.top + PLOT_H / 2})`}
            className="fill-neutral-500 text-[9px]"
          >
            Operaciones / mes
          </text>
          <text
            x={W - 8}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            transform={`rotate(90 ${W - 8} ${PAD.top + PLOT_H / 2})`}
            className="fill-neutral-500 text-[9px]"
          >
            Mediana m²
          </text>
        </svg>
      </div>

      <div className="border-t border-neutral-200 p-5 md:p-6">
        <h4 className={`${investtiReport.serif} text-[1rem] text-[#1C1830]`}>Qué muestra la gráfica</h4>
        <ol className={`${investtiReport.sans} mt-3 space-y-2.5`}>
          {conclusiones.map((c, i) => (
            <li key={c} className="flex gap-2.5 text-[13px] leading-relaxed text-neutral-700">
              <span className="shrink-0 tabular-nums text-neutral-400">
                {String(i + 1).padStart(2, "0")}.
              </span>
              {c}
            </li>
          ))}
        </ol>
      </div>

      <InvesttiFootnote>{fuente}</InvesttiFootnote>
    </InvesttiFigure>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white px-4 py-3.5">
      <p className={investtiReport.label}>{label}</p>
      <p className={`${investtiReport.serif} mt-1 text-xl tabular-nums text-[#1C1830]`}>{value}</p>
      <p className={`${investtiReport.caption} mt-0.5`}>{sub}</p>
    </div>
  );
}

"use client";

import type { PuntoGap } from "@/lib/corredor/investti-analisis";
import {
  METRAJE_RECOMENDADO_MAX,
  METRAJE_RECOMENDADO_MIN,
} from "@/lib/corredor/investti-analisis";
import { getDesarrolloIniciales } from "@/lib/corredor/desarrollo-logos";
import {
  InvesttiChartHeader,
  InvesttiFigure,
  InvesttiLegendItem,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

const W = 520;
const H = 340;
const PAD = { top: 28, right: 24, bottom: 44, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

type CdvPosicionamientoChartProps = {
  puntos: PuntoGap[];
  metrajeMin: number;
  metrajeMax: number;
  precioMin: number;
  precioMax: number;
};

function scaleX(v: number, min: number, max: number) {
  return PAD.left + ((v - min) / (max - min)) * PLOT_W;
}

function scaleY(v: number, min: number, max: number) {
  return PAD.top + PLOT_H - ((v - min) / (max - min)) * PLOT_H;
}

export function CdvPosicionamientoChart({
  puntos,
  metrajeMin,
  metrajeMax,
  precioMin,
  precioMax,
}: CdvPosicionamientoChartProps) {
  const ticksM = 5;
  const ticksP = 4;
  const metrajeTicks = Array.from({ length: ticksM }, (_, i) =>
    Math.round(metrajeMin + ((metrajeMax - metrajeMin) * i) / (ticksM - 1)),
  );
  const precioTicks = Array.from({ length: ticksP }, (_, i) =>
    Math.round(precioMin + ((precioMax - precioMin) * i) / (ticksP - 1)),
  );

  const zonaLeft = scaleX(METRAJE_RECOMENDADO_MIN, metrajeMin, metrajeMax);
  const zonaRight = scaleX(METRAJE_RECOMENDADO_MAX, metrajeMin, metrajeMax);

  return (
    <InvesttiFigure
      caption="Tamaño del círculo = lotes vendidos al mes."
      className="investti-print-figure-compact"
    >
      <InvesttiChartHeader
        title="Precio y metraje — corredor sur"
        subtitle="Promedio de m² vs. $/m²"
        legend={
          <>
            <InvesttiLegendItem color="#201044" label="CDV" />
            <InvesttiLegendItem color="#5C7642" label="Investti" />
            <InvesttiLegendItem color="#A8A29E" label="Competencia" />
          </>
        }
      />

      <div className="overflow-x-auto p-4 md:p-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="mx-auto w-full max-w-[520px]"
          role="img"
          aria-label="Mapa de posicionamiento metraje versus precio"
        >
          <rect x={PAD.left} y={PAD.top} width={PLOT_W} height={PLOT_H} fill="#FAFAF9" />

          <rect
            x={zonaLeft}
            y={PAD.top}
            width={Math.max(0, zonaRight - zonaLeft)}
            height={PLOT_H}
            fill="#201044"
            fillOpacity={0.05}
            stroke="#201044"
            strokeDasharray="4 3"
            strokeWidth={0.75}
            strokeOpacity={0.35}
          />
          <text x={zonaLeft + 4} y={PAD.top + 14} className="fill-neutral-500 text-[9px]">
            {METRAJE_RECOMENDADO_MIN}–{METRAJE_RECOMENDADO_MAX} m²
          </text>

          <line
            x1={PAD.left}
            y1={PAD.top + PLOT_H}
            x2={PAD.left + PLOT_W}
            y2={PAD.top + PLOT_H}
            stroke="#D6D3D1"
            strokeWidth={1}
          />
          <line
            x1={PAD.left}
            y1={PAD.top}
            x2={PAD.left}
            y2={PAD.top + PLOT_H}
            stroke="#D6D3D1"
            strokeWidth={1}
          />

          {metrajeTicks.map((t) => (
            <g key={`mx-${t}`}>
              <line
                x1={scaleX(t, metrajeMin, metrajeMax)}
                y1={PAD.top + PLOT_H}
                x2={scaleX(t, metrajeMin, metrajeMax)}
                y2={PAD.top + PLOT_H + 4}
                stroke="#D6D3D1"
              />
              <text
                x={scaleX(t, metrajeMin, metrajeMax)}
                y={H - 12}
                textAnchor="middle"
                className="fill-neutral-500 text-[9px]"
              >
                {t}
              </text>
            </g>
          ))}

          {precioTicks.map((t) => (
            <g key={`py-${t}`}>
              <line
                x1={PAD.left - 4}
                y1={scaleY(t, precioMin, precioMax)}
                x2={PAD.left}
                y2={scaleY(t, precioMin, precioMax)}
                stroke="#D6D3D1"
              />
              <text
                x={PAD.left - 8}
                y={scaleY(t, precioMin, precioMax) + 3}
                textAnchor="end"
                className="fill-neutral-500 text-[8px]"
              >
                ${(t / 1000).toFixed(1)}k
              </text>
            </g>
          ))}

          <text
            x={PAD.left + PLOT_W / 2}
            y={H - 2}
            textAnchor="middle"
            className={`${investtiReport.sans} fill-neutral-600 text-[10px]`}
          >
            Promedio (m²)
          </text>
          <text
            x={14}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${PAD.top + PLOT_H / 2})`}
            className={`${investtiReport.sans} fill-neutral-600 text-[10px]`}
          >
            $/m²
          </text>

          {puntos.map((p) => {
            const cx = scaleX(p.metrajePromedio, metrajeMin, metrajeMax);
            const cy = scaleY(p.precioPromM2, precioMin, precioMax);
            const r = Math.max(10, Math.min(22, p.tamanoBurbuja / 2.2));
            const fill = p.esCanadasDelValle
              ? "#201044"
              : p.esInvestti
                ? "#5C7642"
                : "#A8A29E";
            const label = p.esCanadasDelValle
              ? "CDV"
              : getDesarrolloIniciales(p.nombre).slice(0, 2);

            return (
              <g key={p.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={fill}
                  fillOpacity={p.esCanadasDelValle ? 1 : 0.9}
                  stroke={p.esCanadasDelValle ? "#1C1830" : "#fff"}
                  strokeWidth={p.esCanadasDelValle ? 1.5 : 1}
                />
                <text
                  x={cx}
                  y={cy + 3}
                  textAnchor="middle"
                  className={`text-[8px] font-medium ${p.esCanadasDelValle || p.esInvestti ? "fill-white" : "fill-white"}`}
                >
                  {label}
                </text>
                <title>
                  {`${p.nombre}\nProm. ${Math.round(p.metrajePromedio)} m² · $${p.precioPromM2.toLocaleString("es-MX")}/m²${p.absorcionMes ? ` · ${p.absorcionMes}/mes` : ""}`}
                </title>
              </g>
            );
          })}
        </svg>
      </div>
    </InvesttiFigure>
  );
}

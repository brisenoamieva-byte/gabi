"use client";

import {
  CDV_SEMBRADO_FUENTE,
  CDV_SEMBRADO_RANGOS,
} from "@/lib/corredor/cdv-sembrado-analisis";
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

export function CdvInventarioDemandaChart() {
  const maxVal = Math.max(
    ...CDV_SEMBRADO_RANGOS.flatMap((r) => [r.vendidosYApartados, r.disponibles]),
  );

  return (
    <InvesttiFigure caption="Vendido = ventas + apartados. El % de cada rango es cuánto del inventario que había en ese metraje ya salió — no es su peso dentro del total de ventas del proyecto.">
      <InvesttiChartHeader
        title="Ventas e inventario por metraje"
        subtitle="Por rango de m² · % = vendido sobre inventario del tramo"
        legend={
          <>
            <InvesttiLegendItem color="#201044" label="Vendido" />
            <InvesttiLegendItem color="#C4C0B8" label="Libre" />
          </>
        }
      />
      <div className="space-y-0 divide-y divide-neutral-100 px-4 py-2 md:px-5">
        {CDV_SEMBRADO_RANGOS.map((r) => {
          const enPropuesta =
            r.maxM2 > METRAJE_RECOMENDADO_MIN && r.minM2 < METRAJE_RECOMENDADO_MAX;
          const demandPct = (r.vendidosYApartados / maxVal) * 100;
          const stockPct = (r.disponibles / maxVal) * 100;

          return (
            <div
              key={r.rango}
              className={`grid grid-cols-[4.5rem_1fr] items-center gap-3 py-3 md:grid-cols-[5rem_1fr] ${enPropuesta ? "bg-neutral-50/80" : ""}`}
            >
              <div>
                <p className="text-[13px] font-medium text-[#1C1830]">{r.rango}</p>
                <p className="text-[10px] text-neutral-500">
                  {Math.round(r.sellThrough * 100)}% del inventario
                </p>
              </div>
              <div className="space-y-1.5">
                <BarRow
                  label="Vend."
                  value={r.vendidosYApartados}
                  pct={demandPct}
                  color="#201044"
                />
                <BarRow
                  label="Libre"
                  value={r.disponibles > 0 ? r.disponibles : null}
                  pct={stockPct}
                  color="#C4C0B8"
                />
              </div>
            </div>
          );
        })}
      </div>
      <InvesttiFootnote>{CDV_SEMBRADO_FUENTE}</InvesttiFootnote>
    </InvesttiFigure>
  );
}

function BarRow({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number | null;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-8 shrink-0 text-[10px] text-neutral-500">{label}</span>
      <div className="relative h-4 flex-1 bg-neutral-100">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${Math.max(pct, value ? 2 : 0)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span className={`${investtiReport.sans} w-8 shrink-0 text-right text-[11px] tabular-nums text-neutral-700`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

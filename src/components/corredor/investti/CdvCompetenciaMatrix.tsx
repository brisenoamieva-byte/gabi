"use client";

import type { CorredorDesarrollo } from "@/lib/corredor/types";
import { CANADAS_DEL_VALLE_ID } from "@/lib/corredor/investti-analisis";
import { BBR_INVESTTI_RELACION } from "@/lib/corredor/bbr-investti-relacion";
import { getDesarrolloLogoUrl, getDesarrolloIniciales } from "@/lib/corredor/desarrollo-logos";
import {
  InvesttiChartHeader,
  InvesttiFigure,
  InvesttiFootnote,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

type CdvCompetenciaMatrixProps = {
  cdv: CorredorDesarrollo;
  competidores: CorredorDesarrollo[];
};

type FilaMetrica = {
  id: string;
  label: string;
  getValue: (d: CorredorDesarrollo) => number | null;
  format: (v: number) => string;
  mayorMejor: boolean;
};

function formatCompactMoney(v: number): string {
  if (v >= 1_000_000) {
    const m = v / 1_000_000;
    const texto = m.toFixed(2).replace(/\.?0+$/, "");
    return `$${texto}M`;
  }
  return `$${Math.round(v / 1000)}K`;
}

function formatCompactM2Price(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `$${v}`;
}

const METRICAS: FilaMetrica[] = [
  {
    id: "min",
    label: "m² mín",
    getValue: (d) => d.loteMinM2,
    format: (v) => `${v}`,
    mayorMejor: false,
  },
  {
    id: "max",
    label: "m² máx",
    getValue: (d) => d.loteMaxM2,
    format: (v) => `${v}`,
    mayorMejor: true,
  },
  {
    id: "precio",
    label: "$/m²",
    getValue: (d) => Math.round((d.precioMinM2 + d.precioMaxM2) / 2),
    format: formatCompactM2Price,
    mayorMejor: false,
  },
  {
    id: "ticket",
    label: "Ticket",
    getValue: (d) => d.ticketDesde,
    format: formatCompactMoney,
    mayorMejor: false,
  },
  {
    id: "absorcion",
    label: "Abs./mes",
    getValue: (d) => d.absorcionMes,
    format: (v) => `${v}`,
    mayorMejor: true,
  },
];

function mejorEnMetrica(
  desarrollos: CorredorDesarrollo[],
  metrica: FilaMetrica,
): number | null {
  const vals = desarrollos
    .map((d) => metrica.getValue(d))
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return metrica.mayorMejor ? Math.max(...vals) : Math.min(...vals);
}

function nombreCorto(nombre: string): string {
  return nombre
    .replace("Cañadas del ", "Cañadas ")
    .replace("Preserve ", "Pres. ")
    .replace("Real del ", "Real ");
}

export function CdvCompetenciaMatrix({ cdv, competidores }: CdvCompetenciaMatrixProps) {
  const columnas = [cdv, ...competidores];

  return (
    <InvesttiFigure caption="En negrita: mejor dato de la fila. CDV en la primera columna.">
      <InvesttiChartHeader
        title="CDV vs. competencia directa"
        subtitle="Solo referencia de mercado"
      />

      <div className="overflow-x-auto px-3 py-3 md:px-4 md:py-4">
        <table className="w-full min-w-[520px] table-fixed border-collapse">
          <colgroup>
            <col className="w-[11%]" />
            {columnas.map((d) => (
              <col key={d.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="pb-2 pr-1 text-left align-bottom text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                Métrica
              </th>
              {columnas.map((d) => {
                const logo = getDesarrolloLogoUrl(d);
                const esCdv = d.id === CANADAS_DEL_VALLE_ID;
                return (
                  <th key={d.id} className="px-0.5 pb-2 align-bottom">
                    <div
                      title={d.nombre}
                      className={`mx-auto flex max-w-full flex-col items-center gap-1 px-0.5 py-1 ${
                        esCdv ? "border-b-2 border-[#201044]" : ""
                      }`}
                    >
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={logo}
                          alt=""
                          className="h-6 w-6 shrink-0 border border-neutral-200 bg-white object-contain p-px md:h-7 md:w-7"
                        />
                      ) : (
                        <span className="grid h-6 w-6 shrink-0 place-items-center bg-[#201044] text-[8px] font-medium text-white md:h-7 md:w-7">
                          {getDesarrolloIniciales(d.nombre).slice(0, 2)}
                        </span>
                      )}
                      <span className="line-clamp-2 text-center text-[8px] font-medium leading-[1.15] text-[#1C1830] md:text-[9px]">
                        {nombreCorto(d.nombre)}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {METRICAS.map((m) => {
              const mejor = mejorEnMetrica(columnas, m);
              return (
                <tr key={m.id} className="border-t border-neutral-100">
                  <td className="py-2 pr-1 text-[10px] leading-tight text-neutral-600 md:text-[11px]">
                    {m.label}
                  </td>
                  {columnas.map((d) => {
                    const raw = m.getValue(d);
                    const esCdv = d.id === CANADAS_DEL_VALLE_ID;
                    const esMejor = raw != null && mejor != null && raw === mejor;
                    const maxAbs = Math.max(...columnas.map((c) => m.getValue(c) ?? 0));
                    const barPct = raw != null && maxAbs > 0 ? (raw / maxAbs) * 100 : 0;

                    return (
                      <td
                        key={d.id}
                        className={`px-0.5 py-2 ${esCdv ? "bg-neutral-50/90" : ""}`}
                      >
                        <div className="px-0.5 py-1 text-center md:px-1">
                          <p
                            className={`${investtiReport.sans} text-[10px] tabular-nums leading-tight md:text-[11px] ${
                              esMejor
                                ? "font-semibold text-[#1C1830]"
                                : esCdv
                                  ? "text-[#1C1830]"
                                  : "text-neutral-700"
                            }`}
                          >
                            {raw != null ? m.format(raw) : "—"}
                          </p>
                          {m.id === "absorcion" && raw != null ? (
                            <div className="mx-auto mt-1.5 h-px w-full max-w-[3rem] bg-neutral-200">
                              <div
                                className={`h-px ${esCdv ? "bg-[#201044]" : "bg-neutral-400"}`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InvesttiFootnote>
        {BBR_INVESTTI_RELACION.comparativo} Fuente: catálogo corredor sur y brochures vigentes.
      </InvesttiFootnote>
    </InvesttiFigure>
  );
}

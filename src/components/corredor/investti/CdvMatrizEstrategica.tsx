"use client";

import {
  CDV_SEMBRADO_RESUMEN,
  sellThroughEnRango,
} from "@/lib/corredor/cdv-sembrado-analisis";
import {
  getCanadasDelValle,
  METRAJE_RECOMENDADO_MAX,
  METRAJE_RECOMENDADO_MIN,
} from "@/lib/corredor/investti-analisis";
import {
  InvesttiFigure,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";
import { formatTicket } from "@/lib/data";

export function CdvMatrizEstrategica() {
  const cdv = getCanadasDelValle();
  const ticketMin = Math.round(METRAJE_RECOMENDADO_MIN * cdv.precioMinM2);
  const ticketMax = Math.round(METRAJE_RECOMENDADO_MAX * cdv.precioMaxM2);
  const st200_250 = sellThroughEnRango(200, 250);

  return (
    <InvesttiFigure>
      <div className="grid md:grid-cols-2">
        <EtapaCol
          titulo="Hoy (etapa actual)"
          rango="160–250 m²"
          filas={[
            ["Ventas bajo 250 m²", `${CDV_SEMBRADO_RESUMEN.pctDemandaBajo250}%`],
            ["Tamaño típico vendido", `${CDV_SEMBRADO_RESUMEN.medianaVentaM2} m²`],
            ["Libres en 200–250 m²", `${CDV_SEMBRADO_RESUMEN.disponibles200a250}`],
            ["Libres en 160–200 m²", `${CDV_SEMBRADO_RESUMEN.disponibles160a200}`],
          ]}
        />
        <EtapaCol
          titulo="Propuesta nueva etapa"
          rango={`${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m²`}
          destacado
          filas={[
            ["Vendido en 200–250 m²", `${st200_250.min}–${st200_250.max}% del tramo`],
            ["Apartados activos (mediana)", `${CDV_SEMBRADO_RESUMEN.medianaApartadoM2} m²`],
            ["Ritmo CDV", `${cdv.absorcionMes} lotes/mes`],
            ["Ticket estimado", `${formatTicket(ticketMin)} – ${formatTicket(ticketMax)}`],
          ]}
        />
      </div>
    </InvesttiFigure>
  );
}

function EtapaCol({
  titulo,
  rango,
  filas,
  destacado = false,
}: {
  titulo: string;
  rango: string;
  filas: [string, string][];
  destacado?: boolean;
}) {
  return (
    <div
      className={`border-b border-neutral-200 px-5 py-5 md:border-b-0 md:border-r md:py-6 ${destacado ? "bg-neutral-50/70" : ""}`}
    >
      <p className={investtiReport.label}>{titulo}</p>
      <p className={`${investtiReport.serif} mt-2 text-[1.65rem] text-[#1C1830]`}>{rango}</p>
      <table className="mt-5 w-full text-[13px]">
        <tbody>
          {filas.map(([k, v]) => (
            <tr key={k} className="border-t border-neutral-100">
              <td className="py-2 pr-3 text-neutral-600">{k}</td>
              <td className="py-2 text-right font-medium tabular-nums text-[#1C1830]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

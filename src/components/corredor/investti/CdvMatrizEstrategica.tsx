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
  InvesttiFootnote,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";
import { formatPrice, formatTicket } from "@/lib/data";

export function CdvMatrizEstrategica() {
  const cdv = getCanadasDelValle();
  const ticketMin = Math.round(METRAJE_RECOMENDADO_MIN * cdv.precioMinM2);
  const ticketMax = Math.round(METRAJE_RECOMENDADO_MAX * cdv.precioMaxM2);
  const st200_250 = sellThroughEnRango(200, 250);

  return (
    <InvesttiFigure caption="Fuente: sembrado v.4 y brochure feb 2026.">
      <div className="grid md:grid-cols-2">
        <EtapaCol
          titulo="Etapa actual"
          rango="160–250 m²"
          subtitulo="Lo que se vende hoy"
          filas={[
            ["Ventas bajo 250 m²", `${CDV_SEMBRADO_RESUMEN.pctDemandaBajo250}% del total`],
            ["Tamaño típico vendido", `${CDV_SEMBRADO_RESUMEN.medianaVentaM2} m²`],
            ["Lotes libres bajo 250 m²", `${CDV_SEMBRADO_RESUMEN.disponiblesBajo250}`],
            ["Ritmo de venta CDV", `${cdv.absorcionMes} lotes/mes`],
          ]}
        />
        <EtapaCol
          titulo="Nueva etapa"
          rango={`${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m²`}
          subtitulo="Propuesta BBR"
          destacado
          filas={[
            ["Inventario vendido en 200–250 m²", `${st200_250.min}–${st200_250.max}%`],
            ["Ventas en 200–250 m²", `${CDV_SEMBRADO_RESUMEN.demanda200a250}`],
            ["Mediana en apartados activos", `${CDV_SEMBRADO_RESUMEN.medianaApartadoM2} m²`],
            [
              "Precio total estimado",
              `${formatTicket(ticketMin)} – ${formatTicket(ticketMax)}`,
            ],
          ]}
        />
      </div>
      <InvesttiFootnote>
        El % en 200–250 m² es del inventario original de ese tramo (vendido + apartado sobre el
        total de lotes en ese metraje), no del total de ventas del proyecto. La mediana en apartados
        es el metraje que ocupan hoy los apartados vigentes en sembrado.
      </InvesttiFootnote>
      <InvesttiFootnote>
        En la etapa actual quedan {CDV_SEMBRADO_RESUMEN.disponibles160a200} lotes en 160–200 m². En
        200–250 m² solo {CDV_SEMBRADO_RESUMEN.disponibles200a250} libres — el inventario en ese
        metraje está casi agotado. La nueva etapa debe reponer producto ahí.
      </InvesttiFootnote>
      <InvesttiFootnote>
        Precio total: {METRAJE_RECOMENDADO_MIN} m² × {formatPrice(cdv.precioMinM2).replace(".00", "")}
        /m² = {formatTicket(ticketMin)}; {METRAJE_RECOMENDADO_MAX} m² ×{" "}
        {formatPrice(cdv.precioMaxM2).replace(".00", "")}/m² = {formatTicket(ticketMax)} (lista CDV
        feb 2026).
      </InvesttiFootnote>
    </InvesttiFigure>
  );
}

function EtapaCol({
  titulo,
  rango,
  subtitulo,
  filas,
  destacado = false,
}: {
  titulo: string;
  rango: string;
  subtitulo: string;
  filas: [string, string][];
  destacado?: boolean;
}) {
  return (
    <div
      className={`border-b border-neutral-200 px-5 py-5 md:border-b-0 md:border-r md:py-6 ${destacado ? "bg-neutral-50/70" : ""}`}
    >
      <p className={investtiReport.label}>{titulo}</p>
      <p className={`${investtiReport.serif} mt-2 text-[1.65rem] text-[#1C1830]`}>{rango}</p>
      <p className="mt-1 text-[12px] text-neutral-500">{subtitulo}</p>
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

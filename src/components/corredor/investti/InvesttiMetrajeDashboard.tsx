"use client";

import { useMemo } from "react";
import { CorredorMetrajeRangeChart } from "@/components/corredor/CorredorMetrajeRangeChart";
import { ConsultoriaBrandLogo } from "@/components/brand/ConsultoriaBrandLogo";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { CdvEtapa4LotificacionReview } from "@/components/corredor/investti/CdvEtapa4LotificacionReview";
import { CdvInventarioDemandaChart } from "@/components/corredor/investti/CdvInventarioDemandaChart";
import { CdvMatrizEstrategica } from "@/components/corredor/investti/CdvMatrizEstrategica";
import { CdvPosicionamientoChart } from "@/components/corredor/investti/CdvPosicionamientoChart";
import {
  InvesttiCallout,
  InvesttiCoverStat,
  InvesttiEvidenceList,
  InvesttiReportCover,
  InvesttiSection,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";
import { CORREDOR_DATOS_ACTUALIZADOS } from "@/lib/corredor/contexto-mercado";
import {
  buildRecomendacionMetraje,
  getCanadasDelValle,
  getGapChartData,
} from "@/lib/corredor/investti-analisis";
import { CDV_SEMBRADO_FUENTE } from "@/lib/corredor/cdv-sembrado-analisis";
import {
  CORREDOR_DESARROLLOS_ANALISIS,
  countCorredorDesarrollosAnalisis,
} from "@/lib/corredor/corredor-analisis";
import { formatPrice, formatTicket } from "@/lib/data";

export function InvesttiMetrajeDashboard() {
  const cdv = getCanadasDelValle();
  const recomendacion = buildRecomendacionMetraje();
  const gapData = getGapChartData();
  const totalDesarrollosAnalisis = countCorredorDesarrollosAnalisis();

  const gapBounds = useMemo(() => {
    const metrajes = gapData.map((p) => p.metrajePromedio);
    const precios = gapData.map((p) => p.precioPromM2);
    return {
      metrajeMin: Math.min(...metrajes) - 20,
      metrajeMax: Math.max(...metrajes) + 20,
      precioMin: Math.min(...precios) - 300,
      precioMax: Math.max(...precios) + 300,
    };
  }, [gapData]);

  return (
    <article className={`${investtiReport.body} investti-report-article`}>
      <InvesttiReportCover
        title="Nueva etapa Cañadas del Valle — metraje propuesto"
        subtitle="Propuesta BBR Habitarea con base en el sembrado vigente y el comparativo del corredor sur."
        client="Grupo Investti"
        date={CORREDOR_DATOS_ACTUALIZADOS}
      >
        <InvesttiCoverStat
          label="Metraje propuesto"
          value={`${recomendacion.rangoMin}–${recomendacion.rangoMax} m²`}
          note="Nueva etapa"
        />
        <InvesttiCoverStat
          label="Precio total (lista)"
          value={`${formatTicket(recomendacion.ticketEstimadoMin)} – ${formatTicket(recomendacion.ticketEstimadoMax)}`}
          note={`${formatPrice(cdv.precioMinM2).replace(".00", "")}–${formatPrice(cdv.precioMaxM2).replace(".00", "")}/m²`}
        />
        <InvesttiCoverStat
          label="Ritmo de venta"
          value={`${cdv.absorcionMes} lotes/mes`}
          note="CDV · sembrado Control Gerencia"
        />
      </InvesttiReportCover>

      <div className="mt-12 space-y-12">
        <InvesttiSection
          number="01"
          title="Recomendación"
          lead="Resumen ejecutivo para definir la siguiente etapa."
          printVariant="after-cover"
        >
          <InvesttiCallout title="BBR Habitarea propone">
            <p className={`${investtiReport.serif} text-[1.35rem] leading-snug text-[#1C1830]`}>
              Lotes de{" "}
              <strong>
                {recomendacion.rangoMin}–{recomendacion.rangoMax} m²
              </strong>{" "}
              en la nueva etapa.
            </p>
            <p className="mt-3">{recomendacion.resumen}</p>
          </InvesttiCallout>
          <InvesttiEvidenceList items={recomendacion.evidencia} />
        </InvesttiSection>

        <InvesttiSection
          number="02"
          title="Inventario y demanda"
          lead="Qué se ha vendido, qué queda y cómo encaja el plano Etapa 4."
          printVariant="major"
        >
          <CdvMatrizEstrategica />
          <div className="mt-8">
            <CdvInventarioDemandaChart />
          </div>
          <div className="mt-8">
            <CdvEtapa4LotificacionReview />
          </div>
        </InvesttiSection>

        <InvesttiSection
          number="03"
          title="Contexto de mercado"
          lead="Referencia del corredor sur — sin fines de comercialización de terceros."
          printVariant="major"
        >
          <div className="space-y-8">
            <CorredorMetrajeRangeChart
              presentation="report"
              desarrollos={CORREDOR_DESARROLLOS_ANALISIS}
              linkToFicha={false}
              highlightBand={{
                min: recomendacion.rangoMin,
                max: recomendacion.rangoMax,
                label: `${recomendacion.rangoMin}–${recomendacion.rangoMax} m²`,
              }}
              title="Metrajes en el corredor sur"
              subtitle={`${totalDesarrollosAnalisis} desarrollos · franja = propuesta CDV`}
            />
            <CdvPosicionamientoChart
              puntos={gapData}
              metrajeMin={gapBounds.metrajeMin}
              metrajeMax={gapBounds.metrajeMax}
              precioMin={gapBounds.precioMin}
              precioMax={gapBounds.precioMax}
            />
          </div>
        </InvesttiSection>

        <footer className={`investti-print-document-footer border-t ${investtiReport.rule} pt-8`}>
          <p className={investtiReport.label}>Fuente</p>
          <p className={`${investtiReport.sans} mt-3 text-[12px] leading-relaxed text-neutral-600`}>
            {CDV_SEMBRADO_FUENTE} · precios lista CDV feb 2026 · comparativo corredor sur jun 2026.
            Plano Etapa 4: validar superficies finales con tabla ARVT.
          </p>
          <div className={`mt-8 flex flex-wrap items-end justify-between gap-6 border-t ${investtiReport.rule} pt-6`}>
            <div>
              <ConsultoriaBrandLogo height={36} />
              <p className={`${investtiReport.caption} mt-2`}>Elaborado por BBR Habitarea</p>
            </div>
            <GabiSistemaMark
              size="sm"
              align="end"
              tone="report"
              tagline="Plataforma de análisis inmobiliario"
            />
          </div>
          <p className={`${investtiReport.caption} mt-4 text-right`}>
            Documento para Grupo Investti · Sistema gabi
          </p>
        </footer>
      </div>
    </article>
  );
}

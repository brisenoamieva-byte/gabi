"use client";

import { useMemo } from "react";
import { CorredorMetrajeRangeChart } from "@/components/corredor/CorredorMetrajeRangeChart";
import { BbrHabitareaLogo } from "@/components/brand/BbrHabitareaLogo";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { CdvEtapa4LotificacionReview } from "@/components/corredor/investti/CdvEtapa4LotificacionReview";
import { CdvCompetenciaMatrix } from "@/components/corredor/investti/CdvCompetenciaMatrix";
import { CdvInventarioDemandaChart } from "@/components/corredor/investti/CdvInventarioDemandaChart";
import { CdvMatrizEstrategica } from "@/components/corredor/investti/CdvMatrizEstrategica";
import { CdvPosicionamientoChart } from "@/components/corredor/investti/CdvPosicionamientoChart";
import { CdvSembradoTemporalChart } from "@/components/corredor/investti/CdvSembradoTemporalChart";
import {
  InvesttiCallout,
  InvesttiConvenioNotice,
  InvesttiCoverStat,
  InvesttiEvidenceList,
  InvesttiReportCover,
  InvesttiSection,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";
import {
  CORREDOR_CONTEXTO,
  CORREDOR_DATOS_ACTUALIZADOS,
  CORREDOR_STATS,
} from "@/lib/corredor/contexto-mercado";
import {
  buildRecomendacionMetraje,
  getAbsorcionRanking,
  getCanadasDelValle,
  getCompetidoresDirectosCDV,
  getGapChartData,
} from "@/lib/corredor/investti-analisis";
import { CDV_ETAPA4_LOTIFICACION_FUENTE } from "@/lib/corredor/cdv-etapa4-lotificacion";
import { CDV_SEMBRADO_FUENTE, CDV_SEMBRADO_RESUMEN } from "@/lib/corredor/cdv-sembrado-analisis";
import { CDV_SEMBRADO_TEMPORAL } from "@/lib/corredor/cdv-sembrado-temporal.generated";
import {
  CORREDOR_DESARROLLOS_ANALISIS,
  countCorredorDesarrollosAnalisis,
} from "@/lib/corredor/corredor-analisis";
import { formatPrice, formatTicket } from "@/lib/data";

export function InvesttiMetrajeDashboard() {
  const cdv = getCanadasDelValle();
  const recomendacion = buildRecomendacionMetraje();
  const absorcionRanking = getAbsorcionRanking();
  const gapData = getGapChartData();
  const competidoresDirectos = getCompetidoresDirectosCDV();
  const totalDesarrollosAnalisis = countCorredorDesarrollosAnalisis();
  const sinAbsorcion = CORREDOR_DESARROLLOS_ANALISIS.filter((d) => d.absorcionMes == null).length;

  const gapBounds = useMemo(() => {
    const metrajes = gapData.map((p) => p.metrajeMedio);
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
        title="Metraje recomendado — nueva etapa Cañadas del Valle"
        subtitle="Con base en el sembrado de Control Gerencia, el corredor sur y los precios de lista. Objetivo: definir cuántos m² conviene desarrollar en la siguiente etapa."
        client="Grupo Investti"
        date={CORREDOR_DATOS_ACTUALIZADOS}
      >
        <InvesttiCoverStat
          label="Absorción CDV"
          value={`${cdv.absorcionMes} lotes/mes`}
          note={`${Math.round((cdv.absorcionMes ?? 0) / CORREDOR_STATS.absorcionPromMes)}× promedio corredor`}
        />
        <InvesttiCoverStat
          label="Propuesta"
          value={`${recomendacion.rangoMin}–${recomendacion.rangoMax} m²`}
          note="Nueva etapa"
        />
        <InvesttiCoverStat
          label="Sembrado"
          value={`${CDV_SEMBRADO_RESUMEN.vendidas} ventas`}
          note={`Mediana ${CDV_SEMBRADO_RESUMEN.medianaVentaM2} m²`}
        />
        <InvesttiCoverStat
          label="Precio total"
          value={formatTicket(recomendacion.ticketEstimadoMin)}
          note={`hasta ${formatTicket(recomendacion.ticketEstimadoMax)} · ${recomendacion.rangoMin}×${formatPrice(cdv.precioMinM2).replace(".00", "")} – ${recomendacion.rangoMax}×${formatPrice(cdv.precioMaxM2).replace(".00", "")}/m²`}
        />
      </InvesttiReportCover>

      <div className="mt-12 space-y-12">
        <InvesttiSection
          number="01"
          title="Diagnóstico"
          lead="Etapa actual (160–250 m²), propuesta BBR (220–260 m²) y plano VoBo de Etapa 4."
        >
          <CdvMatrizEstrategica />
          <div className="investti-print-break mt-8">
            <CdvEtapa4LotificacionReview />
          </div>
        </InvesttiSection>

        <InvesttiSection
          number="02"
          title="Sembrado por metraje"
          lead="Cuánto se ha vendido y cuánto queda libre, por tamaño de lote."
        >
          <CdvInventarioDemandaChart />
        </InvesttiSection>

        <InvesttiSection
          number="03"
          title="Evolución en el tiempo"
          lead="Mes a mes: cuántos lotes se venden y qué tamaño piden los compradores."
        >
          <CdvSembradoTemporalChart />
        </InvesttiSection>

        <InvesttiSection
          number="04"
          title="Conclusión"
          lead="Resumen y recomendación para la siguiente etapa."
        >
          <InvesttiCallout title="Recomendación BBR Habitarea">
            <p className={`${investtiReport.serif} text-[1.35rem] leading-snug text-[#1C1830]`}>
              Desarrollar la nueva etapa en{" "}
              <strong>
                {recomendacion.rangoMin}–{recomendacion.rangoMax} m²
              </strong>
              .
            </p>
            <p className="mt-3">{recomendacion.resumen}</p>
            <p className="mt-4 text-[13px] text-neutral-600">
              Precio total estimado (lista CDV feb 2026):{" "}
              <span className="font-semibold text-[#1C1830]">
                {formatTicket(recomendacion.ticketEstimadoMin)} –{" "}
                {formatTicket(recomendacion.ticketEstimadoMax)}
              </span>
              {" "}
              — {recomendacion.rangoMin} m² × {formatPrice(cdv.precioMinM2).replace(".00", "")}/m²
              y {recomendacion.rangoMax} m² × {formatPrice(cdv.precioMaxM2).replace(".00", "")}/m².
            </p>
          </InvesttiCallout>
          <InvesttiEvidenceList items={recomendacion.evidencia} />
        </InvesttiSection>

        <InvesttiSection
          number="05"
          title="Mercado y competencia"
          lead="Dónde está CDV frente a otros desarrollos del corredor sur. Solo referencia; BBR no comercializa a terceros."
        >
          <InvesttiConvenioNotice />
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
              subtitle={`${totalDesarrollosAnalisis} desarrollos. La franja sombreada es la propuesta para CDV (220–260 m²).`}
            />

            <div className="investti-print-break investti-print-competencia-grid grid gap-8 lg:grid-cols-2">
              <CdvPosicionamientoChart
                puntos={gapData}
                metrajeMin={gapBounds.metrajeMin}
                metrajeMax={gapBounds.metrajeMax}
                precioMin={gapBounds.precioMin}
                precioMax={gapBounds.precioMax}
              />

              <div className={`border ${investtiReport.rule} bg-white`}>
                <div className={`border-b ${investtiReport.rule} px-5 py-4`}>
                  <h3 className={`${investtiReport.serif} text-[1.05rem] text-[#1C1830]`}>
                    Absorción mensual
                  </h3>
                  <p className="mt-1 text-[13px] text-neutral-600">
                    Lotes vendidos al mes en el corredor
                  </p>
                </div>
                <div className="space-y-3 px-5 py-4">
                  {absorcionRanking.map((r) => {
                    const maxAbs = absorcionRanking[0]?.absorcionMes ?? 1;
                    const pct = ((r.absorcionMes ?? 0) / maxAbs) * 100;
                    return (
                      <div key={r.id}>
                        <div className="mb-1 flex justify-between text-[13px]">
                          <span className={r.esCanadasDelValle ? "font-semibold text-[#1C1830]" : "text-neutral-700"}>
                            {r.ranking}. {r.nombre}
                          </span>
                          <span className="tabular-nums text-neutral-800">{r.absorcionMes}/mes</span>
                        </div>
                        <div className="h-1.5 bg-neutral-100">
                          <div
                            className={`h-full ${r.esCanadasDelValle ? "bg-[#201044]" : "bg-neutral-400"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className={`${investtiReport.caption} border-t ${investtiReport.rule} px-5 py-3`}>
                  {sinAbsorcion} desarrollo{sinAbsorcion === 1 ? "" : "s"} sin dato de ventas mensuales.
                </p>
              </div>
            </div>

            <div className="investti-print-break">
              <CdvCompetenciaMatrix cdv={cdv} competidores={competidoresDirectos} />
            </div>
          </div>
        </InvesttiSection>

        <footer className={`investti-print-footer border-t ${investtiReport.rule} pt-8`}>
          <p className={investtiReport.label}>Fuentes</p>
          <div className={`${investtiReport.sans} mt-4 space-y-3 text-[12px] leading-relaxed text-neutral-600`}>
            <p>
              <strong className="font-medium text-neutral-800">Sembrado:</strong> {CDV_SEMBRADO_FUENTE}.{" "}
              {CDV_SEMBRADO_RESUMEN.vendidas} ventas, {CDV_SEMBRADO_RESUMEN.apartados} apartados,{" "}
              {CDV_SEMBRADO_RESUMEN.disponibles} disponibles.
            </p>
            <p>
              <strong className="font-medium text-neutral-800">Serie mensual:</strong>{" "}
              {CDV_SEMBRADO_TEMPORAL.fuente}. {CDV_SEMBRADO_TEMPORAL.insights.totalMovimientos} operaciones
              con fecha ({CDV_SEMBRADO_TEMPORAL.insights.periodoDesde}–
              {CDV_SEMBRADO_TEMPORAL.insights.periodoHasta}).
            </p>
            <p>
              <strong className="font-medium text-neutral-800">Etapa 4:</strong>{" "}
              {CDV_ETAPA4_LOTIFICACION_FUENTE}. Superficies del plano son estimadas; validar con tabla ARVT.
            </p>
            <p>
              <strong className="font-medium text-neutral-800">Corredor:</strong> {totalDesarrollosAnalisis}{" "}
              desarrollos; precios $
              {CORREDOR_STATS.precioMinM2.toLocaleString("es-MX")}–$
              {CORREDOR_STATS.precioMaxM2.toLocaleString("es-MX")}/m². {CORREDOR_CONTEXTO.fuente}
            </p>
          </div>
          <div className={`mt-8 flex flex-wrap items-end justify-between gap-6 border-t ${investtiReport.rule} pt-6`}>
            <div>
              <BbrHabitareaLogo height={36} />
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
            Documento para uso interno de Grupo Investti · Sistema gabi
          </p>
        </footer>
      </div>
    </article>
  );
}

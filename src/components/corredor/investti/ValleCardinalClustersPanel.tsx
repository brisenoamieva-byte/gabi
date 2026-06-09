"use client";

import {
  VALLE_CARDINAL_CLUSTERS,
  VALLE_CARDINAL_RESUMEN,
} from "@/lib/corredor/valle-cardinal";
import {
  InvesttiChartHeader,
  InvesttiFigure,
  InvesttiFootnote,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

export function ValleCardinalClustersPanel() {
  return (
    <InvesttiFigure>
      <InvesttiChartHeader
        title="Valle Cardinal — clústeres del biodesarrollo"
        subtitle="Hacienda Higuera y Cortijo Miravalle son etapas del mismo desarrollo (km 18, carretera 413). Fuente: ebooks mayo 2026."
      />

      <div className={`border ${investtiReport.rule} bg-[#FAFAF8] px-5 py-4 text-[13px] leading-relaxed text-neutral-700`}>
        <p>
          <strong className="font-medium text-[#1C1830]">{VALLE_CARDINAL_RESUMEN.tipo}</strong>{" "}
          en {VALLE_CARDINAL_RESUMEN.ubicacion}. Superficie {VALLE_CARDINAL_RESUMEN.superficieHa} ha ·
          parque lineal {VALLE_CARDINAL_RESUMEN.parqueLinealM2} m². {VALLE_CARDINAL_RESUMEN.reservaNatural}.
        </p>
        <p className="mt-2">
          En el comparativo de metraje y precio se contabiliza una sola entrada (150–194 m², $4,891/m²).
          Los clústeres comparten amenidades maestras; cada uno tiene brochure y etapa comercial propia.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {VALLE_CARDINAL_CLUSTERS.map((cluster) => (
          <div key={cluster.id} className={`border ${investtiReport.rule} bg-white`}>
            <div className={`border-b ${investtiReport.rule} px-4 py-3`}>
              <p className={investtiReport.label}>Clúster {cluster.orden}</p>
              <h4 className={`${investtiReport.serif} mt-1 text-[1.05rem] text-[#1C1830]`}>
                {cluster.nombre}
              </h4>
              {cluster.totalLotes != null && (
                <p className="mt-1 text-[12px] text-neutral-600">{cluster.totalLotes} lotes</p>
              )}
            </div>
            <div className="space-y-3 px-4 py-3 text-[13px] text-neutral-700">
              <p>{cluster.notas}</p>
              {cluster.amenidades.length > 0 && (
                <ul className="list-inside list-disc space-y-0.5 text-[12px] text-neutral-600">
                  {cluster.amenidades.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
              <a
                href={cluster.brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[12px] font-medium text-[#201044] underline-offset-2 hover:underline"
              >
                Ebook {cluster.nombre} (PDF)
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className={investtiReport.label}>Amenidades maestras Valle Cardinal</p>
        <p className="mt-2 text-[12px] leading-relaxed text-neutral-600">
          {VALLE_CARDINAL_RESUMEN.amenidadesMaestro.join(" · ")}
        </p>
      </div>

      <InvesttiFootnote>
        Arroyo del Pedregal se excluyó del análisis por datos no confiables. Valle Cardinal se modela como un
        desarrollo con clústeres, no como tres proyectos separados.
      </InvesttiFootnote>
    </InvesttiFigure>
  );
}

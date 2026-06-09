"use client";

import Link from "next/link";
import {
  CDV_ETAPA4_LOTIFICACION_FUENTE,
  CDV_ETAPA4_LOTIFICACION_PDF,
  CDV_ETAPA4_METRAJE_ESTIMADO,
  evaluarAlineacionEtapa4,
} from "@/lib/corredor/cdv-etapa4-lotificacion";
import {
  METRAJE_RECOMENDADO_MAX,
  METRAJE_RECOMENDADO_MIN,
} from "@/lib/corredor/investti-analisis";
import {
  InvesttiCallout,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

export function CdvEtapa4LotificacionReview() {
  const alineacion = evaluarAlineacionEtapa4(METRAJE_RECOMENDADO_MIN, METRAJE_RECOMENDADO_MAX);
  const e = CDV_ETAPA4_METRAJE_ESTIMADO;

  return (
    <InvesttiCallout title="Plano Etapa 4 (VoBo Investti)">
      <p className="font-medium text-[#1C1830]">{alineacion.resumen}</p>
      <ul className={`${investtiReport.sans} mt-3 space-y-1.5 text-[13px] text-neutral-700`}>
        <li>
          Lotes nuevos (etiquetas en rojo): piso ~{e.minM2} m² · mediana estimada ~{e.medianaM2} m².
        </li>
        <li>
          ~{e.pctEn220_260}% de las manzanas nuevas caen en {METRAJE_RECOMENDADO_MIN}–
          {METRAJE_RECOMENDADO_MAX} m² (estimación por cotas del plano).
        </li>
      </ul>
      <p className={`${investtiReport.sans} mt-4 text-[12px] text-neutral-600`}>
        {CDV_ETAPA4_LOTIFICACION_FUENTE}.{" "}
        <Link
          href={CDV_ETAPA4_LOTIFICACION_PDF}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#201044] underline underline-offset-2"
        >
          Ver plano (PDF)
        </Link>
        {" "}· confirmar cada lote con tabla ARVT.
      </p>
    </InvesttiCallout>
  );
}

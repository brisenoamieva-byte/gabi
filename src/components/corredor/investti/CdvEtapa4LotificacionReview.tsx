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
  InvesttiFigure,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

export function CdvEtapa4LotificacionReview() {
  const alineacion = evaluarAlineacionEtapa4(METRAJE_RECOMENDADO_MIN, METRAJE_RECOMENDADO_MAX);
  const e = CDV_ETAPA4_METRAJE_ESTIMADO;

  return (
    <div className="space-y-4">
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

      <InvesttiFigure caption="Resumen visual del plano VoBo · lotes nuevos L-1…L-81 (etiquetas rojo).">
        <div className="investti-print-etapa4-stats grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-4">
          <Etapa4Stat label="Piso lotes nuevos" value={`~${e.minM2} m²`} />
          <Etapa4Stat
            label="Mediana estimada"
            value={`~${e.medianaM2} m²`}
            destacado
          />
          <Etapa4Stat label="Rango referencial" value={`${e.minM2}–${e.maxM2} m²`} />
          <Etapa4Stat
            label={`En ${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m²`}
            value={`~${e.pctEn220_260}%`}
          />
        </div>
      </InvesttiFigure>
    </div>
  );
}

function Etapa4Stat({
  label,
  value,
  destacado = false,
}: {
  label: string;
  value: string;
  destacado?: boolean;
}) {
  return (
    <div className={`px-4 py-4 ${destacado ? "bg-neutral-50/90" : "bg-white"}`}>
      <p className={investtiReport.label}>{label}</p>
      <p className={`${investtiReport.serif} mt-1 text-[1.35rem] tabular-nums text-[#1C1830]`}>
        {value}
      </p>
    </div>
  );
}

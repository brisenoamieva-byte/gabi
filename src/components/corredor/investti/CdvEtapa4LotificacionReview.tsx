"use client";

import Link from "next/link";
import { CDV_SEMBRADO_RESUMEN } from "@/lib/corredor/cdv-sembrado-analisis";
import {
  CDV_ETAPA4_COTAS_M,
  CDV_ETAPA4_LOTES_NUEVOS,
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
  InvesttiFootnote,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";

export function CdvEtapa4LotificacionReview() {
  const alineacion = evaluarAlineacionEtapa4(METRAJE_RECOMENDADO_MIN, METRAJE_RECOMENDADO_MAX);
  const e = CDV_ETAPA4_METRAJE_ESTIMADO;

  return (
    <div className="mt-8 space-y-6">
      <InvesttiCallout title="Plano Etapa 4 (VoBo Investti)">
        <p className="font-medium text-[#1C1830]">{alineacion.titulo}</p>
        <p className="mt-2">{alineacion.resumen}</p>
      </InvesttiCallout>

      <InvesttiFigure caption="Solo lotes nuevos Etapa 4 (etiquetas en rojo en el plano VoBo). La tabla ARVT confirma cada superficie.">
        <div className="grid md:grid-cols-3">
          <CompareCol
            titulo="Propuesta BBR"
            rango={`${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m²`}
            subtitulo="Nueva etapa"
            filas={[
              ["Fundamento", "Sembrado v.4"],
              ["Apartados activos", `${CDV_SEMBRADO_RESUMEN.medianaApartadoM2} m² mediana`],
              ["Objetivo", "Reponer inventario 200–250 m²"],
            ]}
          />
          <CompareCol
            titulo="Plano Etapa 4"
            rango={`~${e.medianaM2} m² mediana*`}
            subtitulo="Solo lotes nuevos · texto rojo"
            destacado
            filas={[
              ["Lote más pequeño*", `~${e.minM2} m²`],
              ["Rango referencial*", `${e.minM2}–${e.maxM2} m²`],
              [
                `En ${METRAJE_RECOMENDADO_MIN}–${METRAJE_RECOMENDADO_MAX} m²*`,
                `~${e.pctEn220_260}% (cotas)`,
              ],
              ["Fuente", "Plano VoBo Investti"],
            ]}
          />
          <CompareCol
            titulo="Comparación"
            rango={alineacion.nivel === "alta" ? "Encajan" : "Revisar extremos"}
            subtitulo="Plano vs. propuesta BBR"
            filas={[
              ["En 200–280 m²*", `~${e.pctEn200_280}%`],
              ["Bajo 200 m²*", `~${e.pctBajo200}%`],
              ["Sobre 280 m²*", `~${e.pctSobre280}%`],
            ]}
          />
        </div>

        <div className={`${investtiReport.sans} border-t border-neutral-200 px-5 py-4 md:px-6`}>
          <p className={investtiReport.label}>Qué lotes cuenta este análisis</p>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-700">
            En el plano VoBo, los <strong className="font-medium">lotes nuevos de Etapa 4</strong>{" "}
            van en <strong className="font-medium">texto rojo</strong> ({CDV_ETAPA4_LOTES_NUEVOS.numeracion}).
            Las etiquetas en negro son de etapas ya existentes y{" "}
            <strong className="font-medium">no entran</strong> en estas cifras.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-700">
            El <strong className="font-medium">lote más pequeño</strong> que encontramos en las
            manzanas nuevas mide <strong className="font-medium">~{e.minM2} m²</strong> (el CAD
            anota {e.minM2PlanoCad} m²). No hay lotes de 160 m² en esta etapa — el piso real arranca
            cerca de 164 m².
          </p>

          <p className={`${investtiReport.label} mt-6`}>¿Qué significa el ~{e.pctEn220_260}%?</p>
          <p className="mt-2 text-[13px] leading-relaxed text-neutral-700">
            En las <strong className="font-medium">manzanas nuevas</strong> tomamos cotas de frente
            y fondo (de {CDV_ETAPA4_COTAS_M.frenteMin} a {CDV_ETAPA4_COTAS_M.frenteMax} m de frente
            y de {CDV_ETAPA4_COTAS_M.fondoMin} a {CDV_ETAPA4_COTAS_M.fondoMax} m de fondo) y
            estimamos {e.paresAnalizados} tamaños posibles — aproximación, no la tabla ARVT lote por
            lote.
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-700">
            De esas {e.paresAnalizados} combinaciones,{" "}
            <strong className="font-medium text-[#1C1830]">
              ~{e.pctEn220_260}% caen entre {METRAJE_RECOMENDADO_MIN} y {METRAJE_RECOMENDADO_MAX} m²
            </strong>
            : casi <strong className="font-medium">1 de cada 3</strong> en el rango que recomendamos.
            El resto queda fuera y conviene revisarlo con Investti antes de fijar lista.
          </p>

          <p className={`${investtiReport.label} mt-6`}>Del plano</p>
          <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-neutral-700">
            {alineacion.puntos.map((p) => (
              <li key={p} className="flex gap-2">
                <span className="text-neutral-400">—</span>
                {p}
              </li>
            ))}
          </ul>
          {alineacion.observaciones.length > 0 ? (
            <>
              <p className={`${investtiReport.label} mt-5`}>Observaciones</p>
              <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-neutral-700">
                {alineacion.observaciones.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-neutral-400">—</span>
                    {p}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <InvesttiFootnote>
          {CDV_ETAPA4_LOTIFICACION_FUENTE}. Cotas de referencia: frentes{" "}
          {CDV_ETAPA4_COTAS_M.frenteMin}–{CDV_ETAPA4_COTAS_M.frenteMax} m · fondos{" "}
          {CDV_ETAPA4_COTAS_M.fondoMin}–{CDV_ETAPA4_COTAS_M.fondoMax} m.{" "}
          <Link
            href={CDV_ETAPA4_LOTIFICACION_PDF}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-neutral-700"
          >
            Ver plano VoBo (PDF)
          </Link>
          . *Solo lotes nuevos (rojo). Mínimo ~{e.minM2} m² ({e.minM2PlanoCad} m² en CAD). Confirmar
          cada lote con tabla ARVT.
        </InvesttiFootnote>
      </InvesttiFigure>
    </div>
  );
}

function CompareCol({
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
      className={`border-b border-neutral-200 px-5 py-5 md:border-b-0 md:border-r md:py-6 last:md:border-r-0 ${destacado ? "bg-neutral-50/70" : ""}`}
    >
      <p className={investtiReport.label}>{titulo}</p>
      <p className={`${investtiReport.serif} mt-2 text-[1.35rem] leading-snug text-[#1C1830] md:text-[1.5rem]`}>
        {rango}
      </p>
      <p className="mt-1 text-[12px] text-neutral-500">{subtitulo}</p>
      <table className="mt-4 w-full text-[13px]">
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

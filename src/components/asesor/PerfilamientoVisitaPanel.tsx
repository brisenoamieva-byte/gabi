"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PerfilCalificacionLeadBadge } from "@/components/asesor/PerfilCalificacionLeadBadge";
import {
  formatPerfilamientoSiNo,
  isPerfilamientoVisitaComplete,
  PERFILAMIENTO_VISITA_QUESTIONS,
  perfilCalificacionLeadBannerClass,
  perfilCalificacionLeadDescription,
  resolvePerfilCalificacionLead,
  type PerfilamientoVisitaAnswers,
  type PerfilamientoVisitaRecord,
} from "@/lib/comercial/perfilamiento-post-visita";

type PerfilamientoVisitaFormProps = {
  loading: boolean;
  initial?: PerfilamientoVisitaRecord;
  onSubmit: (answers: PerfilamientoVisitaAnswers) => void;
  className?: string;
};

export function PerfilamientoVisitaForm({
  loading,
  initial,
  onSubmit,
  className = "mt-2 space-y-3",
}: PerfilamientoVisitaFormProps) {
  const [answers, setAnswers] = useState<Partial<PerfilamientoVisitaAnswers>>(() => ({
    presupuestoDisponible: initial?.presupuestoDisponible ?? undefined,
    intencionApartarInmediato: initial?.intencionApartarInmediato ?? undefined,
    decisorVisita: initial?.decisorVisita ?? undefined,
    vioPublicidadRedes: initial?.vioPublicidadRedes ?? undefined,
  }));

  const allAnswered = PERFILAMIENTO_VISITA_QUESTIONS.every(
    (question) => typeof answers[question.key] === "boolean",
  );

  return (
    <div className={className}>
      {PERFILAMIENTO_VISITA_QUESTIONS.map((question) => (
        <fieldset key={question.key} className="rounded-lg border border-slate-200 bg-slate-50/80 p-2">
          <legend className="px-1 text-xs leading-snug text-slate-700">{question.label}</legend>
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#201044]">
              <input
                type="radio"
                name={question.key}
                checked={answers[question.key] === true}
                onChange={() =>
                  setAnswers((current) => ({ ...current, [question.key]: true }))
                }
                className="accent-[#201044]"
              />
              Sí
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#201044]">
              <input
                type="radio"
                name={question.key}
                checked={answers[question.key] === false}
                onChange={() =>
                  setAnswers((current) => ({ ...current, [question.key]: false }))
                }
                className="accent-[#201044]"
              />
              No
            </label>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={loading || !allAnswered}
        onClick={() => onSubmit(answers as PerfilamientoVisitaAnswers)}
        className="inline-flex items-center gap-1 rounded-lg bg-[#201044] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Guardando…
          </>
        ) : (
          "Guardar perfilamiento"
        )}
      </button>
    </div>
  );
}

type PerfilamientoVisitaSummaryProps = {
  record: PerfilamientoVisitaRecord;
  className?: string;
};

export function PerfilamientoVisitaSummary({
  record,
  className = "mt-2 space-y-2",
}: PerfilamientoVisitaSummaryProps) {
  const calificacion = resolvePerfilCalificacionLead({
    perfil_presupuesto_disponible: record.presupuestoDisponible,
    perfil_intencion_apartar: record.intencionApartarInmediato,
    perfil_decisor_visita: record.decisorVisita,
  });

  return (
    <div className={className}>
      {calificacion ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${perfilCalificacionLeadBannerClass[calificacion]}`}
        >
          <PerfilCalificacionLeadBadge calificacion={calificacion} size="md" />
          <div>
            <p className="text-xs font-bold">Calificación {calificacion}</p>
            <p className="text-[11px] leading-snug opacity-90">
              {perfilCalificacionLeadDescription[calificacion]}
            </p>
          </div>
        </div>
      ) : null}
      <dl className="space-y-2 rounded-lg bg-slate-50 p-2">
        {PERFILAMIENTO_VISITA_QUESTIONS.map((question) => (
          <div key={question.key}>
            <dt className="text-[11px] leading-snug text-slate-500">{question.label}</dt>
            <dd className="text-xs font-bold text-[#201044]">
              {formatPerfilamientoSiNo(record[question.key])}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type PerfilamientoVisitaPanelProps = {
  record: PerfilamientoVisitaRecord;
  loading: boolean;
  onSubmit: (answers: PerfilamientoVisitaAnswers) => void;
  desarrolloHint?: string | null;
};

/** Bloque siempre visible en el detalle del lead (cualquier etapa). */
export function PerfilamientoVisitaPanel({
  record,
  loading,
  onSubmit,
  desarrolloHint,
}: PerfilamientoVisitaPanelProps) {
  const complete = isPerfilamientoVisitaComplete(record);

  return (
    <div className="rounded-xl border border-[#201044]/15 bg-white p-4">
      <div className="mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#201044]/70">
          Perfilamiento
        </p>
        <p className="mt-1 text-sm font-semibold text-[#201044]">
          Necesidades y perfil documentados
          {!complete ? <span className="text-rose-500"> *</span> : null}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Presupuesto, intención de apartar, decisor y publicidad en redes. Puede capturarse en
          cualquier momento del funnel.
          {desarrolloHint ? ` ${desarrolloHint}` : null}
        </p>
      </div>

      {complete ? (
        <PerfilamientoVisitaSummary record={record} className="space-y-2" />
      ) : (
        <PerfilamientoVisitaForm
          loading={loading}
          initial={record}
          onSubmit={onSubmit}
          className="space-y-3"
        />
      )}
    </div>
  );
}

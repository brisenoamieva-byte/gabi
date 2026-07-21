"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { PerfilCalificacionLeadBadge } from "@/components/asesor/PerfilCalificacionLeadBadge";
import {
  computePerfilCalificacionLead,
  countPerfilamientoAnswered,
  formatPerfilamientoSiNo,
  isPerfilamientoVisitaComplete,
  PERFILAMIENTO_VISITA_QUESTIONS,
  perfilCalificacionLeadBannerClass,
  resolvePerfilCalificacionLead,
  type PerfilamientoVisitaAnswers,
  type PerfilamientoVisitaRecord,
} from "@/lib/comercial/perfilamiento-post-visita";

function SiNoToggle({
  value,
  shortLabel,
  fullLabel,
  disabled,
  onChange,
}: {
  value: boolean | undefined;
  shortLabel: string;
  fullLabel: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5 last:border-b-0"
      title={fullLabel}
    >
      <span className="min-w-0 flex-1 text-[11px] font-medium leading-snug text-slate-700">
        {shortLabel}
      </span>
      <div
        role="group"
        aria-label={fullLabel}
        className="inline-flex shrink-0 rounded-md border border-slate-200 bg-slate-50 p-0.5"
      >
        <button
          type="button"
          disabled={disabled}
          aria-pressed={value === true}
          onClick={() => onChange(true)}
          className={`min-h-8 min-w-10 rounded px-2 text-[11px] font-bold transition ${
            value === true
              ? "bg-[#201044] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-pressed={value === false}
          onClick={() => onChange(false)}
          className={`min-h-8 min-w-10 rounded px-2 text-[11px] font-bold transition ${
            value === false
              ? "bg-[#201044] text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

type PerfilamientoVisitaFormProps = {
  loading: boolean;
  initial?: PerfilamientoVisitaRecord;
  onSubmit: (answers: Partial<PerfilamientoVisitaAnswers>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  className?: string;
};

export function PerfilamientoVisitaForm({
  loading,
  initial,
  onSubmit,
  onCancel,
  submitLabel,
  className = "space-y-2",
}: PerfilamientoVisitaFormProps) {
  const [answers, setAnswers] = useState<Partial<PerfilamientoVisitaAnswers>>(() => ({
    presupuestoDisponible: initial?.presupuestoDisponible ?? undefined,
    intencionApartarInmediato: initial?.intencionApartarInmediato ?? undefined,
    decisorVisita: initial?.decisorVisita ?? undefined,
    vioPublicidadRedes: initial?.vioPublicidadRedes ?? undefined,
  }));

  useEffect(() => {
    setAnswers({
      presupuestoDisponible: initial?.presupuestoDisponible ?? undefined,
      intencionApartarInmediato: initial?.intencionApartarInmediato ?? undefined,
      decisorVisita: initial?.decisorVisita ?? undefined,
      vioPublicidadRedes: initial?.vioPublicidadRedes ?? undefined,
    });
  }, [
    initial?.presupuestoDisponible,
    initial?.intencionApartarInmediato,
    initial?.decisorVisita,
    initial?.vioPublicidadRedes,
  ]);

  const answeredCount = countPerfilamientoAnswered(answers);
  const allAnswered = answeredCount === PERFILAMIENTO_VISITA_QUESTIONS.length;
  const canSave = answeredCount > 0;

  const draftCalificacion = allAnswered
    ? computePerfilCalificacionLead(answers as PerfilamientoVisitaAnswers)
    : null;

  const resolvedSubmitLabel =
    submitLabel ??
    (allAnswered
      ? "Guardar"
      : answeredCount > 0
        ? `Guardar avance (${answeredCount}/4)`
        : "Guardar avance");

  return (
    <div className={className}>
      {draftCalificacion ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${perfilCalificacionLeadBannerClass[draftCalificacion]}`}
        >
          <PerfilCalificacionLeadBadge calificacion={draftCalificacion} size="sm" />
          <p className="text-[11px] font-semibold">Lead {draftCalificacion}</p>
        </div>
      ) : answeredCount > 0 ? (
        <p className="text-[11px] text-slate-500">
          Puedes guardar y completar el resto después ({answeredCount}/4).
        </p>
      ) : null}
      <div className="rounded-lg border border-slate-200 bg-white px-2.5">
        {PERFILAMIENTO_VISITA_QUESTIONS.map((question) => (
          <SiNoToggle
            key={question.key}
            shortLabel={question.shortLabel}
            fullLabel={question.label}
            value={answers[question.key]}
            disabled={loading}
            onChange={(next) =>
              setAnswers((current) => ({ ...current, [question.key]: next }))
            }
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loading || !canSave}
          onClick={() => onSubmit(answers)}
          className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#201044] px-3 text-xs font-bold text-white disabled:opacity-50 sm:flex-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando…
            </>
          ) : (
            resolvedSubmitLabel
          )}
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold text-slate-500 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}

type PerfilamientoVisitaSummaryProps = {
  record: PerfilamientoVisitaRecord;
  onEdit?: () => void;
  className?: string;
};

export function PerfilamientoVisitaSummary({
  record,
  onEdit,
  className = "space-y-2",
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
          className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${perfilCalificacionLeadBannerClass[calificacion]}`}
        >
          <PerfilCalificacionLeadBadge calificacion={calificacion} size="sm" />
          <p className="min-w-0 flex-1 text-[11px] font-semibold">Lead {calificacion}</p>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold text-current/80 transition hover:bg-black/5"
            >
              <Pencil className="h-3 w-3" strokeWidth={2.25} />
              Editar
            </button>
          ) : null}
        </div>
      ) : onEdit ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-[#201044] underline-offset-2 hover:underline"
          >
            <Pencil className="h-3 w-3" strokeWidth={2.25} />
            Editar
          </button>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-1.5">
        {PERFILAMIENTO_VISITA_QUESTIONS.map((question) => (
          <button
            key={question.key}
            type="button"
            disabled={!onEdit}
            onClick={onEdit}
            className={`rounded-md bg-slate-50 px-2 py-1.5 text-left transition ${
              onEdit ? "hover:bg-slate-100" : ""
            }`}
            title={onEdit ? `Editar: ${question.label}` : question.label}
          >
            <p className="text-[10px] leading-tight text-slate-500">{question.shortLabel}</p>
            <p className="text-xs font-bold text-[#201044]">
              {formatPerfilamientoSiNo(record[question.key])}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

type PerfilamientoVisitaPanelProps = {
  record: PerfilamientoVisitaRecord;
  loading: boolean;
  onSubmit: (answers: Partial<PerfilamientoVisitaAnswers>) => void;
  desarrolloHint?: string | null;
};

/** Bloque compacto de perfilamiento en el detalle del lead. */
export function PerfilamientoVisitaPanel({
  record,
  loading,
  onSubmit,
  desarrolloHint,
}: PerfilamientoVisitaPanelProps) {
  const complete = isPerfilamientoVisitaComplete(record);
  const [editing, setEditing] = useState(!complete);
  const fingerprint = [
    record.presupuestoDisponible,
    record.intencionApartarInmediato,
    record.decisorVisita,
    record.vioPublicidadRedes,
  ].join(":");
  const prevFingerprintRef = useRef(fingerprint);

  useEffect(() => {
    if (!complete) {
      setEditing(true);
    }
  }, [complete]);

  useEffect(() => {
    if (prevFingerprintRef.current !== fingerprint && complete) {
      setEditing(false);
    }
    prevFingerprintRef.current = fingerprint;
  }, [fingerprint, complete]);

  const showForm = !complete || editing;
  const answeredCount = countPerfilamientoAnswered(record);

  return (
    <div className="rounded-xl border border-[#201044]/12 bg-white p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#201044]/65">
            Perfilamiento
            {!complete ? <span className="text-rose-500"> *</span> : null}
          </p>
          {desarrolloHint ? (
            <p className="mt-0.5 truncate text-[10px] text-slate-400" title={desarrolloHint}>
              {desarrolloHint}
            </p>
          ) : null}
        </div>
        {!complete ? (
          <p className="shrink-0 text-[10px] font-medium text-slate-400">
            {answeredCount}/4 · se puede ir llenando
          </p>
        ) : null}
      </div>

      {showForm ? (
        <PerfilamientoVisitaForm
          loading={loading}
          initial={record}
          submitLabel={complete ? "Guardar cambios" : undefined}
          onCancel={complete ? () => setEditing(false) : undefined}
          onSubmit={onSubmit}
        />
      ) : (
        <PerfilamientoVisitaSummary record={record} onEdit={() => setEditing(true)} />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2, MessageCircle, Phone } from "lucide-react";
import type { ProspectoPlaybookState } from "@/lib/comercial/crm-playbook-service";
import {
  getPlaybookStepsForEtapa,
  PLAYBOOK_CONTACT_ACTION_STEP_IDS,
  PLAYBOOK_PERFILAMIENTO_OBJETIVO,
  type PlaybookStep,
} from "@/lib/comercial/crm-playbook";
import { PLAYBOOK_STEPS_WITH_VISIT_DATE } from "@/lib/comercial/cadencia-perfilamiento";
import {
  buildCadenciaLlamadaGuion,
  buildCadenciaTelUrl,
  buildCadenciaWhatsAppUrl,
} from "@/lib/comercial/cadencia-perfilamiento";
import {
  formatLeadDateOnly,
  getMexicoCityDateInput,
} from "@/lib/comercial/format-lead-date";
import {
  formatPerfilamientoSiNo,
  PERFILAMIENTO_VISITA_QUESTIONS,
  PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS,
  type PerfilamientoVisitaAnswers,
  type PerfilamientoVisitaRecord,
} from "@/lib/comercial/perfilamiento-post-visita";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

type PlaybookContactContext = {
  prospectoNombre: string;
  telefono: string | null;
  desarrolloNombre: string;
  asesorNombre: string;
};

type CrmPlaybookChecklistProps = {
  etapa: ProspectoEtapa;
  playbook: ProspectoPlaybookState | null;
  completingStepId: string | null;
  contactContext?: PlaybookContactContext;
  visitaAgendadaOn?: string | null;
  visitaRealizadaOn?: string | null;
  perfilamientoVisita?: PerfilamientoVisitaRecord;
  onCompleteStep: (
    stepId: string,
    stepDate?: string,
    perfilamientoVisita?: PerfilamientoVisitaAnswers,
  ) => void;
};

export function CrmPlaybookChecklist({
  etapa,
  playbook,
  completingStepId,
  contactContext,
  visitaAgendadaOn,
  visitaRealizadaOn,
  perfilamientoVisita,
  onCompleteStep,
}: CrmPlaybookChecklistProps) {
  if (!playbook?.config?.enabled) {
    return null;
  }

  const steps = getPlaybookStepsForEtapa(playbook.config, etapa);
  if (!steps.length) {
    return null;
  }

  const completedSet = new Set(playbook.completedStepIds);
  const canAdvanceToContactado =
    etapa === "nuevo" &&
    ["whatsapp-inicial", "llamada-d0", "datos-completos"].every((id) => completedSet.has(id));

  return (
    <div className="rounded-xl border border-[#6cc24a]/25 bg-[#6cc24a]/5 p-4">
      <div className="mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6cc24a]">
          Playbook · {prospectoEtapaLabel[etapa]}
        </p>
        {etapa === "nuevo" ? (
          <p className="mt-1 text-xs text-slate-600">{PLAYBOOK_PERFILAMIENTO_OBJETIVO}</p>
        ) : null}
        {playbook.blockReason && !playbook.canAdvanceEtapa ? (
          <p className="mt-1 text-xs text-amber-800">{playbook.blockReason}</p>
        ) : null}
        {canAdvanceToContactado ? (
          <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            Contacto inicial listo. Ya puedes cambiar la etapa a <strong>Contactado</strong> abajo.
          </p>
        ) : null}
      </div>

      <ul className="space-y-2">
        {steps.map((step) => {
          const done = completedSet.has(step.id);
          const visitDate =
            step.id === "visita-agendada"
              ? visitaAgendadaOn
              : step.id === "recorrido"
                ? visitaRealizadaOn
                : null;

          return (
            <PlaybookStepRow
              key={step.id}
              step={step}
              done={done}
              visitDate={visitDate}
              loading={completingStepId === step.id}
              contactContext={contactContext}
              perfilamientoVisita={perfilamientoVisita}
              onComplete={(stepDate, answers) => onCompleteStep(step.id, stepDate, answers)}
            />
          );
        })}
      </ul>
    </div>
  );
}

function PlaybookStepRow({
  step,
  done,
  visitDate,
  loading,
  contactContext,
  perfilamientoVisita,
  onComplete,
}: {
  step: PlaybookStep;
  done: boolean;
  visitDate?: string | null;
  loading: boolean;
  contactContext?: PlaybookContactContext;
  perfilamientoVisita?: PerfilamientoVisitaRecord;
  onComplete: (stepDate?: string, perfilamientoVisita?: PerfilamientoVisitaAnswers) => void;
}) {
  const needsVisitDate = PLAYBOOK_STEPS_WITH_VISIT_DATE.has(step.id);
  const isPerfilamientoForm = PLAYBOOK_PERFILAMIENTO_VISITA_STEP_IDS.has(step.id);
  const isManualCompletable =
    (step.kind === "manual" || step.id === "recorrido" || step.id === "visita-agendada") &&
    !isPerfilamientoForm;
  const [stepDate, setStepDate] = useState(() => getMexicoCityDateInput());
  const [showGuion, setShowGuion] = useState(false);

  const isContactAction = PLAYBOOK_CONTACT_ACTION_STEP_IDS.has(step.id);
  const telefono = contactContext?.telefono?.trim() || null;

  const scriptCtx = contactContext
    ? {
        prospectNombre: contactContext.prospectoNombre,
        desarrolloNombre: contactContext.desarrolloNombre,
        asesorNombre: contactContext.asesorNombre,
        touchLabel: step.label,
        dayOffset: 0,
      }
    : null;

  const whatsappUrl =
    step.id === "whatsapp-inicial" && telefono && scriptCtx
      ? buildCadenciaWhatsAppUrl(telefono, scriptCtx)
      : null;

  const telUrl =
    step.id === "llamada-d0" && telefono ? buildCadenciaTelUrl(telefono) : null;

  const llamadaGuion =
    step.id === "llamada-d0" && scriptCtx ? buildCadenciaLlamadaGuion(scriptCtx) : null;

  return (
    <li className="flex items-start gap-3 rounded-lg bg-white/70 px-3 py-2">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${done ? "text-slate-500" : "text-[#201044]"}`}>
          {step.label}
          {step.required ? <span className="text-rose-500"> *</span> : null}
        </p>
        {step.hint ? <p className="text-xs text-slate-500">{step.hint}</p> : null}
        {done && visitDate ? (
          <p className="mt-1 text-xs font-medium text-emerald-800">
            Fecha: {formatLeadDateOnly(visitDate)}
          </p>
        ) : null}
        {done && isPerfilamientoForm && perfilamientoVisita ? (
          <dl className="mt-2 space-y-2 rounded-lg bg-slate-50 p-2">
            {PERFILAMIENTO_VISITA_QUESTIONS.map((question) => (
              <div key={question.key}>
                <dt className="text-[11px] leading-snug text-slate-500">{question.label}</dt>
                <dd className="text-xs font-bold text-[#201044]">
                  {formatPerfilamientoSiNo(perfilamientoVisita[question.key])}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {!done && isPerfilamientoForm ? (
          <PerfilamientoVisitaForm
            loading={loading}
            initial={perfilamientoVisita}
            onSubmit={(answers) => onComplete(undefined, answers)}
          />
        ) : null}

        {!done && isContactAction ? (
          <div className="mt-2 space-y-2">
            {!telefono ? (
              <p className="text-xs text-amber-800">
                Agrega el teléfono del prospecto para habilitar WhatsApp y llamada.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {step.id === "whatsapp-inicial" && whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                ) : null}
                {step.id === "llamada-d0" && telUrl ? (
                  <a
                    href={telUrl}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#201044] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Llamar
                  </a>
                ) : null}
              </div>
            )}
            {step.id === "llamada-d0" && llamadaGuion ? (
              <div>
                <button
                  type="button"
                  onClick={() => setShowGuion((value) => !value)}
                  className="text-xs font-semibold text-[#201044] underline-offset-2 hover:underline"
                >
                  {showGuion ? "Ocultar guion" : "Ver guion de llamada"}
                </button>
                {showGuion ? (
                  <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                    {llamadaGuion}
                  </pre>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={() => onComplete()}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#201044] underline-offset-2 hover:underline disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Marcar hecho
                </>
              )}
            </button>
          </div>
        ) : null}

        {!done && isManualCompletable ? (
          <div className="mt-2 space-y-2">
            {needsVisitDate ? (
              <label className="block text-xs text-slate-600">
                <span className="font-semibold text-[#201044]">Fecha de visita</span>
                <input
                  type="date"
                  value={stepDate}
                  onChange={(event) => setStepDate(event.target.value)}
                  className="mt-1 block w-full max-w-[11rem] rounded-md border border-slate-200 px-2 py-1 text-sm text-[#201044]"
                />
              </label>
            ) : null}
            <button
              type="button"
              disabled={loading || (needsVisitDate && !stepDate)}
              onClick={() => onComplete(needsVisitDate ? stepDate : undefined)}
              className="text-xs font-bold text-[#201044] underline-offset-2 hover:underline disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Guardando…
                </span>
              ) : (
                "Marcar completado"
              )}
            </button>
          </div>
        ) : null}

        {!done && step.kind === "contacto" && !isContactAction ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Se completa automáticamente al registrar email y teléfono del prospecto.
          </p>
        ) : null}
      </div>
    </li>
  );
}

function PerfilamientoVisitaForm({
  loading,
  initial,
  onSubmit,
}: {
  loading: boolean;
  initial?: PerfilamientoVisitaRecord;
  onSubmit: (answers: PerfilamientoVisitaAnswers) => void;
}) {
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
    <div className="mt-2 space-y-3">
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

"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { ProspectoPlaybookState } from "@/lib/comercial/crm-playbook-service";
import {
  getPlaybookStepsForEtapa,
  PLAYBOOK_PERFILAMIENTO_OBJETIVO,
  type PlaybookStep,
} from "@/lib/comercial/crm-playbook";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

type CrmPlaybookChecklistProps = {
  etapa: ProspectoEtapa;
  playbook: ProspectoPlaybookState | null;
  completingStepId: string | null;
  onCompleteStep: (stepId: string) => void;
};

export function CrmPlaybookChecklist({
  etapa,
  playbook,
  completingStepId,
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
      </div>

      <ul className="space-y-2">
        {steps.map((step) => {
          const done = completedSet.has(step.id);
          return (
            <PlaybookStepRow
              key={step.id}
              step={step}
              done={done}
              loading={completingStepId === step.id}
              onComplete={() => onCompleteStep(step.id)}
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
  loading,
  onComplete,
}: {
  step: PlaybookStep;
  done: boolean;
  loading: boolean;
  onComplete: () => void;
}) {
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
        {!done && step.kind === "manual" ? (
          <button
            type="button"
            disabled={loading}
            onClick={onComplete}
            className="mt-1 text-xs font-bold text-[#201044] underline-offset-2 hover:underline disabled:opacity-50"
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
        ) : null}
        {!done && step.kind !== "manual" ? (
          <p className="mt-1 text-[11px] text-slate-400">
            Se completa automáticamente al registrar la acción en GABI.
          </p>
        ) : null}
      </div>
    </li>
  );
}

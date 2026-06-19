"use client";

import { ArrowRight, ListOrdered, Sparkles } from "lucide-react";
import type { PlaybookQueueItem } from "@/lib/comercial/crm-playbook";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

type CrmPlaybookBannerProps = {
  queue: PlaybookQueueItem[];
  onSelectLead: (prospectoId: string) => void;
};

export function CrmPlaybookBanner({ queue, onSelectLead }: CrmPlaybookBannerProps) {
  if (!queue.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Playbook al día</p>
            <p className="mt-1 text-sm text-emerald-800/90">
              No hay pasos pendientes en tus leads activos. Sigue cotizando y documentando seguimiento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const priority = queue[0];

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#201044]/10 bg-gradient-to-br from-[#201044] to-[#2d1a5c] p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6cc24a]">
              Siguiente paso
            </p>
            <h3 className="mt-1 text-xl font-black">{priority.nombre}</h3>
            <p className="mt-2 text-sm text-white/85">
              {priority.nextStep?.label ?? "Revisa pasos pendientes del playbook"}
            </p>
            <p className="mt-1 text-xs text-white/65">
              Etapa: {prospectoEtapaLabel[priority.etapa]}
              {priority.pendingRequired > 0 ? ` · ${priority.pendingRequired} requerido(s)` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectLead(priority.prospectoId)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#201044]"
          >
            Abrir lead
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {queue.length > 1 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[#201044]">
            <ListOrdered className="h-4 w-4" />
            Cola de siguiente paso ({queue.length})
          </div>
          <ul className="divide-y divide-slate-100">
            {queue.slice(1, 6).map((item) => (
              <li key={item.prospectoId}>
                <button
                  type="button"
                  onClick={() => onSelectLead(item.prospectoId)}
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#201044]">{item.nombre}</p>
                    <p className="truncate text-xs text-slate-500">
                      {item.nextStep?.label ?? "Paso pendiente"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {prospectoEtapaLabel[item.etapa as ProspectoEtapa]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

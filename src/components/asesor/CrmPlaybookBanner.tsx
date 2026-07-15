"use client";

import { ArrowRight, AlertTriangle, CheckCircle2, ListOrdered } from "lucide-react";
import type { PlaybookQueueItem } from "@/lib/comercial/crm-playbook";
import { prospectoEtapaLabel, type ProspectoEtapa } from "@/lib/comercial/prospecto-etapas";

type CrmPlaybookBannerProps = {
  queue: PlaybookQueueItem[];
  overdueCount?: number;
  onSelectLead: (prospectoId: string) => void;
};

export function CrmPlaybookBanner({ queue, overdueCount = 0, onSelectLead }: CrmPlaybookBannerProps) {
  if (!queue.length) {
    return (
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Playbook al día</p>
            <p className="mt-0.5 text-sm text-emerald-800/80">
              No hay pasos pendientes en tus leads activos. Sigue cotizando y documentando seguimiento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const priority = queue[0];

  return (
    <div className="space-y-2.5">
      {overdueCount > 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" strokeWidth={2} />
          {overdueCount} paso(s) vencido(s) — prioriza antes del reporte comercial.
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#201044]/90 bg-[#201044] text-white shadow-[0_8px_24px_rgba(32,16,68,0.14)]">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
              Siguiente paso
            </p>
            <h3 className="mt-0.5 truncate text-lg font-semibold tracking-tight">{priority.nombre}</h3>
            <p className="mt-1.5 text-sm text-white/75">
              {priority.nextStep?.label ?? "Revisa pasos pendientes del playbook"}
            </p>
            <p className="mt-1 text-xs text-white/45">
              {prospectoEtapaLabel[priority.etapa]}
              {priority.pendingRequired > 0 ? ` · ${priority.pendingRequired} requerido(s)` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectLead(priority.prospectoId)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-[#201044] transition hover:bg-white/95"
          >
            Abrir lead
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {queue.length > 1 ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#201044]">
            <ListOrdered className="h-4 w-4" strokeWidth={2} />
            Cola ({queue.length})
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
                    <p className="truncate text-sm font-medium text-[#201044]">{item.nombre}</p>
                    <p className="truncate text-xs text-slate-500">
                      {item.nextStep?.label ?? "Paso pendiente"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-500">
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

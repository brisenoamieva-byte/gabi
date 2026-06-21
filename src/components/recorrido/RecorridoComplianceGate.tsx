"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";

type RecorridoComplianceGateProps = {
  desarrolloNombre: string;
  overdueCount: number;
  pendingCount: number;
  threshold: number;
  shouldBlock: boolean;
  message: string;
  topExceptions: ProspectoComplianceRow[];
  onContinue: () => void;
  onBack: () => void;
};

export function RecorridoComplianceGate({
  desarrolloNombre,
  overdueCount,
  pendingCount,
  threshold,
  shouldBlock,
  message,
  topExceptions,
  onContinue,
  onBack,
}: RecorridoComplianceGateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] px-5 py-10 text-[#1e293b]">
      <div className="w-full max-w-lg rounded-2xl border border-[#201044]/10 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
            {shouldBlock ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6cc24a]">
              Cumplimiento CRM
            </p>
            <h1 className="mt-1 text-xl font-black text-[#201044]">
              {shouldBlock ? "Atiende tu CRM primero" : "Recordatorio de seguimiento"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <p className="mt-1 text-xs text-slate-400">{desarrolloNombre}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-slate-400">Vencidos</p>
            <p className="text-2xl font-black tabular-nums text-red-700">{overdueCount}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-slate-400">Pendientes</p>
            <p className="text-2xl font-black tabular-nums text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-slate-400">Umbral</p>
            <p className="text-2xl font-black tabular-nums text-[#201044]">{threshold}</p>
          </div>
        </div>

        {topExceptions.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
            {topExceptions.map((row) => {
              const issue = row.issues[0];
              return (
                <li key={row.prospectoId} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#201044]">{row.nombre}</p>
                    <p className="truncate text-xs text-slate-500">
                      {issue?.stepLabel ?? "Revisar playbook"} ·{" "}
                      {prospectoEtapaLabel[row.etapa]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold ${issue?.status === "overdue" ? "text-red-700" : "text-amber-700"}`}
                  >
                    {issue?.status === "overdue" ? "Vencido" : "Pendiente"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/mis-leads"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 py-3 text-sm font-bold text-white"
          >
            Ir a mis prospectos
            <ArrowRight className="h-4 w-4" />
          </Link>
          {shouldBlock ? (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Continuar de todos modos
            </button>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#6cc24a] px-4 py-3 text-sm font-bold text-[#201044]"
            >
              Continuar recorrido
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:text-[#201044]"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </main>
  );
}

export const readRecorridoComplianceOverride = (asesorId: string): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const day = new Date().toISOString().slice(0, 10);
  const keys = [
    `gabi-compliance-gate-override:${asesorId}:${day}`,
    `gabi-compliance-recorrido-override:${asesorId}:${day}`,
  ];
  return keys.some((key) => localStorage.getItem(key) === "1");
};

export const writeRecorridoComplianceOverride = (asesorId: string): void => {
  const day = new Date().toISOString().slice(0, 10);
  localStorage.setItem(`gabi-compliance-gate-override:${asesorId}:${day}`, "1");
  localStorage.setItem(`gabi-compliance-recorrido-override:${asesorId}:${day}`, "1");
};

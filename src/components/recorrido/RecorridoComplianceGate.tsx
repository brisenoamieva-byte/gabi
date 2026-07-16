"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { ComplianceGateLevel } from "@/lib/comercial/crm-compliance-config";
import type { ProspectoComplianceRow } from "@/lib/comercial/crm-compliance-service";
import { prospectoEtapaLabel } from "@/lib/comercial/prospecto-etapas";

type RecorridoComplianceGateProps = {
  desarrolloNombre: string;
  overdueCount: number;
  pendingCount: number;
  threshold: number;
  pauseThreshold?: number;
  level?: ComplianceGateLevel;
  shouldBlock: boolean;
  allowContinue?: boolean;
  title?: string;
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
  pauseThreshold = 6,
  level: levelProp,
  shouldBlock,
  allowContinue: allowContinueProp,
  title,
  message,
  topExceptions,
  onContinue,
  onBack,
}: RecorridoComplianceGateProps) {
  const level = levelProp ?? (shouldBlock ? "pause" : "nudge");
  const allowContinue = allowContinueProp ?? !shouldBlock;
  const resolvedTitle =
    title ||
    (level === "pause"
      ? "Pausa breve: limpia vencidos"
      : level === "coach"
        ? "Ordena tu CRM y sigue vendiendo"
        : "Un toque a tu pipeline");

  const Icon = level === "pause" ? AlertTriangle : level === "coach" ? ShieldCheck : Sparkles;
  const iconWrap =
    level === "pause"
      ? "bg-red-100 text-red-700"
      : level === "coach"
        ? "bg-amber-100 text-amber-700"
        : "bg-emerald-100 text-emerald-700";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9] px-5 py-10 text-[#1e293b]">
      <div className="w-full max-w-lg rounded-2xl border border-[#201044]/10 bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconWrap}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6cc24a]">
              Tu pipeline · tu comisión
            </p>
            <h1 className="mt-1 text-xl font-black text-[#201044]">{resolvedTitle}</h1>
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
            <p className="text-[10px] font-bold uppercase text-slate-400">
              {level === "pause" ? "Pausa" : "Coach"}
            </p>
            <p className="text-2xl font-black tabular-nums text-[#201044]">
              {level === "pause" ? pauseThreshold : threshold}
            </p>
          </div>
        </div>

        {topExceptions.length > 0 ? (
          <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-100 text-sm">
            {topExceptions.map((row) => {
              const issue = row.issues[0];
              return (
                <li
                  key={row.prospectoId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#201044]">{row.nombre}</p>
                    <p className="truncate text-xs text-slate-500">
                      {issue?.stepLabel ?? "Revisar playbook"} · {prospectoEtapaLabel[row.etapa]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold ${
                      issue?.status === "overdue" ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {issue?.status === "overdue" ? "Vencido" : "Pendiente"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          {level === "pause"
            ? "No es un castigo: es proteger tu embudo. Mis prospectos sigue abierto para que registres WhatsApp en segundos."
            : "Diseñado para asesores independientes: te avisamos sin frenarte de más."}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href="/mis-leads"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 py-3 text-sm font-bold text-white"
          >
            Ir a mis prospectos
            <ArrowRight className="h-4 w-4" />
          </Link>
          {allowContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-bold ${
                level === "coach"
                  ? "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  : "bg-[#6cc24a] text-[#201044]"
              }`}
            >
              {level === "coach" ? "Continuar hoy (me comprometo)" : "Continuar recorrido"}
            </button>
          ) : (
            <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 px-3 py-3 text-center text-xs font-semibold text-red-800">
              Recorrido/cotizador nuevos se liberan al bajar de {pauseThreshold} vencidos
            </p>
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

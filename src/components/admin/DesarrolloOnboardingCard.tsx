"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Loader2, Rocket } from "lucide-react";
import type { DesarrolloOnboardingResult } from "@/lib/admin/desarrollo-onboarding-service";

type Props = {
  desarrolloId: string;
};

export function DesarrolloOnboardingCard({ desarrolloId }: Props) {
  const [onboarding, setOnboarding] = useState<DesarrolloOnboardingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ desarrolloId });
      const res = await fetch(`/api/admin/desarrollos/onboarding?${params}`);
      const data = (await res.json()) as {
        onboarding?: DesarrolloOnboardingResult;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar el checklist.");
      setOnboarding(data.onboarding ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
      setOnboarding(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Evaluando preparación del desarrollo…
      </div>
    );
  }

  if (error || !onboarding) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Integración sin Cursor
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-black text-gabi-forest">
            <Rocket className="h-5 w-5" />
            Checklist operativo
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {onboarding.readyForField ? "Listo para campo." : "Completa los pasos ★ pendientes."}
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
            {onboarding.selfServeNote}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums text-gabi-forest">
            {onboarding.progressPct}%
          </p>
          <p className="text-xs font-semibold text-slate-400">completado</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gabi-forest transition-all"
          style={{ width: `${onboarding.progressPct}%` }}
        />
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {onboarding.checks.map((check) => (
          <li
            key={check.id}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm ${
              check.done
                ? "border-emerald-100 bg-emerald-50/80"
                : "border-slate-100 bg-slate-50/80"
            }`}
          >
            {check.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800">
                {check.label}
                {check.required ? (
                  <span className="ml-1 text-[10px] font-black text-amber-600">★</span>
                ) : null}
              </p>
              <p className="text-xs text-slate-500">{check.detail}</p>
              {check.href && !check.done ? (
                <Link
                  href={check.href}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-gabi-forest hover:underline"
                >
                  Completar
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

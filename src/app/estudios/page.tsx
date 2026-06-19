"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BarChart3 } from "lucide-react";
import {
  GabiAuthLoading,
  GabiAuthRedirecting,
  GabiOperatorDenied,
} from "@/components/gabi/GabiAuthGate";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
import { ESTUDIOS_REGISTRY } from "@/lib/estudios/registry";

export default function EstudiosPage() {
  const { authReady, hasSession, operatorOk, loginHref } = useRequireGabiSession({
    nextPath: "/estudios",
    requireOperator: true,
  });

  if (!authReady) {
    return <GabiAuthLoading message="Cargando estudios…" />;
  }

  if (!hasSession) {
    return <GabiAuthRedirecting loginHref={loginHref} />;
  }

  if (!operatorOk) {
    return <GabiOperatorDenied loginHref={loginHref} />;
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#201044]">
      <header className="border-b border-black/8 bg-white px-5 py-4 md:px-10">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/gabi"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Privado · Operador
            </p>
            <h1 className="text-xl font-black">Estudios de mercado</h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-8 md:px-10">
        <p className="text-sm leading-relaxed text-slate-600">
          Análisis de metraje, competencia y demanda. Acceso restringido; exportables a PDF para
          venta o entrega a desarrolladores bajo acuerdo.
        </p>

        <div className="mt-8 space-y-3">
          {ESTUDIOS_REGISTRY.map((e) => (
            <Link
              key={e.slug}
              href={e.href}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#201044]/6">
                  <BarChart3 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black">{e.titulo}</h2>
                  <p className="text-sm text-slate-500">{e.subtitulo}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {e.ubicacion} · {e.clasificacion}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-[#201044]" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

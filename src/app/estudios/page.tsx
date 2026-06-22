"use client";

import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import {
  GabiAuthLoading,
  GabiAuthRedirecting,
  GabiOperatorDenied,
} from "@/components/gabi/GabiAuthGate";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
import { DmbPageShell } from "@/components/dmb/DmbPageShell";
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
    <DmbPageShell title="Estudios de mercado" eyebrow="DMB · Análisis">
      <p className="text-sm leading-relaxed text-dmb-muted">
        Análisis de metraje, competencia y demanda. Acceso restringido; exportables a PDF para
        entrega a desarrolladores bajo acuerdo.
      </p>

      <div className="mt-8 space-y-3">
        {ESTUDIOS_REGISTRY.map((e) => (
          <Link
            key={e.slug}
            href={e.href}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-dmb-line bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-dmb-ink/6">
                <BarChart3 className="h-5 w-5 text-dmb-ink" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-dmb-ink">{e.titulo}</h2>
                <p className="text-sm text-dmb-muted">{e.subtitulo}</p>
                <p className="mt-1 text-xs text-dmb-muted/80">
                  {e.ubicacion} · {e.clasificacion}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-dmb-line group-hover:text-dmb-accent" />
          </Link>
        ))}
      </div>
    </DmbPageShell>
  );
}

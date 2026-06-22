"use client";

import Link from "next/link";
import { ArrowRight, FileText, Pencil } from "lucide-react";
import {
  GabiAuthLoading,
  GabiAuthRedirecting,
  GabiOperatorDenied,
} from "@/components/gabi/GabiAuthGate";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
import { DmbPageShell } from "@/components/dmb/DmbPageShell";
import { PROPUESTAS_REGISTRY } from "@/lib/propuestas/registry";

export default function PropuestasPage() {
  const { authReady, hasSession, operatorOk, loginHref } = useRequireGabiSession({
    nextPath: "/propuestas",
    requireOperator: true,
  });

  if (!authReady) {
    return <GabiAuthLoading message="Cargando propuestas…" />;
  }

  if (!hasSession) {
    return <GabiAuthRedirecting loginHref={loginHref} />;
  }

  if (!operatorOk) {
    return <GabiOperatorDenied loginHref={loginHref} />;
  }

  return (
    <DmbPageShell title="Propuestas comerciales" eyebrow="DMB · B2B">
      <p className="text-sm leading-relaxed text-dmb-muted">
        Presentación interactiva por slides para reunión con el desarrollador. Comparte un enlace
        privado con código de 6 dígitos; solo quien lo tenga podrá ver la propuesta.
      </p>

      <div className="mt-8 space-y-3">
        {PROPUESTAS_REGISTRY.map((p) => (
          <div
            key={p.slug}
            className="flex flex-col gap-2 rounded-2xl border border-dmb-line bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <Link
              href={`/propuestas/${p.slug}`}
              className="group flex min-w-0 flex-1 items-start gap-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-dmb-ink/6">
                <FileText className="h-5 w-5 text-dmb-ink" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-black text-dmb-ink">{p.titulo}</h2>
                <p className="text-sm text-dmb-muted">{p.ubicacion}</p>
                <p className="mt-1 text-xs text-dmb-muted/80">
                  {p.desarrollador} · {p.fecha} · {p.estado}
                </p>
              </div>
            </Link>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/admin/propuestas/${p.slug}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-dmb-line px-3 text-sm font-semibold text-dmb-muted hover:bg-dmb-surface"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
              <Link
                href={`/propuestas/${p.slug}`}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-dmb-ink px-3 text-white"
                aria-label={`Abrir ${p.titulo}`}
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </DmbPageShell>
  );
}

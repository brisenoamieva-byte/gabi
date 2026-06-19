"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Pencil } from "lucide-react";
import {
  GabiAuthLoading,
  GabiAuthRedirecting,
  GabiOperatorDenied,
} from "@/components/gabi/GabiAuthGate";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
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
              Inteligencia comercial
            </p>
            <h1 className="text-xl font-black">Propuestas comerciales</h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-8 md:px-10">
        <p className="text-sm leading-relaxed text-slate-600">
          Presentación interactiva por slides para reunión con el desarrollador. Comparte un enlace
          privado con código de 6 dígitos; solo quien lo tenga podrá ver la propuesta.
        </p>

        <div className="mt-8 space-y-3">
          {PROPUESTAS_REGISTRY.map((p) => (
            <div
              key={p.slug}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <Link
                href={`/propuestas/${p.slug}`}
                className="group flex min-w-0 flex-1 items-start gap-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#201044]/6">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black">{p.titulo}</h2>
                  <p className="text-sm text-slate-500">{p.ubicacion}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {p.desarrollador} · {p.fecha} · {p.estado}
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/propuestas/${p.slug}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Link>
                <Link
                  href={`/propuestas/${p.slug}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#201044] px-3 text-white"
                  aria-label={`Abrir ${p.titulo}`}
                >
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

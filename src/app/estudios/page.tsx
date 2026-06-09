"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BarChart3, Lock } from "lucide-react";
import { useGabiOperator } from "@/components/gabi/useGabiOperator";
import { ESTUDIOS_REGISTRY } from "@/lib/estudios/registry";
import { requireOperatorMessage } from "@/lib/gabi/operator";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
} from "@/lib/portal/session";

export default function EstudiosPage() {
  const router = useRouter();
  const { ready, isOperator } = useGabiOperator();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("gabi_user")) {
      const portal = readPortalSession();
      router.replace(portal ? resolveAdvisorEntryPath(portal) : "/portal");
      return;
    }
    setAuthReady(true);
  }, [router]);

  if (!authReady || !ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-slate-500">Cargando estudios…</p>
      </main>
    );
  }

  if (!isOperator) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <Lock className="h-8 w-8 text-slate-300" />
        <p className="max-w-sm text-center text-sm text-slate-600">{requireOperatorMessage()}</p>
        <Link href="/dashboard" className="text-sm font-semibold underline">
          Volver
        </Link>
      </main>
    );
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

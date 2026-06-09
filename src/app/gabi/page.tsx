"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { GabiLogo, GabiSistemaMark } from "@/components/brand/GabiLogo";
import { useGabiOperator } from "@/components/gabi/useGabiOperator";
import {
  GABI_ECOSYSTEM,
  GABI_LINEA_LABELS,
  modulosPorLinea,
  type GabiLineaNegocio,
} from "@/lib/gabi/ecosystem";
import { OPERATOR_LOGIN_PATH, requireOperatorMessage } from "@/lib/gabi/operator";

const LINEAS: GabiLineaNegocio[] = [
  "plataforma",
  "inteligencia",
  "inmobiliaria",
  "comercializadora",
];

export default function GabiCentroPage() {
  const router = useRouter();
  const { ready, isOperator } = useGabiOperator();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("gabi_user");
    if (!storedUser) {
      router.replace(OPERATOR_LOGIN_PATH);
      return;
    }
    setAuthReady(true);
  }, [router]);

  if (!authReady || !ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#201044]">
        <p className="text-lg font-semibold">Cargando centro gabi…</p>
      </main>
    );
  }

  if (!isOperator) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] px-6 text-[#201044]">
        <GabiSistemaMark size="md" />
        <p className="max-w-md text-center text-sm text-slate-600">{requireOperatorMessage()}</p>
        <Link href={OPERATOR_LOGIN_PATH} className="text-sm font-semibold text-[#201044] underline">
          Entrar como operador
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#201044]">
      <header className="border-b border-black/8 bg-white px-5 py-4 shadow-sm md:px-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Operador
              </p>
              <h1 className="text-xl font-black md:text-2xl">Centro gabi</h1>
            </div>
          </div>
          <GabiLogo variant="platform" />
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12">
        <div className="rounded-2xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="font-[Georgia,'Times_New_Roman',serif] text-xl md:text-2xl">
            Cerebro inmobiliario
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            Vista integral de gabi: inteligencia comercial (propuestas y estudios), gabi Real Estate
            en el corredor sur, y operación de comercializadoras como BBR Habitarea.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {LINEAS.map((linea) => {
            const modulos = modulosPorLinea(linea).filter((m) => m.id !== "centro");
            if (!modulos.length) return null;
            return (
              <div key={linea}>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {GABI_LINEA_LABELS[linea]}
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {modulos.map((modulo) => (
                    <Link
                      key={modulo.id}
                      href={modulo.href}
                      className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#201044]/15 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-lg font-black">{modulo.titulo}</h4>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#201044]" />
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          {modulo.descripcion}
                        </p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {modulo.exportable ? (
                          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                            Exportable PDF
                          </span>
                        ) : null}
                        {modulo.compartible ? (
                          <span className="rounded-full bg-[#201044]/8 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#201044]">
                            Enviar a desarrollador
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-xs text-slate-400">
          {GABI_ECOSYSTEM.length} módulos · Ricardo Briseño · gabi
        </p>
      </section>
    </main>
  );
}

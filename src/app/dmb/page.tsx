"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { DmbLogo, DmbTagline } from "@/components/brand/DmbLogo";
import {
  GabiAuthLoading,
  GabiAuthRedirecting,
  GabiOperatorDenied,
} from "@/components/gabi/GabiAuthGate";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
import { setDmbBrandCookie } from "@/components/dmb/useDmbBrand";
import { DMB_CONTACT, DMB_ECOSYSTEM } from "@/lib/dmb/ecosystem";
import { OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";

export default function DmbCentroPage() {
  const { authReady, hasSession, operatorOk, loginHref } = useRequireGabiSession({
    nextPath: "/dmb",
    requireOperator: true,
  });

  useEffect(() => {
    setDmbBrandCookie();
  }, []);

  if (!authReady) {
    return <GabiAuthLoading message="Cargando DMB…" />;
  }

  if (!hasSession) {
    return <GabiAuthRedirecting loginHref={loginHref} />;
  }

  if (!operatorOk) {
    return <GabiOperatorDenied loginHref={loginHref} />;
  }

  const modulos = DMB_ECOSYSTEM.filter((m) => m.id !== "centro");

  return (
    <main className="min-h-screen bg-dmb-surface text-dmb-ink">
      <header className="border-b border-dmb-line bg-white px-5 py-6 shadow-sm md:px-10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-start justify-between gap-4">
          <div>
            <DmbLogo variant="hero" />
            <DmbTagline className="mt-2" />
          </div>
          <a
            href={`mailto:${DMB_CONTACT.email}`}
            className="text-sm font-semibold text-dmb-accent hover:underline"
          >
            {DMB_CONTACT.email}
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-10 md:px-10">
        <div className="rounded-2xl border border-dmb-line bg-white p-6 shadow-sm md:p-8">
          <h2 className="font-[Georgia,'Times_New_Roman',serif] text-xl md:text-2xl">
            Cerebro inmobiliario · consultoría
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-dmb-muted">
            Propuestas comerciales, estudios de mercado y corredor sur. Misma sesión de operador
            que gabi; marca y dominio independientes (
            <span className="font-semibold text-dmb-ink">{DMB_CONTACT.web}</span>).
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {modulos.map((modulo) => (
            <Link
              key={modulo.id}
              href={modulo.href}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-dmb-line bg-white p-5 shadow-sm transition hover:border-dmb-accent/40 hover:shadow-md"
            >
              <div className="min-w-0">
                <h3 className="text-lg font-black text-dmb-ink">{modulo.titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-dmb-muted">{modulo.descripcion}</p>
                {modulo.compartible ? (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-dmb-accent">
                    Compartible con código
                  </p>
                ) : null}
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-dmb-line group-hover:text-dmb-accent" />
            </Link>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-dmb-muted">
          <Link href="/dmb/landing" className="font-semibold text-dmb-ink hover:underline">
            Sitio público DMB
          </Link>
          {" · "}
          Operación comercial en{" "}
          <a
            href={process.env.NEXT_PUBLIC_SITE_URL ?? "https://gabi.mx"}
            className="inline-flex items-center gap-1 font-semibold text-dmb-ink hover:underline"
          >
            gabi.mx
            <ExternalLink className="h-3 w-3" />
          </a>
          {" · "}
          <Link href={OPERATOR_LOGIN_PATH} className="font-semibold text-dmb-ink hover:underline">
            Cambiar sesión
          </Link>
        </p>
      </section>
    </main>
  );
}

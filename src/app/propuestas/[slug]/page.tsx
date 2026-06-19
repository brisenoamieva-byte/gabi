"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { PropuestaComercialSlides } from "@/components/propuestas/PropuestaComercialSlides";
import { PropuestaSharePanel } from "@/components/propuestas/PropuestaSharePanel";
import {
  GabiAuthLoading,
  GabiAuthRedirecting,
  GabiOperatorDenied,
} from "@/components/gabi/GabiAuthGate";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
import {
  getPropuestaBySlug,
  getPropuestaEstudioLink,
  getPropuestaMedia,
  isPropuestaSlug,
} from "@/lib/propuestas/registry";

export default function PropuestaDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const nextPath = slug ? `/propuestas/${slug}` : "/propuestas";

  const { authReady, hasSession, operatorOk, user, loginHref } = useRequireGabiSession({
    nextPath,
    requireOperator: true,
  });

  const propuesta = isPropuestaSlug(slug) ? getPropuestaBySlug(slug) : null;
  const estudioLink = getPropuestaEstudioLink(slug);

  if (!authReady) {
    return <GabiAuthLoading message="Cargando propuesta…" />;
  }

  if (!hasSession) {
    return <GabiAuthRedirecting loginHref={loginHref} />;
  }

  if (!operatorOk) {
    return <GabiOperatorDenied loginHref={loginHref} />;
  }

  if (!propuesta) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-600">Propuesta no encontrada.</p>
        <Link href="/propuestas" className="text-sm font-semibold underline">
          Ver todas
        </Link>
      </main>
    );
  }

  return (
    <>
      {estudioLink ? (
        <div className="gabi-no-print border-b border-[#6cc24a]/30 bg-[#6cc24a]/10 px-4 py-2 text-center text-[12px] md:px-6">
          <Link href={estudioLink} className="font-semibold text-[#201044] underline-offset-2 hover:underline">
            Ver análisis de preventa (restaurante campestre + accesos)
          </Link>
        </div>
      ) : null}
      <PropuestaSharePanel
        slug={slug}
        operatorEmail={user?.email}
        titulo={`${propuesta.meta.titulo} · ${propuesta.meta.ubicacion}`}
      />
      <PropuestaComercialSlides data={propuesta} media={getPropuestaMedia(slug)} />
    </>
  );
}

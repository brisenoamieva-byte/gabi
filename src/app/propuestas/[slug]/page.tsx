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
import { getPropuestaEstudioLink, isPropuestaSlug } from "@/lib/propuestas/registry";
import { useResolvedPropuesta } from "@/lib/propuestas/use-resolved-propuesta";

export default function PropuestaDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const nextPath = slug ? `/propuestas/${slug}` : "/propuestas";

  const { authReady, hasSession, operatorOk, isOperator, user, loginHref } =
    useRequireGabiSession({
      nextPath,
      requireOperator: true,
    });

  const propuestaQuery = useResolvedPropuesta(isPropuestaSlug(slug) ? slug : "");
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

  if (!isPropuestaSlug(slug)) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-600">Propuesta no encontrada.</p>
        <Link href="/propuestas" className="text-sm font-semibold text-dmb-accent underline">
          Ver todas
        </Link>
      </main>
    );
  }

  if (propuestaQuery.status === "loading") {
    return <GabiAuthLoading message="Cargando contenido…" />;
  }

  if (propuestaQuery.status === "error") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-slate-600">{propuestaQuery.message}</p>
        <button
          type="button"
          onClick={() => void propuestaQuery.reload()}
          className="text-sm font-semibold underline"
        >
          Reintentar
        </button>
      </main>
    );
  }

  const { propuesta, media, presentacionMarca } = propuestaQuery.data;

  return (
    <>
      <div className="gabi-no-print space-y-2 border-b border-black/8 bg-white px-4 py-2 text-center text-[12px] md:px-6">
        {estudioLink ? (
          <p>
            <Link
              href={estudioLink}
              className="font-semibold text-dmb-accent underline-offset-2 hover:underline"
            >
              Ver análisis de preventa (restaurante campestre + accesos)
            </Link>
          </p>
        ) : null}
        {isOperator ? (
          <p>
            <Link
              href={`/admin/propuestas/${slug}`}
              className="font-semibold text-dmb-accent underline-offset-2 hover:underline"
            >
              Editar propuesta (admin DMB)
            </Link>
          </p>
        ) : null}
      </div>
      <PropuestaSharePanel
        slug={slug}
        operatorEmail={user?.email}
        titulo={`${propuesta.meta.titulo} · ${propuesta.meta.ubicacion}`}
      />
      <PropuestaComercialSlides
        data={propuesta}
        media={media}
        presentacionMarca={presentacionMarca}
      />
    </>
  );
}

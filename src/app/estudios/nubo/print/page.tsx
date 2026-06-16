"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { GabiPrintBar } from "@/components/gabi/GabiPrintBar";
import { PropuestaPrintDeck } from "@/components/propuestas/PropuestaPrintDeck";
import { buildNuboPreventaSlides } from "@/components/estudios/nubo/NuboPreventaAnalisisSlides";
import { useNuboEstudioPresentation } from "@/lib/estudios/use-nubo-estudio-presentation";
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";
import { waitForPropuestaPrintImages } from "@/lib/propuestas/propuesta-print-prep";

export default function NuboEstudioPrintPage() {
  const { contenido, media, loading, loadError } = useNuboEstudioPresentation();

  const titulo = `${contenido.meta.titulo} · ${contenido.meta.subtitulo}`;
  const slides = useMemo(
    () => buildNuboPreventaSlides(contenido, media, { showOperatorLinks: false }),
    [contenido, media],
  );

  useEffect(() => {
    if (loading) return;

    const onBeforePrint = () => {
      refitAllPropuestaSlides();
      requestAnimationFrame(refitAllPropuestaSlides);
    };

    window.addEventListener("beforeprint", onBeforePrint);

    void (async () => {
      await waitForPropuestaPrintImages(12_000);
      requestAnimationFrame(() => {
        refitAllPropuestaSlides();
        requestAnimationFrame(refitAllPropuestaSlides);
      });
    })();

    return () => window.removeEventListener("beforeprint", onBeforePrint);
  }, [loading, slides]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#6cc24a]" />
        <p className="text-sm text-slate-600">Preparando documento para PDF…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <p className="max-w-md text-sm text-slate-600">{loadError}</p>
        <Link
          href="/estudios/nubo"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Volver al estudio
        </Link>
      </main>
    );
  }

  return (
    <main className="nubo-estudio-print-page min-h-screen bg-white">
      <GabiPrintBar
        titulo={titulo}
        accion="Guardar PDF"
        hint="Carta · vertical · desactiva encabezados del navegador · activa gráficos de fondo"
      />
      <div className="px-3 py-4 md:px-6 md:py-6">
        <PropuestaPrintDeck titulo={titulo} slides={slides} visible />
      </div>
    </main>
  );
}

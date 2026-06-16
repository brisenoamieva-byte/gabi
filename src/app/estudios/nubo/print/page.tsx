"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { GabiPrintBar } from "@/components/gabi/GabiPrintBar";
import { PropuestaPrintDeck } from "@/components/propuestas/PropuestaPrintDeck";
import { buildNuboPreventaSlides } from "@/components/estudios/nubo/NuboPreventaAnalisisSlides";
import { useNuboEstudioPresentation } from "@/lib/estudios/use-nubo-estudio-presentation";
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";
import { waitForPropuestaPrintImages } from "@/lib/propuestas/propuesta-print-prep";

export default function NuboEstudioPrintPage() {
  const { contenido, media, loading, loadError } = useNuboEstudioPresentation();
  const [ready, setReady] = useState(false);

  const titulo = `${contenido.meta.titulo} · ${contenido.meta.subtitulo}`;
  const slides = useMemo(
    () => buildNuboPreventaSlides(contenido, media, { showOperatorLinks: false }),
    [contenido, media],
  );

  useEffect(() => {
    if (loading || loadError) return;

    const onBeforePrint = () => {
      refitAllPropuestaSlides();
      requestAnimationFrame(refitAllPropuestaSlides);
    };

    window.addEventListener("beforeprint", onBeforePrint);

    void (async () => {
      await waitForPropuestaPrintImages(12_000);
      requestAnimationFrame(() => {
        refitAllPropuestaSlides();
        requestAnimationFrame(() => {
          refitAllPropuestaSlides();
          setReady(true);
        });
      });
    })();

    return () => window.removeEventListener("beforeprint", onBeforePrint);
  }, [loading, loadError, slides]);

  const handleSavePdf = () => {
    if (!ready) return;
    refitAllPropuestaSlides();
    window.print();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#6cc24a]" />
        <p className="text-sm text-slate-600">Cargando presentación…</p>
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
    <main className="nubo-estudio-print-page min-h-screen bg-[#f8fafc]">
      <div className="gabi-no-print">
        <GabiPrintBar
          titulo={titulo}
          accion="Guardar PDF"
          hint="Carta horizontal · desactiva encabezados del navegador · activa gráficos de fondo"
          onPrint={handleSavePdf}
          skipInvesttiPrep
          disabled={!ready}
        />

        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-10 text-center">
          {!ready ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-[#6cc24a]" />
              <p className="text-sm text-slate-600">Preparando imágenes…</p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Revisa las hojas abajo. Cuando estén bien, pulsa{" "}
                <strong className="font-semibold">Guardar PDF</strong>.
              </p>
              <button
                type="button"
                onClick={handleSavePdf}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-40"
              >
                <Printer className="h-5 w-5" />
                Guardar PDF
              </button>
              <p className="text-[11px] leading-relaxed text-slate-400">
                En el diálogo: «Guardar como PDF», orientación horizontal, gráficos de fondo activados.
              </p>
              <Link
                href="/estudios/nubo"
                className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
              >
                ← Volver al estudio
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="nubo-estudio-print-page__deck px-3 pb-8 md:px-6">
        <PropuestaPrintDeck titulo={titulo} slides={slides} visible landscape />
      </div>
    </main>
  );
}

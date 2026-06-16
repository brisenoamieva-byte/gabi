"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { GabiPrintBar } from "@/components/gabi/GabiPrintBar";
import { PropuestaPrintDeck } from "@/components/propuestas/PropuestaPrintDeck";
import { buildNuboPreventaSlides } from "@/components/estudios/nubo/NuboPreventaAnalisisSlides";
import { useNuboEstudioPresentation } from "@/lib/estudios/use-nubo-estudio-presentation";
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";
import { waitForPropuestaPrintImages } from "@/lib/propuestas/propuesta-print-prep";

async function prepareNuboPrintLayout() {
  await waitForPropuestaPrintImages(12_000);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      refitAllPropuestaSlides();
      requestAnimationFrame(() => {
        refitAllPropuestaSlides();
        window.setTimeout(resolve, 300);
      });
    });
  });
}

export default function NuboEstudioPrintPage() {
  const { contenido, media, loading, loadError } = useNuboEstudioPresentation();
  const autoPrinted = useRef(false);
  const [printDismissed, setPrintDismissed] = useState(false);

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
    const onAfterPrint = () => setPrintDismissed(true);

    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    if (!autoPrinted.current) {
      void (async () => {
        await prepareNuboPrintLayout();
        if (!autoPrinted.current) {
          autoPrinted.current = true;
          window.print();
        }
      })();
    }

    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [loading, loadError, slides]);

  const handleReprint = () => {
    void (async () => {
      await prepareNuboPrintLayout();
      window.print();
    })();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#6cc24a]" />
        <p className="text-sm text-slate-600">Preparando PDF…</p>
        <p className="max-w-xs text-xs text-slate-400">
          Se abrirá el diálogo de impresión con carta horizontal (tabla de publicidad completa).
        </p>
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
    <main
      className={`nubo-estudio-print-page min-h-screen bg-white${
        printDismissed ? " nubo-estudio-print-page--show-preview" : ""
      }`}
    >
      <GabiPrintBar
        titulo={titulo}
        accion="Guardar PDF"
        hint="Carta horizontal · desactiva encabezados del navegador · activa gráficos de fondo"
        onPrint={handleReprint}
      />
      {!printDismissed ? (
        <p className="gabi-no-print px-4 py-6 text-center text-sm text-slate-500">
          Si no se abrió el diálogo, usa <strong className="font-semibold">Guardar PDF</strong> arriba.
        </p>
      ) : (
        <p className="gabi-no-print border-b border-slate-100 px-4 py-3 text-center text-xs text-slate-500">
          Cierra esta pestaña o vuelve al{" "}
          <Link href="/estudios/nubo" className="font-medium text-slate-700 underline-offset-2 hover:underline">
            estudio NUBO
          </Link>
          .
        </p>
      )}
      <div className="px-3 py-4 md:px-6 md:py-6">
        <PropuestaPrintDeck titulo={titulo} slides={slides} visible landscape />
      </div>
    </main>
  );
}

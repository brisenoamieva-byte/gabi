"use client";

import Link from "next/link";
import { NuboPreventaAnalisisSlides } from "@/components/estudios/nubo/NuboPreventaAnalisisSlides";
import { EstudioSharePanel } from "@/components/estudios/EstudioSharePanel";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { GabiAuthLoading } from "@/components/gabi/GabiAuthGate";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
import { DMB_ADMIN } from "@/lib/dmb/admin-routes";
import { NUBO_ESTUDIO_SHARE_SLUG } from "@/lib/estudios/share-registry";

export default function EstudioNuboPreventaPage() {
  const { authReady, hasSession, isOperator, user } = useRequireGabiSession({
    nextPath: "/estudios/nubo",
  });

  if (!authReady || !hasSession) {
    return <GabiAuthLoading message="Cargando análisis…" />;
  }

  return (
    <main className="propuesta-deck-viewport flex h-[100svh] flex-col overflow-hidden bg-nubo-beige">
      <div className="gabi-no-print hidden shrink-0 border-b border-black/8 bg-white px-4 py-2 md:block md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <Link
              href="/estudios"
              className="font-medium text-slate-500 hover:text-[#201044] hover:underline"
            >
              ← Estudios
            </Link>
            <Link
              href="/propuestas/nubo"
              className="font-medium text-slate-500 hover:text-[#201044] hover:underline"
            >
              Propuesta NUBO
            </Link>
            {isOperator ? (
              <Link
                href={DMB_ADMIN.estudiosNubo}
                className="font-medium text-slate-500 hover:text-[#201044] hover:underline"
              >
                Editar estudio
              </Link>
            ) : null}
          </div>
          <GabiSistemaMark size="sm" align="end" />
        </div>
      </div>
      {isOperator ? (
        <EstudioSharePanel
          slug={NUBO_ESTUDIO_SHARE_SLUG}
          operatorEmail={user?.email}
          titulo="NUBO · Condiciones para preventa"
        />
      ) : null}
      <NuboPreventaAnalisisSlides />
    </main>
  );
}

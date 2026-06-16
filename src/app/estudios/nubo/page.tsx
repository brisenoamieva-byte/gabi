"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuboPreventaAnalisisSlides } from "@/components/estudios/nubo/NuboPreventaAnalisisSlides";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";

export default function EstudioNuboPreventaPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("gabi_user")) {
      router.replace(OPERATOR_LOGIN_PATH);
      return;
    }
    setAuthReady(true);
  }, [router]);

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#201044]">
        <p className="text-sm font-semibold">Cargando análisis…</p>
      </main>
    );
  }

  return (
    <main className="propuesta-deck-viewport flex h-[100svh] flex-col overflow-hidden bg-[#F8FAFC]">
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
          </div>
          <GabiSistemaMark size="sm" align="end" />
        </div>
      </div>
      <NuboPreventaAnalisisSlides />
    </main>
  );
}

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
    <main className="min-h-[100dvh] bg-[#F8FAFC]">
      <div className="gabi-no-print border-b border-black/8 bg-white px-3 py-2 sm:px-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:gap-3 sm:text-[12px]">
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

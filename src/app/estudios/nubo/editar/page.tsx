"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NuboEstudioAdminPanel } from "@/components/admin/NuboEstudioAdminPanel";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { NuboEditorCodeGate } from "@/components/estudios/nubo/NuboEditorCodeGate";
import { readStoredAsesorSession } from "@/lib/asesores/session-client";
import { getNuboEditorOperatorCode } from "@/lib/estudios/nubo-editor-client";
import { isGabiOperator, OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";

export default function EstudioNuboEditarPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [codeReady, setCodeReady] = useState(false);

  useEffect(() => {
    const session = readStoredAsesorSession();
    if (!session?.email || !isGabiOperator(session)) {
      router.replace(OPERATOR_LOGIN_PATH);
      return;
    }
    setAuthReady(true);
    setCodeReady(Boolean(getNuboEditorOperatorCode()));
  }, [router]);

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#201044]">
        <p className="text-sm font-semibold">Cargando editor…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="gabi-no-print border-b border-black/8 bg-white px-4 py-2 md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <Link
              href="/estudios/nubo"
              className="font-medium text-slate-500 hover:text-[#201044] hover:underline"
            >
              ← Estudio NUBO
            </Link>
          </div>
          <GabiSistemaMark size="sm" align="end" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        {codeReady ?
          <NuboEstudioAdminPanel />
        : <NuboEditorCodeGate onReady={() => setCodeReady(true)} />}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { NuboEstudioAdminPanel } from "@/components/admin/NuboEstudioAdminPanel";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { readStoredAsesorSession } from "@/lib/asesores/session-client";
import { isGabiOperator, OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";

export default function EstudioNuboEditarPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const session = readStoredAsesorSession();
      if (session?.email && isGabiOperator(session)) {
        if (!cancelled) setAuthReady(true);
        return;
      }

      try {
        const res = await fetch("/api/admin/me");
        const data = (await res.json()) as { authenticated?: boolean; rol?: string };
        if (!cancelled && res.ok && data.authenticated && data.rol === "superadmin") {
          setAuthReady(true);
          return;
        }
      } catch {
        /* redirect below */
      }

      if (!cancelled) {
        router.replace(OPERATOR_LOGIN_PATH);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#201044]">
        <Loader2 className="h-4 w-4 animate-spin" />
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
            <Link
              href="/admin/estudios-nubo"
              className="font-medium text-slate-500 hover:text-[#201044] hover:underline"
            >
              Admin
            </Link>
          </div>
          <GabiSistemaMark size="sm" align="end" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <NuboEstudioAdminPanel />
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvesttiMetrajeDashboard } from "@/components/corredor/investti/InvesttiMetrajeDashboard";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import {
  readPortalSession,
  resolveAdvisorEntryPath,
} from "@/lib/portal/session";

export default function CorredorInvesttiPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("gabi_user");
    if (!storedUser) {
      const portal = readPortalSession();
      router.replace(portal ? resolveAdvisorEntryPath(portal) : "/portal");
      return;
    }
    setAuthReady(true);
  }, [router]);

  if (!authReady) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${investtiReport.page}`}>
        <p className={`${investtiReport.sans} text-sm text-neutral-600`}>Cargando documento…</p>
      </main>
    );
  }

  return (
    <main className={investtiReport.page}>
      <div className="px-4 py-6 md:px-6 md:py-10">
        <div className={`${investtiReport.sheet} ${investtiReport.sans}`}>
          <div className={`flex items-center justify-between gap-4 border-b ${investtiReport.rule} px-6 py-3 md:px-10`}>
            <div className="flex flex-wrap items-center gap-4 text-[12px]">
              <Link
                href="/estudios"
                className="text-neutral-500 underline-offset-2 hover:text-[#1C1830] hover:underline"
              >
                ← Estudios de mercado
              </Link>
              <Link
                href="/corredor"
                className="text-neutral-400 underline-offset-2 hover:text-[#1C1830] hover:underline"
              >
                Corredor
              </Link>
            </div>
            <GabiSistemaMark size="sm" align="end" tone="report" />
          </div>
          <InvesttiMetrajeDashboard />
        </div>
      </div>
    </main>
  );
}

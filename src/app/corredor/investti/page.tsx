"use client";

import Link from "next/link";
import { InvesttiMetrajeDashboard } from "@/components/corredor/investti/InvesttiMetrajeDashboard";
import { GabiPrintBar } from "@/components/gabi/GabiPrintBar";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { useRequireGabiSession } from "@/components/gabi/useRequireGabiSession";
import "@/lib/estudios/investti-print.css";

const PRINT_TITLE = "Metraje recomendado — Cañadas del Valle · Grupo Investti";

export default function CorredorInvesttiPage() {
  const { authReady, hasSession } = useRequireGabiSession({
    nextPath: "/corredor/investti",
    requireOperator: true,
  });

  if (!authReady || !hasSession) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${investtiReport.page}`}>
        <p className={`${investtiReport.sans} text-sm text-neutral-600`}>Cargando documento…</p>
      </main>
    );
  }

  return (
    <main className={`${investtiReport.page} gabi-report-print`}>
      <GabiPrintBar titulo={PRINT_TITLE} />
      <div className="px-4 py-6 md:px-6 md:py-10">
        <div className={`investti-report-sheet ${investtiReport.sheet} ${investtiReport.sans}`}>
          <div
            className={`gabi-no-print flex items-center justify-between gap-4 border-b ${investtiReport.rule} px-6 py-3 md:px-10`}
          >
            <div className="flex flex-wrap items-center gap-4 text-[12px]">
              <Link
                href="/corredor"
                className="font-medium text-neutral-600 hover:text-neutral-900 hover:underline"
              >
                ← Corredor sur
              </Link>
              <Link
                href="/gabi"
                className="font-medium text-neutral-600 hover:text-neutral-900 hover:underline"
              >
                Centro gabi
              </Link>
            </div>
            <GabiSistemaMark size="sm" align="end" />
          </div>
          <InvesttiMetrajeDashboard />
        </div>
      </div>
    </main>
  );
}

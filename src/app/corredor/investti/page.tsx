"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvesttiMetrajeDashboard } from "@/components/corredor/investti/InvesttiMetrajeDashboard";
import { GabiPrintBar } from "@/components/gabi/GabiPrintBar";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";
import "@/lib/estudios/investti-print.css";

const PRINT_TITLE = "Metraje recomendado — Cañadas del Valle · Grupo Investti";

export default function CorredorInvesttiPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("gabi_user");
    if (!storedUser) {
      router.replace(OPERATOR_LOGIN_PATH);
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
    <main className={`${investtiReport.page} gabi-report-print`}>
      <GabiPrintBar titulo={PRINT_TITLE} />
      <div className="px-4 py-6 md:px-6 md:py-10">
        <div className={`investti-report-sheet ${investtiReport.sheet} ${investtiReport.sans}`}>
          <div
            className={`gabi-no-print flex items-center justify-between gap-4 border-b ${investtiReport.rule} px-6 py-3 md:px-10`}
          >
            <div className="flex flex-wrap items-center gap-4 text-[12px]">
              <Link
                href="/estudios"
                className="text-neutral-500 underline-offset-2 hover:text-[#1C1830] hover:underline"
              >
                ← Estudios de mercado
              </Link>
              <Link
                href="/gabi"
                className="text-neutral-400 underline-offset-2 hover:text-[#1C1830] hover:underline"
              >
                Centro gabi
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

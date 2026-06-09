"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { GabiPrintBar } from "@/components/gabi/GabiPrintBar";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";

export function GabiReportShell({
  backHref,
  backLabel,
  printTitle,
  children,
}: {
  backHref: string;
  backLabel: string;
  printTitle: string;
  children: ReactNode;
}) {
  return (
    <main className={`${investtiReport.page} gabi-report-print`}>
      <GabiPrintBar titulo={printTitle} />
      <div className="px-4 py-6 md:px-6 md:py-10">
        <div className={`${investtiReport.sheet} ${investtiReport.sans}`}>
          <div
            className={`gabi-no-print flex items-center justify-between gap-4 border-b ${investtiReport.rule} px-6 py-3 md:px-10`}
          >
            <Link
              href={backHref}
              className="text-[12px] text-neutral-500 underline-offset-2 hover:text-[#1C1830] hover:underline"
            >
              {backLabel}
            </Link>
            <GabiSistemaMark size="sm" align="end" tone="report" />
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

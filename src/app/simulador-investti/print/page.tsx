"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GabiPrintBar } from "@/components/gabi/GabiPrintBar";
import { InvesttiSimuladorPrintSheet } from "@/components/corredor/investti/InvesttiSimuladorPrintSheet";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";
import {
  formatManzanaLabel,
  loadInvesttiSimuladorPrintSnapshot,
  type InvesttiSimuladorPrintSnapshot,
} from "@/lib/corredor/investti-simulador-print";
import "@/lib/estudios/investti-print.css";
import "@/lib/corredor/investti-simulador-print.css";

function readPrintSnapshot(): InvesttiSimuladorPrintSnapshot | null {
  if (typeof window === "undefined") return null;
  return loadInvesttiSimuladorPrintSnapshot();
}

export default function InvesttiSimuladorPrintPage() {
  const [snapshot, setSnapshot] = useState<InvesttiSimuladorPrintSnapshot | null>(readPrintSnapshot);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSnapshot(readPrintSnapshot());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className={`flex min-h-screen items-center justify-center ${investtiReport.page}`}>
        <p className={`${investtiReport.sans} text-sm text-neutral-600`}>Preparando documento…</p>
      </main>
    );
  }

  if (!snapshot) {
    return (
      <main className={`flex min-h-screen flex-col items-center justify-center gap-4 px-6 ${investtiReport.page}`}>
        <p className={`${investtiReport.sans} max-w-md text-center text-sm text-neutral-600`}>
          No hay una simulación lista para exportar. Configura manzana, lote y esquema en el
          simulador y vuelve a pulsar «Exportar PDF».
        </p>
        <Link
          href="/cotizador"
          className={`gabi-no-print ${investtiReport.sans} rounded-lg border border-[#201044]/15 bg-white px-4 py-2 text-[13px] font-semibold text-[#201044]`}
        >
          Ir al cotizador
        </Link>
      </main>
    );
  }

  const printTitle = `Simulación ${snapshot.desarrolloNombre} · ${formatManzanaLabel(snapshot.lote.manzana)}-${snapshot.lote.lote}`;

  return (
    <main className={`investti-simulador-print-page ${investtiReport.page} gabi-report-print`}>
      <GabiPrintBar titulo={printTitle} accion="Guardar PDF" />
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className={`investti-report-sheet ${investtiReport.sheet}`}>
          <div className="gabi-no-print flex items-center justify-between gap-4 border-b border-neutral-200 px-6 py-3 md:px-10">
            <Link
              href="/cotizador"
              className="text-[12px] text-neutral-500 underline-offset-2 hover:text-[#1C1830] hover:underline"
            >
              ← Volver al cotizador
            </Link>
          </div>
          <InvesttiSimuladorPrintSheet snapshot={snapshot} />
        </div>
      </div>
    </main>
  );
}

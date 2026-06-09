"use client";

import { Printer } from "lucide-react";

export function GabiPrintBar({ titulo }: { titulo: string }) {
  return (
    <div className="gabi-no-print sticky top-0 z-20 border-b border-neutral-200/80 bg-[#FDFCFA]/95 px-4 py-3 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4">
        <p className="truncate text-[12px] text-neutral-500">{titulo}</p>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#201044]/15 bg-white px-4 py-2 text-[12px] font-semibold text-[#201044] shadow-sm transition hover:bg-neutral-50"
        >
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </button>
      </div>
    </div>
  );
}

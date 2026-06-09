"use client";

import { Printer } from "lucide-react";

export function GabiPrintBar({
  titulo,
  accion = "PDF carta",
}: {
  titulo: string;
  accion?: string;
}) {
  return (
    <div className="gabi-no-print sticky top-0 z-20 border-b border-neutral-200/80 bg-[#FDFCFA]/95 px-4 py-3 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-neutral-700">{titulo}</p>
          <p className="hidden text-[11px] text-neutral-400 sm:block">
            Una hoja carta por sección · en el diálogo elige «Guardar como PDF»
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#201044]/15 bg-white px-4 py-2 text-[12px] font-semibold text-[#201044] shadow-sm transition hover:bg-neutral-50"
        >
          <Printer className="h-4 w-4" />
          {accion}
        </button>
      </div>
    </div>
  );
}

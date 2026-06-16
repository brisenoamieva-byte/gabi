"use client";

import { Printer, X } from "lucide-react";
import { getMobilePrintPlatform } from "@/lib/propuestas/propuesta-print-mobile";

type PropuestaMobilePrintSheetProps = {
  open: boolean;
  preparing?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function printSteps(platform: ReturnType<typeof getMobilePrintPlatform>): string[] {
  if (platform === "ios") {
    return [
      "Se abrirá la vista de impresión de Safari.",
      "Pellizca la vista previa para ver las hojas completas.",
      "Toca Compartir → Guardar en Archivos para obtener el PDF.",
      "Si las imágenes salen en blanco, activa «Imprimir fondos» en Opciones.",
    ];
  }

  if (platform === "android") {
    return [
      "Se abrirá el diálogo de impresión de Chrome.",
      "Elige «Guardar como PDF» como destino.",
      "Activa «Gráficos de fondo» si aparece la opción.",
      "Toca el ícono de descarga o Guardar.",
    ];
  }

  return [
    "Se abrirá la vista de impresión del navegador.",
    "Elige guardar o compartir como PDF.",
    "Activa gráficos de fondo si las imágenes no se ven.",
  ];
}

export function PropuestaMobilePrintSheet({
  open,
  preparing = false,
  onClose,
  onConfirm,
}: PropuestaMobilePrintSheetProps) {
  if (!open) return null;

  const platform = getMobilePrintPlatform();
  const steps = printSteps(platform);

  return (
    <div className="gabi-no-print fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-labelledby="mobile-print-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Exportar PDF
            </p>
            <h2 id="mobile-print-title" className="text-base font-bold text-slate-800">
              Guardar presentación
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={preparing}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-sm leading-relaxed text-slate-600">
            La presentación se preparará y se abrirá la impresión del dispositivo. Sigue estos pasos:
          </p>
          <ol className="space-y-2 text-sm text-slate-700">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6cc24a]/15 text-[11px] font-bold text-[#4a9a32]">
                  {index + 1}
                </span>
                <span className="pt-0.5 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-slate-400">
            Recomendado en horizontal para mejor vista previa. El PDF puede tardar unos segundos en cargar las imágenes.
          </p>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-4 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={preparing}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={preparing}
            className="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Printer className="h-4 w-4" />
            {preparing ? "Preparando…" : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

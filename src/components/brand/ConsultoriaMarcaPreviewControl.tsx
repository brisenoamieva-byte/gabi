"use client";

import { ConsultoriaMarcaSelector } from "@/components/brand/ConsultoriaMarcaSelector";
import { useConsultoriaMarca } from "@/components/brand/ConsultoriaMarcaProvider";

/** Vista previa de marca en el deck (no persiste; guardar en admin). */
export function ConsultoriaMarcaPreviewControl({ className = "" }: { className?: string }) {
  const { marca, storedMarca, setPreviewMarca } = useConsultoriaMarca();

  return (
    <ConsultoriaMarcaSelector
      compact
      className={className}
      value={marca}
      onChange={(next) => setPreviewMarca(next === storedMarca ? null : next)}
    />
  );
}

"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  downloadClusterBrochure,
  downloadDesarrolloBrochure,
  downloadDisponibilidadReport,
  downloadFichaTecnica,
} from "@/lib/documents";

type DocumentDownloadButtonProps = {
  label?: string;
  className?: string;
  compact?: boolean;
} & (
  | { variant: "desarrollo"; desarrolloId: string }
  | { variant: "cluster"; clusterId: string; desarrolloId: string }
  | { variant: "ficha-tecnica"; prototipoId: string; desarrolloId: string }
  | { variant: "disponibilidad"; clusterId: string; desarrolloId: string; etapa?: string }
);

export function DocumentDownloadButton({
  label,
  className = "",
  compact = false,
  ...props
}: DocumentDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const defaultLabel =
    props.variant === "desarrollo"
      ? "Brochure del desarrollo"
      : props.variant === "cluster"
        ? "Brochure del cluster"
        : props.variant === "ficha-tecnica"
          ? "Ficha técnica PDF"
          : props.etapa
            ? `Disponibilidad · Etapa ${props.etapa}`
            : "Disponibilidad PDF";

  const handleDownload = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (props.variant === "desarrollo") {
        await downloadDesarrolloBrochure(props.desarrolloId);
      } else if (props.variant === "cluster") {
        await downloadClusterBrochure(props.clusterId, props.desarrolloId);
      } else if (props.variant === "ficha-tecnica") {
        await downloadFichaTecnica(props.prototipoId, props.desarrolloId);
      } else {
        await downloadDisponibilidadReport(props.clusterId, props.desarrolloId, props.etapa);
      }
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "No se pudo descargar. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={(event) => void handleDownload(event)}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#201044]/15 bg-white font-bold text-[#201044] transition hover:border-[#201044]/25 hover:bg-slate-50 disabled:opacity-60 ${
          compact ? "min-h-10 px-3 text-xs" : "min-h-11 px-4 text-sm"
        }`}
      >
        {loading ? (
          <Loader2 className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} animate-spin`} />
        ) : (
          <Download className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        )}
        {label ?? defaultLabel}
      </button>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-amber-700">{error}</p>
      ) : null}
    </div>
  );
}

"use client";

import { CheckCircle2, CloudOff, Loader2, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatOfflinePreparedAt,
  prepareOfflineVisit,
  readOfflinePreparedMeta,
} from "@/lib/offline/prepare-offline-visit";
import type { OfflinePreparedMeta } from "@/lib/offline/constants";

type PrepareOfflineVisitButtonProps = {
  desarrolloId: string;
  desarrolloNombre: string;
  className?: string;
};

export function PrepareOfflineVisitButton({
  desarrolloId,
  desarrolloNombre,
  className = "",
}: PrepareOfflineVisitButtonProps) {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [meta, setMeta] = useState<OfflinePreparedMeta | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = readOfflinePreparedMeta();
    if (stored?.desarrolloId === desarrolloId) {
      setMeta(stored);
    }
  }, [desarrolloId]);

  const handlePrepare = async () => {
    setLoading(true);
    setError("");
    setPhase("Iniciando…");

    try {
      const result = await prepareOfflineVisit(desarrolloId, (next) => {
        setPhase(next.phase);
        setProgress({ done: next.done, total: next.total });
      });
      setMeta(result);
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : "No se pudo preparar la visita offline.",
      );
    } finally {
      setLoading(false);
    }
  };

  const progressPct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div
      className={`rounded-2xl border border-[#201044]/10 bg-white p-5 shadow-sm ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : meta ? (
            <CheckCircle2 className="h-5 w-5 text-[#6cc24a]" />
          ) : (
            <CloudOff className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#6cc24a]">
            Showroom sin señal
          </p>
          <h3 className="text-lg font-black text-[#201044]">Preparar visita offline</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Descarga recorrido, cotizador, inventario curado y PDFs de {desarrolloNombre} mientras
            tengas WiFi.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span className="truncate pr-2">{phase}</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#6cc24a] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {meta && meta.desarrolloId === desarrolloId ? (
        <div className="mt-4 rounded-xl bg-[#F2F0E9] px-3 py-2.5 text-xs leading-relaxed text-[#201044]">
          <p className="font-bold">
            Listo · {formatOfflinePreparedAt(meta.preparedAt)}
          </p>
          <p className="mt-1 text-slate-600">
            {meta.documentsCached} PDF(s) · {meta.inventarioClusters} cluster(s) inventario ·{" "}
            {meta.assetsCached} imágenes
            {meta.documentsFailed > 0
              ? ` · ${meta.documentsFailed} doc(s) no disponibles en admin`
              : ""}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void handlePrepare()}
        disabled={loading}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando…
          </>
        ) : meta ? (
          <>
            <Wifi className="h-4 w-4" />
            Actualizar paquete offline
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" />
            Preparar para visita offline
          </>
        )}
      </button>
    </div>
  );
}

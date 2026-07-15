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
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#201044]/[0.06] text-[#201044]">
          {loading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : meta ? (
            <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600" strokeWidth={2} />
          ) : (
            <CloudOff className="h-[18px] w-[18px]" strokeWidth={2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
            Showroom sin señal
          </p>
          <h3 className="text-sm font-semibold text-[#201044]">Preparar visita offline</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Descarga recorrido, cotizador, inventario y PDFs de {desarrolloNombre} con WiFi.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
            <span className="truncate pr-2">{phase}</span>
            <span className="tabular-nums">{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#201044] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      {meta && meta.desarrolloId === desarrolloId ? (
        <div className="mt-3 rounded-xl bg-[#F7F6F2] px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <p className="font-semibold text-[#201044]">
            Listo · {formatOfflinePreparedAt(meta.preparedAt)}
          </p>
          <p className="mt-1">
            {meta.documentsCached} PDF(s) · {meta.inventarioClusters} cluster(s) inventario ·{" "}
            {meta.assetsCached} imágenes
            {meta.documentsFailed > 0
              ? ` · ${meta.documentsFailed} doc(s) no disponibles en admin`
              : ""}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-xs font-medium text-red-600">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void handlePrepare()}
        disabled={loading}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-semibold text-white transition hover:bg-[#2a1760] disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparando…
          </>
        ) : meta ? (
          <>
            <Wifi className="h-4 w-4" strokeWidth={2} />
            Actualizar paquete offline
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4" strokeWidth={2} />
            Preparar para visita offline
          </>
        )}
      </button>
    </div>
  );
}

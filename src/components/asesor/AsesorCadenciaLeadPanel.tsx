"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Phone } from "lucide-react";
import type { CadenciaHoyItem } from "@/lib/comercial/cadencia-service";

type AsesorCadenciaLeadPanelProps = {
  asesorId: string;
  prospectoId: string;
  etapa: string;
};

export function AsesorCadenciaLeadPanel({
  asesorId,
  prospectoId,
  etapa,
}: AsesorCadenciaLeadPanelProps) {
  const [items, setItems] = useState<CadenciaHoyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (etapa !== "nuevo") {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        asesorId,
        prospectoId,
      });
      const response = await fetch(`/api/asesores/cadencia/prospecto?${params.toString()}`);
      const data = (await response.json()) as { items?: CadenciaHoyItem[] };
      if (response.ok) {
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [asesorId, prospectoId, etapa]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleComplete = async (touchId: string) => {
    setCompletingId(touchId);
    try {
      await fetch(`/api/asesores/cadencia/touches/${touchId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asesorId }),
      });
      await load();
    } finally {
      setCompletingId(null);
    }
  };

  if (etapa !== "nuevo" || (!loading && !items.length)) {
    return null;
  }

  const next = items[0];

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">
        Cadencia de perfilamiento
      </p>
      {loading ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Cargando…
        </p>
      ) : next ? (
        <>
          <p className="mt-1 text-sm font-semibold text-[#201044]">{next.touch.label}</p>
          <p className="text-xs text-slate-500">
            Día {next.cadenciaDayIndex} · {next.windowLabel}
            {next.isOverdue ? " · vencido" : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {next.whatsappUrl ? (
              <a
                href={next.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
            ) : null}
            {next.telUrl ? (
              <a
                href={next.telUrl}
                className="inline-flex items-center gap-1 rounded-lg bg-[#201044] px-3 py-1.5 text-xs font-bold text-white"
              >
                <Phone className="h-3.5 w-3.5" />
                Llamar
              </a>
            ) : null}
            <button
              type="button"
              disabled={completingId === next.touch.id}
              onClick={() => void handleComplete(next.touch.id)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#201044] underline-offset-2 hover:underline"
            >
              {completingId === next.touch.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Marcar hecho
            </button>
          </div>
          {items.length > 1 ? (
            <p className="mt-2 text-[11px] text-slate-500">+{items.length - 1} toque(s) más hoy</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

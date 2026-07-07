"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  Clock,
} from "lucide-react";
import type { CadenciaHoyItem } from "@/lib/comercial/cadencia-service";

type AsesorCadenciaHoyPanelProps = {
  asesorId: string;
  desarrolloId: string;
  items: CadenciaHoyItem[];
  loading?: boolean;
  onRefresh: () => void;
};

export function AsesorCadenciaHoyPanel({
  asesorId,
  items,
  loading,
  onRefresh,
}: AsesorCadenciaHoyPanelProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (touchId: string) => {
      setCompletingId(touchId);
      try {
        const response = await fetch(`/api/asesores/cadencia/touches/${touchId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asesorId }),
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? "Error al guardar");
        }
        onRefresh();
      } catch (error) {
        console.error(error);
      } finally {
        setCompletingId(null);
      }
    },
    [asesorId, onRefresh],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/70">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando cadencia de hoy…
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="relative mt-4 rounded-2xl border border-sky-400/25 bg-sky-500/10 p-4 backdrop-blur-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-300">
            <Clock className="h-3.5 w-3.5" />
            Hoy toca · perfilamiento
          </p>
          <p className="mt-0.5 text-xs text-white/65">
            {items.length} contacto(s) pendiente(s) — meta: agendar visita
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <CadenciaHoyRow
            key={item.touch.id}
            item={item}
            completing={completingId === item.touch.id}
            onComplete={() => void handleComplete(item.touch.id)}
          />
        ))}
      </ul>

      {items.length > 5 ? (
        <p className="mt-2 text-center text-xs text-white/50">
          +{items.length - 5} más en{" "}
          <Link href="/mis-leads" className="font-semibold text-sky-300 underline-offset-2 hover:underline">
            Mis prospectos
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function CadenciaHoyRow({
  item,
  completing,
  onComplete,
}: {
  item: CadenciaHoyItem;
  completing: boolean;
  onComplete: () => void;
}) {
  const isWa = item.touch.canal === "whatsapp";

  return (
    <li className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-bold text-white">{item.prospectoNombre}</p>
            {item.isOverdue ? (
              <span className="rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-200">
                Vencido
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-white/80">{item.touch.label}</p>
          <p className="mt-0.5 text-xs text-white/50">
            Día {item.cadenciaDayIndex} · {item.windowLabel}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5">
          {isWa && item.whatsappUrl ? (
            <a
              href={item.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-xs font-bold text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          ) : null}
          {!isWa && item.telUrl ? (
            <a
              href={item.telUrl}
              className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-xs font-bold text-white"
            >
              <Phone className="h-3.5 w-3.5" />
              Llamar
            </a>
          ) : null}
          <button
            type="button"
            disabled={completing}
            onClick={onComplete}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-2.5 py-1.5 text-xs font-bold text-white/90 disabled:opacity-50"
          >
            {completing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Hecho
          </button>
        </div>
      </div>

      {item.llamadaGuion ? (
        <p className="mt-2 line-clamp-2 text-[11px] text-white/45">{item.llamadaGuion.split("\n")[3]}</p>
      ) : null}

      <Link
        href={`/mis-leads?prospecto=${encodeURIComponent(item.prospectoId)}`}
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-300"
      >
        Ver lead
        <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}

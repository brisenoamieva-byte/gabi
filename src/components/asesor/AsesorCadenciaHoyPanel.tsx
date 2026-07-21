"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  Clock,
  MessageSquareOff,
} from "lucide-react";
import type { CadenciaHoyItem } from "@/lib/comercial/cadencia-service";
import {
  CONTACTO_RESULTADO_LABEL,
  type ContactoResultadoRapido,
} from "@/lib/comercial/crm-compliance-config";

type AsesorCadenciaHoyPanelProps = {
  asesorId: string;
  desarrolloId: string;
  items: CadenciaHoyItem[];
  loading?: boolean;
  onRefresh: () => void;
};

const OUTCOMES: Array<{
  id: ContactoResultadoRapido;
  label: string;
  icon: typeof CheckCircle2;
  tone: string;
}> = [
  {
    id: "respondio",
    label: CONTACTO_RESULTADO_LABEL.respondio,
    icon: CheckCircle2,
    tone: "bg-emerald-500/25 text-emerald-100 border-emerald-400/30",
  },
  {
    id: "sin_respuesta",
    label: CONTACTO_RESULTADO_LABEL.sin_respuesta,
    icon: MessageSquareOff,
    tone: "bg-amber-500/20 text-amber-100 border-amber-400/30",
  },
  {
    id: "cita",
    label: CONTACTO_RESULTADO_LABEL.cita,
    icon: Calendar,
    tone: "bg-[#6cc24a]/30 text-white border-[#6cc24a]/40",
  },
  {
    id: "mensaje_enviado",
    label: "Enviado",
    icon: MessageCircle,
    tone: "bg-sky-500/20 text-sky-100 border-sky-400/30",
  },
];

export function AsesorCadenciaHoyPanel({
  asesorId,
  items,
  loading,
  onRefresh,
}: AsesorCadenciaHoyPanelProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (touchId: string, resultado: ContactoResultadoRapido) => {
      setCompletingId(touchId);
      try {
        const response = await fetch(`/api/asesores/cadencia/touches/${touchId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asesorId, resultado }),
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
            Hoy toca · captura rápida
          </p>
          <p className="mt-0.5 text-xs text-white/65">
            Un toque por lead. Los días viejos se saltan solos; tras D7 la cadencia expira.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <CadenciaHoyRow
            key={item.touch.id}
            item={item}
            completing={completingId === item.touch.id}
            onComplete={(resultado) => void handleComplete(item.touch.id, resultado)}
          />
        ))}
      </ul>

      {items.length > 5 ? (
        <p className="mt-2 text-center text-xs text-white/50">
          +{items.length - 5} más en{" "}
          <Link
            href="/mis-leads"
            className="font-semibold text-sky-300 underline-offset-2 hover:underline"
          >
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
  onComplete: (resultado: ContactoResultadoRapido) => void;
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
            Toque D{item.touch.dayOffset} · {item.windowLabel}
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
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {OUTCOMES.map((outcome) => {
          const Icon = outcome.icon;
          return (
            <button
              key={outcome.id}
              type="button"
              disabled={completing}
              onClick={() => onComplete(outcome.id)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold disabled:opacity-50 ${outcome.tone}`}
            >
              {completing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {outcome.label}
            </button>
          );
        })}
      </div>

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

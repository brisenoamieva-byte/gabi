"use client";

import { useState } from "react";
import { CheckCircle2, Copy, MessageCircle, X } from "lucide-react";
import {
  buildVisitaFollowUpSummary,
  buildWhatsAppUrl,
} from "@/lib/visitas/follow-up";

type PostVisitaModalProps = {
  desarrolloNombre: string;
  asesorNombre: string;
  clienteNombre: string;
  clienteTelefono?: string;
  clusterNombre?: string;
  prototipoNombre?: string;
  precioFinal?: number;
  onClose: () => void;
};

export function PostVisitaModal({
  desarrolloNombre,
  asesorNombre,
  clienteNombre,
  clienteTelefono,
  clusterNombre,
  prototipoNombre,
  precioFinal,
  onClose,
}: PostVisitaModalProps) {
  const [copied, setCopied] = useState(false);

  const message = buildVisitaFollowUpSummary({
    desarrolloNombre,
    asesorNombre,
    clienteNombre,
    clusterNombre,
    prototipoNombre,
    precioFinal,
  });

  const whatsAppUrl = clienteTelefono ? buildWhatsAppUrl(clienteTelefono, message) : null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#201044]/40 p-4 sm:items-center">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-[#201044]/10 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6CC24A]">
              Recorrido completado
            </p>
            <h2 className="mt-1 text-xl font-black text-[#201044]">Seguimiento post-visita</h2>
            <p className="mt-2 text-sm text-slate-500">
              Envía un mensaje profesional al prospecto mientras la visita está fresca.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-[#F2F0E9] p-4 text-xs leading-relaxed text-[#201044]">
          {message}
        </pre>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#201044]/15 bg-white px-4 text-sm font-bold text-[#201044]"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar mensaje"}
          </button>
          {whatsAppUrl ? (
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-bold text-white"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
            </a>
          ) : (
            <p className="flex min-h-11 items-center justify-center rounded-xl bg-slate-50 px-4 text-xs text-slate-500">
              Sin teléfono capturado
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-[#201044] py-3 text-sm font-bold text-white"
        >
          Ir al dashboard
        </button>
      </div>
    </div>
  );
}

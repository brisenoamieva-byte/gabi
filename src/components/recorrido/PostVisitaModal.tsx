"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Copy, Loader2, Mail, MessageCircle, X } from "lucide-react";
import {
  buildVisitaFollowUpSummary,
  buildWhatsAppUrl,
} from "@/lib/visitas/follow-up";

type PostVisitaModalProps = {
  desarrolloId: string;
  desarrolloNombre: string;
  asesorId: string;
  asesorNombre: string;
  clienteNombre: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  clusterNombre?: string;
  prototipoNombre?: string;
  precioFinal?: number;
  initialEmailSent?: boolean;
  onClose: () => void;
};

export function PostVisitaModal({
  desarrolloId,
  desarrolloNombre,
  asesorId,
  asesorNombre,
  clienteNombre,
  clienteEmail,
  clienteTelefono,
  clusterNombre,
  prototipoNombre,
  precioFinal,
  initialEmailSent = false,
  onClose,
}: PostVisitaModalProps) {
  const [copied, setCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(initialEmailSent);
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");

  const message = buildVisitaFollowUpSummary({
    desarrolloNombre,
    asesorNombre,
    clienteNombre,
    clusterNombre,
    prototipoNombre,
    precioFinal,
  });

  const whatsAppUrl = clienteTelefono ? buildWhatsAppUrl(clienteTelefono, message) : null;
  const hasEmail = Boolean(clienteEmail?.trim());

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleSendEmail = useCallback(async () => {
    if (!clienteEmail?.trim()) {
      return;
    }

    setEmailSending(true);
    setEmailError("");

    try {
      const response = await fetch("/api/visitas/follow-up-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          asesorId,
          asesorNombre,
          clienteNombre,
          clienteEmail: clienteEmail.trim(),
          desarrolloNombre,
          clusterNombre,
          prototipoNombre,
          precioFinal,
        }),
      });

      const data = (await response.json()) as { sent?: boolean; error?: string };

      if (!response.ok || !data.sent) {
        throw new Error(data.error ?? "No se pudo enviar el correo.");
      }

      setEmailSent(true);
    } catch (sendError) {
      setEmailError(sendError instanceof Error ? sendError.message : "Error al enviar email");
    } finally {
      setEmailSending(false);
    }
  }, [
    asesorId,
    asesorNombre,
    clienteEmail,
    clienteNombre,
    clusterNombre,
    desarrolloId,
    desarrolloNombre,
    precioFinal,
    prototipoNombre,
  ]);

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

        {emailSent ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Correo enviado a {clienteEmail}
          </p>
        ) : null}

        {emailError ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {emailError}
          </p>
        ) : null}

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
          {hasEmail ? (
            <button
              type="button"
              disabled={emailSending || emailSent}
              onClick={() => void handleSendEmail()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#13315C] px-4 text-sm font-bold text-white disabled:opacity-60 sm:col-span-2"
            >
              {emailSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : emailSent ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {emailSent ? "Email enviado" : emailSending ? "Enviando..." : `Enviar email a ${clienteEmail}`}
            </button>
          ) : (
            <p className="flex min-h-11 items-center justify-center rounded-xl bg-slate-50 px-4 text-xs text-slate-500 sm:col-span-2">
              Sin email capturado
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

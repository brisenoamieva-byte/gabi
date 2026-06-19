"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, X } from "lucide-react";
import type { PlatformHealth } from "@/lib/admin/platform-health-types";

export function PlatformHealthBanner() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/admin/platform-health");
        const data = (await response.json()) as PlatformHealth & { error?: string };
        if (response.ok) {
          setHealth(data);
        }
      } catch {
        setHealth(null);
      }
    })();
  }, []);

  if (!health || dismissed) {
    return null;
  }

  const pending = health.checks.filter((item) => !item.ok);
  const showParseurWarning = !health.parseurSecretConfigured;
  const showQaWarning = !health.qaWebhookSecretConfigured;
  const hasIssues = pending.length > 0 || showParseurWarning || showQaWarning;

  if (!hasIssues) {
    return null;
  }

  return (
    <div
      className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
        pending.length
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-sky-200 bg-sky-50 text-sky-950"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">
              {pending.length
                ? `${pending.length} migración${pending.length === 1 ? "" : "es"} pendiente${pending.length === 1 ? "" : "s"} en Supabase`
                : showParseurWarning && showQaWarning
                  ? "Webhooks Parseur y QA sin secreto en el servidor"
                  : showQaWarning
                    ? "Webhook QA sin secreto en el servidor"
                    : "Parseur sin secreto en el servidor"}
            </p>
            <p className="mt-1 text-xs opacity-90">
              {pending.length ? (
                <>
                  Algunas funciones de Leads (spam, iScore, duplicados) o comisiones pueden fallar
                  hasta aplicar el SQL en el proyecto Supabase.
                  {showParseurWarning ? " En producción configura PARSEUR_WEBHOOK_SECRET." : null}
                  {showQaWarning ? " Para ADRYO configura QA_WEBHOOK_SECRET." : null}
                </>
              ) : (
                <>
                  Las migraciones están al día. Añade{" "}
                  <code className="rounded bg-white/70 px-1">PARSEUR_WEBHOOK_SECRET</code> en{" "}
                  <code className="rounded bg-white/70 px-1">.env.local</code>, reinicia{" "}
                  <code className="rounded bg-white/70 px-1">npm run dev</code> y usa el mismo valor
                  en Vercel y en Parseur (header{" "}
                  <code className="rounded bg-white/70 px-1">Authorization: Bearer …</code>).
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-lg p-1.5 hover:bg-black/5"
            aria-label={expanded ? "Ocultar detalle" : "Ver detalle"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1.5 hover:bg-black/5"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {expanded ? (
        <ul className="mt-3 space-y-2 border-t border-amber-200/80 pt-3 text-xs">
          {health.checks.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              {item.ok ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-700" />
              )}
              <span>
                <strong>{item.label}</strong> — {item.detail}
                {!item.ok ? (
                  <span className="block font-mono text-[10px] text-amber-800/90">
                    supabase/migrations/{item.migrationFile}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
          <li className="flex items-start gap-2">
            {health.parseurSecretConfigured ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-sky-700" />
            )}
            <span>
              <strong>Webhook Parseur</strong> —{" "}
              {health.parseurSecretConfigured
                ? "Secreto configurado."
                : "Opcional en local; obligatorio en Vercel (PARSEUR_WEBHOOK_SECRET)."}
            </span>
          </li>
          <li className="flex items-start gap-2">
            {health.qaWebhookSecretConfigured ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-sky-700" />
            )}
            <span>
              <strong>Webhook QA / ADRYO</strong> —{" "}
              {health.qaWebhookSecretConfigured
                ? "Secreto configurado."
                : "Opcional en local; obligatorio en Vercel (QA_WEBHOOK_SECRET)."}
            </span>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

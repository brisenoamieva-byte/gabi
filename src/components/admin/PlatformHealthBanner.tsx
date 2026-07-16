"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import type { PlatformHealth } from "@/lib/admin/platform-health-types";

type ApplyStatus = {
  canApply: boolean;
  pendingIds: string[];
};

export function PlatformHealthBanner() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [applyStatus, setApplyStatus] = useState<ApplyStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const copyMigrationSql = async (id: string) => {
    setCopyMessage("");
    try {
      const query =
        id === "042-043"
          ? "bundle=042-043"
          : `id=${encodeURIComponent(id)}`;
      const response = await fetch(`/api/admin/db/migration-sql?${query}`);
      const data = (await response.json()) as { sql?: string; error?: string };
      if (!response.ok || !data.sql) {
        throw new Error(data.error ?? "No se pudo cargar el SQL.");
      }
      await navigator.clipboard.writeText(data.sql);
      setCopyMessage(`SQL ${id} copiado — pégalo en Supabase SQL Editor y ejecuta.`);
    } catch (error) {
      setCopyMessage(error instanceof Error ? error.message : "Error al copiar SQL.");
    }
  };

  const loadHealth = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/platform-health");
      const data = (await response.json()) as PlatformHealth & { error?: string };
      if (response.ok) {
        setHealth(data);
      }
    } catch {
      setHealth(null);
    }
  }, []);

  const loadApplyStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/db/apply-migrations");
      if (response.ok) {
        const data = (await response.json()) as ApplyStatus;
        setApplyStatus(data);
      }
    } catch {
      setApplyStatus(null);
    }
  }, []);

  useEffect(() => {
    void loadHealth();
    void loadApplyStatus();
  }, [loadHealth, loadApplyStatus]);

  if (!health || dismissed) {
    return null;
  }

  const pending = health.checks.filter((item) => !item.ok);
  const pendingRecent = pending.filter((item) =>
    ["073", "072", "069", "070", "071", "065", "066", "067", "068", "042", "043"].includes(item.id),
  );
  const showParseurWarning = !health.parseurSecretConfigured;
  const showQaWarning = !health.qaWebhookSecretConfigured;
  const showCronWarning = !health.cronSecretConfigured;
  const showResendWarning = !health.resendConfigured || !health.emailFromConfigured;
  const complianceDigestReady = health.checks.find((item) => item.id === "042")?.ok;
  const hasIssues =
    pending.length > 0 ||
    showParseurWarning ||
    showQaWarning ||
    showCronWarning ||
    (complianceDigestReady && showResendWarning);

  const handleApplyMigrations = async () => {
    setApplying(true);
    setApplyMessage("");

    try {
      const response = await fetch("/api/admin/db/apply-migrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        applied?: string[];
        error?: string;
        health?: PlatformHealth;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron aplicar las migraciones.");
      }

      if (data.health) {
        setHealth(data.health);
      } else {
        await loadHealth();
      }
      await loadApplyStatus();
      setApplyMessage(
        data.applied?.length
          ? `Aplicadas: ${data.applied.join(", ")}`
          : "Migraciones aplicadas.",
      );
      setExpanded(true);
    } catch (error) {
      setApplyMessage(error instanceof Error ? error.message : "Error al aplicar.");
    } finally {
      setApplying(false);
    }
  };

  if (!hasIssues) {
    return null;
  }

  return (
    <div
      className={`mb-3 shrink-0 rounded-xl border px-3 py-2 text-sm ${
        pending.length
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-sky-200 bg-sky-50 text-sky-950"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">
              {pending.length
                ? `${pending.length} migración${pending.length === 1 ? "" : "es"} pendiente${pending.length === 1 ? "" : "s"} en Supabase`
                : showParseurWarning && showQaWarning
                  ? "Webhooks Parseur y QA sin secreto"
                  : showQaWarning
                    ? "Webhook QA sin secreto"
                    : "Parseur sin secreto en el servidor"}
            </p>
            {expanded ? (
              <p className="mt-1 text-xs opacity-90">
              {pending.length ? (
                <>
                  Algunas funciones pueden fallar hasta aplicar el SQL en Supabase.
                  {pendingRecent.length
                    ? ` Prioridad: ${pendingRecent.map((item) => item.id).join(", ")}.`
                    : null}
                  {showParseurWarning ? " En producción configura PARSEUR_WEBHOOK_SECRET." : null}
                  {showQaWarning ? " Para ADRYO configura QA_WEBHOOK_SECRET." : null}
                  {showCronWarning ? " Falta CRON_SECRET para el digest automático." : null}
                  {complianceDigestReady && showResendWarning
                    ? " Configura RESEND_API_KEY y EMAIL_FROM para emails de cumplimiento."
                    : null}
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
            ) : null}
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
          {pendingRecent.length > 0 ? (
            <li className="flex flex-wrap gap-2 pt-2">
              {pendingRecent.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void copyMigrationSql(item.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-800/30 bg-white px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100/50"
                >
                  Copiar SQL {item.id}
                </button>
              ))}
              <p className="basis-full text-[10px] opacity-80">
                Supabase → SQL Editor → Run. Luego recarga este panel.
              </p>
            </li>
          ) : null}
          {applyStatus?.canApply ? (
            <li className="pt-2">
              <button
                type="button"
                disabled={applying}
                onClick={() => void handleApplyMigrations()}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Aplicar migraciones {applyStatus.pendingIds.join(" + ")} en Supabase
              </button>
              <p className="mt-1 text-[10px] opacity-80">
                Requiere SUPABASE_DB_PASSWORD en el servidor (Vercel).
              </p>
            </li>
          ) : null}
          {copyMessage ? (
            <li className="rounded-lg bg-white/60 px-3 py-2 text-xs font-medium">{copyMessage}</li>
          ) : null}
          {applyMessage ? (
            <li className="rounded-lg bg-white/60 px-3 py-2 text-xs font-medium">{applyMessage}</li>
          ) : null}
          <li className="flex items-start gap-2">
            {health.cronSecretConfigured ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-sky-700" />
            )}
            <span>
              <strong>Cron digest CRM</strong> —{" "}
              {health.cronSecretConfigured
                ? "CRON_SECRET configurado."
                : "Falta CRON_SECRET en Vercel (digest lun-sáb 8:00 UTC)."}
            </span>
          </li>
          <li className="flex items-start gap-2">
            {health.resendConfigured && health.emailFromConfigured ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-sky-700" />
            )}
            <span>
              <strong>Email cumplimiento CRM</strong> —{" "}
              {health.resendConfigured && health.emailFromConfigured
                ? "Resend configurado."
                : "Configura RESEND_API_KEY y EMAIL_FROM en Vercel."}
            </span>
          </li>
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

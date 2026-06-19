"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";

type ProspectoOption = {
  id: string;
  nombre: string;
  xperience_id?: number | null;
};

type QaEncuestaSimuladorProps = {
  desarrolloId: string;
  webhookUrl: string;
  onSubmitted?: () => void;
};

export function QaEncuestaSimulador({
  desarrolloId,
  webhookUrl,
  onSubmitted,
}: QaEncuestaSimuladorProps) {
  const [migrationOk, setMigrationOk] = useState(true);
  const [secretConfigured, setSecretConfigured] = useState(false);
  const [prospectos, setProspectos] = useState<ProspectoOption[]>([]);
  const [prospectoId, setProspectoId] = useState("");
  const [xperienceId, setXperienceId] = useState("");
  const [tipo, setTipo] = useState<"qa" | "satisfaccion">("qa");
  const [canal, setCanal] = useState<"whatsapp" | "email" | "sms" | "otro">("whatsapp");
  const [score, setScore] = useState("8");
  const [comentario, setComentario] = useState("");
  const [loadingProspectos, setLoadingProspectos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/qa/status");
      const data = (await response.json()) as {
        migrationOk?: boolean;
        secretConfigured?: boolean;
        error?: string;
      };
      if (response.ok) {
        setMigrationOk(data.migrationOk ?? false);
        setSecretConfigured(data.secretConfigured ?? false);
      }
    } catch {
      setMigrationOk(false);
    }
  }, []);

  const loadProspectos = useCallback(async () => {
    if (!desarrolloId) return;
    setLoadingProspectos(true);
    try {
      const params = new URLSearchParams({ desarrolloId });
      const response = await fetch(`/api/admin/prospectos?${params.toString()}`);
      const data = (await response.json()) as { prospectos?: ProspectoOption[] };
      const rows = (data.prospectos ?? []).slice(0, 40);
      setProspectos(rows);
      if (rows.length) {
        setProspectoId((current) => current || rows[0].id);
      }
    } catch {
      setProspectos([]);
    } finally {
      setLoadingProspectos(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    void loadProspectos();
  }, [loadProspectos]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    const parsedScore = Number(score);
    if (Number.isNaN(parsedScore)) {
      setError("Score inválido.");
      setSubmitting(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        desarrolloId,
        tipo,
        canal,
        score: parsedScore,
        comentario: comentario.trim() || undefined,
      };

      if (prospectoId) {
        body.prospectoId = prospectoId;
      }
      if (xperienceId.trim()) {
        body.xperienceId = Number(xperienceId);
      }

      const response = await fetch("/api/admin/qa/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        status?: string;
        message?: string;
        encuestaId?: string;
        error?: string;
      };

      if (!response.ok && data.status !== "duplicate") {
        throw new Error(data.message ?? data.error ?? "No se pudo registrar la encuesta.");
      }

      setMessage(
        data.status === "created"
          ? "Encuesta registrada. Los KPIs se actualizarán al refrescar el reporte."
          : data.status === "duplicate"
            ? "Encuesta duplicada (external_id ya existía)."
            : data.message ?? "Listo.",
      );
      onSubmitted?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al simular.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-black text-gabi-forest">Probar encuesta (manual / ADRYO)</h3>
      <p className="mt-1 text-sm text-slate-500">
        Registra una respuesta QA o de satisfacción sin ADRYO, o valida el mismo payload que usará
        el webhook.
      </p>

      {!migrationOk ? (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Migración 037 pendiente</p>
          <p className="mt-1">
            Aplica{" "}
            <code className="rounded bg-white px-1 text-xs">
              supabase/migrations/037_prospecto_qa_satisfaccion.sql
            </code>{" "}
            en Supabase SQL Editor antes de registrar encuestas.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Prospecto</span>
            <select
              value={prospectoId}
              onChange={(event) => setProspectoId(event.target.value)}
              disabled={loadingProspectos || !migrationOk}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              {prospectos.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.nombre}
                  {row.xperience_id ? ` (#${row.xperience_id})` : ""}
                </option>
              ))}
              {!prospectos.length ? <option value="">Sin prospectos</option> : null}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">
              Xperience ID (opcional)
            </span>
            <input
              type="number"
              value={xperienceId}
              onChange={(event) => setXperienceId(event.target.value)}
              placeholder="Si ADRYO solo envía ID Xperience"
              disabled={!migrationOk}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Tipo</span>
            <select
              value={tipo}
              onChange={(event) => setTipo(event.target.value as "qa" | "satisfaccion")}
              disabled={!migrationOk}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="qa">QA</option>
              <option value="satisfaccion">Satisfacción</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Canal</span>
            <select
              value={canal}
              onChange={(event) =>
                setCanal(event.target.value as "whatsapp" | "email" | "sms" | "otro")
              }
              disabled={!migrationOk}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Score (0–10)</span>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              disabled={!migrationOk}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-slate-600">Comentario</span>
          <textarea
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
            rows={2}
            disabled={!migrationOk}
            className="w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="Opcional — como en ADRYO"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting || !migrationOk}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Registrar encuesta
          </button>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-gabi-forest">Webhook ADRYO</p>
        <p className="mt-2 break-all font-mono">{webhookUrl}</p>
        <p className="mt-2">
          Header:{" "}
          <code className="rounded bg-white px-1">Authorization: Bearer &lt;QA_WEBHOOK_SECRET&gt;</code>
          {secretConfigured ? " — secreto configurado en servidor." : " — falta QA_WEBHOOK_SECRET en Vercel."}
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-3 text-[11px] leading-relaxed">
{`{
  "xperienceId": 12345,
  "tipo": "qa",
  "canal": "whatsapp",
  "score": 8.5,
  "comentario": "Atención rápida",
  "externalId": "adryo-uuid"
}`}
        </pre>
      </div>
    </div>
  );
}

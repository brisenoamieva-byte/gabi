"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Play, RefreshCw } from "lucide-react";
import {
  capturaLogStatusColor,
  capturaLogStatusLabel,
  type CapturaLogRow,
  type CapturaLogStatus,
} from "@/lib/comercial/captura-log-status";
import { buildParseurWebhookUrl } from "@/lib/comercial/parseur-webhook-url";

type CapturaLogsPanelProps = {
  desarrolloId: string;
  campanas: Array<{ id: string; nombre: string }>;
  onOpenProspecto?: (prospectoId: string) => void;
};

const STATUS_FILTERS: Array<{ value: "" | CapturaLogStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "created", label: "Creados" },
  { value: "duplicate", label: "Duplicados" },
  { value: "rejected", label: "Rechazados" },
  { value: "error", label: "Errores" },
  { value: "ignored", label: "Ignorados" },
];

const formatFecha = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
};

export function CapturaLogsPanel({
  desarrolloId,
  campanas,
  onOpenProspecto,
}: CapturaLogsPanelProps) {
  const [logs, setLogs] = useState<CapturaLogRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | CapturaLogStatus>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [simCampanaId, setSimCampanaId] = useState("");
  const [simNombre, setSimNombre] = useState("");
  const [simEmail, setSimEmail] = useState("");
  const [simTelefono, setSimTelefono] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState("");

  useEffect(() => {
    if (campanas.length && !simCampanaId) {
      setSimCampanaId(campanas[0].id);
    }
  }, [campanas, simCampanaId]);

  const handleSimular = async (event: React.FormEvent) => {
    event.preventDefault();
    setSimulating(true);
    setSimMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/captura/simular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campanaId: simCampanaId,
          nombre: simNombre,
          email: simEmail,
          telefono: simTelefono,
        }),
      });

      const data = (await response.json()) as {
        status?: string;
        message?: string;
        prospectoId?: string;
        error?: string;
      };

      if (!response.ok && !data.status) {
        throw new Error(data.error ?? data.message ?? "No se pudo simular.");
      }

      setSimMessage(
        data.message ??
          (data.status === "created"
            ? "Lead creado correctamente."
            : data.status === "duplicate"
              ? "Contacto duplicado (actualizado)."
              : `Estado: ${data.status ?? "ok"}`),
      );

      if (data.prospectoId && onOpenProspecto) {
        onOpenProspecto(data.prospectoId);
      }

      void loadLogs();
    } catch (simError) {
      setError(simError instanceof Error ? simError.message : "Error al simular.");
    } finally {
      setSimulating(false);
    }
  };

  const loadLogs = useCallback(async () => {
    if (!desarrolloId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId, limit: "80" });
      if (statusFilter) {
        params.set("status", statusFilter);
      }

      const response = await fetch(`/api/admin/captura-logs?${params.toString()}`);
      const data = (await response.json()) as { logs?: CapturaLogRow[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los logs.");
      }

      setLogs(data.logs ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, statusFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const primeraCampana = campanas[0];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sm text-sky-950">
        <p className="font-semibold">Captura automática (Parseur)</p>
        <p className="mt-1 text-sky-900/90">
          Cada webhook entrante queda registrado aquí. Configura la URL en{" "}
          <Link href="/admin/campanas" className="font-bold underline">
            Campañas
          </Link>{" "}
          y el secreto <code className="rounded bg-white/70 px-1">PARSEUR_WEBHOOK_SECRET</code> en el
          servidor.
          {primeraCampana ? (
            <>
              {" "}
              Ejemplo:{" "}
              <code className="block mt-1 break-all rounded bg-white/70 px-2 py-1 text-xs">
                {buildParseurWebhookUrl(
                  primeraCampana.id,
                  typeof window !== "undefined" ? window.location.origin : undefined,
                )}
              </code>
            </>
          ) : null}
        </p>
      </div>

      {campanas.length ? (
        <form
          onSubmit={(event) => void handleSimular(event)}
          className="rounded-2xl border border-gabi-forest/10 bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-bold text-gabi-forest">Simular captura (sin Parseur)</p>
          <p className="mt-1 text-xs text-slate-500">
            Prueba el mismo flujo del webhook antes de conectar el mailbox.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block min-w-[160px] text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Campaña</span>
              <select
                value={simCampanaId}
                onChange={(event) => setSimCampanaId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                {campanas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-[140px] text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Nombre</span>
              <input
                value={simNombre}
                onChange={(event) => setSimNombre(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="Opcional"
              />
            </label>
            <label className="block min-w-[180px] text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Email</span>
              <input
                type="email"
                value={simEmail}
                onChange={(event) => setSimEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="Opcional"
              />
            </label>
            <label className="block min-w-[130px] text-sm">
              <span className="mb-1 block font-semibold text-slate-600">Teléfono</span>
              <input
                value={simTelefono}
                onChange={(event) => setSimTelefono(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="Opcional"
              />
            </label>
            <button
              type="submit"
              disabled={simulating || !simCampanaId}
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Simular lead
            </button>
          </div>
          {simMessage ? (
            <p className="mt-3 text-sm font-semibold text-emerald-800">{simMessage}</p>
          ) : null}
        </form>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value || "all"}
            type="button"
            onClick={() => setStatusFilter(item.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              statusFilter === item.value
                ? "bg-gabi-forest text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando logs…
          </div>
        ) : !logs.length ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            Sin eventos de captura para este desarrollo. Envía una prueba desde Parseur.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Campaña</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Lead</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {formatFecha(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${capturaLogStatusColor[log.status]}`}
                      >
                        {capturaLogStatusLabel[log.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.contactoHint ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{log.campanaNombre ?? "—"}</td>
                    <td className="max-w-xs px-4 py-3 text-xs text-slate-500">
                      {log.errorMessage ?? log.parseurDocumentId ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.prospectoId ? (
                        onOpenProspecto ? (
                          <button
                            type="button"
                            onClick={() => onOpenProspecto(log.prospectoId!)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-gabi-forest hover:underline"
                          >
                            Abrir lead
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        ) : (
                          <Link
                            href={`/admin/leads?desarrolloId=${desarrolloId}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-gabi-forest hover:underline"
                          >
                            Ver CRM
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

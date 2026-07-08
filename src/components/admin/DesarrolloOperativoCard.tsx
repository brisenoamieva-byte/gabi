"use client";

import { useState } from "react";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";

type DesarrolloOperativoCardProps = {
  desarrolloId: string;
  desarrolloNombre: string;
  catalogActivo: boolean;
  canManage: boolean;
  onUpdated: (activo: boolean) => void;
};

export function DesarrolloOperativoCard({
  desarrolloId,
  desarrolloNombre,
  catalogActivo,
  canManage,
  onUpdated,
}: DesarrolloOperativoCardProps) {
  const [activo, setActivo] = useState(catalogActivo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleToggle = async () => {
    const next = !activo;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/desarrollos/${encodeURIComponent(desarrolloId)}/operativo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: next }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar el desarrollo.");
      }

      setActivo(next);
      onUpdated(next);
      setSuccess(
        next
          ? `${desarrolloNombre} activado — CRM y notificaciones automáticas habilitadas.`
          : `${desarrolloNombre} pausado — sin crons, cadencia ni correos automáticos.`,
      );
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm ${
        activo ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/80"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Estado operativo
          </p>
          <p className="mt-1 text-sm font-black text-gabi-forest">
            {activo ? "Activo en GABI" : "Pausado"}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {activo
              ? "Playbook CRM, cadencia, digest de cumplimiento y notificaciones automáticas están habilitados."
              : "Sin automatizaciones: no se envían correos ni WhatsApp automáticos, ni recordatorios de cadencia."}
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleToggle()}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${
              activo ? "bg-amber-700 hover:bg-amber-800" : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : activo ? (
              <PauseCircle className="h-4 w-4" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {activo ? "Pausar desarrollo" : "Activar desarrollo"}
          </button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs font-semibold text-red-700">{error}</p> : null}
      {success ? <p className="mt-3 text-xs font-semibold text-emerald-800">{success}</p> : null}
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Sparkles, X } from "lucide-react";
import type { LeadScoreAction } from "@/lib/comercial/lead-activity-score";

type Props = {
  canEdit: boolean;
};

export function CrmLeadScoreActionsPanel({ canEdit }: Props) {
  const [actions, setActions] = useState<LeadScoreAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<LeadScoreAction | null>(null);
  const [draftPoints, setDraftPoints] = useState(0);
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/lead-score-actions?scope=lead");
      const data = (await response.json()) as { actions?: LeadScoreAction[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las acciones.");
      }
      setActions(data.actions ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (action: LeadScoreAction) => {
    if (!canEdit) {
      return;
    }
    setEditing(action);
    setDraftPoints(action.points);
    setDraftEnabled(action.enabled);
  };

  const saveEdit = async () => {
    if (!editing) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/lead-score-actions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          points: draftPoints,
          enabled: draftEnabled,
        }),
      });
      const data = (await response.json()) as { action?: LeadScoreAction; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }
      if (data.action) {
        setActions((current) =>
          current.map((item) => (item.id === data.action!.id ? data.action! : item)),
        );
      }
      setEditing(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-gabi-cream-dark bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-gabi-teal" />
          <div>
            <h2 className="text-sm font-bold text-gabi-forest">Acciones · Score de leads</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Añade el puntaje a las acciones que aumentan el score del prospecto. Cada señal
              (teléfono, WhatsApp, cita, cotización…) suma una sola vez. El total se muestra al
              asesor como guía de qué tan perfilado llegó el lead.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gabi-cream-dark bg-white px-4 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando acciones…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => (
            <article
              key={action.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                action.enabled
                  ? "border-gabi-cream-dark"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gabi-forest">{action.label}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{action.hint}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-[#201044] px-2.5 py-1 text-sm font-black text-white">
                  {action.points}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {action.enabled ? "Activa" : "Desactivada"}
                </span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => openEdit(action)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-gabi-forest transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-gabi-teal">
                  Editar acción
                </p>
                <h3 className="mt-1 text-base font-bold text-gabi-forest">{editing.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">{editing.hint}</p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-slate-500">Puntos</span>
              <input
                type="number"
                min={0}
                max={100}
                value={draftPoints}
                onChange={(event) => setDraftPoints(Number(event.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draftEnabled}
                onChange={(event) => setDraftEnabled(event.target.checked)}
                className="rounded border-slate-300"
              />
              Acción habilitada
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEdit()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#201044] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

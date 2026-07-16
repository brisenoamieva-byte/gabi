"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import {
  type CrmPlaybookConfig,
  type PlaybookActionKind,
  type PlaybookStep,
} from "@/lib/comercial/crm-playbook";
import {
  prospectoEtapaLabel,
  type ProspectoEtapa,
} from "@/lib/comercial/prospecto-etapas";
import { ETAPAS_ASESOR } from "@/lib/asesores/prospectos-client";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type CrmPlaybookAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  /** Embebido en Salud CRM (sin título ni selector de desarrollo). */
  embedded?: boolean;
};

const ACTION_KINDS: Array<{ value: PlaybookActionKind; label: string }> = [
  { value: "manual", label: "Manual" },
  { value: "contacto", label: "Contacto" },
  { value: "recorrido", label: "Recorrido" },
  { value: "cotizacion", label: "Cotización" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

const pilotDesarrollos = (desarrollos: Desarrollo[]) => desarrollos;

export function CrmPlaybookAdminPanel({
  desarrollos,
  scopeLabel,
  embedded = false,
}: CrmPlaybookAdminPanelProps) {
  const options = pilotDesarrollos(desarrollos);
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(options);
  const [config, setConfig] = useState<CrmPlaybookConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadConfig = useCallback(async () => {
    if (!desarrolloId) {
      setConfig(null);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/crm-playbook?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as { config?: CrmPlaybookConfig; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el playbook.");
      }

      setConfig(data.config ?? null);
    } catch (loadError) {
      setConfig(null);
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const patchStep = (index: number, patch: Partial<PlaybookStep>) => {
    setConfig((prev) => {
      if (!prev) {
        return prev;
      }
      const steps = [...prev.steps];
      steps[index] = { ...steps[index], ...patch };
      return { ...prev, steps };
    });
  };

  const addStep = () => {
    setConfig((prev) => {
      if (!prev) {
        return prev;
      }
      const order = (prev.steps.at(-1)?.order ?? 0) + 10;
      const step: PlaybookStep = {
        id: `paso-${Date.now()}`,
        etapa: "nuevo",
        label: "Nuevo paso",
        kind: "manual",
        required: true,
        order,
      };
      return { ...prev, steps: [...prev.steps, step] };
    });
  };

  const removeStep = (index: number) => {
    setConfig((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, steps: prev.steps.filter((_, itemIndex) => itemIndex !== index) };
    });
  };

  const handleSave = async () => {
    if (!config) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/crm-playbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId: config.desarrolloId,
          enabled: config.enabled,
          blockEtapa: config.blockEtapa,
          steps: config.steps,
        }),
      });

      const data = (await response.json()) as { config?: CrmPlaybookConfig; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      setConfig(data.config ?? config);
      setSuccess("Playbook guardado.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (!options.length) {
    return (
      <p className="text-sm text-slate-500">
        No hay desarrollos en tu alcance.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {embedded ? (
        <p className="text-sm text-slate-600">Pasos obligatorios por etapa.</p>
      ) : (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              CRM playbook
            </p>
            <h1 className="text-2xl font-black text-gabi-forest">Siguiente paso por etapa</h1>
            {scopeLabel ? <p className="mt-1 text-sm text-slate-500">{scopeLabel}</p> : null}
          </div>

          <label className="block max-w-md text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo piloto</span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className={inputClass}
            >
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando playbook…
        </div>
      ) : null}

      {config && !loading ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(event) => setConfig({ ...config, enabled: event.target.checked })}
              />
              Playbook activo
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.blockEtapa}
                onChange={(event) => setConfig({ ...config, blockEtapa: event.target.checked })}
              />
              Bloquear cambio de etapa (Fase 2)
            </label>
          </div>

          <div className="space-y-3">
            {config.steps.map((step, index) => (
              <div
                key={step.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-gabi-forest">Paso {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">Etapa</span>
                    <select
                      value={step.etapa}
                      onChange={(event) =>
                        patchStep(index, { etapa: event.target.value as ProspectoEtapa })
                      }
                      className={inputClass}
                    >
                      {ETAPAS_ASESOR.map((etapa) => (
                        <option key={etapa} value={etapa}>
                          {prospectoEtapaLabel[etapa]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">Tipo</span>
                    <select
                      value={step.kind}
                      onChange={(event) =>
                        patchStep(index, { kind: event.target.value as PlaybookActionKind })
                      }
                      className={inputClass}
                    >
                      {ACTION_KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block font-semibold text-slate-600">Label</span>
                    <input
                      value={step.label}
                      onChange={(event) => patchStep(index, { label: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block font-semibold text-slate-600">Hint</span>
                    <input
                      value={step.hint ?? ""}
                      onChange={(event) => patchStep(index, { hint: event.target.value })}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">Orden</span>
                    <input
                      type="number"
                      value={step.order}
                      onChange={(event) =>
                        patchStep(index, { order: Number(event.target.value) || 0 })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={step.required}
                      onChange={(event) => patchStep(index, { required: event.target.checked })}
                    />
                    Requerido para avanzar etapa
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700"
            >
              <Plus className="h-4 w-4" />
              Agregar paso
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar playbook
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

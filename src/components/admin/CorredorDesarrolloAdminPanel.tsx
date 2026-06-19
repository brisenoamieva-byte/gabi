"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { nuboEditorFetch } from "@/lib/estudios/nubo-editor-client";
import type { CorredorDesarrolloEditableOverrides } from "@/lib/corredor/overrides-types";

const inputClass =
  "w-full rounded-xl border border-gabi-forest/10 px-3 py-2 text-sm text-gabi-ink outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const textareaClass =
  "w-full min-h-[88px] rounded-xl border border-gabi-forest/10 px-3 py-2 text-sm leading-relaxed text-gabi-ink outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-gabi-forest/8 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-gabi-forest">{title}</h3>
      {children}
    </section>
  );
}

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function listToLines(items: readonly string[] | undefined): string {
  return items?.join("\n") ?? "";
}

function numOrEmpty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function parseRequiredNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

function parseNullableNumber(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : undefined;
}

type Props = {
  desarrolloId: string;
  titulo: string;
};

export function CorredorDesarrolloAdminPanel({ desarrolloId, titulo }: Props) {
  const [editable, setEditable] = useState<CorredorDesarrolloEditableOverrides | null>(null);
  const [hasOverrides, setHasOverrides] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await nuboEditorFetch(`/api/admin/corredor/${desarrolloId}`);
      const data = (await res.json()) as {
        editable?: CorredorDesarrolloEditableOverrides;
        meta?: { hasOverrides?: boolean };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar");
      setEditable(data.editable ?? null);
      setHasOverrides(Boolean(data.meta?.hasOverrides));
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (patchFn: (prev: CorredorDesarrolloEditableOverrides) => CorredorDesarrolloEditableOverrides) => {
    setEditable((prev) => (prev ? patchFn(prev) : prev));
    setDirty(true);
    setSuccess("");
  };

  const handleSave = async () => {
    if (!editable) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await nuboEditorFetch(`/api/admin/corredor/${desarrolloId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editable }),
      });
      const data = (await res.json()) as { error?: string; meta?: { hasOverrides?: boolean } };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setHasOverrides(Boolean(data.meta?.hasOverrides));
      setDirty(false);
      setSuccess("Cambios publicados. Recarga /corredor para verlos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "¿Restaurar datos del seed estático? Se perderán los overrides en Supabase para este desarrollo.",
      )
    ) {
      return;
    }
    setResetting(true);
    setError("");
    setSuccess("");
    try {
      const res = await nuboEditorFetch(`/api/admin/corredor/${desarrolloId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = (await res.json()) as {
        editable?: CorredorDesarrolloEditableOverrides;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo restaurar");
      setEditable(data.editable ?? null);
      setHasOverrides(false);
      setDirty(false);
      setSuccess("Restaurado al catálogo estático.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al restaurar");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando editor…
      </div>
    );
  }

  if (!editable) {
    return <p className="text-sm text-red-600">{error || "No se pudo cargar el desarrollo."}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gabi-forest">{titulo}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {hasOverrides ? "Publicado en Supabase" : "Usando seed estático"} ·{" "}
            <Link
              href={`/corredor/${desarrolloId}`}
              target="_blank"
              className="inline-flex items-center gap-1 font-semibold text-gabi-forest hover:underline"
            >
              Ver ficha <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting || !hasOverrides}
            className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/15 px-4 py-2 text-sm font-semibold text-gabi-forest disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar seed
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publicar
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <Section title="Visibilidad">
        <div className="flex flex-wrap gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(editable.oculto)}
              onChange={(e) => patch((prev) => ({ ...prev, oculto: e.target.checked }))}
            />
            Ocultar del hub /corredor
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(editable.destacado)}
              onChange={(e) => patch((prev) => ({ ...prev, destacado: e.target.checked }))}
            />
            Destacado
          </label>
        </div>
      </Section>

      <Section title="Mercado">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Lote mín (m²)">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.loteMinM2)}
              onChange={(e) =>
                patch((prev) => ({ ...prev, loteMinM2: parseRequiredNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Lote máx (m²)">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.loteMaxM2)}
              onChange={(e) =>
                patch((prev) => ({ ...prev, loteMaxM2: parseRequiredNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Precio mín ($/m²)">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.precioMinM2)}
              onChange={(e) =>
                patch((prev) => ({ ...prev, precioMinM2: parseRequiredNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Precio máx ($/m²)">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.precioMaxM2)}
              onChange={(e) =>
                patch((prev) => ({ ...prev, precioMaxM2: parseRequiredNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Ticket desde">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.ticketDesde)}
              onChange={(e) =>
                patch((prev) => ({ ...prev, ticketDesde: parseRequiredNumber(e.target.value) }))
              }
            />
          </Field>
          <Field label="Absorción (lotes/mes)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={numOrEmpty(editable.absorcionMes)}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  absorcionMes: parseNullableNumber(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Total lotes">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.totalLotes)}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  totalLotes: parseNullableNumber(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Enganche (%)">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.enganchePct)}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  enganchePct: parseNullableNumber(e.target.value),
                }))
              }
            />
          </Field>
          <Field label="Plazo (meses)">
            <input
              type="number"
              className={inputClass}
              value={numOrEmpty(editable.plazoMeses)}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  plazoMeses: parseNullableNumber(e.target.value),
                }))
              }
            />
          </Field>
        </div>
      </Section>

      <Section title="Ventas">
        <div className="space-y-4">
          <Field label="Guía asesor">
            <textarea
              className={textareaClass}
              value={editable.guiaAsesor ?? ""}
              onChange={(e) => patch((prev) => ({ ...prev, guiaAsesor: e.target.value }))}
            />
          </Field>
          <Field label="Notas">
            <textarea
              className={textareaClass}
              value={editable.notas ?? ""}
              onChange={(e) => patch((prev) => ({ ...prev, notas: e.target.value }))}
            />
          </Field>
          <Field label="Argumentos de venta (uno por línea)">
            <textarea
              className={textareaClass}
              value={listToLines(editable.argumentosVenta)}
              onChange={(e) =>
                patch((prev) => ({ ...prev, argumentosVenta: linesToList(e.target.value) }))
              }
            />
          </Field>
          <Field label="Amenidades (una por línea)">
            <textarea
              className={textareaClass}
              value={listToLines(editable.amenidades)}
              onChange={(e) =>
                patch((prev) => ({ ...prev, amenidades: linesToList(e.target.value) }))
              }
            />
          </Field>
        </div>
      </Section>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { nuboEditorFetch } from "@/lib/estudios/nubo-editor-client";
import type { PropuestaEditableOverrides } from "@/lib/propuestas/overrides-types";
import type { PropuestaEstado } from "@/lib/propuestas/types";

const inputClass =
  "w-full rounded-xl border border-gabi-forest/10 px-3 py-2 text-sm text-gabi-ink outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const textareaClass =
  "w-full min-h-[88px] rounded-xl border border-gabi-forest/10 px-3 py-2 text-sm leading-relaxed text-gabi-ink outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const ESTADOS: PropuestaEstado[] = ["borrador", "enviada", "firmada", "archivada"];

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

function listToLines(items: readonly string[]): string {
  return items.join("\n");
}

type Props = {
  slug: string;
  titulo: string;
};

export function PropuestaComercialAdminPanel({ slug, titulo }: Props) {
  const [editable, setEditable] = useState<PropuestaEditableOverrides | null>(null);
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
      const res = await nuboEditorFetch(`/api/admin/propuestas/${slug}`);
      const data = (await res.json()) as {
        editable?: PropuestaEditableOverrides;
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
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (patchFn: (prev: PropuestaEditableOverrides) => PropuestaEditableOverrides) => {
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
      const res = await nuboEditorFetch(`/api/admin/propuestas/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editable }),
      });
      const data = (await res.json()) as { error?: string; meta?: { hasOverrides?: boolean } };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setHasOverrides(Boolean(data.meta?.hasOverrides));
      setDirty(false);
      setSuccess("Cambios publicados. Recarga la propuesta para verlos.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("¿Restaurar textos generados desde código? Se perderán los overrides en Supabase.")) {
      return;
    }
    setResetting(true);
    setError("");
    setSuccess("");
    try {
      const res = await nuboEditorFetch(`/api/admin/propuestas/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = (await res.json()) as {
        editable?: PropuestaEditableOverrides;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo restaurar");
      setEditable(data.editable ?? null);
      setHasOverrides(false);
      setDirty(false);
      setSuccess("Restaurado al contenido generado.");
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
    return <p className="text-sm text-red-600">{error || "No se pudo cargar la propuesta."}</p>;
  }

  const meta = editable.meta ?? {};
  const narrativa = editable.narrativa ?? {};
  const propuestaBbr = editable.propuestaBbr ?? {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Propuestas comerciales
          </p>
          <h2 className="text-2xl font-black text-gabi-forest">{titulo}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Edita portada, narrativa y condiciones BBR. Lotes y escenario financiero siguen en el
            archivo generado (<code>*.generated.ts</code>).
            {hasOverrides ? (
              <span className="ml-1 font-semibold text-emerald-700">· Overrides activos</span>
            ) : (
              <span className="ml-1 text-slate-400">· Sin overrides (solo código)</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/propuestas/${slug}`}
            target="_blank"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gabi-forest/15 bg-white px-4 text-sm font-semibold text-gabi-forest hover:bg-gabi-cream"
          >
            <ExternalLink className="h-4 w-4" />
            Ver propuesta
          </Link>
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting || saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || saving || resetting}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publicar
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
          {success}
        </p>
      ) : null}

      <Section title="Estado y portada">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Estado">
            <select
              className={inputClass}
              value={editable.estado ?? "borrador"}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  estado: event.target.value as PropuestaEstado,
                }))
              }
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input
              className={inputClass}
              value={meta.fecha ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, fecha: event.target.value },
                }))
              }
            />
          </Field>
          <Field label="Título">
            <input
              className={inputClass}
              value={meta.titulo ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, titulo: event.target.value },
                }))
              }
            />
          </Field>
          <Field label="Subtítulo">
            <input
              className={inputClass}
              value={meta.subtitulo ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, subtitulo: event.target.value },
                }))
              }
            />
          </Field>
          <Field label="Ubicación">
            <input
              className={inputClass}
              value={meta.ubicacion ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, ubicacion: event.target.value },
                }))
              }
            />
          </Field>
          <Field label="Desarrollador">
            <input
              className={inputClass}
              value={meta.desarrollador ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, desarrollador: event.target.value },
                }))
              }
            />
          </Field>
          <Field label="Preparado para">
            <input
              className={inputClass}
              value={meta.preparadoPara ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, preparadoPara: event.target.value },
                }))
              }
            />
          </Field>
          <Field label="Elaborado por">
            <input
              className={inputClass}
              value={meta.elaboradoPor ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, elaboradoPor: event.target.value },
                }))
              }
            />
          </Field>
          <Field label="Clasificación">
            <input
              className={inputClass}
              value={meta.clasificacion ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  meta: { ...prev.meta, clasificacion: event.target.value },
                }))
              }
            />
          </Field>
        </div>
      </Section>

      <Section title="Narrativa comercial">
        <Field label="Quiénes somos">
          <textarea
            className={textareaClass}
            value={narrativa.quienesSomos ?? ""}
            onChange={(event) =>
              patch((prev) => ({
                ...prev,
                narrativa: { ...prev.narrativa, quienesSomos: event.target.value },
              }))
            }
          />
        </Field>
        <Field label="Estrategia (una línea por bullet)">
          <textarea
            className={textareaClass}
            value={listToLines(narrativa.estrategia ?? [])}
            onChange={(event) =>
              patch((prev) => ({
                ...prev,
                narrativa: {
                  ...prev.narrativa,
                  estrategia: linesToList(event.target.value),
                },
              }))
            }
          />
        </Field>
        <Field label="Clasificación de lotes">
          <textarea
            className={textareaClass}
            value={narrativa.clasificacionLotes ?? ""}
            onChange={(event) =>
              patch((prev) => ({
                ...prev,
                narrativa: { ...prev.narrativa, clasificacionLotes: event.target.value },
              }))
            }
          />
        </Field>
      </Section>

      <Section title="Propuesta BBR">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Comisión (%)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={propuestaBbr.comision ?? 0}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  propuestaBbr: {
                    ...prev.propuestaBbr,
                    comision: Number(event.target.value),
                  },
                }))
              }
            />
          </Field>
          <Field label="Comisión venta directa (%)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={propuestaBbr.comisionVentaDirecta ?? 0}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  propuestaBbr: {
                    ...prev.propuestaBbr,
                    comisionVentaDirecta: Number(event.target.value),
                  },
                }))
              }
            />
          </Field>
          <Field label="Comisión inmobiliaria (%)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={propuestaBbr.comisionInmobiliaria ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  propuestaBbr: {
                    ...prev.propuestaBbr,
                    comisionInmobiliaria: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  },
                }))
              }
            />
          </Field>
          <Field label="Meses construcción">
            <input
              type="number"
              className={inputClass}
              value={propuestaBbr.mesesConstruccion ?? 0}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  propuestaBbr: {
                    ...prev.propuestaBbr,
                    mesesConstruccion: Number(event.target.value),
                  },
                }))
              }
            />
          </Field>
          <Field label="Pago de comisión">
            <input
              className={inputClass}
              value={propuestaBbr.pagoComision ?? ""}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  propuestaBbr: {
                    ...prev.propuestaBbr,
                    pagoComision: event.target.value,
                  },
                }))
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-gabi-ink">
            <input
              type="checkbox"
              checked={Boolean(propuestaBbr.exclusiva)}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  propuestaBbr: {
                    ...prev.propuestaBbr,
                    exclusiva: event.target.checked,
                  },
                }))
              }
            />
            Exclusiva
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-gabi-ink">
            <input
              type="checkbox"
              checked={Boolean(propuestaBbr.iva)}
              onChange={(event) =>
                patch((prev) => ({
                  ...prev,
                  propuestaBbr: {
                    ...prev.propuestaBbr,
                    iva: event.target.checked,
                  },
                }))
              }
            />
            IVA en comisión
          </label>
        </div>
        <Field label="Equipo (una línea por persona o rol)">
          <textarea
            className={textareaClass}
            value={listToLines(propuestaBbr.equipo ?? [])}
            onChange={(event) =>
              patch((prev) => ({
                ...prev,
                propuestaBbr: {
                  ...prev.propuestaBbr,
                  equipo: linesToList(event.target.value),
                },
              }))
            }
          />
        </Field>
      </Section>
    </div>
  );
}

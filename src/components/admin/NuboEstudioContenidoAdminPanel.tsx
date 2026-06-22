"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { nuboEditorFetch } from "@/lib/estudios/nubo-editor-client";
import { ConsultoriaMarcaSelector } from "@/components/brand/ConsultoriaMarcaSelector";
import { resolveConsultoriaMarca } from "@/lib/brand/consultoria-marca";
import type { NuboEstudioContenido, NuboEstudioPublishMeta } from "@/lib/estudios/nubo-estudio-types";

const inputClass =
  "w-full rounded-xl border border-gabi-forest/10 px-3 py-2 text-sm text-gabi-ink outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const textareaClass =
  "w-full min-h-[80px] rounded-xl border border-gabi-forest/10 px-3 py-2 text-sm leading-relaxed text-gabi-ink outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
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
  onSaved?: () => void;
};

export function NuboEstudioContenidoAdminPanel({ onSaved }: Props) {
  const [contenido, setContenido] = useState<NuboEstudioContenido | null>(null);
  const [publishMeta, setPublishMeta] = useState<NuboEstudioPublishMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/contenido");
      const data = (await res.json()) as {
        contenido?: NuboEstudioContenido;
        meta?: NuboEstudioPublishMeta;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar");
      setContenido(data.contenido ?? null);
      setPublishMeta(data.meta ?? null);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (patchFn: (prev: NuboEstudioContenido) => NuboEstudioContenido) => {
    setContenido((prev) => (prev ? patchFn(prev) : prev));
    setDirty(true);
    setSuccess("");
  };

  const handleSave = async () => {
    if (!contenido) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/contenido", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });
      const data = (await res.json()) as {
        contenido?: NuboEstudioContenido;
        meta?: NuboEstudioPublishMeta;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      if (data.meta?.origin !== "supabase" || !data.meta.contenidoPublicado) {
        throw new Error(
          "No se pudo confirmar la publicación del contenido en Supabase. Revisa SUPABASE_SERVICE_ROLE_KEY y la migración 030.",
        );
      }
      setContenido(data.contenido ?? contenido);
      setPublishMeta(data.meta ?? null);
      setDirty(false);
      setSuccess(
        `Textos publicados. Recarga /estudios/nubo para verlos (${new Date(data.meta.updatedAt).toLocaleString("es-MX")}).`,
      );
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("¿Restaurar todos los textos al archivo base del código?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/contenido", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: "contenido" }),
      });
      const data = (await res.json()) as {
        contenido?: NuboEstudioContenido;
        meta?: NuboEstudioPublishMeta;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo restaurar");
      setContenido(data.contenido ?? null);
      setPublishMeta(data.meta ?? null);
      setDirty(false);
      setSuccess("Textos restaurados.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al restaurar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gabi-forest/8 bg-white p-8 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando textos…
      </div>
    );
  }

  if (!contenido) {
    return (
      <div className="space-y-4 rounded-2xl border border-gabi-forest/8 bg-white p-8">
        <p className="text-sm text-red-700">{error || "No se pudieron cargar los textos."}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-gabi-forest/15 px-4 py-2 text-sm font-semibold text-gabi-forest"
          >
            Reintentar
          </button>
          <Link
            href="/admin/estudios-nubo"
            className="rounded-xl bg-gabi-forest px-4 py-2 text-sm font-semibold text-white"
          >
            Volver a entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleReset()}
          disabled={saving}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar textos
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white hover:bg-gabi-forest-light disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Publicar textos
        </button>
      </div>

      {publishMeta ? (
        <p className="text-xs text-slate-500">
          Origen:{" "}
        {publishMeta?.origin === "supabase" ?
            `publicado en Supabase · ${new Date(publishMeta.updatedAt).toLocaleString("es-MX")}`
          : publishMeta?.contenidoPublicado ?
            `textos en Supabase · ${new Date(publishMeta.updatedAt).toLocaleString("es-MX")}`
          : "archivo base del código (aún no publicado en Supabase)"}
          {dirty ? " · hay cambios sin guardar" : null}
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Portada">
          <ConsultoriaMarcaSelector
            value={resolveConsultoriaMarca(contenido.meta.presentacionMarca)}
            onChange={(presentacionMarca) =>
              patch((p) => ({ ...p, meta: { ...p.meta, presentacionMarca } }))
            }
          />
          <Field label="Título">
            <input
              className={inputClass}
              value={contenido.meta.titulo}
              onChange={(e) => patch((p) => ({ ...p, meta: { ...p.meta, titulo: e.target.value } }))}
            />
          </Field>
          <Field label="Subtítulo">
            <input
              className={inputClass}
              value={contenido.meta.subtitulo}
              onChange={(e) =>
                patch((p) => ({ ...p, meta: { ...p.meta, subtitulo: e.target.value } }))
              }
            />
          </Field>
          <Field label="Ubicación">
            <input
              className={inputClass}
              value={contenido.meta.ubicacion}
              onChange={(e) =>
                patch((p) => ({ ...p, meta: { ...p.meta, ubicacion: e.target.value } }))
              }
            />
          </Field>
          <Field label="Fecha">
            <input
              className={inputClass}
              value={contenido.meta.fecha}
              onChange={(e) => patch((p) => ({ ...p, meta: { ...p.meta, fecha: e.target.value } }))}
            />
          </Field>
        </Section>

        <Section title="Diagnóstico">
          <Field label="Título">
            <input
              className={inputClass}
              value={contenido.diagnostico.titulo}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  diagnostico: { ...p.diagnostico, titulo: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Contexto">
            <textarea
              className={textareaClass}
              value={contenido.diagnostico.contexto}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  diagnostico: { ...p.diagnostico, contexto: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Escenario comercial">
            <textarea
              className={textareaClass}
              value={contenido.diagnostico.escenario}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  diagnostico: { ...p.diagnostico, escenario: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Cierre">
            <textarea
              className={textareaClass}
              value={contenido.diagnostico.cierre}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  diagnostico: { ...p.diagnostico, cierre: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Caption mapa ubicación">
            <textarea
              className={textareaClass}
              value={contenido.planos.ubicacionSitio}
              onChange={(e) =>
                patch((p) => ({ ...p, planos: { ubicacionSitio: e.target.value } }))
              }
            />
          </Field>
        </Section>

        <Section title="Tarjetas · 4 condiciones">
          {contenido.condiciones.map((c, index) => (
            <div key={c.num} className="space-y-2 rounded-xl border border-slate-100 p-3">
              <p className="text-xs font-bold text-slate-400">{c.num}</p>
              <Field label="Título">
                <input
                  className={inputClass}
                  value={c.titulo}
                  onChange={(e) =>
                    patch((p) => {
                      const condiciones = [...p.condiciones];
                      condiciones[index] = { ...condiciones[index], titulo: e.target.value };
                      return { ...p, condiciones };
                    })
                  }
                />
              </Field>
              <Field label="Detalle">
                <textarea
                  className={textareaClass}
                  value={c.detalle}
                  onChange={(e) =>
                    patch((p) => {
                      const condiciones = [...p.condiciones];
                      condiciones[index] = { ...condiciones[index], detalle: e.target.value };
                      return { ...p, condiciones };
                    })
                  }
                />
              </Field>
            </div>
          ))}
        </Section>

        <Section title="01 · Acceso">
          <Field label="Hoy">
            <textarea
              className={textareaClass}
              value={contenido.accesos.hoy}
              onChange={(e) =>
                patch((p) => ({ ...p, accesos: { ...p.accesos, hoy: e.target.value } }))
              }
            />
          </Field>
          <Field label="Recomendación BBR">
            <textarea
              className={textareaClass}
              value={contenido.accesos.recomendacion}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  accesos: { ...p.accesos, recomendacion: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Para arrancar (un renglón por bullet)">
            <textarea
              className={textareaClass}
              value={listToLines(contenido.accesos.paraArrancar)}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  accesos: { ...p.accesos, paraArrancar: linesToList(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Ubicación en plano">
            <textarea
              className={textareaClass}
              value={contenido.accesos.ubicacionEnPlano}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  accesos: { ...p.accesos, ubicacionEnPlano: e.target.value },
                }))
              }
            />
          </Field>
        </Section>

        <Section title="02 · Hotel Taboada">
          <Field label="Hoy">
            <textarea
              className={textareaClass}
              value={contenido.hotel.hoy}
              onChange={(e) =>
                patch((p) => ({ ...p, hotel: { ...p.hotel, hoy: e.target.value } }))
              }
            />
          </Field>
          <Field label="Recomendación BBR">
            <textarea
              className={textareaClass}
              value={contenido.hotel.recomendacion}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  hotel: { ...p.hotel, recomendacion: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Para arrancar (un renglón por bullet)">
            <textarea
              className={textareaClass}
              value={listToLines(contenido.hotel.paraArrancar)}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  hotel: { ...p.hotel, paraArrancar: linesToList(e.target.value) },
                }))
              }
            />
          </Field>
          <Field label="Caption foto actual">
            <textarea
              className={textareaClass}
              value={contenido.hotel.fotoActualCaption}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  hotel: { ...p.hotel, fotoActualCaption: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Ubicación en plano">
            <textarea
              className={textareaClass}
              value={contenido.hotel.ubicacionEnPlano}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  hotel: { ...p.hotel, ubicacionEnPlano: e.target.value },
                }))
              }
            />
          </Field>
        </Section>

        <Section title="03 · Restaurante">
          <Field label="Hoy">
            <textarea
              className={textareaClass}
              value={contenido.restaurante.hoy}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  restaurante: { ...p.restaurante, hoy: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Recomendación BBR">
            <textarea
              className={textareaClass}
              value={contenido.restaurante.recomendacion}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  restaurante: { ...p.restaurante, recomendacion: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Para arrancar (un renglón por bullet)">
            <textarea
              className={textareaClass}
              value={listToLines(contenido.restaurante.paraArrancar)}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  restaurante: {
                    ...p.restaurante,
                    paraArrancar: linesToList(e.target.value),
                  },
                }))
              }
            />
          </Field>
          <Field label="Ubicación en plano">
            <textarea
              className={textareaClass}
              value={contenido.restaurante.ubicacionEnPlano}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  restaurante: { ...p.restaurante, ubicacionEnPlano: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Look & feel (texto)">
            <textarea
              className={textareaClass}
              value={contenido.restaurante.lookAndFeel}
              onChange={(e) =>
                patch((p) => ({
                  ...p,
                  restaurante: { ...p.restaurante, lookAndFeel: e.target.value },
                }))
              }
            />
          </Field>
          {contenido.restaurante.referenciasConcepto.map((ref, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-slate-100 p-3">
              <Field label={`Referencia ${index + 1} · nombre`}>
                <input
                  className={inputClass}
                  value={ref.nombre}
                  onChange={(e) =>
                    patch((p) => {
                      const referenciasConcepto = [...p.restaurante.referenciasConcepto];
                      referenciasConcepto[index] = {
                        ...referenciasConcepto[index],
                        nombre: e.target.value,
                      };
                      return {
                        ...p,
                        restaurante: { ...p.restaurante, referenciasConcepto },
                      };
                    })
                  }
                />
              </Field>
              <Field label="Detalle">
                <textarea
                  className={textareaClass}
                  value={ref.detalle}
                  onChange={(e) =>
                    patch((p) => {
                      const referenciasConcepto = [...p.restaurante.referenciasConcepto];
                      referenciasConcepto[index] = {
                        ...referenciasConcepto[index],
                        detalle: e.target.value,
                      };
                      return {
                        ...p,
                        restaurante: { ...p.restaurante, referenciasConcepto },
                      };
                    })
                  }
                />
              </Field>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

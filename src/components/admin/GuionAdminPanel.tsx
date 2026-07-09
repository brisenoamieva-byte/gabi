"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type { RecorridoContenido } from "@/lib/catalog/recorrido-content";
import {
  contenidoToForm,
  formToContenido,
  type RecorridoContenidoForm,
} from "@/lib/catalog/recorrido-content-editor";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";
import { GuionPoisEditor } from "@/components/admin/GuionPoisEditor";
import { GuionTecnicasCierreEditor } from "@/components/admin/GuionTecnicasCierreEditor";
import { ProductoCatalogAdminPanel } from "@/components/admin/ProductoCatalogAdminPanel";

type GuionAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({ title, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-black uppercase tracking-[0.16em] text-[#13315C]">
        {title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
  hint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function GuionAdminPanel({ desarrollos, scopeLabel }: GuionAdminPanelProps) {
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos);
  const [form, setForm] = useState<RecorridoContenidoForm | null>(null);
  const [baseContent, setBaseContent] = useState<RecorridoContenido | null>(null);
  const [hubHeroImage, setHubHeroImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingHubHero, setSavingHubHero] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const patchForm = (patch: Partial<RecorridoContenidoForm>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const loadContenido = useCallback(async () => {
    if (!desarrolloId) {
      setForm(null);
      setBaseContent(null);
      setHubHeroImage("");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const [guionResponse, hubResponse] = await Promise.all([
        fetch(`/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/recorrido-contenido`),
        fetch(`/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/hub-hero`),
      ]);
      const data = (await guionResponse.json()) as {
        recorridoContenido?: RecorridoContenido;
        error?: string;
      };
      const hubData = (await hubResponse.json()) as {
        hubHeroImage?: string | null;
        error?: string;
      };

      if (!guionResponse.ok) {
        throw new Error(data.error ?? "No se pudo cargar el guion.");
      }

      const content = data.recorridoContenido;
      if (!content) {
        throw new Error("Sin contenido de recorrido.");
      }

      setBaseContent(content);
      setForm(contenidoToForm(content));
      setHubHeroImage(hubResponse.ok ? hubData.hubHeroImage ?? "" : "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
      setForm(null);
      setBaseContent(null);
      setHubHeroImage("");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadContenido();
  }, [loadContenido]);

  const saveContenido = async () => {
    if (!form || !baseContent || !desarrolloId) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const recorridoContenido = formToContenido(form, baseContent);
      const response = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/recorrido-contenido`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recorridoContenido }),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      setSuccess("Guion comercial actualizado.");
      await loadContenido();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const saveHubHero = async () => {
    if (!desarrolloId) {
      return;
    }

    setSavingHubHero(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/hub-hero`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hubHeroImage: hubHeroImage.trim() || null }),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la portada.");
      }

      setSuccess("Portada del hub actualizada.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSavingHubHero(false);
    }
  };

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados para editar el guion comercial.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
          Recorrido comercial
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#13315C]">Guion por desarrollo</h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-[#13315C]/5 px-3 py-1 text-xs font-semibold text-[#13315C]">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Edita textos, imágenes, puntos del mapa y técnicas de cierre del recorrido comercial. Todo
          se guarda en el catálogo sin necesidad de código ni deploy.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-[240px]">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Desarrollo
            </span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="input-cotizador"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={saving || loading || !form}
            onClick={() => void saveContenido()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#13315C] px-5 text-sm font-black text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar guion
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando guion...
        </div>
      ) : form ? (
        <div className="space-y-5">
          <Section title="1 · Zona y ubicación">
            <Field label="Título">
              <input
                value={form.zonaTitulo}
                onChange={(event) => patchForm({ zonaTitulo: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="Subtítulo">
              <input
                value={form.zonaSubtitulo}
                onChange={(event) => patchForm({ zonaSubtitulo: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="Centro / referencia">
              <input
                value={form.zonaCentro}
                onChange={(event) => patchForm({ zonaCentro: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="Dirección">
              <input
                value={form.zonaDireccion}
                onChange={(event) => patchForm({ zonaDireccion: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="URL embed mapa" className="sm:col-span-2">
              <input
                value={form.zonaMapaEmbedUrl}
                onChange={(event) => patchForm({ zonaMapaEmbedUrl: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="URL Google Maps" className="sm:col-span-2">
              <input
                value={form.zonaMapaUrl}
                onChange={(event) => patchForm({ zonaMapaUrl: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="Guion para asesor" className="sm:col-span-2">
              <textarea
                value={form.zonaMensajeAsesor}
                onChange={(event) => patchForm({ zonaMensajeAsesor: event.target.value })}
                className="input-cotizador min-h-24"
              />
            </Field>
          </Section>

          <Section title="Mapa · Puntos de interés">
            <GuionPoisEditor
              puntos={form.puntosCercanos}
              categoriasOrden={form.zonaCategoriasOrden}
              onPuntosChange={(puntos) => patchForm({ puntosCercanos: puntos })}
              onCategoriasOrdenChange={(zonaCategoriasOrden) => patchForm({ zonaCategoriasOrden })}
            />
          </Section>

          <Section title="2 · Desarrollador">
            <Field label="Título">
              <input
                value={form.desarrolladorTitulo}
                onChange={(event) => patchForm({ desarrolladorTitulo: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="Subtítulo">
              <input
                value={form.desarrolladorSubtitulo}
                onChange={(event) => patchForm({ desarrolladorSubtitulo: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <AdminImageUploadField
              label="Logo desarrollador"
              className="sm:col-span-2"
              value={form.desarrolladorLogoPath}
              onChange={(url) => patchForm({ desarrolladorLogoPath: url })}
              kind="recorrido-desarrollador-logo"
              desarrolloId={desarrolloId}
              hint="Slide «Desarrollador» del recorrido."
            />
            <Field label="Historia" className="sm:col-span-2">
              <textarea
                value={form.desarrolladorHistoria}
                onChange={(event) => patchForm({ desarrolladorHistoria: event.target.value })}
                className="input-cotizador min-h-28"
              />
            </Field>
            <Field label="Frase asesor" className="sm:col-span-2">
              <textarea
                value={form.desarrolladorFraseAsesor}
                onChange={(event) => patchForm({ desarrolladorFraseAsesor: event.target.value })}
                className="input-cotizador min-h-20"
              />
            </Field>
            <Field
              label="Métricas"
              className="sm:col-span-2"
              hint="Una por línea: valor|etiqueta. Ej: +30|años de experiencia"
            >
              <textarea
                value={form.desarrolladorMetricas}
                onChange={(event) => patchForm({ desarrolladorMetricas: event.target.value })}
                className="input-cotizador min-h-24 font-mono text-sm"
              />
            </Field>
            <Field label="Respaldo" className="sm:col-span-2" hint="Un ítem por línea">
              <textarea
                value={form.desarrolladorRespaldo}
                onChange={(event) => patchForm({ desarrolladorRespaldo: event.target.value })}
                className="input-cotizador min-h-24"
              />
            </Field>
          </Section>

          <Section title="3 · Desarrollo">
            <Field label="Título">
              <input
                value={form.overviewTitulo}
                onChange={(event) => patchForm({ overviewTitulo: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="Subtítulo">
              <input
                value={form.overviewSubtitulo}
                onChange={(event) => patchForm({ overviewSubtitulo: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <AdminImageUploadField
              label="Logo desarrollo"
              className="sm:col-span-2"
              value={form.overviewLogoPath}
              onChange={(url) => patchForm({ overviewLogoPath: url })}
              kind="recorrido-overview-logo"
              desarrolloId={desarrolloId}
              hint="Slide «Desarrollo» del recorrido."
            />
            <AdminImageUploadField
              label="Master plan"
              className="sm:col-span-2"
              value={form.overviewMasterPlanImage}
              onChange={(url) => patchForm({ overviewMasterPlanImage: url })}
              kind="recorrido-master-plan"
              desarrolloId={desarrolloId}
              hint="Imagen del plano maestro en la presentación del desarrollo."
            />
            <Field label="Guía asesor" className="sm:col-span-2">
              <textarea
                value={form.overviewGuiaAsesor}
                onChange={(event) => patchForm({ overviewGuiaAsesor: event.target.value })}
                className="input-cotizador min-h-20"
              />
            </Field>
            <Field label="Narrativa" className="sm:col-span-2" hint="Un párrafo por línea">
              <textarea
                value={form.overviewNarrativa}
                onChange={(event) => patchForm({ overviewNarrativa: event.target.value })}
                className="input-cotizador min-h-32"
              />
            </Field>
            <Field label="Destacados" className="sm:col-span-2" hint="Un ítem por línea">
              <textarea
                value={form.overviewDestacados}
                onChange={(event) => patchForm({ overviewDestacados: event.target.value })}
                className="input-cotizador min-h-24"
              />
            </Field>
            <Field label="Bondades" className="sm:col-span-2" hint="Un ítem por línea">
              <textarea
                value={form.bondades}
                onChange={(event) => patchForm({ bondades: event.target.value })}
                className="input-cotizador min-h-24"
              />
            </Field>
          </Section>

          <Section title="Técnica de 2 minutos">
            <Field label="Título">
              <input
                value={form.tecnicaTitulo}
                onChange={(event) => patchForm({ tecnicaTitulo: event.target.value })}
                className="input-cotizador"
              />
            </Field>
            <Field label="Puntos del guion" className="sm:col-span-2" hint="Un punto por línea">
              <textarea
                value={form.tecnicaPuntos}
                onChange={(event) => patchForm({ tecnicaPuntos: event.target.value })}
                className="input-cotizador min-h-32"
              />
            </Field>
          </Section>

          <Section title="Ideas de cierre">
            <GuionTecnicasCierreEditor
              tecnicas={form.tecnicasCierre}
              onChange={(tecnicasCierre) => patchForm({ tecnicasCierre })}
            />
          </Section>
        </div>
      ) : null}

      {!loading && desarrolloId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#13315C]">
                Portada del hub
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Imagen wide en Admin → Desarrollos (tarjeta y detalle del proyecto).
              </p>
            </div>
            <button
              type="button"
              disabled={savingHubHero}
              onClick={() => void saveHubHero()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#13315C]/15 px-4 text-sm font-bold text-[#13315C] disabled:opacity-50"
            >
              {savingHubHero ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar portada
            </button>
          </div>
          <AdminImageUploadField
            label="Imagen de portada"
            value={hubHeroImage}
            onChange={setHubHeroImage}
            kind="hub-hero"
            desarrolloId={desarrolloId}
            hint="Formato horizontal 16:10 recomendado. Si está vacío, se usa cluster o logo."
          />
        </section>
      ) : null}

      <ProductoCatalogAdminPanel
        desarrollos={desarrollos.map((item) => ({ id: item.id, nombre: item.nombre }))}
        desarrolloId={desarrolloId}
        onDesarrolloIdChange={setDesarrolloId}
        showDesarrolloPicker={false}
        scopeLabel={scopeLabel}
      />
    </div>
  );
}

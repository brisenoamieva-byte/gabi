"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { nuboEditorFetch } from "@/lib/estudios/nubo-editor-client";
import { DEFAULT_NUBO_UBICACION_MARCADORES } from "@/lib/estudios/nubo-ubicacion-markers";
import type { NuboEstudioMedia } from "@/lib/estudios/nubo-estudio-types";
import { NuboUbicacionSitioFigure } from "@/components/estudios/nubo/NuboUbicacionSitioFigure";

const inputClass =
  "w-full rounded-xl border border-gabi-forest/10 px-3 py-2 text-sm text-gabi-ink outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

type MediaSlot = {
  key: string;
  uploadSlot: string;
  label: string;
  getSrc: (media: NuboEstudioMedia) => string;
  setSrc: (media: NuboEstudioMedia, src: string) => NuboEstudioMedia;
  getDetalle?: (media: NuboEstudioMedia) => string;
  setDetalle?: (media: NuboEstudioMedia, detalle: string) => NuboEstudioMedia;
  getNombre?: (media: NuboEstudioMedia) => string;
  setNombre?: (media: NuboEstudioMedia, nombre: string) => NuboEstudioMedia;
};

const MEDIA_SLOTS: MediaSlot[] = [
  {
    key: "ubicacion",
    uploadSlot: "ubicacion-sitio",
    label: "Mapa · ubicación del sitio",
    getSrc: (m) => m.ubicacionSitio,
    setSrc: (m, src) => ({ ...m, ubicacionSitio: src }),
  },
  {
    key: "hotel",
    uploadSlot: "hotel-taboada",
    label: "Hotel Hacienda Taboada · foto actual",
    getSrc: (m) => m.hotelTaboadaActual,
    setSrc: (m, src) => ({ ...m, hotelTaboadaActual: src }),
  },
  {
    key: "acceso-0",
    uploadSlot: "acceso-ref-0",
    label: "Referencia acceso · La Ceiba",
    getSrc: (m) => m.accesosRef[0]?.src ?? "",
    setSrc: (m, src) => {
      const accesosRef = [...m.accesosRef];
      accesosRef[0] = { ...accesosRef[0], src };
      return { ...m, accesosRef };
    },
    getNombre: (m) => m.accesosRef[0]?.nombre ?? "",
    setNombre: (m, nombre) => {
      const accesosRef = [...m.accesosRef];
      accesosRef[0] = { ...accesosRef[0], nombre };
      return { ...m, accesosRef };
    },
    getDetalle: (m) => m.accesosRef[0]?.detalle ?? "",
    setDetalle: (m, detalle) => {
      const accesosRef = [...m.accesosRef];
      accesosRef[0] = { ...accesosRef[0], detalle };
      return { ...m, accesosRef };
    },
  },
  {
    key: "acceso-1",
    uploadSlot: "acceso-ref-1",
    label: "Referencia acceso · El Otomí",
    getSrc: (m) => m.accesosRef[1]?.src ?? "",
    setSrc: (m, src) => {
      const accesosRef = [...m.accesosRef];
      accesosRef[1] = { ...accesosRef[1], src };
      return { ...m, accesosRef };
    },
    getNombre: (m) => m.accesosRef[1]?.nombre ?? "",
    setNombre: (m, nombre) => {
      const accesosRef = [...m.accesosRef];
      accesosRef[1] = { ...accesosRef[1], nombre };
      return { ...m, accesosRef };
    },
    getDetalle: (m) => m.accesosRef[1]?.detalle ?? "",
    setDetalle: (m, detalle) => {
      const accesosRef = [...m.accesosRef];
      accesosRef[1] = { ...accesosRef[1], detalle };
      return { ...m, accesosRef };
    },
  },
  {
    key: "rest-0",
    uploadSlot: "restaurante-ref-0",
    label: "Plantado · referencia 1",
    getSrc: (m) => m.restauranteLookAndFeel[0]?.src ?? "",
    setSrc: (m, src) => {
      const restauranteLookAndFeel = [...m.restauranteLookAndFeel];
      restauranteLookAndFeel[0] = { ...restauranteLookAndFeel[0], src };
      return { ...m, restauranteLookAndFeel };
    },
    getDetalle: (m) => m.restauranteLookAndFeel[0]?.detalle ?? "",
    setDetalle: (m, detalle) => {
      const restauranteLookAndFeel = [...m.restauranteLookAndFeel];
      restauranteLookAndFeel[0] = { ...restauranteLookAndFeel[0], detalle };
      return { ...m, restauranteLookAndFeel };
    },
  },
  {
    key: "rest-1",
    uploadSlot: "restaurante-ref-1",
    label: "Plantado · referencia 2",
    getSrc: (m) => m.restauranteLookAndFeel[1]?.src ?? "",
    setSrc: (m, src) => {
      const restauranteLookAndFeel = [...m.restauranteLookAndFeel];
      restauranteLookAndFeel[1] = { ...restauranteLookAndFeel[1], src };
      return { ...m, restauranteLookAndFeel };
    },
    getDetalle: (m) => m.restauranteLookAndFeel[1]?.detalle ?? "",
    setDetalle: (m, detalle) => {
      const restauranteLookAndFeel = [...m.restauranteLookAndFeel];
      restauranteLookAndFeel[1] = { ...restauranteLookAndFeel[1], detalle };
      return { ...m, restauranteLookAndFeel };
    },
  },
];

export function NuboEstudioMediaAdminPanel() {
  const [media, setMedia] = useState<NuboEstudioMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/contenido");
      const data = (await res.json()) as { media?: NuboEstudioMedia; error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar");
      setMedia(data.media ?? null);
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

  const handleSave = async () => {
    if (!media) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/contenido", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media }),
      });
      const data = (await res.json()) as {
        media?: NuboEstudioMedia;
        meta?: { origin?: string; updatedAt?: string };
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      if (data.meta?.origin !== "supabase") {
        throw new Error(
          "No se pudo confirmar la publicación en Supabase. Revisa SUPABASE_SERVICE_ROLE_KEY y las migraciones 029–030.",
        );
      }
      setMedia(data.media ?? media);
      setDirty(false);
      setSuccess("Imágenes publicadas. Recarga /estudios/nubo para verlas.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("¿Restaurar imágenes y captions al archivo base?")) return;
    setSaving(true);
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/contenido", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: "media" }),
      });
      const data = (await res.json()) as { media?: NuboEstudioMedia; error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo restaurar");
      setMedia(data.media ?? null);
      setDirty(false);
      setSuccess("Imágenes restauradas.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al restaurar");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (slot: MediaSlot, file: File) => {
    if (!media) return;
    setUploadingSlot(slot.uploadSlot);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("slot", slot.uploadSlot);
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/imagen", { method: "POST", body: form });
      const data = (await res.json()) as { publicUrl?: string; error?: string };
      if (!res.ok || !data.publicUrl) throw new Error(data.error ?? "No se pudo subir");
      setMedia(slot.setSrc(media, data.publicUrl));
      setDirty(true);
      setSuccess(`Imagen subida para ${slot.label}. Recuerda publicar cambios.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    } finally {
      setUploadingSlot(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gabi-forest/8 bg-white p-8 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando imágenes…
      </div>
    );
  }

  if (!media) {
    return (
      <div className="space-y-4 rounded-2xl border border-gabi-forest/8 bg-white p-8">
        <p className="text-sm text-red-700">{error || "No se pudieron cargar las imágenes."}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl border border-gabi-forest/15 px-4 py-2 text-sm font-semibold text-gabi-forest"
          >
            Reintentar
          </button>
          <Link
            href={`/operador?next=${encodeURIComponent("/estudios/nubo/editar")}`}
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
          Restaurar imágenes
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white hover:bg-gabi-forest-light disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Publicar imágenes
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-gabi-forest/8 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-gabi-forest">Mapa · iconos de ubicación</h3>
            <p className="mt-1 text-xs text-slate-500">
              Arrastra Hotel, Zona arbolada y Acceso sobre el mapa. Pulsa Publicar imágenes para guardar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMedia((prev) =>
                prev ?
                  { ...prev, ubicacionMarcadores: { ...DEFAULT_NUBO_UBICACION_MARCADORES } }
                : prev,
              );
              setDirty(true);
              setSuccess("");
            }}
            className="rounded-lg border border-gabi-forest/15 px-3 py-1.5 text-xs font-semibold text-gabi-forest hover:bg-gabi-cream"
          >
            Restaurar posiciones
          </button>
        </div>
        <NuboUbicacionSitioFigure
          src={media.ubicacionSitio}
          marcadores={media.ubicacionMarcadores}
          editable
          onMarcadoresChange={(next) => {
            setMedia((prev) => (prev ? { ...prev, ubicacionMarcadores: next } : prev));
            setDirty(true);
            setSuccess("");
          }}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {MEDIA_SLOTS.map((slot) => {
          const src = slot.getSrc(media);
          return (
            <article
              key={slot.key}
              className="space-y-3 rounded-2xl border border-gabi-forest/8 bg-white p-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-gabi-forest">{slot.label}</h3>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
                {src ? (
                  <Image src={src} alt={slot.label} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Sin imagen
                  </div>
                )}
              </div>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  URL
                </span>
                <input
                  className={inputClass}
                  value={src}
                  onChange={(e) => {
                    setMedia(slot.setSrc(media, e.target.value));
                    setDirty(true);
                    setSuccess("");
                  }}
                />
              </label>
              {slot.getNombre && slot.setNombre ? (
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Nombre
                  </span>
                  <input
                    className={inputClass}
                    value={slot.getNombre(media)}
                    onChange={(e) => {
                      setMedia(slot.setNombre!(media, e.target.value));
                      setDirty(true);
                    }}
                  />
                </label>
              ) : null}
              {slot.getDetalle && slot.setDetalle ? (
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Caption
                  </span>
                  <textarea
                    className={`${inputClass} min-h-[64px]`}
                    value={slot.getDetalle(media)}
                    onChange={(e) => {
                      setMedia(slot.setDetalle!(media, e.target.value));
                      setDirty(true);
                    }}
                  />
                </label>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => {
                    fileRefs.current[slot.uploadSlot] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(slot, file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={uploadingSlot === slot.uploadSlot}
                  onClick={() => fileRefs.current[slot.uploadSlot]?.click()}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-gabi-forest/15 px-3 text-xs font-semibold text-gabi-forest hover:bg-gabi-cream disabled:opacity-50"
                >
                  {uploadingSlot === slot.uploadSlot ?
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Upload className="h-3.5 w-3.5" />}
                  Subir imagen
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-xs text-slate-500">
        Puedes subir una imagen nueva o pegar una URL. Tras subir o editar, pulsa Publicar imágenes. Requiere
        migración 031 (bucket gabi-estudios) en Supabase.
        {dirty ? " · hay cambios sin guardar" : null}
      </p>
    </div>
  );
}

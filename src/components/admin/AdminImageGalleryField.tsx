"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import type { CatalogAssetKind } from "@/lib/admin/catalog-assets-store";

type AdminImageGalleryFieldProps = {
  label: string;
  urls: string[];
  onChange: (urls: string[]) => void;
  kind: CatalogAssetKind;
  desarrolloId: string;
  clusterId?: string;
  prototipoId?: string;
  hint?: string;
  className?: string;
};

export function AdminImageGalleryField({
  label,
  urls,
  onChange,
  kind,
  desarrolloId,
  clusterId,
  prototipoId,
  hint,
  className = "",
}: AdminImageGalleryFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      form.append("desarrolloId", desarrolloId);
      if (clusterId) {
        form.append("clusterId", clusterId);
      }
      if (prototipoId) {
        form.append("prototipoId", prototipoId);
      }

      const response = await fetch("/api/admin/catalog/assets", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as { publicUrl?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo subir la imagen.");
      }

      if (!data.publicUrl) {
        throw new Error("Respuesta inválida del servidor.");
      }

      onChange([...urls, data.publicUrl]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const removeAt = (index: number) => {
    onChange(urls.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="space-y-2">
        {urls.length ? (
          <ul className="flex flex-wrap gap-2">
            {urls.map((url, index) => (
              <li
                key={`${url}-${index}`}
                className="relative flex h-20 w-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="max-h-full max-w-full object-contain p-1" />
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute right-1 top-1 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/70"
                  aria-label="Quitar imagen"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">Sin imágenes todavía.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleUpload(file);
              }
              event.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-gabi-forest/15 px-3 text-xs font-semibold text-gabi-forest hover:bg-gabi-cream disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Agregar imagen
          </button>
        </div>
        {uploadError ? <p className="text-xs font-semibold text-red-600">{uploadError}</p> : null}
        {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

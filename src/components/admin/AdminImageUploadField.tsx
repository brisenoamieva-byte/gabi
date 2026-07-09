"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import type { CatalogAssetKind } from "@/lib/admin/catalog-assets-store";

type AdminImageUploadFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: CatalogAssetKind;
  desarrolloId?: string;
  comercializadoraId?: string;
  clusterId?: string;
  prototipoId?: string;
  hint?: string;
  className?: string;
};

export function AdminImageUploadField({
  label,
  value,
  onChange,
  kind,
  desarrolloId,
  comercializadoraId,
  clusterId,
  prototipoId,
  hint,
  className = "",
}: AdminImageUploadFieldProps) {
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
      if (desarrolloId) {
        form.append("desarrolloId", desarrolloId);
      }
      if (comercializadoraId) {
        form.append("comercializadoraId", comercializadoraId);
      }
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

      onChange(data.publicUrl);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="max-h-full max-w-full object-contain p-1" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="input-cotizador"
            placeholder="https://… o /logos/…"
          />
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
              Subir imagen
            </button>
          </div>
          {uploadError ? <p className="text-xs font-semibold text-red-600">{uploadError}</p> : null}
          {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
        </div>
      </div>
    </label>
  );
}

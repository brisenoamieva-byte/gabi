"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import type { ExpedienteTemplateStatus } from "@/lib/admin/expediente-templates-service";
import { canGenerateApartadoPack } from "@/lib/comercial/expediente-template-map";

type ExpedienteTemplatesAdminCardProps = {
  desarrolloId: string;
};

export function ExpedienteTemplatesAdminCard({ desarrolloId }: ExpedienteTemplatesAdminCardProps) {
  const [templates, setTemplates] = useState<ExpedienteTemplateStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!canGenerateApartadoPack(desarrolloId)) {
      setTemplates([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/expedientes/templates?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as {
        templates?: ExpedienteTemplateStatus[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar plantillas.");
      }
      setTemplates(data.templates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canGenerateApartadoPack(desarrolloId)) {
    return null;
  }

  const onUpload = async (fileName: string, file: File | null) => {
    if (!file) return;
    setUploading(fileName);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("desarrolloId", desarrolloId);
      form.set("fileName", fileName);
      form.set("file", file);
      const response = await fetch("/api/admin/expedientes/templates", {
        method: "POST",
        body: form,
      });
      const data = (await response.json()) as {
        error?: string;
        missingTags?: string[];
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo subir.");
      }
      const warn =
        data.missingTags && data.missingTags.length
          ? ` Aviso: faltan tags ${data.missingTags.join(", ")}.`
          : "";
      setMessage(`Plantilla ${fileName} actualizada.${warn}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir.");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-gabi-forest">Plantillas oferta / anexos</p>
          <p className="text-xs text-slate-500">
            Sube .docx con placeholders {"{cliente_nombre}"}, {"{unidad_numero}"}, etc. Sin redeploy.
          </p>
        </div>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}

      <ul className="mt-3 space-y-2">
        {templates.map((tpl) => (
          <li
            key={tpl.codigo}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold text-slate-800">{tpl.titulo}</p>
              <p className="text-[11px] text-slate-500">
                {tpl.fileName} ·{" "}
                {tpl.source === "storage"
                  ? "Storage"
                  : tpl.source === "public"
                    ? "Default repo"
                    : "Falta"}
                {tpl.missingTags.length
                  ? ` · faltan: ${tpl.missingTags.join(", ")}`
                  : ""}
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-gabi-forest hover:bg-gabi-forest/5">
              {uploading === tpl.fileName ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Subir
              <input
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                disabled={uploading === tpl.fileName}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  void onUpload(tpl.fileName, file);
                }}
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

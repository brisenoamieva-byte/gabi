"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import type { AsesorExpedienteSummary } from "@/lib/asesores/expediente-service";

type AsesorExpedienteApartadoPanelProps = {
  asesorId: string;
  prospectoId: string;
  etapa: string;
};

export function AsesorExpedienteApartadoPanel({
  asesorId,
  prospectoId,
  etapa,
}: AsesorExpedienteApartadoPanelProps) {
  const [expediente, setExpediente] = useState<AsesorExpedienteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingCodigo, setUploadingCodigo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const showPanel = etapa === "apartado" || etapa === "vendido";

  const load = useCallback(async () => {
    if (!showPanel) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ asesorId, prospectoId });
      const response = await fetch(`/api/asesores/expedientes?${params}`);
      const data = (await response.json()) as {
        expediente?: AsesorExpedienteSummary | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el expediente.");
      }

      setExpediente(data.expediente ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
      setExpediente(null);
    } finally {
      setLoading(false);
    }
  }, [asesorId, prospectoId, showPanel]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (codigo: string, file: File) => {
    setUploadingCodigo(codigo);
    setError("");

    try {
      const formData = new FormData();
      formData.append("asesorId", asesorId);
      formData.append("prospectoId", prospectoId);
      formData.append("checklistCodigo", codigo);
      formData.append("file", file);

      const response = await fetch("/api/asesores/expedientes/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo subir el archivo.");
      }

      await load();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error al subir");
    } finally {
      setUploadingCodigo(null);
    }
  };

  if (!showPanel) {
    return null;
  }

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black text-emerald-900">Expediente de apartado</h4>
          <p className="mt-0.5 text-xs text-emerald-800/80">
            Sube la documentación del cliente. Se guarda en Google Drive (oficial).
          </p>
        </div>
        {expediente?.driveFolderUrl ? (
          <a
            href={expediente.driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline"
          >
            Carpeta Drive
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando expediente…
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && !expediente ? (
        <p className="mt-3 text-sm text-emerald-900">
          {etapa === "apartado"
            ? "Aún no hay operación en sembrado para este apartado. Si acabas de reportarlo, recarga en un momento."
            : "Cuando el cliente aparte, usa «Reportar apartado» en el prospecto para registrar la unidad en sembrado e iniciar el expediente."}
        </p>
      ) : null}

      {expediente ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs font-semibold text-emerald-900">
            {expediente.unidadNumero} · Docs cliente: {expediente.progresoApartadoCliente.completados}/
            {expediente.progresoApartadoCliente.requeridos} (
            {expediente.progresoApartadoCliente.pct}%)
            {!expediente.driveConfigured ? (
              <span className="ml-2 text-amber-700">Drive no configurado en servidor</span>
            ) : null}
          </p>

          <ul className="space-y-2">
            {expediente.items.map((item) => (
              <li
                key={item.codigo}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200/80 bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#201044]">{item.titulo}</p>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    {item.requerido ? "Obligatorio" : "Opcional"}
                    {item.subido ? " · Subido" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.driveLink ? (
                    <a
                      href={item.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-700 underline"
                    >
                      Ver
                    </a>
                  ) : null}
                  <label
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-300 px-2 py-1 text-xs font-bold text-emerald-800 ${
                      uploadingCodigo === item.codigo ? "opacity-60" : "hover:bg-emerald-50"
                    }`}
                  >
                    {uploadingCodigo === item.codigo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {item.subido ? "Reemplazar" : "Subir"}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      disabled={uploadingCodigo !== null}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void handleUpload(item.codigo, file);
                        }
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

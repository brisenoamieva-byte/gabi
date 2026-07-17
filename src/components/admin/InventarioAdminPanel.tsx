"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { ProductosSpreadsheetTable } from "@/components/admin/ProductosSpreadsheetTable";
import type { Cluster, Desarrollo, Prototipo } from "@/lib/data";
import {
  exportRecordsToCsv,
  templateCsv,
} from "@/lib/inventario/csv-productos";
import type { ProductoRecomendadoRecord } from "@/lib/inventario/productos-recomendados";
import { filterClustersByDesarrollo } from "@/lib/catalog/cluster-filter";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";
import { downloadAdminExport } from "@/lib/admin/download-excel-client";

const downloadTextFile = (filename: string, content: string, mime = "text/csv;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

type InventarioAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  clusters: Cluster[];
  prototipos: Prototipo[];
  /** Dentro de Sembrado: sin cabecera duplicada ni selectores ya controlados arriba. */
  embedded?: boolean;
  desarrolloIdOverride?: string;
  clusterIdOverride?: string;
  onUnitsChanged?: () => void;
};

export function InventarioAdminPanel({
  desarrollos,
  scopeLabel,
  clusters,
  prototipos,
  embedded = false,
  desarrolloIdOverride,
  clusterIdOverride,
  onUnitsChanged,
}: InventarioAdminPanelProps) {
  const { desarrolloId: selectedDesarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(
    desarrollos,
  );
  const desarrolloId = desarrolloIdOverride ?? selectedDesarrolloId;
  const [clusterId, setClusterId] = useState("");
  const effectiveClusterId = clusterIdOverride ?? clusterId;
  const [productos, setProductos] = useState<ProductoRecomendadoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clustersDisponibles = useMemo(
    () => filterClustersByDesarrollo(clusters, desarrolloId),
    [clusters, desarrolloId],
  );

  const prototiposDisponibles = useMemo(
    () => prototipos.filter((item) => !effectiveClusterId || item.clusterId === effectiveClusterId),
    [effectiveClusterId, prototipos],
  );

  const activos = useMemo(
    () => productos.filter((item) => item.activo).sort((a, b) => a.orden - b.orden),
    [productos],
  );

  const loadProductos = useCallback(async () => {
    if (!desarrolloId || !effectiveClusterId) {
      setProductos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ desarrolloId, clusterId: effectiveClusterId });
      const response = await fetch(`/api/admin/inventario?${params}`);
      const data = (await response.json()) as {
        productos?: ProductoRecomendadoRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la lista.");
      }

      setProductos(data.productos ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, effectiveClusterId]);

  useEffect(() => {
    if (clusterIdOverride) {
      return;
    }
    if (!desarrolloId || !clustersDisponibles.length) {
      if (clusterId) {
        setClusterId("");
      }
      return;
    }
    if (!clustersDisponibles.some((item) => item.id === clusterId)) {
      setClusterId(clustersDisponibles[0].id);
    }
  }, [clusterId, clusterIdOverride, clustersDisponibles, desarrolloId]);

  useEffect(() => {
    void loadProductos();
  }, [loadProductos]);

  const handleDownloadTemplate = () => {
    const cluster = clustersDisponibles.find((item) => item.id === effectiveClusterId);
    const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
    const slug = cluster?.slug ?? "plantilla";
    downloadTextFile(
      `gabi-productos-plantilla-${slug}.csv`,
      templateCsv({
        clusterNombre: cluster?.nombre,
        desarrolloNombre: desarrollo?.nombre,
        clusterTipo: cluster?.tipo,
        prototipos: prototiposDisponibles.map((item) => ({ nombre: item.nombre })),
      }),
    );
  };

  const handleDownloadCurrent = () => {
    const cluster = clustersDisponibles.find((item) => item.id === effectiveClusterId);
    const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
    const filename = `gabi-productos-${cluster?.slug ?? (effectiveClusterId || "cluster")}.csv`;
    downloadTextFile(
      filename,
      exportRecordsToCsv(productos, prototiposDisponibles, {
        clusterNombre: cluster?.nombre,
        desarrolloNombre: desarrollo?.nombre,
      }),
    );
  };

  const handleImportFile = async (file: File) => {
    if (!desarrolloId || !effectiveClusterId) {
      return;
    }

    const confirmed = window.confirm(
      "Esto reemplazará la lista activa de este cluster con las filas del archivo. ¿Continuar?",
    );

    if (!confirmed) {
      return;
    }

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const csv = await file.text();
      const response = await fetch("/api/admin/inventario/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          clusterId: effectiveClusterId,
          csv,
          prototipos: prototiposDisponibles.map((item) => ({
            id: item.id,
            nombre: item.nombre,
          })),
        }),
      });
      const data = (await response.json()) as { error?: string; imported?: number };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo importar.");
      }

      setSuccess(`Importados ${data.imported ?? 0} productos desde Excel/CSV.`);
      await loadProductos();
      onUnitsChanged?.();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Error al importar");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={embedded ? "space-y-4" : "space-y-6"}>
      {!embedded && desarrollos.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          No tienes desarrollos asignados. Pide al administrador gabi que configure tu perfil.
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        {!embedded ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
              Recorrido · Curación comercial
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#13315C]">
              Unidades para mostrar en visita
            </h2>
            {scopeLabel ? (
              <p className="mt-2 inline-flex rounded-full bg-[#13315C]/5 px-3 py-1 text-xs font-semibold text-[#13315C]">
                Alcance: {scopeLabel}
              </p>
            ) : null}
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              La <strong>disponibilidad</strong> (disponible, apartado, vendido) se administra en{" "}
              <strong>Sembrado</strong>. Aquí solo defines qué unidades enseñar en recorrido/cotizador:
              orden, razones de venta, instrucciones y visibilidad.
            </div>
          </>
        ) : (
          <div>
            <h3 className="text-lg font-black text-gabi-forest">Curación para recorrido y cotizador</h3>
            <p className="mt-1 text-sm text-slate-500">
              Visibilidad en visita y razones de venta. El estatus comercial está en Sembrado.
            </p>
          </div>
        )}
        <p className={`${embedded ? "mt-2" : "mt-3"} max-w-3xl text-sm text-slate-500`}>
          Edita la tabla o importa CSV.
        </p>

        {!embedded ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Desarrollo
              </span>
              <select
                value={desarrolloId}
                onChange={(event) => {
                  setDesarrolloId(event.target.value);
                  setClusterId("");
                }}
                className="input-cotizador"
              >
                {desarrollos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Cluster
              </span>
              <select
                value={clusterId}
                onChange={(event) => setClusterId(event.target.value)}
                className="input-cotizador"
              >
                {clustersDisponibles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : !clusterIdOverride ? (
          <label className="mt-4 block max-w-md">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Tipo de producto
            </span>
            <select
              value={clusterId}
              onChange={(event) => setClusterId(event.target.value)}
              className="input-cotizador"
            >
              {clustersDisponibles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="mt-5 rounded-2xl border border-dashed border-[#13315C]/15 bg-[#F2F0E9]/60 p-4">
          <p className="text-sm font-bold text-[#13315C]">Excel / CSV</p>
          <p className="mt-1 text-xs text-slate-500">
            La plantilla es la misma estructura para todos los clusters. Al{" "}
            <strong>importar</strong>, se aplica al cluster seleccionado arriba. Solo se listan
            unidades <strong>disponibles</strong> (sin columna estatus). Superficies: terreno =
            solo m² terreno; casa = terreno + construcción; depto = solo construcción.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#13315C]/15 bg-white px-4 text-sm font-semibold text-[#13315C]"
            >
              <Download className="h-4 w-4" />
              Descargar plantilla
            </button>
            <button
              type="button"
              onClick={handleDownloadCurrent}
              disabled={!effectiveClusterId || !activos.length}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#13315C]/15 bg-white px-4 text-sm font-semibold text-[#13315C] disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Exportar lista actual
            </button>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  if (!desarrolloId) return;
                  try {
                    await downloadAdminExport(
                      `/api/admin/inventario/export?desarrolloId=${encodeURIComponent(desarrolloId)}`,
                      `inventario-${desarrolloId}.xlsx`,
                    );
                  } catch (exportError) {
                    setError(
                      exportError instanceof Error
                        ? exportError.message
                        : "Error al exportar Excel.",
                    );
                  }
                })();
              }}
              disabled={!desarrolloId}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#13315C]/15 bg-white px-4 text-sm font-semibold text-[#13315C] disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Excel desarrollo
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!effectiveClusterId || importing}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#13315C] px-4 text-sm font-semibold text-white disabled:opacity-40"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Subir Excel/CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportFile(file);
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-[#13315C]">
            Hoja editable ({activos.length} filas)
          </h3>
          <p className="text-sm text-slate-500">
            Filas en verde = cambios sin guardar. Pulsa ✓ para guardar cada fila.
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            {success}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando lista...
          </div>
        ) : (
          <ProductosSpreadsheetTable
            rows={productos}
            prototipos={prototiposDisponibles}
            desarrolloId={desarrolloId}
            clusterId={effectiveClusterId}
            onRefresh={async () => {
              await loadProductos();
              onUnitsChanged?.();
            }}
            onError={setError}
            onSuccess={(message) => {
              setSuccess(message);
              setError("");
              onUnitsChanged?.();
            }}
          />
        )}
      </div>
    </div>
  );
}

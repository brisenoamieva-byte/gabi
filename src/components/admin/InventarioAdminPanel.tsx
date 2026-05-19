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
};

export function InventarioAdminPanel({
  desarrollos,
  scopeLabel,
  clusters,
  prototipos,
}: InventarioAdminPanelProps) {
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [clusterId, setClusterId] = useState("");
  const [productos, setProductos] = useState<ProductoRecomendadoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clustersDisponibles = useMemo(
    () => clusters.filter((item) => !desarrolloId || item.id),
    [clusters, desarrolloId],
  );

  const prototiposDisponibles = useMemo(
    () => prototipos.filter((item) => !clusterId || item.clusterId === clusterId),
    [clusterId, prototipos],
  );

  const activos = useMemo(
    () => productos.filter((item) => item.activo).sort((a, b) => a.orden - b.orden),
    [productos],
  );

  const loadProductos = useCallback(async () => {
    if (!desarrolloId || !clusterId) {
      setProductos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ desarrolloId, clusterId });
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
  }, [clusterId, desarrolloId]);

  useEffect(() => {
    if (!clusterId && clustersDisponibles[0]) {
      setClusterId(clustersDisponibles[0].id);
    }
  }, [clusterId, clustersDisponibles]);

  useEffect(() => {
    void loadProductos();
  }, [loadProductos]);

  const handleDownloadTemplate = () => {
    const cluster = clustersDisponibles.find((item) => item.id === clusterId);
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
    const cluster = clustersDisponibles.find((item) => item.id === clusterId);
    const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
    const filename = `gabi-productos-${cluster?.slug ?? (clusterId || "cluster")}.csv`;
    downloadTextFile(
      filename,
      exportRecordsToCsv(productos, prototiposDisponibles, {
        clusterNombre: cluster?.nombre,
        desarrolloNombre: desarrollo?.nombre,
      }),
    );
  };

  const handleImportFile = async (file: File) => {
    if (!desarrolloId || !clusterId) {
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
          clusterId,
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
    <div className="space-y-6">
      {desarrollos.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          No tienes desarrollos asignados. Pide al administrador gabi que configure tu perfil.
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#201044]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6cc24a]">
          Paso 2 · Productos para mostrar
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#201044]">
          Lista curada para el recorrido
        </h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-[#201044]/5 px-3 py-1 text-xs font-semibold text-[#201044]">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Edita la tabla como Excel, importa CSV o agrega filas. El PDF sigue siendo el inventario
          completo.
        </p>

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

        <div className="mt-5 rounded-2xl border border-dashed border-[#201044]/15 bg-[#F2F0E9]/60 p-4">
          <p className="text-sm font-bold text-[#201044]">Excel / CSV</p>
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
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#201044]/15 bg-white px-4 text-sm font-semibold text-[#201044]"
            >
              <Download className="h-4 w-4" />
              Descargar plantilla
            </button>
            <button
              type="button"
              onClick={handleDownloadCurrent}
              disabled={!clusterId || !activos.length}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#201044]/15 bg-white px-4 text-sm font-semibold text-[#201044] disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              Exportar lista actual
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!clusterId || importing}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#201044] px-4 text-sm font-semibold text-white disabled:opacity-40"
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

      <div className="rounded-2xl border border-[#201044]/8 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-black text-[#201044]">
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
            clusterId={clusterId}
            onRefresh={loadProductos}
            onError={setError}
            onSuccess={(message) => {
              setSuccess(message);
              setError("");
            }}
          />
        )}
      </div>
    </div>
  );
}

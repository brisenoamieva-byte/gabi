"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { formatAmountInput, formatPrice, parseMoneyInput } from "@/lib/format/money";
import {
  listaPreciosEstadoLabel,
  type ListaPrecioPreviewRow,
  type ListaPreciosDetail,
  type ListaPreciosRecord,
} from "@/lib/admin/listas-precios-types";

type ListasPreciosAdminPanelProps = {
  desarrolloId: string;
  desarrolloNombre: string;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

export function ListasPreciosAdminPanel({
  desarrolloId,
  desarrolloNombre,
}: ListasPreciosAdminPanelProps) {
  const [listas, setListas] = useState<ListaPreciosRecord[]>([]);
  const [activa, setActiva] = useState<ListaPreciosRecord | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ListaPreciosDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showGenerar, setShowGenerar] = useState(false);
  const [incrementoPct, setIncrementoPct] = useState("3");
  const [vigenciaDesde, setVigenciaDesde] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [nombreNueva, setNombreNueva] = useState("");
  const [preview, setPreview] = useState<ListaPrecioPreviewRow[]>([]);
  const [editPrecios, setEditPrecios] = useState<Record<string, string>>({});

  const loadListas = useCallback(async () => {
    if (!desarrolloId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/listas-precios?desarrolloId=${encodeURIComponent(desarrolloId)}`,
      );
      const data = (await response.json()) as {
        listas?: ListaPreciosRecord[];
        activa?: ListaPreciosRecord | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las listas.");
      }
      setListas(data.listas ?? []);
      setActiva(data.activa ?? null);
      setSelectedId((current) => current ?? data.activa?.id ?? data.listas?.[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setListas([]);
      setActiva(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    setSelectedId(null);
    setDetail(null);
    void loadListas();
  }, [loadListas]);

  const loadDetail = useCallback(async (listaId: string) => {
    setError("");
    try {
      const response = await fetch(`/api/admin/listas-precios/${listaId}`);
      const data = (await response.json()) as { lista?: ListaPreciosDetail; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el detalle.");
      }
      setDetail(data.lista ?? null);
      const map: Record<string, string> = {};
      for (const row of data.lista?.unidades ?? []) {
        map[row.unidad_id] = formatAmountInput(Number(row.precio_lista));
      }
      setEditPrecios(map);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Error al cargar detalle.");
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, loadDetail]);

  const loadPreview = async () => {
    setError("");
    try {
      const pct = Number(incrementoPct);
      const params = new URLSearchParams({
        desarrolloId,
        preview: "1",
        incrementoPct: String(pct),
      });
      const response = await fetch(`/api/admin/listas-precios?${params.toString()}`);
      const data = (await response.json()) as {
        filas?: ListaPrecioPreviewRow[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo calcular el preview.");
      }
      setPreview(data.filas ?? []);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Error en preview.");
      setPreview([]);
    }
  };

  const handleSeed = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/listas-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seed",
          desarrolloId,
          vigenciaDesde,
          nombre: "Lista 1",
        }),
      });
      const data = (await response.json()) as { lista?: ListaPreciosDetail; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear Lista 1.");
      }
      await loadListas();
      if (data.lista?.id) {
        setSelectedId(data.lista.id);
      }
    } catch (seedError) {
      setError(seedError instanceof Error ? seedError.message : "Error al crear Lista 1.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerar = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/listas-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "incremento",
          desarrolloId,
          incrementoPct: Number(incrementoPct),
          vigenciaDesde,
          nombre: nombreNueva.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { lista?: ListaPreciosDetail; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo generar la lista.");
      }
      setShowGenerar(false);
      setPreview([]);
      setNombreNueva("");
      await loadListas();
      if (data.lista?.id) {
        setSelectedId(data.lista.id);
      }
    } catch (genError) {
      setError(genError instanceof Error ? genError.message : "Error al generar.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrecios = async () => {
    if (!detail || detail.estado !== "borrador") {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const precios = Object.entries(editPrecios).map(([unidadId, value]) => ({
        unidadId,
        precioLista: parseMoneyInput(value) ?? 0,
      }));
      const response = await fetch(`/api/admin/listas-precios/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "precios", precios }),
      });
      const data = (await response.json()) as { lista?: ListaPreciosDetail; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron guardar los precios.");
      }
      const lista = data.lista ?? null;
      setDetail(lista);
      if (lista) {
        const map: Record<string, string> = {};
        for (const row of lista.unidades) {
          map[row.unidad_id] = formatAmountInput(Number(row.precio_lista));
        }
        setEditPrecios(map);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleActivar = async () => {
    if (!detail) {
      return;
    }
    const confirmed = window.confirm(
      `¿Activar «${detail.nombre}» desde ${detail.vigencia_desde}? La lista activa actual se cerrará y se actualizará el inventario disponible.`,
    );
    if (!confirmed) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/listas-precios/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activar" }),
      });
      const data = (await response.json()) as { lista?: ListaPreciosDetail; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo activar.");
      }
      await loadListas();
      setDetail(data.lista ?? null);
    } catch (actError) {
      setError(actError instanceof Error ? actError.message : "Error al activar.");
    } finally {
      setSaving(false);
    }
  };

  const previewDelta = useMemo(() => {
    if (!preview.length) {
      return null;
    }
    const actual = preview.reduce((sum, row) => sum + row.precioActual, 0);
    const nuevo = preview.reduce((sum, row) => sum + row.precioNuevo, 0);
    return { actual, nuevo, unidades: preview.length };
  }, [preview]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gabi-forest">Listas de precios</h3>
          <p className="mt-1 text-sm text-slate-500">
            Versiona precios de {desarrolloNombre}.
          </p>
          {activa ? (
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              Lista activa: {activa.nombre} · vigente desde {activa.vigencia_desde}
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-amber-700">
              Sin lista activa. Crea Lista 1 desde el inventario o genera un borrador.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadListas()}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          {!activa && !listas.length ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSeed()}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gabi-forest/20 bg-white px-3 text-sm font-semibold text-gabi-forest disabled:opacity-50"
            >
              Crear Lista 1 desde inventario
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setShowGenerar((value) => !value);
              setPreview([]);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gabi-forest px-3 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Generar siguiente lista
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {showGenerar ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold text-slate-500">
              Incremento %
              <input
                type="number"
                step="0.1"
                value={incrementoPct}
                onChange={(event) => setIncrementoPct(event.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Vigencia desde
              <input
                type="date"
                value={vigenciaDesde}
                onChange={(event) => setVigenciaDesde(event.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              Nombre (opcional)
              <input
                value={nombreNueva}
                onChange={(event) => setNombreNueva(event.target.value)}
                placeholder={`Lista ${(listas.length || 0) + 1}`}
                className={`${inputClass} mt-1`}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadPreview()}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
            >
              Previsualizar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleGenerar()}
              className="rounded-xl bg-gabi-forest px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Generando…" : "Crear borrador"}
            </button>
          </div>
          {previewDelta ? (
            <p className="mt-3 text-sm text-slate-600">
              {previewDelta.unidades} unidades · suma lista {formatPrice(previewDelta.actual)} →{" "}
              {formatPrice(previewDelta.nuevo)}
            </p>
          ) : null}
          {preview.length ? (
            <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Unidad</th>
                    <th className="px-3 py-2">Actual</th>
                    <th className="px-3 py-2">Nuevo</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 40).map((row) => (
                    <tr key={row.unidadId} className="border-t border-slate-100">
                      <td className="px-3 py-1.5 font-medium text-gabi-forest">{row.unidad}</td>
                      <td className="px-3 py-1.5 tabular-nums">{formatPrice(row.precioActual)}</td>
                      <td className="px-3 py-1.5 tabular-nums font-semibold">
                        {formatPrice(row.precioNuevo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 40 ? (
                <p className="px-3 py-2 text-xs text-slate-400">
                  Mostrando 40 de {preview.length} unidades…
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando listas…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-2">
            {listas.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Sin listas aún.</p>
            ) : (
              <ul className="space-y-1">
                {listas.map((lista) => (
                  <li key={lista.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(lista.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                        selectedId === lista.id
                          ? "bg-gabi-forest text-white"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <span className="block font-semibold">{lista.nombre}</span>
                      <span
                        className={`mt-0.5 block text-[11px] ${
                          selectedId === lista.id ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        {listaPreciosEstadoLabel[lista.estado]} · {lista.vigencia_desde}
                        {lista.incremento_pct != null ? ` · +${lista.incremento_pct}%` : ""}
                        {lista.estado === "cerrada" ? " · cerrada" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {!detail ? (
              <p className="py-8 text-center text-sm text-slate-500">Selecciona una lista.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-gabi-forest">{detail.nombre}</h4>
                    <p className="text-sm text-slate-500">
                      {listaPreciosEstadoLabel[detail.estado]} · vigencia {detail.vigencia_desde}
                      {detail.vigencia_hasta ? ` → ${detail.vigencia_hasta}` : ""} ·{" "}
                      {detail.unidadesCount} unidades
                      {detail.estado === "cerrada" ? " · cerrada" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {detail.estado === "borrador" ? (
                      <>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleSavePrecios()}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
                        >
                          Guardar precios
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleActivar()}
                          className="rounded-xl bg-gabi-forest px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Activar lista
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-slate-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Unidad</th>
                        <th className="px-3 py-2">Tipo</th>
                        <th className="px-3 py-2">Precio lista</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.unidades.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-3 py-1.5 font-medium text-gabi-forest">
                            {row.unidad ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-slate-500">{row.tipo ?? "—"}</td>
                          <td className="px-3 py-1.5">
                            {detail.estado === "borrador" ? (
                              <input
                                value={editPrecios[row.unidad_id] ?? ""}
                                onChange={(event) =>
                                  setEditPrecios((prev) => ({
                                    ...prev,
                                    [row.unidad_id]: formatAmountInput(
                                      parseMoneyInput(event.target.value) ?? 0,
                                    ),
                                  }))
                                }
                                className="w-40 rounded-lg border border-slate-200 px-2 py-1 tabular-nums"
                                inputMode="decimal"
                              />
                            ) : (
                              <span className="tabular-nums">{formatPrice(row.precio_lista)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

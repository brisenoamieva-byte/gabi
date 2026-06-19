"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { ReporteObjetivosAnuales } from "@/lib/admin/reporte-semanal/objetivos-config";
import { getSembradoSegmentsForDesarrollo } from "@/lib/catalog/desarrollos-registry";

type ObjetivoSegmento = {
  segmentoId: string;
  label: string;
  origen: "db" | "seed" | "none";
  valores: ReporteObjetivosAnuales | null;
};

type ObjetivosComercialesEditorProps = {
  desarrolloId: string;
  anio: number;
  onSaved?: () => void;
};

const emptyValores = (): ReporteObjetivosAnuales => ({
  ventasUnidades: 0,
  apartadosObjetivo: 0,
  ingresosTotales: 0,
  ingresosMes: 0,
  precioM2Objetivo: 0,
  totalUnidades: 0,
});

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(value);

export function ObjetivosComercialesEditor({
  desarrolloId,
  anio,
  onSaved,
}: ObjetivosComercialesEditorProps) {
  const [items, setItems] = useState<ObjetivoSegmento[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReporteObjetivosAnuales>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!desarrolloId) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ desarrolloId, anio: String(anio) });
      const res = await fetch(`/api/admin/reportes/objetivos?${params}`);
      const data = (await res.json()) as {
        objetivos?: ObjetivoSegmento[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudieron cargar objetivos.");
      const next = data.objetivos ?? [];
      setItems(next);
      const nextDrafts: Record<string, ReporteObjetivosAnuales> = {};
      for (const item of next) {
        nextDrafts[item.segmentoId] = item.valores ? { ...item.valores } : emptyValores();
      }
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
      setItems([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, [anio, desarrolloId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasEditable = useMemo(
    () => items.some((item) => item.valores || getSembradoSegmentsForDesarrollo(desarrolloId).length > 0),
    [desarrolloId, items],
  );

  const patchDraft = (segmentoId: string, patch: Partial<ReporteObjetivosAnuales>) => {
    setDrafts((current) => ({
      ...current,
      [segmentoId]: { ...(current[segmentoId] ?? emptyValores()), ...patch },
    }));
  };

  const saveSegmento = async (segmentoId: string) => {
    const valores = drafts[segmentoId];
    if (!valores) return;

    setSavingId(segmentoId);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/reportes/objetivos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          segmentoId,
          anio,
          ...valores,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setMessage(`Objetivos de ${items.find((i) => i.segmentoId === segmentoId)?.label ?? segmentoId} guardados.`);
      await load();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSavingId(null);
    }
  };

  if (!hasEditable && !loading) {
    return null;
  }

  return (
    <section className="no-print rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gabi-sand">
            Configuración
          </p>
          <h3 className="mt-1 text-lg font-black text-gabi-forest">
            Objetivos comerciales {anio}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Metas anuales por segmento usadas en avance, ingresos y precio m² del reporte semanal.
          </p>
        </div>
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-gabi-forest" /> : null}
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p> : null}

      <div className="mt-5 space-y-6">
        {items.map((item) => {
          const draft = drafts[item.segmentoId] ?? emptyValores();
          return (
            <div
              key={item.segmentoId}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-4"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-black text-gabi-forest">{item.label}</h4>
                  <p className="text-xs text-slate-500">
                    Origen:{" "}
                    {item.origen === "db"
                      ? "base de datos"
                      : item.origen === "seed"
                        ? "valores seed (guardar para persistir)"
                        : "sin metas — captura abajo"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void saveSegmento(item.segmentoId)}
                  disabled={savingId === item.segmentoId}
                  className="inline-flex items-center gap-2 rounded-lg bg-gabi-forest px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {savingId === item.segmentoId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Guardar
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["ventasUnidades", "Ventas (unidades)", "number"],
                    ["apartadosObjetivo", "Apartados objetivo", "number"],
                    ["totalUnidades", "Total unidades", "number"],
                    ["precioM2Objetivo", "Precio m² objetivo", "number"],
                    ["ingresosMes", "Ingresos mes", "number"],
                    ["ingresosTotales", "Ingresos totales año", "number"],
                  ] as const
                ).map(([key, label, type]) => (
                  <label key={key} className="text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">{label}</span>
                    <input
                      type={type}
                      value={draft[key]}
                      onChange={(e) =>
                        patchDraft(item.segmentoId, {
                          [key]: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 tabular-nums"
                    />
                    {(key === "ingresosMes" || key === "ingresosTotales") && draft[key] > 0 ? (
                      <span className="mt-1 block text-xs text-slate-400">
                        ${formatMoney(draft[key])}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

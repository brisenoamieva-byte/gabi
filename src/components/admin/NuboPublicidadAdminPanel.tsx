"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Plus, RefreshCw, RotateCcw, Save, Trash2, Wand2 } from "lucide-react";
import {
  formatCeldaPresupuesto,
  getNuboPublicidadColumnasMes,
  getNuboPublicidadInversionAnual,
  getNuboPublicidadTotales,
  getNuboPublicidadTotalesMensuales,
  NUBO_PUBLICIDAD_META,
} from "@/lib/estudios/nubo-publicidad-content";
import type { NuboPublicidadPartidaMensual } from "@/lib/estudios/nubo-publicidad-partidas";
import { nuboEditorFetch } from "@/lib/estudios/nubo-editor-client";
import {
  buildMesesFromPatron,
  NUBO_PATRON_TIPO_LABEL,
  type NuboPatronTipo,
} from "@/lib/estudios/nubo-publicidad-pattern";
import type { NuboPublicidadPublishMeta } from "@/lib/estudios/nubo-publicidad-store";

const MESES_COUNT = 12;

type EditablePartida = {
  key: string;
  proveedor: string;
  concepto: string;
  segmento: string;
  meses: string[];
  patronMonto: string;
  patronTipo: NuboPatronTipo;
  patronIntervalo: string;
  patronDesde: number;
};

const cellInput =
  "w-full min-w-0 rounded border border-transparent bg-white px-1.5 py-1 text-[11px] text-[#13315C] outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const mesInput =
  "w-full min-w-[52px] rounded border border-transparent bg-white px-1 py-1 text-right text-[11px] tabular-nums outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

function partidaKey(p: Pick<NuboPublicidadPartidaMensual, "proveedor" | "concepto">, index: number) {
  return `${p.proveedor}-${p.concepto}-${index}`;
}

const selectClass =
  "w-full min-w-0 rounded border border-slate-200 bg-white px-1 py-1 text-[10px] text-[#13315C] outline-none focus:border-[#2DD4BF]";

function newRowKey() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createEmptyRow(seed?: Partial<EditablePartida>): EditablePartida {
  return {
    key: newRowKey(),
    segmento: seed?.segmento ?? "Campaña digital",
    proveedor: "",
    concepto: "",
    meses: Array(MESES_COUNT).fill(""),
    patronMonto: "",
    patronTipo: "mensual",
    patronIntervalo: "2",
    patronDesde: 0,
    ...seed,
  };
}

function toEditable(partidas: readonly NuboPublicidadPartidaMensual[]): EditablePartida[] {
  return partidas.map((p, index) => ({
    key: partidaKey(p, index),
    proveedor: p.proveedor,
    concepto: p.concepto,
    segmento: p.segmento,
    meses: p.meses.map((m) => (m === 0 ? "" : String(Math.round(m)))),
    patronMonto: "",
    patronTipo: "manual" as const,
    patronIntervalo: "2",
    patronDesde: 0,
  }));
}

function parseMonto(raw: string): number {
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function toPayload(rows: EditablePartida[]): NuboPublicidadPartidaMensual[] {
  return rows.map((row) => {
    const meses = row.meses.map(parseMonto);
    return {
      proveedor: row.proveedor.trim(),
      concepto: row.concepto.trim(),
      segmento: row.segmento.trim(),
      meses,
      anual: meses.reduce((sum, m) => sum + m, 0),
    };
  });
}

function rowAnual(row: EditablePartida): number {
  return row.meses.reduce((sum, raw) => sum + parseMonto(raw), 0);
}

export function NuboPublicidadAdminPanel({ embedded = false }: { embedded?: boolean }) {
  const columnas = getNuboPublicidadColumnasMes();
  const [rows, setRows] = useState<EditablePartida[]>([]);
  const [meta, setMeta] = useState<NuboPublicidadPublishMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/publicidad");
      const data = (await res.json()) as {
        partidas?: NuboPublicidadPartidaMensual[];
        meta?: NuboPublicidadPublishMeta;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo cargar");
      setRows(toEditable(data.partidas ?? []));
      setMeta(data.meta ?? null);
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

  const payloadPreview = useMemo(() => toPayload(rows), [rows]);
  const totalesMes = useMemo(
    () => getNuboPublicidadTotalesMensuales(payloadPreview),
    [payloadPreview],
  );
  const totales = useMemo(() => getNuboPublicidadTotales(payloadPreview), [payloadPreview]);
  const inversionAnual = useMemo(
    () => getNuboPublicidadInversionAnual(totalesMes),
    [totalesMes],
  );

  const patchRow = (key: string, patch: Partial<EditablePartida>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
    setDirty(true);
    setSuccess("");
  };

  const patchMes = (key: string, mesIndex: number, value: string) => {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const meses = [...row.meses];
        meses[mesIndex] = value;
        return { ...row, meses, patronTipo: "manual" };
      }),
    );
    setDirty(true);
    setSuccess("");
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows((current) => [...current, createEmptyRow({ segmento: last?.segmento ?? "Campaña digital" })]);
    setDirty(true);
    setSuccess("");
  };

  const removeRow = (key: string) => {
    if (rows.length <= 1) {
      setError("Debe quedar al menos una partida.");
      return;
    }
    if (!window.confirm("¿Eliminar esta fila del presupuesto?")) return;
    setRows((current) => current.filter((row) => row.key !== key));
    setDirty(true);
    setSuccess("");
    setError("");
  };

  const applyPatron = (key: string) => {
    const row = rows.find((item) => item.key === key);
    if (!row || row.patronTipo === "manual") return;

    const monto = parseMonto(row.patronMonto);
    if (monto <= 0) {
      setError("Indica un monto mayor a 0 para aplicar el patrón.");
      return;
    }

    const meses = buildMesesFromPatron({
      monto,
      tipo: row.patronTipo,
      intervaloMeses: parseMonto(row.patronIntervalo) || 2,
      mesInicio: row.patronDesde,
      totalMeses: MESES_COUNT,
    });

    patchRow(key, { meses });
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/publicidad", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partidas: toPayload(rows) }),
      });
      const data = (await res.json()) as {
        meta?: NuboPublicidadPublishMeta;
        partidas?: NuboPublicidadPartidaMensual[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
      setRows(toEditable(data.partidas ?? toPayload(rows)));
      setMeta(data.meta ?? null);
      setDirty(false);
      setSuccess("Presupuesto publicado. La diapositiva en /estudios/nubo lo reflejará al recargar.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "¿Restaurar el presupuesto desde el archivo base del código? Se perderán cambios no guardados en Supabase.",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await nuboEditorFetch("/api/admin/estudios/nubo/publicidad", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = (await res.json()) as {
        meta?: NuboPublicidadPublishMeta;
        partidas?: NuboPublicidadPartidaMensual[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "No se pudo restaurar");
      setRows(toEditable(data.partidas ?? []));
      setMeta(data.meta ?? null);
      setDirty(false);
      setSuccess("Restaurado desde el archivo base.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al restaurar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Estudios de mercado
            </p>
            <h2 className="text-2xl font-black text-gabi-forest">NUBO · Presupuesto de publicidad</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Edita proveedor, concepto y montos mes a mes. Los cambios se publican en la diapositiva{" "}
              <strong>05 Presupuesto de publicidad</strong> de <code>/estudios/nubo</code>.
            </p>
            {meta ? (
              <p className="mt-2 text-xs text-slate-500">
                Origen: {meta.origin === "supabase" ? "publicado en gabi" : "archivo base (aún no guardado)"}
                {meta.origin === "supabase" ? ` · ${new Date(meta.updatedAt).toLocaleString("es-MX")}` : null}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/estudios/nubo"
              target="_blank"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gabi-forest/15 bg-white px-4 text-sm font-semibold text-gabi-forest hover:bg-gabi-cream"
            >
              <ExternalLink className="h-4 w-4" />
              Ver estudio
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading || saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gabi-forest/15 bg-white px-4 text-sm font-semibold text-gabi-forest hover:bg-gabi-cream disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Recargar
            </button>
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={loading || saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar base
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={loading || saving || !dirty}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white hover:bg-gabi-forest-light disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Publicar cambios
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gabi-forest/15 bg-white px-4 text-sm font-semibold text-gabi-forest hover:bg-gabi-cream disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recargar
          </button>
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={loading || saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar base
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || !dirty}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white hover:bg-gabi-forest-light disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publicar presupuesto
          </button>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {success}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-gabi-forest/8 bg-white px-4 py-3 text-xs text-slate-600">
        <span>
          <strong className="text-gabi-forest">Calendario:</strong> {NUBO_PUBLICIDAD_META.mesInicioLabel} – Jul 2027
        </span>
        <span>
          <strong className="text-gabi-forest">Año 1:</strong> {formatCeldaPresupuesto(inversionAnual)}
        </span>
        <span>
          <strong className="text-gabi-forest">Subtotal:</strong> {formatCeldaPresupuesto(totales.subtotal)}
        </span>
        <span>
          <strong className="text-gabi-forest">Con IVA:</strong> {formatCeldaPresupuesto(totales.total)}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-gabi-forest/8 bg-white p-8 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando presupuesto…
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Usa <strong>Monto + repetición</strong> y pulsa aplicar para llenar los meses. También puedes editar
              celdas a mano.
            </p>
            <button
              type="button"
              onClick={addRow}
              disabled={saving}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gabi-forest/15 bg-white px-3 text-xs font-semibold text-gabi-forest hover:bg-gabi-cream disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar fila
            </button>
          </div>
          <div className="overflow-auto rounded-2xl border border-gabi-forest/8 bg-white shadow-sm">
          <table className="w-max min-w-full border-collapse text-[11px]">
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr className="border-b border-slate-200 uppercase tracking-wide text-slate-500">
                <th className="sticky left-0 z-30 min-w-[88px] bg-slate-50 px-2 py-2 text-left">Segmento</th>
                <th className="min-w-[100px] px-2 py-2 text-left">Proveedor</th>
                <th className="min-w-[160px] px-2 py-2 text-left">Concepto</th>
                <th className="min-w-[72px] border-l border-slate-200 bg-[#6cc24a]/5 px-2 py-2 text-left">
                  Monto
                </th>
                <th className="min-w-[108px] bg-[#6cc24a]/5 px-2 py-2 text-left">Repetición</th>
                <th className="min-w-[44px] bg-[#6cc24a]/5 px-1 py-2 text-center">N</th>
                <th className="min-w-[72px] bg-[#6cc24a]/5 px-2 py-2 text-left">Desde</th>
                <th className="min-w-[40px] bg-[#6cc24a]/5 px-1 py-2 text-center"> </th>
                {columnas.map((col) => (
                  <th key={col.indice} className="min-w-[68px] px-1 py-2 text-right whitespace-nowrap">
                    {col.etiquetaCorta}
                  </th>
                ))}
                <th className="min-w-[72px] bg-slate-100 px-2 py-2 text-right">Total</th>
                <th className="min-w-[40px] px-1 py-2 text-center"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="sticky left-0 z-10 bg-white px-2 py-1 align-top">
                    <input
                      className={cellInput}
                      value={row.segmento}
                      onChange={(e) => patchRow(row.key, { segmento: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className={cellInput}
                      value={row.proveedor}
                      onChange={(e) => patchRow(row.key, { proveedor: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1 align-top">
                    <input
                      className={cellInput}
                      value={row.concepto}
                      onChange={(e) => patchRow(row.key, { concepto: e.target.value })}
                    />
                  </td>
                  <td className="border-l border-slate-100 bg-[#6cc24a]/[0.03] px-2 py-1 align-top">
                    <input
                      className={mesInput}
                      inputMode="numeric"
                      placeholder="0"
                      value={row.patronMonto}
                      onChange={(e) => patchRow(row.key, { patronMonto: e.target.value })}
                    />
                  </td>
                  <td className="bg-[#6cc24a]/[0.03] px-2 py-1 align-top">
                    <select
                      className={selectClass}
                      value={row.patronTipo}
                      onChange={(e) =>
                        patchRow(row.key, { patronTipo: e.target.value as NuboPatronTipo })
                      }
                    >
                      <option value="mensual">{NUBO_PATRON_TIPO_LABEL.mensual}</option>
                      <option value="intervalo">{NUBO_PATRON_TIPO_LABEL.intervalo}</option>
                      <option value="unico">{NUBO_PATRON_TIPO_LABEL.unico}</option>
                      <option value="manual">Manual (celdas)</option>
                    </select>
                  </td>
                  <td className="bg-[#6cc24a]/[0.03] px-1 py-1 align-top">
                    <input
                      className={`${mesInput} ${row.patronTipo !== "intervalo" ? "opacity-30" : ""}`}
                      inputMode="numeric"
                      min={1}
                      disabled={row.patronTipo !== "intervalo"}
                      value={row.patronIntervalo}
                      onChange={(e) => patchRow(row.key, { patronIntervalo: e.target.value })}
                      title="Cada cuántos meses"
                    />
                  </td>
                  <td className="bg-[#6cc24a]/[0.03] px-2 py-1 align-top">
                    <select
                      className={selectClass}
                      value={row.patronDesde}
                      disabled={row.patronTipo === "manual"}
                      onChange={(e) =>
                        patchRow(row.key, { patronDesde: Number(e.target.value) })
                      }
                    >
                      {columnas.map((col) => (
                        <option key={col.indice} value={col.indice}>
                          {col.etiquetaCorta}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="bg-[#6cc24a]/[0.03] px-1 py-1 align-top">
                    <button
                      type="button"
                      title="Aplicar patrón a los meses"
                      disabled={row.patronTipo === "manual"}
                      onClick={() => applyPatron(row.key)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-gabi-forest/15 text-gabi-forest hover:bg-gabi-cream disabled:opacity-30"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  {row.meses.map((mes, mesIndex) => (
                    <td key={mesIndex} className="px-1 py-1 align-top">
                      <input
                        className={mesInput}
                        inputMode="numeric"
                        placeholder="—"
                        value={mes}
                        onChange={(e) => patchMes(row.key, mesIndex, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="bg-slate-50/80 px-2 py-1 text-right tabular-nums font-semibold text-gabi-forest">
                    {formatCeldaPresupuesto(rowAnual(row))}
                  </td>
                  <td className="px-1 py-1 align-top">
                    <button
                      type="button"
                      title="Eliminar fila"
                      onClick={() => removeRow(row.key)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-100">
              <tr className="border-t-2 border-gabi-forest">
                <td colSpan={8} className="sticky left-0 bg-slate-100 px-2 py-2 font-semibold text-gabi-forest">
                  Subtotal mensual
                </td>
                {totalesMes.map((monto, index) => (
                  <td key={index} className="px-1 py-2 text-right tabular-nums font-semibold">
                    {formatCeldaPresupuesto(monto)}
                  </td>
                ))}
                <td className="px-2 py-2 text-right tabular-nums font-semibold">
                  {formatCeldaPresupuesto(totales.subtotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Patrones: <strong>Cada mes</strong> repite el monto en todos los meses desde &quot;Desde&quot;;{" "}
        <strong>Cada N meses</strong> salta N meses (ej. 2 = bimestral); <strong>Pago único</strong> solo en el mes
        inicial. Deja celdas vacías para $0. Publica para ver cambios en la diapositiva.
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Plus, Save, Trash2, Wand2 } from "lucide-react";
import {
  formatCeldaPresupuesto,
  formatMontoInput,
  getNuboPublicidadColumnasMes,
  getNuboPublicidadInversionAnual,
  getNuboPublicidadTotales,
  getNuboPublicidadTotalesMensuales,
  normalizeMontoDigits,
  NUBO_PUBLICIDAD_MESES_PROYECCION,
  NUBO_PUBLICIDAD_META,
  NUBO_PUBLICIDAD_MES_COL_PX,
  NUBO_PUBLICIDAD_TOTAL_COL_PX,
  parseMontoPresupuesto,
} from "@/lib/estudios/nubo-publicidad-content";
import type { NuboPublicidadPartidaMensual } from "@/lib/estudios/nubo-publicidad-partidas";
import { nuboEditorFetch } from "@/lib/estudios/nubo-editor-client";
import {
  buildMesesFromPatron,
  NUBO_PATRON_TIPO_LABEL,
  type NuboPatronTipo,
} from "@/lib/estudios/nubo-publicidad-pattern";
import type { NuboPublicidadPublishMeta } from "@/lib/estudios/nubo-publicidad-store";

const MESES_COUNT = NUBO_PUBLICIDAD_MESES_PROYECCION;

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
  "w-full min-w-0 rounded border border-transparent bg-white px-1 py-0.5 text-[10px] text-[#13315C] outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const mesInput =
  "w-full min-w-0 rounded border border-transparent bg-white px-0.5 py-0.5 text-right text-[10px] tabular-nums outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const mesMonthInput =
  "w-full min-w-0 rounded border border-transparent bg-white px-0.5 py-0.5 text-right text-[10px] tabular-nums outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const cellTd = "px-1 py-0.5 align-top";
const moneyTd = `${cellTd} text-right tabular-nums text-[10px]`;
const headTh = "px-1 py-1.5 font-medium";

const TABLE_COL_W = {
  segmento: 68,
  proveedor: 60,
  concepto: 108,
  patronMonto: NUBO_PUBLICIDAD_MES_COL_PX,
  patronTipo: 78,
  patronN: 26,
  patronDesde: 46,
  patronWand: 26,
  total: NUBO_PUBLICIDAD_TOTAL_COL_PX,
  mes: NUBO_PUBLICIDAD_MES_COL_PX,
  delete: 26,
} as const;

function colStyle(w: number): CSSProperties {
  return { width: w, minWidth: w, maxWidth: w };
}

function presupuestoTableWidth(mesCount: number): number {
  const w = TABLE_COL_W;
  return (
    w.segmento +
    w.proveedor +
    w.concepto +
    w.patronMonto +
    w.patronTipo +
    w.patronN +
    w.patronDesde +
    w.patronWand +
    w.total +
    w.mes * mesCount +
    w.delete
  );
}

function PresupuestoColGroup({ mesCount }: { mesCount: number }) {
  const w = TABLE_COL_W;
  return (
    <colgroup>
      <col style={colStyle(w.segmento)} />
      <col style={colStyle(w.proveedor)} />
      <col style={colStyle(w.concepto)} />
      <col style={colStyle(w.patronMonto)} />
      <col style={colStyle(w.patronTipo)} />
      <col style={colStyle(w.patronN)} />
      <col style={colStyle(w.patronDesde)} />
      <col style={colStyle(w.patronWand)} />
      <col style={colStyle(w.total)} />
      {Array.from({ length: mesCount }, (_, i) => (
        <col key={i} style={colStyle(w.mes)} />
      ))}
      <col style={colStyle(w.delete)} />
    </colgroup>
  );
}

const selectClass =
  "w-full min-w-0 rounded border border-slate-200 bg-white px-0.5 py-0.5 text-[9px] leading-tight text-[#13315C] outline-none focus:border-[#2DD4BF]";

function partidaKey(p: Pick<NuboPublicidadPartidaMensual, "proveedor" | "concepto">, index: number) {
  return `${p.proveedor}-${p.concepto}-${index}`;
}

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

function toPayload(rows: EditablePartida[]): NuboPublicidadPartidaMensual[] {
  return rows.map((row) => {
    const meses = row.meses.map(parseMontoPresupuesto);
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
  return row.meses.reduce((sum, raw) => sum + parseMontoPresupuesto(raw), 0);
}

export function NuboPublicidadAdminPanel({ embedded = false }: { embedded?: boolean }) {
  const columnas = getNuboPublicidadColumnasMes();
  const tableWidth = presupuestoTableWidth(columnas.length);
  const [rows, setRows] = useState<EditablePartida[]>([]);
  const [meta, setMeta] = useState<NuboPublicidadPublishMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [highlightedRowKey, setHighlightedRowKey] = useState<string | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const footerScrollRef = useRef<HTMLDivElement>(null);

  const syncHorizontalScroll = useCallback((from: "main" | "footer") => {
    const main = tableScrollRef.current;
    const footer = footerScrollRef.current;
    if (!main || !footer) return;
    if (from === "main") footer.scrollLeft = main.scrollLeft;
    else main.scrollLeft = footer.scrollLeft;
  }, []);

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
    const digits = normalizeMontoDigits(value);
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const meses = [...row.meses];
        meses[mesIndex] = digits;
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
    setRows((current) => {
      const row = current.find((item) => item.key === key);
      if (!row) return current;

      const monto = parseMontoPresupuesto(row.patronMonto);
      const mesesVacios = Array<string>(MESES_COUNT).fill("");

      if (monto <= 0) {
        if (!normalizeMontoDigits(row.patronMonto)) {
          queueMicrotask(() =>
            setError("Escribe 0 en Monto y pulsa aplicar para vaciar todos los meses de la fila."),
          );
          return current;
        }

        queueMicrotask(() => {
          setError("");
          setSuccess("Meses vaciados ($0 en todos los meses de esta fila).");
          setDirty(true);
          setHighlightedRowKey(key);
          window.setTimeout(() => setHighlightedRowKey(null), 2000);
        });

        return current.map((r) => (r.key === key ? { ...r, meses: mesesVacios } : r));
      }

      if (row.patronTipo === "manual") {
        queueMicrotask(() =>
          setError("Elige una repetición distinta a Manual (celdas) para aplicar un monto."),
        );
        return current;
      }

      const meses = buildMesesFromPatron({
        monto,
        tipo: row.patronTipo,
        intervaloMeses: parseMontoPresupuesto(row.patronIntervalo) || 2,
        mesInicio: row.patronDesde,
        totalMeses: MESES_COUNT,
      });

      const filled = meses.filter((m) => m !== "").length;

      queueMicrotask(() => {
        setError("");
        setSuccess(
          `Patrón aplicado: ${filled} meses con ${formatCeldaPresupuesto(monto)}. Desplaza la tabla hacia la derecha para ver los meses.`,
        );
        setDirty(true);
        setHighlightedRowKey(key);
        window.setTimeout(() => setHighlightedRowKey(null), 2000);
        tableScrollRef.current
          ?.querySelector<HTMLElement>("[data-mes-anchor]")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" });
      });

      return current.map((r) => (r.key === key ? { ...r, meses } : r));
    });
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
              onClick={() => void handleSave()}
              disabled={loading || saving || !dirty}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white hover:bg-gabi-forest-light disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={loading || saving || !dirty}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-semibold text-white hover:bg-gabi-forest-light disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
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
              La columna <strong>Monto</strong> solo sirve con la varita: llena o vacía (con 0) los meses de esa fila.
              Los valores reales están en las celdas mensuales a la derecha.
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
          <div className="overflow-hidden rounded-2xl border border-gabi-forest/8 bg-white shadow-sm">
          <div
            ref={tableScrollRef}
            className="max-h-[min(560px,65vh)] overflow-auto"
            onScroll={() => syncHorizontalScroll("main")}
          >
          <table
            className="table-fixed border-collapse text-[10px]"
            style={{ width: tableWidth }}
          >
            <PresupuestoColGroup mesCount={columnas.length} />
            <thead className="sticky top-0 z-20 bg-slate-50">
              <tr className="border-b border-slate-200 uppercase tracking-wide text-[9px] text-slate-500">
                <th className={`sticky left-0 z-30 bg-slate-50 ${headTh} text-left`}>Segmento</th>
                <th className={`${headTh} text-left`}>Proveedor</th>
                <th className={`${headTh} text-left`}>Concepto</th>
                <th className={`border-l border-slate-200 bg-[#6cc24a]/5 ${headTh} text-left`}>Monto</th>
                <th className={`bg-[#6cc24a]/5 ${headTh} text-left`}>Rep.</th>
                <th className={`bg-[#6cc24a]/5 ${headTh} text-center`}>N</th>
                <th className={`bg-[#6cc24a]/5 ${headTh} text-left`}>Desde</th>
                <th className={`bg-[#6cc24a]/5 ${headTh} text-center`}> </th>
                <th className={`border-l border-slate-200 bg-slate-100 ${headTh} text-right font-bold`}>Total</th>
                {columnas.map((col, colIndex) => (
                  <th
                    key={col.indice}
                    data-mes-anchor={colIndex === 0 ? "true" : undefined}
                    className={`${headTh} text-right whitespace-nowrap`}
                    title={col.etiquetaCorta}
                  >
                    {col.etiquetaCompacta}
                  </th>
                ))}
                <th className={`${headTh} text-center`}> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className={`border-b border-slate-100 hover:bg-slate-50/60 ${
                    highlightedRowKey === row.key ? "bg-emerald-50/80" : ""
                  }`}
                >
                  <td className={`sticky left-0 z-10 bg-white ${cellTd}`}>
                    <input
                      className={cellInput}
                      value={row.segmento}
                      onChange={(e) => patchRow(row.key, { segmento: e.target.value })}
                    />
                  </td>
                  <td className={cellTd}>
                    <input
                      className={cellInput}
                      value={row.proveedor}
                      onChange={(e) => patchRow(row.key, { proveedor: e.target.value })}
                    />
                  </td>
                  <td className={cellTd}>
                    <input
                      className={cellInput}
                      value={row.concepto}
                      onChange={(e) => patchRow(row.key, { concepto: e.target.value })}
                      title={row.concepto}
                    />
                  </td>
                  <td className={`border-l border-slate-100 bg-[#6cc24a]/[0.03] ${cellTd}`}>
                    <input
                      className={mesInput}
                      inputMode="numeric"
                      placeholder="$0"
                      value={formatMontoInput(row.patronMonto)}
                      onChange={(e) =>
                        patchRow(row.key, { patronMonto: normalizeMontoDigits(e.target.value) })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyPatron(row.key);
                        }
                      }}
                    />
                  </td>
                  <td className={`bg-[#6cc24a]/[0.03] ${cellTd}`}>
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
                      <option value="manual">Manual</option>
                    </select>
                  </td>
                  <td className={`bg-[#6cc24a]/[0.03] ${cellTd}`}>
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
                  <td className={`bg-[#6cc24a]/[0.03] ${cellTd}`}>
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
                          {col.etiquetaCompacta}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`bg-[#6cc24a]/[0.03] ${cellTd} text-center`}>
                    <button
                      type="button"
                      title={
                        parseMontoPresupuesto(row.patronMonto) <= 0 &&
                        normalizeMontoDigits(row.patronMonto)
                          ? "Vaciar todos los meses de esta fila"
                          : row.patronTipo === "manual"
                            ? "Cambia la repetición a Cada mes, Cada N meses o Pago único"
                            : "Aplicar patrón a los meses"
                      }
                      disabled={
                        row.patronTipo === "manual" &&
                        (!normalizeMontoDigits(row.patronMonto) ||
                          parseMontoPresupuesto(row.patronMonto) > 0)
                      }
                      onClick={() => applyPatron(row.key)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-gabi-forest/15 text-gabi-forest hover:bg-gabi-cream disabled:opacity-30"
                    >
                      <Wand2 className="h-3 w-3" />
                    </button>
                  </td>
                  <td className={`border-l border-slate-100 bg-slate-50/80 ${moneyTd} font-bold text-gabi-forest`}>
                    {formatCeldaPresupuesto(rowAnual(row))}
                  </td>
                  {row.meses.map((mes, mesIndex) => (
                    <td key={`${row.key}-mes-${mesIndex}`} className={cellTd}>
                      <input
                        className={mesMonthInput}
                        inputMode="numeric"
                        placeholder="$0"
                        value={formatMontoInput(mes)}
                        onChange={(e) => patchMes(row.key, mesIndex, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className={`${cellTd} text-center`}>
                    <button
                      type="button"
                      title="Eliminar fila"
                      onClick={() => removeRow(row.key)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div
            ref={footerScrollRef}
            className="overflow-x-auto border-t-2 border-gabi-forest bg-slate-100"
            onScroll={() => syncHorizontalScroll("footer")}
          >
            <table
              className="table-fixed border-collapse text-[10px]"
              style={{ width: tableWidth }}
            >
              <PresupuestoColGroup mesCount={columnas.length} />
              <tbody>
                <tr>
                  <td
                    colSpan={3}
                    className="sticky left-0 z-10 bg-slate-100 px-2 py-2.5 text-[10px] font-bold uppercase tracking-wide text-gabi-forest whitespace-nowrap shadow-[4px_0_8px_-4px_rgba(19,49,92,0.15)]"
                  >
                    Subtotal mensual
                  </td>
                  <td colSpan={5} className="border-l border-slate-200 bg-slate-100" />
                  <td className={`border-l border-slate-200 bg-slate-100 ${moneyTd} py-2.5 font-bold text-gabi-forest`}>
                    {formatCeldaPresupuesto(totales.subtotal)}
                  </td>
                  {totalesMes.map((monto, index) => (
                    <td
                      key={index}
                      className={`bg-slate-100 ${moneyTd} py-2.5 font-semibold text-gabi-forest`}
                    >
                      {formatCeldaPresupuesto(monto)}
                    </td>
                  ))}
                  <td className="bg-slate-100" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Patrones: <strong>Cada mes</strong> repite el monto en todos los meses desde &quot;Desde&quot;;{" "}
        <strong>Cada N meses</strong> salta N meses (ej. 2 = bimestral); <strong>Pago único</strong> solo en el mes
        inicial. Escribe <strong>0</strong> en Monto y aplica para vaciar toda la fila. Publica para ver cambios en la
        diapositiva.
      </p>
    </div>
  );
}

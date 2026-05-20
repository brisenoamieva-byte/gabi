"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { Prototipo } from "@/lib/data";
import { parseRazonesVenta } from "@/lib/inventario/productos-recomendados";
import type { ProductoRecomendadoRecord } from "@/lib/inventario/productos-recomendados";
import { superficieColumnHint } from "@/lib/inventario/csv-productos";

const tipos = ["casa", "departamento", "terreno"] as const;

export type EditableProductoRow = {
  id: string;
  unidad: string;
  tipo: (typeof tipos)[number];
  prototipoId: string;
  precio: string;
  superficieTerrenoM2: string;
  superficieConstruccionM2: string;
  entrega: string;
  etapa: string;
  visitable: boolean;
  razonesVenta: string;
  instruccionRecorrido: string;
  notaAcceso: string;
  orden: number;
  isNew?: boolean;
};

type ProductosSpreadsheetTableProps = {
  rows: ProductoRecomendadoRecord[];
  prototipos: Prototipo[];
  desarrolloId: string;
  clusterId: string;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const cellClass =
  "w-full min-w-0 rounded-lg border border-transparent bg-white px-2 py-1.5 text-sm text-[#13315C] outline-none focus:border-[#2DD4BF] focus:ring-1 focus:ring-[#2DD4BF]/30";

const headerClass =
  "px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400";

export const recordToEditableRow = (record: ProductoRecomendadoRecord): EditableProductoRow => ({
  id: record.id,
  unidad: record.unidad,
  tipo: record.tipo,
  prototipoId: record.prototipo_id ?? "",
  precio: record.precio?.toString() ?? "",
  superficieTerrenoM2: record.superficie_terreno_m2?.toString() ?? "",
  superficieConstruccionM2: record.superficie_construccion_m2?.toString() ?? "",
  entrega: record.entrega ?? "",
  etapa: record.etapa ?? "",
  visitable: record.visitable,
  razonesVenta: (record.razones_venta ?? []).join(" | "),
  instruccionRecorrido: record.instruccion_recorrido ?? "",
  notaAcceso: record.nota_acceso ?? "",
  orden: record.orden,
});

const emptyEditableRow = (orden: number): EditableProductoRow => ({
  id: `new-${Date.now()}`,
  unidad: "",
  tipo: "casa",
  prototipoId: "",
  precio: "",
  superficieTerrenoM2: "",
  superficieConstruccionM2: "",
  entrega: "",
  etapa: "",
  visitable: true,
  razonesVenta: "",
  instruccionRecorrido: "",
  notaAcceso: "",
  orden,
  isNew: true,
});

const rowToPayload = (
  row: EditableProductoRow,
  desarrolloId: string,
  clusterId: string,
) => ({
  desarrolloId,
  clusterId,
  unidad: row.unidad.trim(),
  tipo: row.tipo,
  estatus: "disponible" as const,
  prototipoId: row.prototipoId || null,
  precio: row.precio ? Number(row.precio.replace(/[$,\s]/g, "")) : null,
  superficieTerrenoM2: row.superficieTerrenoM2 ? Number(row.superficieTerrenoM2) : null,
  superficieConstruccionM2: row.superficieConstruccionM2
    ? Number(row.superficieConstruccionM2)
    : null,
  entrega: row.entrega.trim() || null,
  etapa: row.etapa.trim() || null,
  orden: row.orden,
  visitable: row.visitable,
  prioridadComercial: "alta" as const,
  razonesVenta: parseRazonesVenta(row.razonesVenta.replace(/\|/g, "\n")),
  instruccionRecorrido: row.instruccionRecorrido.trim() || null,
  notaAcceso: row.notaAcceso.trim() || null,
});

export function ProductosSpreadsheetTable({
  rows,
  prototipos,
  desarrolloId,
  clusterId,
  onRefresh,
  onError,
  onSuccess,
}: ProductosSpreadsheetTableProps) {
  const [sheetRows, setSheetRows] = useState<EditableProductoRow[]>([]);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setSheetRows(rows.filter((item) => item.activo).map(recordToEditableRow));
    setDirtyIds(new Set());
  }, [rows]);

  const markDirty = (id: string) => {
    setDirtyIds((current) => new Set(current).add(id));
  };

  const updateRow = (id: string, patch: Partial<EditableProductoRow>) => {
    setSheetRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    markDirty(id);
  };

  const saveRow = async (row: EditableProductoRow) => {
    if (!row.unidad.trim()) {
      onError("Escribe el número o nombre de la propiedad.");
      return;
    }

    setSavingId(row.id);
    onError("");

    try {
      const payload = rowToPayload(row, desarrolloId, clusterId);
      const response = await fetch(
        row.isNew ? "/api/admin/inventario" : `/api/admin/inventario/${row.id}`,
        {
          method: row.isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar la fila.");
      }

      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
      onSuccess(row.isNew ? "Fila agregada." : "Fila actualizada.");
      await onRefresh();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSavingId(null);
    }
  };

  const deleteRow = async (id: string, isNew?: boolean) => {
    if (isNew) {
      setSheetRows((current) => current.filter((row) => row.id !== id));
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      return;
    }

    if (!window.confirm("¿Quitar esta fila de la lista?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/inventario/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar.");
      }
      await onRefresh();
    } catch (deleteError) {
      onError(deleteError instanceof Error ? deleteError.message : "Error al eliminar");
    }
  };

  const reorder = async (id: string, direction: "up" | "down") => {
    const index = sheetRows.findIndex((row) => row.id === id);
    if (index < 0) {
      return;
    }

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sheetRows.length) {
      return;
    }

    const reordered = [...sheetRows];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];

    const persisted = reordered.filter((row) => !row.isNew);
    if (persisted.length !== reordered.length) {
      onError("Guarda las filas nuevas antes de reordenar.");
      return;
    }

    const ids = reordered.map((row) => row.id);

    try {
      const response = await fetch("/api/admin/inventario", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo reordenar.");
      }
      await onRefresh();
    } catch (reorderError) {
      onError(reorderError instanceof Error ? reorderError.message : "Error al reordenar");
    }
  };

  const addRow = () => {
    const nextRow = emptyEditableRow(sheetRows.length + 1);
    setSheetRows((current) => [...current, nextRow]);
    setDirtyIds((current) => new Set(current).add(nextRow.id));
    setExpandedId(nextRow.id);
  };

  const dirtyCount = useMemo(() => dirtyIds.size, [dirtyIds]);

  if (!sheetRows.length) {
    return (
      <div className="mt-5 space-y-3">
        <p className="text-sm text-slate-500">
          Sin filas aún. Agrega la primera o importa desde Excel/CSV.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2DD4BF] px-4 text-sm font-bold text-[#13315C]"
        >
          <Plus className="h-4 w-4" />
          Agregar fila
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Edita celdas directamente.{" "}
          {dirtyCount ? (
            <span className="font-semibold text-[#13315C]">{dirtyCount} fila(s) sin guardar</span>
          ) : (
            "Los cambios se guardan fila por fila."
          )}
        </p>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#13315C]/15 bg-white px-3 text-xs font-bold text-[#13315C]"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar fila
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[1100px] w-full border-collapse bg-slate-50 text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-white">
              <th className={headerClass}>#</th>
              <th className={headerClass}>Unidad *</th>
              <th className={headerClass}>Tipo</th>
              <th className={headerClass}>Prototipo</th>
              <th className={headerClass}>Precio</th>
              <th className={headerClass}>m² terreno</th>
              <th className={headerClass}>m² construcción</th>
              <th className={headerClass}>Entrega</th>
              <th className={headerClass}>Razones venta</th>
              <th className={headerClass}>Visitable</th>
              <th className={headerClass}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sheetRows.map((row, index) => {
              const isDirty = dirtyIds.has(row.id);
              const isSaving = savingId === row.id;
              const isExpanded = expandedId === row.id;

              return (
                <Fragment key={row.id}>
                  <tr
                    className={`border-b border-slate-100 ${isDirty ? "bg-[#2DD4BF]/5" : "bg-white"}`}
                  >
                    <td className="px-2 py-2 font-black text-[#13315C]">{index + 1}</td>
                    <td className="px-2 py-2 min-w-[8rem]">
                      <input
                        value={row.unidad}
                        onChange={(event) => updateRow(row.id, { unidad: event.target.value })}
                        className={cellClass}
                        placeholder="Vivienda 53"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.tipo}
                        onChange={(event) =>
                          updateRow(row.id, {
                            tipo: event.target.value as EditableProductoRow["tipo"],
                          })
                        }
                        className={cellClass}
                        title={superficieColumnHint(row.tipo)}
                      >
                        {tipos.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 min-w-[7rem]">
                      <select
                        value={row.prototipoId}
                        onChange={(event) =>
                          updateRow(row.id, { prototipoId: event.target.value })
                        }
                        className={cellClass}
                      >
                        <option value="">—</option>
                        {prototipos.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2 min-w-[6rem]">
                      <input
                        value={row.precio}
                        onChange={(event) => updateRow(row.id, { precio: event.target.value })}
                        className={cellClass}
                        inputMode="numeric"
                        placeholder="5400000"
                      />
                    </td>
                    <td className="px-2 py-2 min-w-[5rem]">
                      <input
                        value={row.superficieTerrenoM2}
                        onChange={(event) =>
                          updateRow(row.id, { superficieTerrenoM2: event.target.value })
                        }
                        className={cellClass}
                        inputMode="decimal"
                        placeholder={row.tipo === "departamento" ? "—" : "196"}
                        disabled={row.tipo === "departamento"}
                      />
                    </td>
                    <td className="px-2 py-2 min-w-[5rem]">
                      <input
                        value={row.superficieConstruccionM2}
                        onChange={(event) =>
                          updateRow(row.id, { superficieConstruccionM2: event.target.value })
                        }
                        className={cellClass}
                        inputMode="decimal"
                        placeholder={row.tipo === "terreno" ? "—" : "181"}
                        disabled={row.tipo === "terreno"}
                      />
                    </td>
                    <td className="px-2 py-2 min-w-[6rem]">
                      <input
                        value={row.entrega}
                        onChange={(event) => updateRow(row.id, { entrega: event.target.value })}
                        className={cellClass}
                      />
                    </td>
                    <td className="px-2 py-2 min-w-[10rem]">
                      <input
                        value={row.razonesVenta}
                        onChange={(event) =>
                          updateRow(row.id, { razonesVenta: event.target.value })
                        }
                        className={cellClass}
                        placeholder="Razón 1 | Razón 2"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.visitable}
                        onChange={(event) =>
                          updateRow(row.id, { visitable: event.target.checked })
                        }
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          title="Guardar fila"
                          disabled={!isDirty || isSaving}
                          onClick={() => void saveRow(row)}
                          className="rounded-lg border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 p-1.5 text-[#13315C] disabled:opacity-30"
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          title="Subir"
                          disabled={index === 0}
                          onClick={() => void reorder(row.id, "up")}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Bajar"
                          disabled={index === sheetRows.length - 1}
                          onClick={() => void reorder(row.id, "down")}
                          className="rounded-lg border border-slate-200 bg-white p-1.5 disabled:opacity-30"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Más campos"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold uppercase"
                        >
                          {isExpanded ? "−" : "+"}
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={() => void deleteRow(row.id, row.isNew)}
                          className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-b border-slate-100 bg-white">
                      <td colSpan={10} className="px-4 py-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <label className="block">
                            <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">
                              Etapa
                            </span>
                            <input
                              value={row.etapa}
                              onChange={(event) =>
                                updateRow(row.id, { etapa: event.target.value })
                              }
                              className={cellClass}
                            />
                          </label>
                          <label className="block md:col-span-2">
                            <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">
                              Instrucción recorrido
                            </span>
                            <input
                              value={row.instruccionRecorrido}
                              onChange={(event) =>
                                updateRow(row.id, { instruccionRecorrido: event.target.value })
                              }
                              className={cellClass}
                            />
                          </label>
                          <label className="block md:col-span-3">
                            <span className="mb-1 block text-[10px] font-bold uppercase text-slate-400">
                              Nota de acceso
                            </span>
                            <input
                              value={row.notaAcceso}
                              onChange={(event) =>
                                updateRow(row.id, { notaAcceso: event.target.value })
                              }
                              className={cellClass}
                            />
                          </label>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

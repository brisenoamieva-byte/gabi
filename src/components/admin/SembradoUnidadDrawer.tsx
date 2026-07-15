"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { parseRazonesVenta } from "@/lib/inventario/productos-recomendados";
import {
  estatusSembradoLabel,
  type InventarioEstatus,
  type SembradoUnidadRow,
} from "@/lib/comercial/sembrado-status";

type SembradoUnidadDrawerProps = {
  row: SembradoUnidadRow;
  onClose: () => void;
  onSuccess: () => void;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const estatusInventarioLabel: Record<InventarioEstatus, string> = {
  disponible: "Disponible",
  apartado: "Apartado",
  vendido: "Vendido",
  bloqueado: "Bloqueado",
};

const estatusInventarioColor: Record<InventarioEstatus, string> = {
  disponible: "bg-emerald-100 text-emerald-800",
  apartado: "bg-amber-100 text-amber-800",
  vendido: "bg-slate-100 text-slate-700",
  bloqueado: "bg-red-100 text-red-700",
};

export function SembradoUnidadDrawer({ row, onClose, onSuccess }: SembradoUnidadDrawerProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    precio: row.precio?.toString() ?? "",
    orden: row.orden.toString(),
    visitable: row.visitable,
    prioridadComercial: row.prioridadComercial,
    razonesVenta: row.razonesVenta.join("\n"),
    instruccionRecorrido: row.instruccionRecorrido ?? "",
    notaAcceso: row.notaAcceso ?? "",
    ubicacionComercial: row.ubicacionComercial ?? "",
    etapa: row.etapa ?? "",
    superficieTerrenoM2: row.superficieTerrenoM2?.toString() ?? "",
    superficieConstruccionM2: row.superficieConstruccionM2?.toString() ?? "",
  });

  const estatusSembrado =
    row.operacion?.estatus_sembrado ??
    (row.estatusInventario === "apartado" ? "Apartado pendiente" : "Disponibles");

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/sembrado/unidades/${row.unidadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precio: form.precio ? Number(form.precio.replace(/[$,\s]/g, "")) : null,
          orden: Number(form.orden) || 0,
          visitable: form.visitable,
          prioridadComercial: form.prioridadComercial,
          razonesVenta: parseRazonesVenta(form.razonesVenta),
          instruccionRecorrido: form.instruccionRecorrido.trim() || null,
          notaAcceso: form.notaAcceso.trim() || null,
          ubicacionComercial: form.ubicacionComercial.trim() || null,
          etapa: form.etapa.trim() || null,
          superficieTerrenoM2: form.superficieTerrenoM2
            ? Number(form.superficieTerrenoM2)
            : null,
          superficieConstruccionM2: form.superficieConstruccionM2
            ? Number(form.superficieConstruccionM2)
            : null,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      onSuccess();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white pt-[env(safe-area-inset-top)] shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Unidad · {row.tipo}
            </p>
            <h3 className="text-xl font-black text-gabi-forest">{row.unidad}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Disponibilidad (sembrado)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${estatusInventarioColor[row.estatusInventario]}`}
              >
                {estatusInventarioLabel[row.estatusInventario]}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                {estatusSembradoLabel[estatusSembrado] ?? estatusSembrado}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              El estatus comercial se administra desde apartados y operaciones. Aquí editas datos
              de producto y recorrido.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <Field label="Precio lista">
              <input
                value={form.precio}
                onChange={(event) => setForm((prev) => ({ ...prev, precio: event.target.value }))}
                className={inputClass}
                placeholder="0"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sup. terreno m²">
                <input
                  value={form.superficieTerrenoM2}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, superficieTerrenoM2: event.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Sup. construcción m²">
                <input
                  value={form.superficieConstruccionM2}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, superficieConstruccionM2: event.target.value }))
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Etapa / torre">
              <input
                value={form.etapa}
                onChange={(event) => setForm((prev) => ({ ...prev, etapa: event.target.value }))}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Orden en recorrido">
                <input
                  type="number"
                  value={form.orden}
                  onChange={(event) => setForm((prev) => ({ ...prev, orden: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Prioridad comercial">
                <select
                  value={form.prioridadComercial}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      prioridadComercial: event.target.value as "alta" | "media" | "baja",
                    }))
                  }
                  className={inputClass}
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={form.visitable}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, visitable: event.target.checked }))
                }
                className="rounded border-slate-300"
              />
              Mostrar en recorrido / cotizador
            </label>

            <Field label="Ubicación comercial">
              <input
                value={form.ubicacionComercial}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ubicacionComercial: event.target.value }))
                }
                className={inputClass}
              />
            </Field>

            <Field label="Razones de venta (una por línea)">
              <textarea
                value={form.razonesVenta}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, razonesVenta: event.target.value }))
                }
                rows={4}
                className={inputClass}
              />
            </Field>

            <Field label="Instrucción para recorrido">
              <textarea
                value={form.instruccionRecorrido}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, instruccionRecorrido: event.target.value }))
                }
                rows={3}
                className={inputClass}
              />
            </Field>

            <Field label="Nota de acceso">
              <textarea
                value={form.notaAcceso}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notaAcceso: event.target.value }))
                }
                rows={2}
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gabi-forest px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

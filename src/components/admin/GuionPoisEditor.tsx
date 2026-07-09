"use client";

import { Plus, Trash2 } from "lucide-react";
import type { PuntoInteres } from "@/lib/data";
import { slugifyCatalogId } from "@/lib/catalog/slug";
import { emptyPuntoInteres } from "@/lib/catalog/recorrido-content-editor";

type Props = {
  puntos: PuntoInteres[];
  categoriasOrden: string;
  onPuntosChange: (puntos: PuntoInteres[]) => void;
  onCategoriasOrdenChange: (value: string) => void;
};

function Field({
  label,
  children,
  className = "",
  hint,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function GuionPoisEditor({
  puntos,
  categoriasOrden,
  onPuntosChange,
  onCategoriasOrdenChange,
}: Props) {
  const patchPunto = (index: number, patch: Partial<PuntoInteres>) => {
    onPuntosChange(
      puntos.map((punto, itemIndex) => (itemIndex === index ? { ...punto, ...patch } : punto)),
    );
  };

  const addPunto = () => {
    onPuntosChange([...puntos, emptyPuntoInteres()]);
  };

  const removePunto = (index: number) => {
    onPuntosChange(puntos.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-4 sm:col-span-2">
      <Field
        label="Orden de categorías"
        className="sm:col-span-2"
        hint="Una categoría por línea. Define el orden en el mapa del recorrido."
      >
        <textarea
          value={categoriasOrden}
          onChange={(event) => onCategoriasOrdenChange(event.target.value)}
          className="input-cotizador min-h-20"
          placeholder={"Comercio\nSupermercados\nEducación"}
        />
      </Field>

      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Puntos de interés ({puntos.length})
        </p>
        <button
          type="button"
          onClick={addPunto}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#13315C]/15 px-3 text-xs font-bold text-[#13315C] hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar POI
        </button>
      </div>

      {!puntos.length ? (
        <p className="sm:col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Sin puntos en el mapa. Agrega comercios, escuelas, hospitales y conectividad cercana.
        </p>
      ) : (
        puntos.map((punto, index) => (
          <article
            key={`${punto.id}-${index}`}
            className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-black text-[#13315C]">
                {punto.nombre.trim() || `Punto ${index + 1}`}
              </p>
              <button
                type="button"
                onClick={() => removePunto(index)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar punto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={punto.nombre}
                  onChange={(event) => {
                    const nombre = event.target.value;
                    patchPunto(index, {
                      nombre,
                      id: punto.id || slugifyCatalogId(nombre),
                    });
                  }}
                  className="input-cotizador"
                />
              </Field>
              <Field label="ID">
                <input
                  value={punto.id}
                  onChange={(event) =>
                    patchPunto(index, { id: slugifyCatalogId(event.target.value) })
                  }
                  className="input-cotizador"
                />
              </Field>
              <Field label="Categoría">
                <input
                  value={punto.categoria}
                  onChange={(event) => patchPunto(index, { categoria: event.target.value })}
                  className="input-cotizador"
                  placeholder="Comercio"
                />
              </Field>
              <Field label="Tiempo / distancia">
                <input
                  value={punto.tiempo}
                  onChange={(event) => patchPunto(index, { tiempo: event.target.value })}
                  className="input-cotizador"
                  placeholder="5 min"
                />
              </Field>
              <Field label="Detalle" className="sm:col-span-2">
                <textarea
                  value={punto.detalle}
                  onChange={(event) => patchPunto(index, { detalle: event.target.value })}
                  className="input-cotizador min-h-20"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(punto.destacado)}
                  onChange={(event) =>
                    patchPunto(index, { destacado: event.target.checked || undefined })
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Destacado en el mapa
              </label>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

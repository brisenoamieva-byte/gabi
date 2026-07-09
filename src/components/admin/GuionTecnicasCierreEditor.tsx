"use client";

import { Plus, Trash2 } from "lucide-react";
import type { TecnicaCierre } from "@/lib/data";
import { slugifyCatalogId } from "@/lib/catalog/slug";
import { emptyTecnicaCierre } from "@/lib/catalog/recorrido-content-editor";

type Props = {
  tecnicas: TecnicaCierre[];
  onChange: (tecnicas: TecnicaCierre[]) => void;
};

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function GuionTecnicasCierreEditor({ tecnicas, onChange }: Props) {
  const patchTecnica = (index: number, patch: Partial<TecnicaCierre>) => {
    onChange(
      tecnicas.map((tecnica, itemIndex) =>
        itemIndex === index ? { ...tecnica, ...patch } : tecnica,
      ),
    );
  };

  const addTecnica = () => {
    onChange([...tecnicas, emptyTecnicaCierre()]);
  };

  const removeTecnica = (index: number) => {
    onChange(tecnicas.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Técnicas de cierre ({tecnicas.length})
        </p>
        <button
          type="button"
          onClick={addTecnica}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#13315C]/15 px-3 text-xs font-bold text-[#13315C] hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar técnica
        </button>
      </div>

      {!tecnicas.length ? (
        <p className="sm:col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Sin técnicas configuradas. La etapa de cierre del recorrido quedará vacía.
        </p>
      ) : (
        tecnicas.map((tecnica, index) => (
          <article
            key={`${tecnica.id}-${index}`}
            className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-black text-[#13315C]">
                {tecnica.nombre.trim() || `Técnica ${index + 1}`}
              </p>
              <button
                type="button"
                onClick={() => removeTecnica(index)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar técnica"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={tecnica.nombre}
                  onChange={(event) => {
                    const nombre = event.target.value;
                    patchTecnica(index, {
                      nombre,
                      id: tecnica.id || slugifyCatalogId(nombre),
                    });
                  }}
                  className="input-cotizador"
                />
              </Field>
              <Field label="ID">
                <input
                  value={tecnica.id}
                  onChange={(event) =>
                    patchTecnica(index, { id: slugifyCatalogId(event.target.value) })
                  }
                  className="input-cotizador"
                />
              </Field>
              <Field label="Descripción" className="sm:col-span-2">
                <textarea
                  value={tecnica.descripcion}
                  onChange={(event) => patchTecnica(index, { descripcion: event.target.value })}
                  className="input-cotizador min-h-16"
                />
              </Field>
              <Field label="Ejemplo" className="sm:col-span-2">
                <textarea
                  value={tecnica.ejemplo}
                  onChange={(event) => patchTecnica(index, { ejemplo: event.target.value })}
                  className="input-cotizador min-h-16"
                />
              </Field>
              <Field label="Cuándo usar" className="sm:col-span-2">
                <textarea
                  value={tecnica.cuandoUsar}
                  onChange={(event) => patchTecnica(index, { cuandoUsar: event.target.value })}
                  className="input-cotizador min-h-16"
                />
              </Field>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

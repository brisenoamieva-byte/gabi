"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import {
  formatMarcajeHora,
  guardiaMarcajeCumplimientoLabel,
  type GuardiaMarcajesDiaPayload,
} from "@/lib/admin/guardia-marcajes-types";
import { formatDateYmd } from "@/lib/comercial/guardias";

type Props = {
  desarrolloId: string;
};

export function GuardiasMarcajesHoyPanel({ desarrolloId }: Props) {
  const [payload, setPayload] = useState<GuardiaMarcajesDiaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fecha = formatDateYmd(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ desarrolloId, fecha });
      const res = await fetch(`/api/admin/guardias/marcajes?${params}`);
      const data = (await res.json()) as GuardiaMarcajesDiaPayload & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los marcajes.");
      }
      setPayload(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar marcajes.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, fecha]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !payload?.marcajesEnabled) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Marcajes de caseta · hoy
          </p>
          <h3 className="text-lg font-black text-gabi-forest">Entradas y salidas</h3>
          {payload?.caseta ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {payload.caseta.etiqueta ?? "Caseta de ventas"} · radio {payload.caseta.radioMetros} m
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando marcajes…
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}

      {!loading && payload && payload.filas.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No hay guardias asignadas para hoy.</p>
      ) : null}

      {!loading && payload && payload.filas.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                <th className="px-2 py-2">Asesor</th>
                <th className="px-2 py-2">Turno</th>
                <th className="px-2 py-2">Entrada</th>
                <th className="px-2 py-2">Salida</th>
                <th className="px-2 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {payload.filas.map((fila) => (
                <tr key={fila.asignacionId} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-2 font-semibold text-gabi-forest">
                    {fila.asesorNombre ?? fila.asesorId}
                  </td>
                  <td className="px-2 py-2 text-slate-600">{fila.turnoLabel}</td>
                  <td className="px-2 py-2 tabular-nums text-slate-700">
                    {fila.entrada
                      ? `${formatMarcajeHora(fila.entrada.registradoAt)} · ${Math.round(fila.entrada.distanciaMetros)} m`
                      : "—"}
                  </td>
                  <td className="px-2 py-2 tabular-nums text-slate-700">
                    {fila.salida
                      ? `${formatMarcajeHora(fila.salida.registradoAt)} · ${Math.round(fila.salida.distanciaMetros)} m`
                      : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        fila.cumplimiento === "completo"
                          ? "bg-emerald-100 text-emerald-800"
                          : fila.cumplimiento === "sin_publicar"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {guardiaMarcajeCumplimientoLabel(fila.cumplimiento)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

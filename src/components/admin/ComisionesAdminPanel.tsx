"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileCheck, FolderOpen, Loader2, RefreshCw } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import type {
  SolicitudComisionListRow,
  SolicitudesComisionResumen,
} from "@/lib/admin/comision-service";
import { ExpedienteDrawer } from "@/components/admin/ExpedienteDrawer";
import { formatLeadDate } from "@/lib/comercial/format-lead-date";
import { formatPrice } from "@/lib/data";

type ComisionesAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  /** Si true, filtra por defecto solicitudes pendientes. */
  focusPendientes?: boolean;
};

const ESTADOS = ["", "pendiente", "autorizada", "rechazada", "facturada"] as const;

const estadoLabel: Record<string, string> = {
  pendiente: "Pendiente",
  autorizada: "Autorizada",
  rechazada: "Rechazada",
  facturada: "Facturada",
};

const estadoClass: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-900",
  autorizada: "bg-emerald-100 text-emerald-800",
  rechazada: "bg-red-100 text-red-800",
  facturada: "bg-slate-200 text-slate-800",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

export function ComisionesAdminPanel({
  desarrollos,
  scopeLabel,
  focusPendientes = false,
}: ComisionesAdminPanelProps) {
  const [desarrolloId, setDesarrolloId] = useState("");
  const [estadoFilter, setEstadoFilter] = useState(focusPendientes ? "pendiente" : "");
  const [solicitudes, setSolicitudes] = useState<SolicitudComisionListRow[]>([]);
  const [resumen, setResumen] = useState<SolicitudesComisionResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [selectedOperacionId, setSelectedOperacionId] = useState<string | null>(null);

  const desarrolloNames = useMemo(
    () => Object.fromEntries(desarrollos.map((item) => [item.id, item.nombre])),
    [desarrollos],
  );

  const loadSolicitudes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ enriched: "1" });
      if (desarrolloId) {
        params.set("desarrolloId", desarrolloId);
      }
      if (estadoFilter) {
        params.set("estado", estadoFilter);
      }

      const response = await fetch(`/api/admin/comisiones?${params.toString()}`);
      const data = (await response.json()) as {
        solicitudes?: SolicitudComisionListRow[];
        resumen?: SolicitudesComisionResumen;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar las solicitudes.");
      }

      setSolicitudes(data.solicitudes ?? []);
      setResumen(data.resumen ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setSolicitudes([]);
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, estadoFilter]);

  useEffect(() => {
    void loadSolicitudes();
  }, [loadSolicitudes]);

  const resolver = async (
    solicitudId: string,
    accion: "autorizar" | "rechazar" | "facturar",
  ) => {
    setResolviendoId(solicitudId);
    setError("");

    try {
      const body: { solicitudId: string; accion: typeof accion; motivoRechazo?: string } = {
        solicitudId,
        accion,
      };
      if (accion === "rechazar") {
        const motivo = window.prompt("Motivo del rechazo (opcional)") ?? "";
        if (motivo) {
          body.motivoRechazo = motivo;
        }
      }

      const response = await fetch("/api/admin/comisiones", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }
      void loadSolicitudes();
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "Error al resolver.");
    } finally {
      setResolviendoId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Facturación comercial
            </p>
            <h2 className="text-xl font-black text-gabi-forest">Solicitudes de comisión</h2>
            <p className="mt-1 text-sm text-slate-500">
              Autoriza facturas cuando el expediente está completo y el enganche cubierto.
              {scopeLabel ? ` ${scopeLabel}.` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadSolicitudes()}
            className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {resumen ? (
            <>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                {resumen.pendiente} pendientes
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {resumen.autorizada} autorizadas
              </span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                {resumen.facturada} facturadas
              </span>
            </>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className={inputClass}
            >
              <option value="">Todos</option>
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[180px] text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Estado</span>
            <select
              value={estadoFilter}
              onChange={(event) => setEstadoFilter(event.target.value)}
              className={inputClass}
            >
              {ESTADOS.map((estado) => (
                <option key={estado || "all"} value={estado}>
                  {estado ? estadoLabel[estado] : "Todos"}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando solicitudes…
          </div>
        ) : !solicitudes.length ? (
          <p className="px-6 py-16 text-center text-sm text-slate-500">
            No hay solicitudes con estos filtros.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Desarrollo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-500">{formatLeadDate(row.created_at)}</td>
                    <td className="px-4 py-3">{desarrolloNames[row.desarrollo_id] ?? row.desarrollo_id}</td>
                    <td className="px-4 py-3 font-semibold text-gabi-forest">{row.clienteNombre}</td>
                    <td className="px-4 py-3">{row.unidadNumero}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold tabular-nums">{formatPrice(Number(row.monto_solicitado))}</p>
                      <p className="text-xs text-slate-500">
                        {row.comision_pct != null ? `${row.comision_pct}% com.` : "—"} · tramo{" "}
                        {row.porcentaje_pago}%
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${estadoClass[row.estado] ?? "bg-slate-100"}`}
                      >
                        {estadoLabel[row.estado] ?? row.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedOperacionId(row.operacion_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gabi-forest/15 px-2 py-1 text-xs font-bold text-gabi-forest"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          Expediente
                        </button>
                        {row.estado === "pendiente" ? (
                          <>
                            <button
                              type="button"
                              disabled={resolviendoId === row.id}
                              onClick={() => void resolver(row.id, "autorizar")}
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                            >
                              Autorizar
                            </button>
                            <button
                              type="button"
                              disabled={resolviendoId === row.id}
                              onClick={() => void resolver(row.id, "rechazar")}
                              className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-700"
                            >
                              Rechazar
                            </button>
                          </>
                        ) : null}
                        {row.estado === "autorizada" ? (
                          <button
                            type="button"
                            disabled={resolviendoId === row.id}
                            onClick={() => void resolver(row.id, "facturar")}
                            className="inline-flex items-center gap-1 rounded-lg bg-gabi-forest px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                          >
                            <FileCheck className="h-3.5 w-3.5" />
                            Facturada
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOperacionId ? (
        <ExpedienteDrawer
          operacionId={selectedOperacionId}
          onClose={() => setSelectedOperacionId(null)}
          onUpdated={() => void loadSolicitudes()}
        />
      ) : null}
    </div>
  );
}

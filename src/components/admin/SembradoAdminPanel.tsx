"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Home, Layers, Loader2, Plus, RefreshCw } from "lucide-react";
import type { Desarrollo } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { RegistrarApartadoModal } from "@/components/admin/RegistrarApartadoModal";
import { OperacionDetailDrawer } from "@/components/admin/OperacionDetailDrawer";
import {
  estatusSembradoLabel,
  LA_VISTA_RESIDENCIAL_ID,
  LA_VISTA_SEMBRADO_SEGMENTOS,
  PASAJE_ALAMOS_ID,
  PASAJE_SEMBRADO_SEGMENTOS,
  type LaVistaSembradoSegmentoId,
  type PasajeSembradoSegmentoId,
  type SembradoUnidadRow,
} from "@/lib/comercial/sembrado-status";

type SembradoAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
};

type Resumen = {
  total: number;
  porEstatus: Record<string, number>;
};

function SembradoTable({
  filas,
  estatusFilter,
  showAllUnits,
  onRegistrarApartado,
  onCompletarApartado,
  onVerOperacion,
}: {
  filas: SembradoUnidadRow[];
  estatusFilter: string;
  showAllUnits: boolean;
  onRegistrarApartado: (unidadId: string) => void;
  onCompletarApartado: (unidadId: string) => void;
  onVerOperacion: (operacionId: string) => void;
}) {
  const rowsToShow = useMemo(() => {
    if (estatusFilter) {
      return filas.filter(
        (row) => (row.operacion?.estatus_sembrado ?? "Disponibles") === estatusFilter,
      );
    }
    if (showAllUnits) {
      return filas;
    }
    return filas.filter((row) => row.operacion || row.estatusInventario === "apartado");
  }, [filas, estatusFilter, showAllUnits]);

  if (!rowsToShow.length) {
    return (
      <p className="px-6 py-12 text-center text-sm text-slate-500">
        No hay unidades en esta sección con el filtro actual.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Unidad</th>
            <th className="px-4 py-3">Lista</th>
            <th className="px-4 py-3">Estatus</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Medio</th>
            <th className="px-4 py-3">Esquema</th>
            <th className="px-4 py-3">Precio venta</th>
            <th className="px-4 py-3">Cobrado</th>
            <th className="px-4 py-3">Saldo</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rowsToShow.map((row) => {
            const op = row.operacion;
            const apartadoPendiente = !op && row.estatusInventario === "apartado";
            const estatus = op?.estatus_sembrado ?? (apartadoPendiente ? "Apartado pendiente" : "Disponibles");
            const precioVenta = op?.precio_venta ?? 0;
            const saldo =
              op?.comprobacion ?? (precioVenta ? precioVenta - row.totalCobrado : null);
            const puedeApartar = !op && row.estatusInventario === "disponible";

            return (
              <tr
                key={row.unidadId}
                className={`border-t border-slate-100 ${op ? "cursor-pointer hover:bg-slate-50" : apartadoPendiente ? "bg-amber-50/40" : ""}`}
                onClick={() => {
                  if (op) {
                    onVerOperacion(op.id);
                  }
                }}
              >
                <td className="px-4 py-3 font-bold text-gabi-forest">{row.unidad}</td>
                <td className="px-4 py-3 text-slate-600">{row.listaPrecios ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      apartadoPendiente
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {estatusSembradoLabel[estatus] ?? estatus}
                  </span>
                </td>
                <td className="px-4 py-3">{op?.cliente_nombre ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{op?.medio_publicitario ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{op?.esquema_pago ?? "—"}</td>
                <td className="px-4 py-3 tabular-nums">
                  {precioVenta ? formatPrice(precioVenta) : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {row.totalCobrado ? formatPrice(row.totalCobrado) : "—"}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {saldo != null ? formatPrice(saldo) : "—"}
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  {puedeApartar ? (
                    <button
                      type="button"
                      onClick={() => onRegistrarApartado(row.unidadId)}
                      className="rounded-lg border border-gabi-forest/20 px-2 py-1 text-xs font-bold text-gabi-forest hover:bg-gabi-forest/5"
                    >
                      Apartado
                    </button>
                  ) : apartadoPendiente ? (
                    <button
                      type="button"
                      onClick={() => onCompletarApartado(row.unidadId)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100"
                    >
                      Completar
                    </button>
                  ) : op ? (
                    <button
                      type="button"
                      onClick={() => onVerOperacion(op.id)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Ver
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ResumenCards({
  resumen,
  estatusFilter,
  onEstatusChange,
}: {
  resumen: Resumen;
  estatusFilter: string;
  onEstatusChange: (estatus: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {Object.entries(resumen.porEstatus)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([estatus, count]) => (
          <button
            key={estatus}
            type="button"
            onClick={() => onEstatusChange(estatus === estatusFilter ? "" : estatus)}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              estatusFilter === estatus
                ? "border-gabi-forest bg-gabi-forest/5"
                : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-2xl font-black text-gabi-forest">{count}</p>
            <p className="text-xs font-semibold text-slate-500">
              {estatusSembradoLabel[estatus] ?? estatus}
            </p>
          </button>
        ))}
    </div>
  );
}

type SembradoSegmentoId = PasajeSembradoSegmentoId | LaVistaSembradoSegmentoId;

const defaultSegmentoForDesarrollo = (id: string): SembradoSegmentoId => {
  if (id === PASAJE_ALAMOS_ID) {
    return "departamentos";
  }
  if (id === LA_VISTA_RESIDENCIAL_ID) {
    return "oliveto";
  }
  return "departamentos";
};

export function SembradoAdminPanel({ desarrollos, scopeLabel }: SembradoAdminPanelProps) {
  const [desarrolloId, setDesarrolloId] = useState(desarrollos[0]?.id ?? "");
  const [segmento, setSegmento] = useState<SembradoSegmentoId>(() =>
    defaultSegmentoForDesarrollo(desarrollos[0]?.id ?? ""),
  );
  const [estatusFilter, setEstatusFilter] = useState("");
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [filas, setFilas] = useState<SembradoUnidadRow[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apartadoModalOpen, setApartadoModalOpen] = useState(false);
  const [apartadoModalModo, setApartadoModalModo] = useState<"registrar" | "completar">(
    "registrar",
  );
  const [apartadoUnidadId, setApartadoUnidadId] = useState<string | undefined>();
  const [operacionId, setOperacionId] = useState<string | null>(null);

  const unidadesDisponibles = useMemo(
    () => filas.filter((row) => !row.operacion && row.estatusInventario === "disponible"),
    [filas],
  );

  const unidadesPendientes = useMemo(
    () => filas.filter((row) => !row.operacion && row.estatusInventario === "apartado"),
    [filas],
  );

  const openApartadoModal = (
    unidadId?: string,
    modo: "registrar" | "completar" = "registrar",
  ) => {
    setApartadoModalModo(modo);
    setApartadoUnidadId(unidadId);
    setApartadoModalOpen(true);
  };

  const esPasajeAlamos = desarrolloId === PASAJE_ALAMOS_ID;
  const esLaVista = desarrolloId === LA_VISTA_RESIDENCIAL_ID;
  const tieneSegmentos = esPasajeAlamos || esLaVista;

  const segmentoConfig = esPasajeAlamos
    ? PASAJE_SEMBRADO_SEGMENTOS[segmento as PasajeSembradoSegmentoId]
    : esLaVista
      ? LA_VISTA_SEMBRADO_SEGMENTOS[segmento as LaVistaSembradoSegmentoId]
      : null;

  const activeClusterId = tieneSegmentos ? segmentoConfig?.clusterId : undefined;

  const estatusOptions = useMemo(() => {
    if (!resumen) {
      return [];
    }
    return Object.entries(resumen.porEstatus)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [resumen]);

  const loadSembrado = useCallback(async () => {
    if (!desarrolloId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ desarrolloId });
      if (activeClusterId) {
        params.set("clusterId", activeClusterId);
      }

      const response = await fetch(`/api/admin/sembrado?${params.toString()}`);
      const data = (await response.json()) as {
        filas?: SembradoUnidadRow[];
        resumen?: Resumen;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el sembrado.");
      }

      setFilas(data.filas ?? []);
      setResumen(data.resumen ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setFilas([]);
      setResumen(null);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId, activeClusterId]);

  useEffect(() => {
    void loadSembrado();
  }, [loadSembrado]);

  useEffect(() => {
    setEstatusFilter("");
    setShowAllUnits(false);
  }, [desarrolloId, segmento]);

  useEffect(() => {
    setSegmento(defaultSegmentoForDesarrollo(desarrolloId));
  }, [desarrolloId]);

  const segmentTabs: Array<{
    id: SembradoSegmentoId;
    label: string;
    icon: typeof Home;
  }> = esPasajeAlamos
    ? [
        { id: "departamentos", label: "Departamentos", icon: Home },
        { id: "oficinas", label: "Oficinas", icon: Building2 },
      ]
    : esLaVista
      ? [
          { id: "oliveto", label: "Oliveto", icon: Home },
          { id: "benevento", label: "Benevento", icon: Building2 },
          { id: "volterra", label: "Volterra", icon: Layers },
        ]
      : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Control gerencia
            </p>
            <h2 className="text-2xl font-black text-gabi-forest">Sembrado de ventas</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {esPasajeAlamos
                ? `Administración separada por producto — ${segmentoConfig?.label.toLowerCase() ?? ""}.`
                : esLaVista
                  ? `Administración por cluster — ${segmentoConfig?.label ?? "La Vista"}.`
                  : "Vista operativa por unidad: estatus comercial, cliente, precios y cobranza."}
              {scopeLabel ? ` Alcance: ${scopeLabel}.` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unidadesPendientes.length ? (
              <button
                type="button"
                onClick={() => openApartadoModal(undefined, "completar")}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900"
              >
                Completar apartado ({unidadesPendientes.length})
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => openApartadoModal(undefined, "registrar")}
              disabled={!unidadesDisponibles.length}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Registrar apartado
            </button>
            <button
              type="button"
              onClick={() => void loadSembrado()}
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Desarrollo</span>
            <select
              value={desarrolloId}
              onChange={(event) => {
                const nextId = event.target.value;
                setDesarrolloId(nextId);
                setSegmento(defaultSegmentoForDesarrollo(nextId));
              }}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-slate-600">Estatus</span>
            <select
              value={estatusFilter}
              onChange={(event) => setEstatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="">Todos (con operación)</option>
              {estatusOptions.map(([estatus, count]) => (
                <option key={estatus} value={estatus}>
                  {estatusSembradoLabel[estatus] ?? estatus} ({count})
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={showAllUnits}
              onChange={(event) => setShowAllUnits(event.target.checked)}
              className="rounded border-slate-300"
            />
            <span className="font-semibold text-slate-600">Ver todas las unidades</span>
          </label>
        </div>
      </div>

      {tieneSegmentos ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {segmentTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSegmento(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition sm:flex-none sm:px-6 ${
                segmento === id
                  ? "bg-gabi-forest text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {resumen && segmento === id ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    segmento === id ? "bg-white/20" : "bg-slate-100"
                  }`}
                >
                  {resumen.total}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      {resumen ? (
        <ResumenCards
          resumen={resumen}
          estatusFilter={estatusFilter}
          onEstatusChange={setEstatusFilter}
        />
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-black text-gabi-forest">
            {tieneSegmentos && segmentoConfig
              ? `Sembrado — ${segmentoConfig.label}`
              : "Sembrado"}
          </h3>
          {resumen ? (
            <p className="text-sm text-slate-500">
              {resumen.total} unidades ·{" "}
              {filas.filter((row) => row.operacion).length} con operación activa
              {unidadesPendientes.length
                ? ` · ${unidadesPendientes.length} apartado${unidadesPendientes.length === 1 ? "" : "s"} pendiente${unidadesPendientes.length === 1 ? "" : "s"}`
                : ""}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando sembrado…
          </div>
        ) : (
          <SembradoTable
            filas={filas}
            estatusFilter={estatusFilter}
            showAllUnits={showAllUnits}
            onRegistrarApartado={(unidadId) => openApartadoModal(unidadId, "registrar")}
            onCompletarApartado={(unidadId) => openApartadoModal(unidadId, "completar")}
            onVerOperacion={setOperacionId}
          />
        )}
      </div>

      {apartadoModalOpen ? (
        <RegistrarApartadoModal
          desarrolloId={desarrolloId}
          modo={apartadoModalModo}
          unidadesOpciones={
            apartadoModalModo === "completar" ? unidadesPendientes : unidadesDisponibles
          }
          initialUnidadId={apartadoUnidadId}
          onClose={() => {
            setApartadoModalOpen(false);
            setApartadoUnidadId(undefined);
            setApartadoModalModo("registrar");
          }}
          onSuccess={() => void loadSembrado()}
        />
      ) : null}

      {operacionId ? (
        <OperacionDetailDrawer
          operacionId={operacionId}
          onClose={() => setOperacionId(null)}
          onSuccess={() => void loadSembrado()}
        />
      ) : null}
    </div>
  );
}

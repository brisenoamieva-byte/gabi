"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Home,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Smartphone,
  Table2,
} from "lucide-react";
import type { Cluster, Desarrollo, Prototipo } from "@/lib/data";
import { formatPrice } from "@/lib/data";
import { InventarioAdminPanel } from "@/components/admin/InventarioAdminPanel";
import { RegistrarApartadoModal } from "@/components/admin/RegistrarApartadoModal";
import { ExpedienteDrawer } from "@/components/admin/ExpedienteDrawer";
import { OperacionDetailDrawer } from "@/components/admin/OperacionDetailDrawer";
import { SembradoUnidadDrawer } from "@/components/admin/SembradoUnidadDrawer";
import {
  estatusSembradoLabel,
  type SembradoUnidadRow,
} from "@/lib/comercial/sembrado-status";
import {
  getDefaultSembradoSegmentId,
  getSembradoSegmentsForDesarrollo,
} from "@/lib/catalog/desarrollos-registry";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type SembradoAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  clusters: Cluster[];
  prototipos: Prototipo[];
};

type SembradoVista = "sembrado" | "curacion";

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
  onEditUnidad,
  onToggleVisitable,
  dense = false,
  stickyHeader = false,
  stickyFirstColumn = false,
}: {
  filas: SembradoUnidadRow[];
  estatusFilter: string;
  showAllUnits: boolean;
  onRegistrarApartado: (unidadId: string) => void;
  onCompletarApartado: (unidadId: string) => void;
  onVerOperacion: (operacionId: string) => void;
  onEditUnidad: (row: SembradoUnidadRow) => void;
  onToggleVisitable: (row: SembradoUnidadRow) => void;
  dense?: boolean;
  stickyHeader?: boolean;
  stickyFirstColumn?: boolean;
}) {
  const cellPad = dense ? "px-3 py-1.5" : "px-4 py-3";
  const headClass = stickyHeader
    ? "sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]"
    : "";
  const firstColClass = stickyFirstColumn
    ? "sticky left-0 z-10 bg-white shadow-[1px_0_0_0_rgb(241_245_249)]"
    : "";
  const firstHeadClass = stickyFirstColumn
    ? "sticky left-0 z-30 bg-slate-50 shadow-[1px_0_0_0_rgb(226_232_240)]"
    : "";
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
    <table className="min-w-full text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className={`${cellPad} ${headClass} ${firstHeadClass}`}>Unidad</th>
          <th className={`${cellPad} ${headClass}`}>Recorrido</th>
          <th className={`${cellPad} ${headClass}`}>Precio lista</th>
          <th className={`${cellPad} ${headClass}`}>Lista</th>
          <th className={`${cellPad} ${headClass}`}>Estatus</th>
          <th className={`${cellPad} ${headClass}`}>Cliente</th>
          <th className={`${cellPad} ${headClass}`}>Medio</th>
          <th className={`${cellPad} ${headClass}`}>Esquema</th>
          <th className={`${cellPad} ${headClass}`}>Precio venta</th>
          <th className={`${cellPad} ${headClass}`}>Cobrado</th>
          <th className={`${cellPad} ${headClass}`}>Saldo</th>
          <th className={`${cellPad} ${headClass}`}>Acciones</th>
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

            const rowBg = apartadoPendiente ? "bg-amber-50/40" : "bg-white";
            const stickyBg = stickyFirstColumn
              ? apartadoPendiente
                ? "bg-amber-50/40"
                : "bg-white group-hover:bg-slate-50"
              : "";

            return (
              <tr
                key={row.unidadId}
                className={`group border-t border-slate-100 ${op ? "hover:bg-slate-50" : apartadoPendiente ? "bg-amber-50/40" : ""}`}
              >
                <td className={`${cellPad} ${firstColClass} ${stickyBg || rowBg}`}>
                  <button
                    type="button"
                    onClick={() => onEditUnidad(row)}
                    className="font-bold text-gabi-forest hover:underline"
                  >
                    {row.unidad}
                  </button>
                  <p className="text-xs text-slate-400">{row.tipo}</p>
                </td>
                <td className={cellPad} onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onToggleVisitable(row)}
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      row.visitable
                        ? "bg-sky-100 text-sky-800"
                        : "bg-slate-100 text-slate-500"
                    }`}
                    title={row.visitable ? "Visible en recorrido" : "Oculta en recorrido"}
                  >
                    {row.visitable ? "Sí" : "No"}
                  </button>
                </td>
                <td className={`${cellPad} tabular-nums text-slate-600`}>
                  {row.precio ? formatPrice(row.precio) : "—"}
                </td>
                <td className={`${cellPad} text-slate-600`}>{row.listaPrecios ?? "—"}</td>
                <td className={cellPad}>
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
                <td className={cellPad}>{op?.cliente_nombre ?? "—"}</td>
                <td className={`${cellPad} text-slate-600`}>{op?.medio_publicitario ?? "—"}</td>
                <td className={`${cellPad} text-slate-600`}>{op?.esquema_pago ?? "—"}</td>
                <td className={`${cellPad} tabular-nums`}>
                  {precioVenta ? formatPrice(precioVenta) : "—"}
                </td>
                <td className={`${cellPad} tabular-nums`}>
                  {row.totalCobrado ? formatPrice(row.totalCobrado) : "—"}
                </td>
                <td className={`${cellPad} tabular-nums`}>
                  {saldo != null ? formatPrice(saldo) : "—"}
                </td>
                <td className={cellPad} onClick={(event) => event.stopPropagation()}>
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => onEditUnidad(row)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Unidad
                    </button>
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
                        Operación
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
    </table>
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

type SembradoSegmentoId = string;

const defaultSegmentoForDesarrollo = (id: string): SembradoSegmentoId =>
  getDefaultSembradoSegmentId(id) ?? "general";

export function SembradoAdminPanel({
  desarrollos,
  scopeLabel,
  clusters,
  prototipos,
}: SembradoAdminPanelProps) {
  const searchParams = useSearchParams();
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos);
  const [vista, setVista] = useState<SembradoVista>(
    searchParams.get("seccion") === "curacion" ? "curacion" : "sembrado",
  );
  const [segmento, setSegmento] = useState<SembradoSegmentoId>(() =>
    defaultSegmentoForDesarrollo(desarrolloId),
  );
  const [estatusFilter, setEstatusFilter] = useState("");
  const [showAllUnits, setShowAllUnits] = useState(true);
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
  const [expedienteOperacionId, setExpedienteOperacionId] = useState<string | null>(null);
  const [unidadEdit, setUnidadEdit] = useState<SembradoUnidadRow | null>(null);
  const [modoAmplio, setModoAmplio] = useState(() => searchParams.get("amplio") === "1");

  useEffect(() => {
    if (vista !== "sembrado" && modoAmplio) {
      setModoAmplio(false);
    }
  }, [vista, modoAmplio]);

  useEffect(() => {
    if (!modoAmplio) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModoAmplio(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modoAmplio]);

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

  const segmentConfigs = getSembradoSegmentsForDesarrollo(desarrolloId);
  const tieneSegmentos = segmentConfigs.length > 0;
  const segmentoConfig = segmentConfigs.find((item) => item.id === segmento) ?? null;

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
    setShowAllUnits(true);
  }, [desarrolloId, segmento]);

  const toggleVisitable = async (row: SembradoUnidadRow) => {
    try {
      const response = await fetch(`/api/admin/sembrado/unidades/${row.unidadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitable: !row.visitable }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }
      void loadSembrado();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al actualizar.");
    }
  };

  useEffect(() => {
    setSegmento(defaultSegmentoForDesarrollo(desarrolloId));
  }, [desarrolloId]);

  const segmentIcons = [Home, Building2, Layers] as const;
  const segmentTabs: Array<{
    id: SembradoSegmentoId;
    label: string;
    icon: typeof Home;
  }> = segmentConfigs.map((config, index) => ({
    id: config.id,
    label: config.label,
    icon: segmentIcons[index % segmentIcons.length] ?? Home,
  }));

  const sembradoTitle =
    tieneSegmentos && segmentoConfig ? `Sembrado — ${segmentoConfig.label}` : "Sembrado";

  const sembradoSubtitle = resumen
    ? `${resumen.total} unidades · ${filas.filter((row) => row.operacion).length} con operación activa${
        unidadesPendientes.length
          ? ` · ${unidadesPendientes.length} apartado${unidadesPendientes.length === 1 ? "" : "s"} pendiente${unidadesPendientes.length === 1 ? "" : "s"}`
          : ""
      }`
    : null;

  const sembradoTableProps = {
    filas,
    estatusFilter,
    showAllUnits,
    onRegistrarApartado: (unidadId: string) => openApartadoModal(unidadId, "registrar"),
    onCompletarApartado: (unidadId: string) => openApartadoModal(unidadId, "completar"),
    onVerOperacion: setOperacionId,
    onEditUnidad: setUnidadEdit,
    onToggleVisitable: (row: SembradoUnidadRow) => void toggleVisitable(row),
  };

  const renderSembradoTable = (options?: {
    dense?: boolean;
    stickyHeader?: boolean;
    stickyFirstColumn?: boolean;
  }) => (
    <SembradoTable
      {...sembradoTableProps}
      dense={options?.dense}
      stickyHeader={options?.stickyHeader}
      stickyFirstColumn={options?.stickyFirstColumn}
    />
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gabi-forest/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Control gerencia
            </p>
            <h2 className="text-2xl font-black text-gabi-forest">Sembrado y disponibilidad</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {tieneSegmentos
                ? `Inventario completo por segmento — ${segmentoConfig?.label ?? "selecciona segmento"}.`
                : "Todas las unidades del desarrollo: estatus comercial, precios, cobranza y curación para recorrido."}
              {scopeLabel ? ` Alcance: ${scopeLabel}.` : ""}{" "}
              Apartados, precios, cobranza y curación para recorrido en un solo lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {vista === "sembrado" ? (
              <>
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
            <button
              type="button"
              onClick={() => setModoAmplio(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <Maximize2 className="h-4 w-4" />
              Vista amplia
            </button>
            <Link
              href={`/disponibilidad?from=admin&desarrolloId=${encodeURIComponent(desarrolloId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-2 text-sm font-bold text-gabi-forest"
            >
              <Smartphone className="h-4 w-4" />
              Vista campo
            </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          <button
            type="button"
            onClick={() => setVista("sembrado")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              vista === "sembrado"
                ? "bg-gabi-forest text-white"
                : "border border-slate-200 bg-white text-gabi-forest"
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Sembrado y operaciones
          </button>
          <button
            type="button"
            onClick={() => setVista("curacion")}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
              vista === "curacion"
                ? "bg-gabi-forest text-white"
                : "border border-slate-200 bg-white text-gabi-forest"
            }`}
          >
            <Table2 className="h-4 w-4" />
            Curación e importación CSV
          </button>
        </div>

        {vista === "sembrado" ? (
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
                <option value="">Todos</option>
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
                checked={!showAllUnits}
                onChange={(event) => setShowAllUnits(!event.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="font-semibold text-slate-600">Solo con operación activa</span>
            </label>
          </div>
        ) : (
          <div className="mt-5">
            <label className="block max-w-md text-sm">
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
          </div>
        )}
      </div>

      {vista === "sembrado" ? (
        <>
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

      <div className="flex max-h-[min(72vh,calc(100dvh-18rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-gabi-forest">{sembradoTitle}</h3>
            {sembradoSubtitle ? <p className="text-sm text-slate-500">{sembradoSubtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => setModoAmplio(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-3 py-2 text-xs font-bold text-gabi-forest hover:bg-gabi-forest/5"
            title="Abrir vista amplia a pantalla completa"
          >
            <Maximize2 className="h-4 w-4" />
            Vista amplia
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando sembrado…
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            {renderSembradoTable({ stickyHeader: true })}
          </div>
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
          onOpenExpediente={(id) => {
            setOperacionId(null);
            setExpedienteOperacionId(id);
          }}
        />
      ) : null}

      {expedienteOperacionId ? (
        <ExpedienteDrawer
          operacionId={expedienteOperacionId}
          onClose={() => setExpedienteOperacionId(null)}
        />
      ) : null}

      {unidadEdit ? (
        <SembradoUnidadDrawer
          row={unidadEdit}
          onClose={() => setUnidadEdit(null)}
          onSuccess={() => void loadSembrado()}
        />
      ) : null}

      {modoAmplio && vista === "sembrado" ? (
        <div className="fixed inset-0 z-[45] flex flex-col bg-[#eef2f6]">
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gabi-sand">
                  Vista amplia · Control gerencia
                </p>
                <h2 className="truncate text-lg font-black text-gabi-forest">{sembradoTitle}</h2>
                {sembradoSubtitle ? (
                  <p className="text-xs text-slate-500">{sembradoSubtitle}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {unidadesPendientes.length ? (
                  <button
                    type="button"
                    onClick={() => openApartadoModal(undefined, "completar")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900"
                  >
                    Completar ({unidadesPendientes.length})
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openApartadoModal(undefined, "registrar")}
                  disabled={!unidadesDisponibles.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gabi-forest/20 px-3 py-1.5 text-xs font-bold text-gabi-forest disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Apartado
                </button>
                <button
                  type="button"
                  onClick={() => void loadSembrado()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gabi-forest px-3 py-1.5 text-xs font-bold text-white"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => setModoAmplio(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                  title="Salir de vista amplia (Esc)"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Salir
                </button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-2">
              <label className="text-xs">
                <span className="mb-0.5 block font-semibold text-slate-500">Desarrollo</span>
                <select
                  value={desarrolloId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setDesarrolloId(nextId);
                    setSegmento(defaultSegmentoForDesarrollo(nextId));
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {desarrollos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                <span className="mb-0.5 block font-semibold text-slate-500">Estatus</span>
                <select
                  value={estatusFilter}
                  onChange={(event) => setEstatusFilter(event.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Todos</option>
                  {estatusOptions.map(([estatus, count]) => (
                    <option key={estatus} value={estatus}>
                      {estatusSembradoLabel[estatus] ?? estatus} ({count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 pb-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={!showAllUnits}
                  onChange={(event) => setShowAllUnits(!event.target.checked)}
                  className="rounded border-slate-300"
                />
                <span className="font-semibold text-slate-600">Solo con operación</span>
              </label>

              {tieneSegmentos ? (
                <div className="ml-auto flex flex-wrap gap-1">
                  {segmentTabs.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSegmento(id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                        segmento === id
                          ? "bg-gabi-forest text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </header>

          {error ? (
            <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col p-2">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {loading ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Cargando sembrado…
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto">
                  {renderSembradoTable({
                    dense: true,
                    stickyHeader: true,
                    stickyFirstColumn: true,
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
        </>
      ) : (
        <InventarioAdminPanel
          embedded
          desarrollos={desarrollos}
          scopeLabel={scopeLabel}
          clusters={clusters}
          prototipos={prototipos}
          desarrolloIdOverride={desarrolloId}
          clusterIdOverride={activeClusterId}
          onUnitsChanged={() => void loadSembrado()}
        />
      )}
    </div>
  );
}

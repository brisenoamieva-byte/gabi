"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Calculator,
  ExternalLink,
  Loader2,
  MapPinned,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SembradoUnidadDrawer } from "@/components/admin/SembradoUnidadDrawer";
import { DisponibilidadPlanoGavia } from "@/components/disponibilidad/DisponibilidadPlanoGavia";
import type { AsesorDisponibilidadRow } from "@/lib/inventario/asesor-disponibilidad";
import { formatPrice, type Cluster, type Desarrollo } from "@/lib/data";
import {
  estatusSembradoLabel,
  type SembradoUnidadRow,
} from "@/lib/comercial/sembrado-status";
import { hasDisponibilidadPlano } from "@/lib/disponibilidad/planos";
import {
  decodeMisionLaGaviaUnidad,
  isGaviaEdificioCotizable,
} from "@/lib/disponibilidad/planos/mision-la-gavia";
import {
  cotizadorHrefForUnidad,
  recorridoHrefForUnidad,
} from "@/lib/disponibilidad/unit-deep-links";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

type ViewMode = "plano" | "lista";

type DisponibilidadPanelProps = {
  fromAdmin?: boolean;
  desarrolloIdParam?: string | null;
};

const estatusClass = (estatus: string) => {
  if (estatus === "Disponibles") {
    return "bg-emerald-50 text-emerald-800";
  }
  if (estatus.includes("Apartado")) {
    return "bg-amber-50 text-amber-900";
  }
  if (estatus.includes("Vendid")) {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-slate-50 text-slate-700";
};

const mapSembradoRow = (row: SembradoUnidadRow): AsesorDisponibilidadRow => {
  const estatusSembrado =
    row.operacion?.estatus_sembrado ??
    (row.estatusInventario === "apartado" ? "Apartado pendiente" : "Disponibles");

  return {
    unidadId: row.unidadId,
    unidad: row.unidad,
    tipo: row.tipo,
    clusterId: row.clusterId,
    precio: row.precio,
    listaPrecios: row.listaPrecios,
    estatusSembrado,
    estatusLabel: estatusSembradoLabel[estatusSembrado] ?? estatusSembrado,
    visitable: row.visitable,
    prototipoId: row.prototipoId,
  };
};

export function DisponibilidadPanel({
  fromAdmin = false,
  desarrolloIdParam = null,
}: DisponibilidadPanelProps) {
  const router = useRouter();
  const [adminChecked, setAdminChecked] = useState(false);
  const [canEditSembrado, setCanEditSembrado] = useState(false);
  const [adminDesarrollosIds, setAdminDesarrollosIds] = useState<string[]>([]);
  const [desarrollo, setDesarrollo] = useState<Desarrollo | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [clusterId, setClusterId] = useState<string>("");
  const [unidades, setUnidades] = useState<AsesorDisponibilidadRow[]>([]);
  const [sembradoRows, setSembradoRows] = useState<SembradoUnidadRow[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<SembradoUnidadRow | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("plano");
  const [highlightUnidadId, setHighlightUnidadId] = useState<string | null>(null);

  const isAdminEditMode = fromAdmin && canEditSembrado;
  const needsAsesorAuth = !isAdminEditMode;

  const {
    authReady: asesorAuthReady,
    user: asesorUser,
    desarrollo: asesorDesarrollo,
  } = useRequireAsesorSession({
    enabled: adminChecked && needsAsesorAuth,
    requireDesarrollo: !desarrolloIdParam,
  });

  const user = isAdminEditMode
    ? { id: "admin", nombre: "Gerencia", desarrollosIds: adminDesarrollosIds }
    : asesorUser;

  const resolvedDesarrolloId =
    desarrolloIdParam ?? asesorDesarrollo?.id ?? null;

  const sembradoByUnidadId = useMemo(
    () => new Map(sembradoRows.map((row) => [row.unidadId, row])),
    [sembradoRows],
  );

  useEffect(() => {
    void (async () => {
      try {
        const adminResponse = await fetch("/api/admin/me");
        const adminData = (await adminResponse.json()) as {
          authenticated?: boolean;
          canEditSembrado?: boolean;
          desarrollosIds?: string[];
        };

        const canEdit = Boolean(adminData.authenticated && adminData.canEditSembrado);
        setCanEditSembrado(canEdit);
        setAdminDesarrollosIds(adminData.desarrollosIds ?? []);
        setEditMode(canEdit && fromAdmin);
      } finally {
        setAdminChecked(true);
      }
    })();
  }, [fromAdmin]);

  useEffect(() => {
    if (!adminChecked) {
      return;
    }

    if (needsAsesorAuth && !asesorAuthReady) {
      return;
    }

    if (isAdminEditMode && !resolvedDesarrolloId) {
      setError("Falta desarrolloId en la URL.");
      setLoading(false);
      return;
    }

    if (!resolvedDesarrolloId) {
      return;
    }

    void (async () => {
      try {
        const catalogResponse = await fetch(
          `/api/catalog/recorrido?desarrolloId=${encodeURIComponent(resolvedDesarrolloId)}`,
        );
        const catalogData = (await catalogResponse.json()) as {
          desarrollo?: Desarrollo;
          clusters?: Cluster[];
        };

        if (!catalogData.desarrollo) {
          if (isAdminEditMode) {
            setError("Desarrollo no encontrado.");
            setLoading(false);
            return;
          }
          router.replace("/desarrollos");
          return;
        }

        const loadedClusters = catalogData.clusters ?? [];
        setDesarrollo(catalogData.desarrollo);
        setClusters(loadedClusters);
        setClusterId(loadedClusters[0]?.id ?? "");
        setCatalogReady(true);
      } catch {
        router.replace(isAdminEditMode ? "/admin/sembrado" : "/dashboard");
      }
    })();
  }, [
    adminChecked,
    asesorAuthReady,
    isAdminEditMode,
    needsAsesorAuth,
    resolvedDesarrolloId,
    router,
  ]);

  const loadUnidades = useCallback(async () => {
    if (!desarrollo?.id || !clusterId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (editMode) {
        const params = new URLSearchParams({
          desarrolloId: desarrollo.id,
          clusterId,
        });
        const response = await fetch(`/api/admin/sembrado?${params}`);
        const data = (await response.json()) as {
          filas?: SembradoUnidadRow[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar el sembrado.");
        }
        const filas = data.filas ?? [];
        setSembradoRows(filas);
        setUnidades(filas.map(mapSembradoRow));
      } else {
        const params = new URLSearchParams({
          desarrolloId: desarrollo.id,
          clusterId,
        });
        const response = await fetch(`/api/inventario/asesor?${params}`);
        const data = (await response.json()) as {
          unidades?: AsesorDisponibilidadRow[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar la disponibilidad.");
        }
        setSembradoRows([]);
        setUnidades(data.unidades ?? []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setUnidades([]);
      setSembradoRows([]);
    } finally {
      setLoading(false);
    }
  }, [desarrollo?.id, clusterId, editMode]);

  useEffect(() => {
    if (!catalogReady) {
      return;
    }
    void loadUnidades();
  }, [catalogReady, loadUnidades]);

  const toggleVisitable = async (row: AsesorDisponibilidadRow) => {
    setTogglingId(row.unidadId);
    setError("");
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
      await loadUnidades();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Error al guardar.");
    } finally {
      setTogglingId(null);
    }
  };

  const resumen = useMemo(() => {
    const counts = { disponibles: 0, apartados: 0, vendidos: 0, otros: 0 };
    for (const row of unidades) {
      if (row.estatusSembrado === "Disponibles") {
        counts.disponibles += 1;
      } else if (row.estatusSembrado.includes("Apartado")) {
        counts.apartados += 1;
      } else if (row.estatusSembrado.includes("Vendid")) {
        counts.vendidos += 1;
      } else {
        counts.otros += 1;
      }
    }
    return counts;
  }, [unidades]);

  if (!adminChecked || (needsAsesorAuth && !asesorAuthReady) || !catalogReady || !user || !desarrollo) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F6F2]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  const activeCluster = clusters.find((item) => item.id === clusterId);
  const backHref = editMode ? "/admin/sembrado" : "/dashboard";
  const showPlano = hasDisponibilidadPlano(desarrollo.id);
  const effectiveView: ViewMode = showPlano ? viewMode : "lista";

  return (
    <main className="min-h-screen bg-[#F7F6F2] text-[#201044]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#F7F6F2]/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-5">
          <Link
            href={backHref}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
              {editMode ? "Sembrado · edición gerencia" : "Sembrado · solo lectura"}
            </p>
            <h1 className="truncate text-lg font-semibold tracking-tight">Disponibilidad</h1>
            <p className="truncate text-xs text-slate-500">{desarrollo.nombre}</p>
          </div>
          {editMode ? (
            <Link
              href="/admin/sembrado"
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg bg-[#201044] px-3 text-xs font-semibold text-white"
            >
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Sembrado completo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-5 md:py-6">
        {editMode ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            Modo gerencia: puedes cambiar <strong>Recorrido</strong>, <strong>precio</strong> y
            curación. Para apartados y cobranza usa{" "}
            <Link href="/admin/sembrado" className="font-semibold underline">
              Admin → Sembrado
            </Link>
            .
          </div>
        ) : null}

        {clusters.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {clusters.map((cluster) => (
              <button
                key={cluster.id}
                type="button"
                onClick={() => setClusterId(cluster.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  clusterId === cluster.id
                    ? "bg-[#201044] text-white"
                    : "bg-white text-[#201044] ring-1 ring-slate-200"
                }`}
              >
                {cluster.nombre}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-xl font-semibold tabular-nums text-emerald-700">{resumen.disponibles}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Disponibles</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-xl font-semibold tabular-nums text-amber-700">{resumen.apartados}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Apartados</p>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white p-3 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-xl font-semibold tabular-nums text-slate-600">{resumen.vendidos}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Vendidos</p>
          </div>
        </div>

        {showPlano ? (
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={() => setViewMode("plano")}
              className={`min-h-11 rounded-md px-4 text-sm font-medium transition ${
                effectiveView === "plano"
                  ? "bg-[#201044] text-white"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Plano
            </button>
            <button
              type="button"
              onClick={() => setViewMode("lista")}
              className={`min-h-11 rounded-md px-4 text-sm font-medium transition ${
                effectiveView === "lista"
                  ? "bg-[#201044] text-white"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Lista
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando unidades…
          </div>
        ) : effectiveView === "plano" ? (
          <DisponibilidadPlanoGavia
            unidades={unidades}
            onSelectUnidad={(row) => {
              setHighlightUnidadId(row.unidadId);
              setViewMode("lista");
              window.setTimeout(() => {
                document
                  .getElementById(`unidad-${row.unidadId}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 50);
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold">{activeCluster?.nombre ?? "Unidades"}</p>
              <p className="text-xs text-slate-500">
                {editMode
                  ? "Misma vista que el asesor, con controles de edición."
                  : "Estatus en tiempo real desde sembrado (sin datos de clientes)."}
              </p>
            </div>

            <ul className="divide-y divide-slate-100">
              {unidades.map((row) => (
                <li
                  key={row.unidadId}
                  id={`unidad-${row.unidadId}`}
                  className={`flex flex-col gap-3 px-4 py-3 text-sm transition sm:flex-row sm:items-center sm:justify-between ${
                    highlightUnidadId === row.unidadId ? "bg-emerald-50/80" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#201044]">
                      {row.tipo === "oficina" ? "Of." : "Depto"} {row.unidad}
                      {row.prototipoId ? (
                        <span className="ml-1 font-normal text-slate-500">· {row.prototipoId}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.precio ? formatPrice(row.precio) : "Sin precio"}
                      {row.listaPrecios ? ` · ${row.listaPrecios}` : ""}
                      {row.visitable ? " · Recorrido" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {!editMode ? (
                      <>
                        {(() => {
                          const decoded = decodeMisionLaGaviaUnidad(row.unidad);
                          const canQuote =
                            !decoded || isGaviaEdificioCotizable(decoded.edificio);
                          if (!canQuote) {
                            return (
                              <span className="px-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                No cotizable
                              </span>
                            );
                          }
                          return (
                            <>
                              <Link
                                href={cotizadorHrefForUnidad(row)}
                                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#201044] hover:bg-slate-100"
                                title={`Cotizar ${row.unidad}`}
                                aria-label={`Cotizar ${row.unidad}`}
                              >
                                <Calculator className="h-4 w-4" strokeWidth={2} />
                              </Link>
                              {row.visitable ? (
                                <Link
                                  href={recorridoHrefForUnidad(row)}
                                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#201044] hover:bg-slate-100"
                                  title={`Recorrido ${row.unidad}`}
                                  aria-label={`Recorrido ${row.unidad}`}
                                >
                                  <MapPinned className="h-4 w-4" strokeWidth={2} />
                                </Link>
                              ) : null}
                            </>
                          );
                        })()}
                      </>
                    ) : null}
                    {editMode ? (
                      <>
                        <button
                          type="button"
                          disabled={togglingId === row.unidadId}
                          onClick={() => void toggleVisitable(row)}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#201044] hover:bg-slate-100 disabled:opacity-50"
                          title={row.visitable ? "Quitar de recorrido" : "Mostrar en recorrido"}
                        >
                          {togglingId === row.unidadId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : row.visitable ? (
                            <ToggleRight className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const full = sembradoByUnidadId.get(row.unidadId);
                            if (full) {
                              setEditRow(full);
                            }
                          }}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[#201044] hover:bg-slate-100"
                          title="Editar unidad"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                    <span
                      className={`max-w-[11rem] truncate rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${estatusClass(row.estatusSembrado)}`}
                      title={row.estatusLabel}
                    >
                      {row.estatusLabel}
                    </span>
                  </div>
                </li>
              ))}
              {!unidades.length ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay unidades en este segmento.
                </li>
              ) : null}
            </ul>
          </div>
        )}

        {!editMode ? (
          <p className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="h-3.5 w-3.5" />
            Gerencia edita en Admin → Sembrado → Vista campo.
          </p>
        ) : null}
      </section>

      {editRow ? (
        <SembradoUnidadDrawer
          row={editRow}
          onClose={() => setEditRow(null)}
          onSuccess={() => {
            setEditRow(null);
            void loadUnidades();
          }}
        />
      ) : null}
    </main>
  );
}

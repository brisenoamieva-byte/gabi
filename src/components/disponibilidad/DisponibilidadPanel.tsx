"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Loader2,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SembradoUnidadDrawer } from "@/components/admin/SembradoUnidadDrawer";
import type { AsesorDisponibilidadRow } from "@/lib/inventario/asesor-disponibilidad";
import { formatPrice, type Cluster, type Desarrollo } from "@/lib/data";
import {
  estatusSembradoLabel,
  type SembradoUnidadRow,
} from "@/lib/comercial/sembrado-status";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

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
      <main className="flex min-h-screen items-center justify-center bg-[#F2F0E9]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </main>
    );
  }

  const activeCluster = clusters.find((item) => item.id === clusterId);
  const backHref = editMode ? "/admin/sembrado" : "/dashboard";

  return (
    <main className="min-h-screen bg-[#F2F0E9] text-[#201044]">
      <header className="border-b border-[#201044]/8 bg-white/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[#201044]/12 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              {editMode ? "Sembrado · edición gerencia" : "Sembrado · solo lectura"}
            </p>
            <h1 className="truncate text-lg font-black">Disponibilidad</h1>
            <p className="truncate text-xs text-slate-500">{desarrollo.nombre}</p>
          </div>
          {editMode ? (
            <Link
              href="/admin/sembrado"
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#201044] px-3 py-2 text-xs font-bold text-white"
            >
              Sembrado completo
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-4 px-5 py-6">
        {editMode ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
            Modo gerencia: puedes cambiar <strong>Recorrido</strong>, <strong>precio</strong> y
            curación. Para apartados y cobranza usa{" "}
            <Link href="/admin/sembrado" className="font-bold underline">
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
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  clusterId === cluster.id
                    ? "bg-[#201044] text-white"
                    : "bg-white text-[#201044] ring-1 ring-[#201044]/10"
                }`}
              >
                {cluster.nombre}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-black text-emerald-700">{resumen.disponibles}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Disponibles</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-black text-amber-700">{resumen.apartados}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Apartados</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-center shadow-sm">
            <p className="text-xl font-black text-slate-600">{resumen.vendidos}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vendidos</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold">{activeCluster?.nombre ?? "Unidades"}</p>
            <p className="text-xs text-slate-500">
              {editMode
                ? "Misma vista que el asesor, con controles de edición."
                : "Estatus en tiempo real desde sembrado (sin datos de clientes)."}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando unidades…
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {unidades.map((row) => (
                <li
                  key={row.unidadId}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#201044]">
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
                  <div className="flex shrink-0 items-center gap-1">
                    {editMode ? (
                      <>
                        <button
                          type="button"
                          disabled={togglingId === row.unidadId}
                          onClick={() => void toggleVisitable(row)}
                          className="rounded-lg p-2 text-gabi-forest hover:bg-slate-100 disabled:opacity-50"
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
                          className="rounded-lg p-2 text-gabi-forest hover:bg-slate-100"
                          title="Editar unidad"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${estatusClass(row.estatusSembrado)}`}
                    >
                      {row.estatusLabel}
                    </span>
                  </div>
                </li>
              ))}
              {!unidades.length && !loading ? (
                <li className="px-4 py-8 text-center text-sm text-slate-500">
                  No hay unidades en este segmento.
                </li>
              ) : null}
            </ul>
          )}
        </div>

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

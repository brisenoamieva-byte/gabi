"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Loader2, Plus, Save } from "lucide-react";
import type {
  ClusterCatalogAdminRecord,
  PrototipoCatalogAdminRecord,
} from "@/lib/admin/catalog-product-service";
import type { Cluster } from "@/lib/data";
import { slugifyCatalogId } from "@/lib/catalog/slug";
import { AdminImageGalleryField } from "@/components/admin/AdminImageGalleryField";
import { AdminImageUploadField } from "@/components/admin/AdminImageUploadField";

type DesarrolloOption = { id: string; nombre: string };

type ProductoCatalogAdminPanelProps = {
  desarrollos: DesarrolloOption[];
  desarrolloId?: string;
  onDesarrolloIdChange?: (id: string) => void;
  showDesarrolloPicker?: boolean;
  scopeLabel?: string;
};

const clusterTipos: Cluster["tipo"][] = [
  "casas",
  "terrenos",
  "departamentos",
  "oficinas",
  "mixto",
];

const emptyClusterDraft = {
  id: "",
  nombre: "",
  tipo: "oficinas" as Cluster["tipo"],
};

const emptyPrototipoDraft = {
  id: "",
  nombre: "",
  clusterId: "",
};

export function ProductoCatalogAdminPanel({
  desarrollos,
  desarrolloId: controlledDesarrolloId,
  onDesarrolloIdChange,
  showDesarrolloPicker = true,
  scopeLabel,
}: ProductoCatalogAdminPanelProps) {
  const [internalDesarrolloId, setInternalDesarrolloId] = useState(
    controlledDesarrolloId ?? desarrollos[0]?.id ?? "",
  );
  const desarrolloId = controlledDesarrolloId ?? internalDesarrolloId;

  const setDesarrolloId = (id: string) => {
    if (onDesarrolloIdChange) {
      onDesarrolloIdChange(id);
    } else {
      setInternalDesarrolloId(id);
    }
  };

  const [clusters, setClusters] = useState<ClusterCatalogAdminRecord[]>([]);
  const [prototipos, setPrototipos] = useState<PrototipoCatalogAdminRecord[]>([]);
  const [clusterDrafts, setClusterDrafts] = useState<Record<string, ClusterCatalogAdminRecord>>({});
  const [prototipoDrafts, setPrototipoDrafts] = useState<
    Record<string, PrototipoCatalogAdminRecord>
  >({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newCluster, setNewCluster] = useState(emptyClusterDraft);
  const [newPrototipo, setNewPrototipo] = useState(emptyPrototipoDraft);
  const [creating, setCreating] = useState(false);

  const prototiposByCluster = useMemo(() => {
    const map: Record<string, PrototipoCatalogAdminRecord[]> = {};
    for (const prototipo of prototipos) {
      const draft = prototipoDrafts[prototipo.id] ?? prototipo;
      if (!map[draft.clusterId]) {
        map[draft.clusterId] = [];
      }
      map[draft.clusterId].push(draft);
    }
    return map;
  }, [prototipos, prototipoDrafts]);

  const loadProducto = useCallback(async () => {
    if (!desarrolloId) {
      setClusters([]);
      setPrototipos([]);
      setClusterDrafts({});
      setPrototipoDrafts({});
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/producto`,
      );
      const data = (await response.json()) as {
        clusters?: ClusterCatalogAdminRecord[];
        prototipos?: PrototipoCatalogAdminRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar producto.");
      }

      const nextClusters = data.clusters ?? [];
      const nextPrototipos = data.prototipos ?? [];
      setClusters(nextClusters);
      setPrototipos(nextPrototipos);
      setClusterDrafts(Object.fromEntries(nextClusters.map((item) => [item.id, { ...item }])));
      setPrototipoDrafts(
        Object.fromEntries(nextPrototipos.map((item) => [item.id, { ...item }])),
      );
      setNewPrototipo((prev) => ({
        ...prev,
        clusterId: prev.clusterId || nextClusters[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar");
      setClusters([]);
      setPrototipos([]);
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadProducto();
  }, [loadProducto]);

  useEffect(() => {
    if (controlledDesarrolloId) {
      setInternalDesarrolloId(controlledDesarrolloId);
    }
  }, [controlledDesarrolloId]);

  const patchClusterDraft = (clusterId: string, patch: Partial<ClusterCatalogAdminRecord>) => {
    setClusterDrafts((prev) => ({
      ...prev,
      [clusterId]: { ...prev[clusterId], ...patch },
    }));
  };

  const patchPrototipoDraft = (
    prototipoId: string,
    patch: Partial<PrototipoCatalogAdminRecord>,
  ) => {
    setPrototipoDrafts((prev) => ({
      ...prev,
      [prototipoId]: { ...prev[prototipoId], ...patch },
    }));
  };

  const saveCluster = async (clusterId: string) => {
    const draft = clusterDrafts[clusterId];
    if (!draft || !desarrolloId) {
      return;
    }

    setSavingId(`cluster:${clusterId}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/clusters/${encodeURIComponent(clusterId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: {
              nombre: draft.nombre,
              slug: draft.slug,
              tipo: draft.tipo,
              descripcion: draft.descripcion,
              logo: draft.logo,
              fotoPortada: draft.fotoPortada,
              precioDesde: draft.precioDesde,
              totalViviendas: draft.totalViviendas,
              entregaGeneral: draft.entregaGeneral,
              activo: draft.activo,
            },
          }),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el cluster.");
      }

      setSuccess(`Cluster «${draft.nombre}» actualizado.`);
      await loadProducto();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSavingId("");
    }
  };

  const savePrototipo = async (prototipoId: string) => {
    const draft = prototipoDrafts[prototipoId];
    if (!draft || !desarrolloId) {
      return;
    }

    setSavingId(`prototipo:${prototipoId}`);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/prototipos/${encodeURIComponent(prototipoId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payload: {
              nombre: draft.nombre,
              slug: draft.slug,
              construccionM2: draft.construccionM2,
              precioFinal: draft.precioFinal,
              entrega: draft.entrega,
              fotos: draft.fotos,
              planos: draft.planos,
              activo: draft.activo,
              soldOut: draft.soldOut,
            },
          }),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar el prototipo.");
      }

      setSuccess(`Prototipo «${draft.nombre}» actualizado.`);
      await loadProducto();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar");
    } finally {
      setSavingId("");
    }
  };

  const createCluster = async () => {
    if (!desarrolloId) {
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const id = newCluster.id.trim() || slugifyCatalogId(newCluster.nombre);
      const response = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/clusters`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            nombre: newCluster.nombre,
            tipo: newCluster.tipo,
          }),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el cluster.");
      }

      setSuccess("Cluster creado.");
      setNewCluster(emptyClusterDraft);
      await loadProducto();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  };

  const createPrototipo = async () => {
    if (!desarrolloId || !newPrototipo.clusterId) {
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const id = newPrototipo.id.trim() || slugifyCatalogId(newPrototipo.nombre);
      const response = await fetch(
        `/api/admin/catalog/desarrollos/${encodeURIComponent(desarrolloId)}/prototipos`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            clusterId: newPrototipo.clusterId,
            nombre: newPrototipo.nombre,
          }),
        },
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear el prototipo.");
      }

      setSuccess("Prototipo creado.");
      setNewPrototipo((prev) => ({ ...emptyPrototipoDraft, clusterId: prev.clusterId }));
      await loadProducto();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear");
    } finally {
      setCreating(false);
    }
  };

  if (!desarrollos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No tienes desarrollos asignados para editar clusters y prototipos.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
          Recorrido · Cotizador
        </p>
        <h2 className="mt-2 flex items-center gap-2 text-2xl font-black text-[#13315C]">
          <Layers className="h-6 w-6" />
          Clusters y prototipos
        </h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-[#13315C]/5 px-3 py-1 text-xs font-semibold text-[#13315C]">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-3 max-w-3xl text-sm text-slate-500">
          Define las torres o tipologías del desarrollo y sus prototipos. Las imágenes se usan en
          recorrido, cotizador y portada del hub.
        </p>

        {showDesarrolloPicker ? (
          <label className="mt-5 block min-w-[240px]">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Desarrollo
            </span>
            <select
              value={desarrolloId}
              onChange={(event) => setDesarrolloId(event.target.value)}
              className="input-cotizador"
            >
              {desarrollos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando producto…
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#13315C]">
              Nuevo cluster
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={newCluster.nombre}
                onChange={(event) =>
                  setNewCluster((prev) => ({
                    ...prev,
                    nombre: event.target.value,
                    id: prev.id || slugifyCatalogId(event.target.value),
                  }))
                }
                placeholder="Nombre"
                className="input-cotizador"
              />
              <input
                value={newCluster.id}
                onChange={(event) =>
                  setNewCluster((prev) => ({
                    ...prev,
                    id: slugifyCatalogId(event.target.value),
                  }))
                }
                placeholder="ID"
                className="input-cotizador"
              />
              <select
                value={newCluster.tipo}
                onChange={(event) =>
                  setNewCluster((prev) => ({
                    ...prev,
                    tipo: event.target.value as Cluster["tipo"],
                  }))
                }
                className="input-cotizador"
              >
                {clusterTipos.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={creating || !newCluster.nombre.trim()}
                onClick={() => void createCluster()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#13315C] px-4 text-sm font-black text-white disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Crear cluster
              </button>
            </div>
          </section>

          {!clusters.length ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Este desarrollo aún no tiene clusters. Crea el primero para habilitar recorrido y
              cotizador de producto.
            </div>
          ) : (
            clusters.map((cluster) => {
              const draft = clusterDrafts[cluster.id] ?? cluster;
              return (
                <section
                  key={cluster.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        Cluster · {draft.tipo}
                      </p>
                      <input
                        value={draft.nombre}
                        onChange={(event) =>
                          patchClusterDraft(cluster.id, { nombre: event.target.value })
                        }
                        className="mt-1 w-full min-w-[200px] border-0 bg-transparent p-0 text-xl font-black text-[#13315C] outline-none focus:ring-0"
                      />
                      <p className="text-xs text-slate-400">ID: {cluster.id}</p>
                    </div>
                    <button
                      type="button"
                      disabled={savingId === `cluster:${cluster.id}`}
                      onClick={() => void saveCluster(cluster.id)}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#13315C] px-4 text-sm font-black text-white disabled:opacity-50"
                    >
                      {savingId === `cluster:${cluster.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Guardar cluster
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <AdminImageUploadField
                      label="Logo cluster"
                      value={draft.logo}
                      onChange={(url) => patchClusterDraft(cluster.id, { logo: url })}
                      kind="cluster-logo"
                      desarrolloId={desarrolloId}
                      clusterId={cluster.id}
                      hint="Tarjeta de cluster en recorrido."
                    />
                    <AdminImageUploadField
                      label="Foto portada"
                      value={draft.fotoPortada}
                      onChange={(url) => patchClusterDraft(cluster.id, { fotoPortada: url })}
                      kind="cluster-portada"
                      desarrolloId={desarrolloId}
                      clusterId={cluster.id}
                      hint="Portada del hub y presentación visual."
                    />
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Prototipos
                    </h4>

                    {(prototiposByCluster[cluster.id] ?? []).map((prototipo) => {
                      const protoDraft = prototipoDrafts[prototipo.id] ?? prototipo;
                      return (
                        <article
                          key={prototipo.id}
                          className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <input
                                value={protoDraft.nombre}
                                onChange={(event) =>
                                  patchPrototipoDraft(prototipo.id, {
                                    nombre: event.target.value,
                                  })
                                }
                                className="w-full border-0 bg-transparent p-0 text-base font-black text-[#13315C] outline-none"
                              />
                              <p className="text-xs text-slate-400">ID: {prototipo.id}</p>
                            </div>
                            <button
                              type="button"
                              disabled={savingId === `prototipo:${prototipo.id}`}
                              onClick={() => void savePrototipo(prototipo.id)}
                              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#13315C]/15 px-3 text-xs font-bold text-[#13315C] disabled:opacity-50"
                            >
                              {savingId === `prototipo:${prototipo.id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Guardar
                            </button>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <AdminImageGalleryField
                              label="Fotos"
                              urls={protoDraft.fotos ?? []}
                              onChange={(urls) =>
                                patchPrototipoDraft(prototipo.id, { fotos: urls })
                              }
                              kind="prototipo-foto"
                              desarrolloId={desarrolloId}
                              prototipoId={prototipo.id}
                              hint="Fachada y renders del prototipo."
                            />
                            <AdminImageGalleryField
                              label="Planos"
                              urls={protoDraft.planos ?? []}
                              onChange={(urls) =>
                                patchPrototipoDraft(prototipo.id, { planos: urls })
                              }
                              kind="prototipo-plano"
                              desarrolloId={desarrolloId}
                              prototipoId={prototipo.id}
                              hint="Planta arquitectónica en recorrido."
                            />
                          </div>
                        </article>
                      );
                    })}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <input
                        value={newPrototipo.clusterId === cluster.id ? newPrototipo.nombre : ""}
                        onChange={(event) =>
                          setNewPrototipo({
                            clusterId: cluster.id,
                            nombre: event.target.value,
                            id: slugifyCatalogId(event.target.value),
                          })
                        }
                        placeholder="Nuevo prototipo"
                        className="input-cotizador sm:col-span-2"
                      />
                      <button
                        type="button"
                        disabled={
                          creating ||
                          newPrototipo.clusterId !== cluster.id ||
                          !newPrototipo.nombre.trim()
                        }
                        onClick={() => void createPrototipo()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#13315C]/15 px-4 text-sm font-bold text-[#13315C] disabled:opacity-50 sm:col-span-2"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar prototipo
                      </button>
                    </div>
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, Trash2, Upload } from "lucide-react";
import {
  buildDocumentoAlcanceKey,
  documentoAlcanceLabel,
  documentoCategoriaLabel,
  formatDocumentoAlcance,
  getEtapasForCluster,
  resolveDocumentoAlcanceStorage,
  sameDocumentoAlcance,
  type DocumentoAlcance,
  type DocumentoCategoria,
} from "@/lib/admin/documentos-scope";
import type { DocumentoRecord } from "@/lib/admin/types";
import type { Cluster, Desarrollo, DisponibilidadUnidad, Prototipo } from "@/lib/data";
import { filterClustersByDesarrollo } from "@/lib/catalog/cluster-filter";
import { useAdminDesarrolloSelection } from "@/lib/admin/use-admin-desarrollo";

type DocumentosAdminPanelProps = {
  desarrollos: Desarrollo[];
  scopeLabel?: string;
  clusters: Cluster[];
  disponibilidades: DisponibilidadUnidad[];
  prototipos: Prototipo[];
};

const alcances: DocumentoAlcance[] = ["desarrollo", "especifico"];

const categorias: DocumentoCategoria[] = [
  "brochure",
  "disponibilidad",
  "ficha_tecnica",
  "lista_precios",
  "master_plan",
  "otro",
];

const formatBytes = (bytes: number | null) => {
  if (!bytes) {
    return "—";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatFecha = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

const getCategoriaFromRecord = (doc: DocumentoRecord): DocumentoCategoria => {
  if (doc.tipo === "disponibilidad") {
    return "disponibilidad";
  }
  if (doc.tipo === "ficha_tecnica") {
    return "ficha_tecnica";
  }
  if (doc.tipo === "brochure_desarrollo" || doc.tipo === "brochure_cluster") {
    return "brochure";
  }
  return "otro";
};

export function DocumentosAdminPanel({
  desarrollos,
  scopeLabel,
  clusters,
  disponibilidades,
  prototipos,
}: DocumentosAdminPanelProps) {
  const { desarrolloId, setDesarrolloId } = useAdminDesarrolloSelection(desarrollos);
  const [alcance, setAlcance] = useState<DocumentoAlcance>("desarrollo");
  const [clusterId, setClusterId] = useState("");
  const [etapa, setEtapa] = useState("");
  const [prototipoId, setPrototipoId] = useState("");
  const [categoria, setCategoria] = useState<DocumentoCategoria>("brochure");
  const [nombre, setNombre] = useState("");
  const [nombrePersonalizado, setNombrePersonalizado] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingReplace, setPendingReplace] = useState<DocumentoRecord | null>(null);
  const [showHistorial, setShowHistorial] = useState(false);

  const esFichaTecnica = categoria === "ficha_tecnica";

  const clustersDisponibles = useMemo(
    () => filterClustersByDesarrollo(clusters, desarrolloId),
    [clusters, desarrolloId],
  );

  const clusterSeleccionado = useMemo(
    () => clustersDisponibles.find((item) => item.id === clusterId),
    [clusterId, clustersDisponibles],
  );

  const etapasDisponibles = useMemo(
    () =>
      getEtapasForCluster(
        clusterSeleccionado,
        disponibilidades.filter((item) => item.clusterId === clusterId),
      ),
    [clusterId, clusterSeleccionado, disponibilidades],
  );

  const prototiposDisponibles = useMemo(
    () => prototipos.filter((item) => !clusterId || item.clusterId === clusterId),
    [clusterId, prototipos],
  );

  const prototipoSeleccionado = useMemo(
    () => prototipos.find((item) => item.id === prototipoId),
    [prototipoId, prototipos],
  );

  const loadDocumentos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = desarrolloId ? `?desarrolloId=${desarrolloId}` : "";
      const response = await fetch(`/api/admin/documentos${params}`);
      const data = (await response.json()) as {
        documentos?: DocumentoRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la lista");
      }
      setDocumentos(data.documentos ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error de carga");
    } finally {
      setLoading(false);
    }
  }, [desarrolloId]);

  useEffect(() => {
    void loadDocumentos();
  }, [loadDocumentos]);

  useEffect(() => {
    if (!clustersDisponibles.some((item) => item.id === clusterId)) {
      setClusterId("");
      setPrototipoId("");
    }
  }, [clusterId, clustersDisponibles, desarrolloId]);

  useEffect(() => {
    if (esFichaTecnica) {
      return;
    }
    if (alcance === "desarrollo") {
      setClusterId("");
      setEtapa("");
    }
  }, [alcance, esFichaTecnica]);

  useEffect(() => {
    if (!esFichaTecnica) {
      setEtapa("");
    }
    setPrototipoId("");
  }, [clusterId, esFichaTecnica]);

  useEffect(() => {
    if (esFichaTecnica) {
      setEtapa("");
    } else {
      setPrototipoId("");
    }
  }, [categoria, esFichaTecnica]);

  const nombreSugerido = useMemo(() => {
    const desarrollo = desarrollos.find((item) => item.id === desarrolloId)?.nombre ?? "Desarrollo";
    const cluster = clusterSeleccionado?.nombre ?? "Cluster";

    if (categoria === "disponibilidad") {
      if (alcance === "especifico" && etapa) {
        return `Disponibilidad ${cluster} · Etapa ${etapa}`;
      }
      if (alcance === "especifico") {
        return `Disponibilidad ${cluster}`;
      }
      return `Disponibilidad ${desarrollo}`;
    }

    if (categoria === "lista_precios") {
      if (alcance === "especifico" && etapa) {
        return `Lista de precios ${cluster} · Etapa ${etapa}`;
      }
      if (alcance === "especifico") {
        return `Lista de precios ${cluster}`;
      }
      return `Lista de precios ${desarrollo}`;
    }

    if (categoria === "master_plan") {
      return alcance === "desarrollo" ? `Master plan ${desarrollo}` : `Plano ${cluster}`;
    }

    if (categoria === "ficha_tecnica") {
      const producto = prototipoSeleccionado?.nombre ?? "Producto";
      return `Ficha técnica ${producto}`;
    }

    if (categoria === "brochure") {
      if (alcance === "especifico" && etapa) {
        return `Brochure ${cluster} · Etapa ${etapa}`;
      }
      return alcance === "desarrollo" ? `Brochure ${desarrollo}` : `Brochure ${cluster}`;
    }

    return `Documento ${desarrollo}`;
  }, [alcance, categoria, clusterSeleccionado, desarrolloId, desarrollos, etapa, prototipoSeleccionado]);

  useEffect(() => {
    if (!nombrePersonalizado) {
      setNombre(nombreSugerido);
    }
  }, [nombrePersonalizado, nombreSugerido]);

  const confirmarNombreSugerido = () => {
    setNombre(nombreSugerido);
    setNombrePersonalizado(false);
  };

  const nombreConfirmado = !nombrePersonalizado || nombre.trim() === nombreSugerido.trim();

  const uploadAlcanceStorage = useMemo(
    () => resolveDocumentoAlcanceStorage(alcance, etapa),
    [alcance, etapa],
  );

  const uploadScopeKey = useMemo(() => {
    if (!desarrolloId) {
      return null;
    }

    const clusterForScope = esFichaTecnica
      ? clusterId || null
      : alcance === "especifico"
        ? clusterId || null
        : null;

    const etapaForScope =
      !esFichaTecnica && alcance === "especifico" ? etapa || null : null;

    const prototipoForScope = esFichaTecnica ? prototipoId || null : null;

    return buildDocumentoAlcanceKey({
      desarrolloId,
      clusterId: clusterForScope,
      etapa: etapaForScope,
      prototipoId: prototipoForScope,
      alcance: uploadAlcanceStorage,
      categoria,
    });
  }, [
    alcance,
    categoria,
    clusterId,
    desarrolloId,
    esFichaTecnica,
    etapa,
    prototipoId,
    uploadAlcanceStorage,
  ]);

  const documentoActivoEnAlcance = useMemo(() => {
    if (!uploadScopeKey) {
      return null;
    }

    return (
      documentos.find(
        (doc) => doc.activo && sameDocumentoAlcance(doc, uploadScopeKey),
      ) ?? null
    );
  }, [documentos, uploadScopeKey]);

  const documentosVisibles = useMemo(
    () => (showHistorial ? documentos : documentos.filter((doc) => doc.activo)),
    [documentos, showHistorial],
  );

  const inactiveCount = useMemo(
    () => documentos.filter((doc) => !doc.activo).length,
    [documentos],
  );

  useEffect(() => {
    setPendingReplace(null);
  }, [uploadScopeKey, file?.name]);

  const performUpload = async (confirmReplace: boolean) => {
    if (!file) {
      setError("Selecciona un archivo PDF.");
      return;
    }

    const alcanceStorage = resolveDocumentoAlcanceStorage(alcance, etapa);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("desarrolloId", desarrolloId);
      formData.append("categoria", categoria);
      formData.append("nombre", nombre);
      if (confirmReplace) {
        formData.append("confirmReplace", "true");
      }
      if (!esFichaTecnica) {
        formData.append("alcance", alcanceStorage);
      }
      if (clusterId) {
        formData.append("clusterId", clusterId);
      }
      if (etapa) {
        formData.append("etapa", etapa);
      }
      if (prototipoId) {
        formData.append("prototipoId", prototipoId);
      }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 90000);

      let response: Response;
      try {
        response = await fetch("/api/admin/documentos", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          throw new Error(
            "La subida tardó demasiado. Revisa tu internet, el tamaño del PDF o intenta de nuevo.",
          );
        }
        throw fetchError;
      } finally {
        window.clearTimeout(timeoutId);
      }

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        existing?: DocumentoRecord;
      };

      if (response.status === 409 && data.error === "DOCUMENTO_ALREADY_EXISTS") {
        setPendingReplace(data.existing ?? documentoActivoEnAlcance);
        setError("");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "Error al subir");
      }

      setSuccess(
        confirmReplace
          ? "Documento reemplazado. La versión anterior quedó en historial."
          : "Documento publicado. Los asesores ya pueden descargarlo.",
      );
      setPendingReplace(null);
      setNombrePersonalizado(false);
      setNombre("");
      setFile(null);
      await loadDocumentos();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Selecciona un archivo PDF.");
      return;
    }

    if (esFichaTecnica) {
      if (!clusterId) {
        setError("Selecciona un cluster.");
        return;
      }
      if (!prototipoId) {
        setError("Selecciona un producto (prototipo).");
        return;
      }
    } else {
      if (alcance === "especifico" && !clusterId) {
        setError("Selecciona un cluster.");
        return;
      }
    }

    const existing = documentoActivoEnAlcance ?? pendingReplace;
    if (existing && !pendingReplace) {
      setPendingReplace(existing);
      return;
    }

    await performUpload(Boolean(pendingReplace));
  };

  const handleConfirmReplace = async () => {
    setError("");
    setSuccess("");
    await performUpload(true);
  };

  const handleCancelReplace = () => {
    setPendingReplace(null);
  };

  const handleDeactivate = async (id: string) => {
    setError("");
    try {
      const response = await fetch(`/api/admin/documentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: false }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo desactivar");
      }
      await loadDocumentos();
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "Error");
    }
  };

  return (
    <div className="space-y-6">
      {desarrollos.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          No tienes desarrollos asignados. Pide al administrador gabi que configure tu perfil en
          Supabase (<code className="rounded bg-white px-1">admin_profiles.desarrollos_ids</code>
          ).
        </div>
      ) : null}

      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2DD4BF]">
          Paso 1 · Subir documento
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#13315C]">Publicar PDF comercial</h2>
        {scopeLabel ? (
          <p className="mt-2 inline-flex rounded-full bg-[#13315C]/5 px-3 py-1 text-xs font-semibold text-[#13315C]">
            Alcance: {scopeLabel}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-slate-500">
          Define el <strong>tipo de documento</strong> y su contexto: todo el desarrollo, cluster o
          etapa específica, o producto (ficha técnica).
        </p>

        <form onSubmit={(event) => void handleUpload(event)} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                1 · Desarrollo
              </span>
              <select
                value={desarrolloId}
                onChange={(event) => {
                  setDesarrolloId(event.target.value);
                  setClusterId("");
                  setPrototipoId("");
                }}
                className="input-cotizador"
              >
                {desarrollos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                2 · Tipo de documento
              </span>
              <select
                value={categoria}
                onChange={(event) => setCategoria(event.target.value as DocumentoCategoria)}
                className="input-cotizador"
              >
                {categorias.map((item) => (
                  <option key={item} value={item}>
                    {documentoCategoriaLabel[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {esFichaTecnica ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  3 · Cluster
                </span>
                <select
                  value={clusterId}
                  onChange={(event) => setClusterId(event.target.value)}
                  className="input-cotizador"
                  required
                >
                  <option value="">Selecciona cluster</option>
                  {clustersDisponibles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  4 · Producto (prototipo)
                </span>
                <select
                  value={prototipoId}
                  onChange={(event) => setPrototipoId(event.target.value)}
                  className="input-cotizador"
                  required
                  disabled={!clusterId}
                >
                  <option value="">
                    {clusterId ? "Selecciona producto" : "Primero elige cluster"}
                  </option>
                  {prototiposDisponibles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <>
              <label className="block md:max-w-md">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  3 · Aplica a
                </span>
                <select
                  value={alcance}
                  onChange={(event) => setAlcance(event.target.value as DocumentoAlcance)}
                  className="input-cotizador"
                >
                  {alcances.map((item) => (
                    <option key={item} value={item}>
                      {documentoAlcanceLabel[item]}
                    </option>
                  ))}
                </select>
              </label>

              {alcance === "especifico" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      4 · Cluster
                    </span>
                    <select
                      value={clusterId}
                      onChange={(event) => setClusterId(event.target.value)}
                      className="input-cotizador"
                      required
                    >
                      <option value="">Selecciona cluster</option>
                      {clustersDisponibles.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                      5 · Etapa (opcional)
                    </span>
                    <select
                      value={etapa}
                      onChange={(event) => setEtapa(event.target.value)}
                      className="input-cotizador"
                      disabled={!clusterId}
                    >
                      <option value="">
                        {clusterId ? "Todo el cluster" : "Primero elige cluster"}
                      </option>
                      {etapasDisponibles.map((item) => (
                        <option key={item} value={item}>
                          Etapa {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </>
          )}

          <div className="rounded-xl border border-[#13315C]/8 bg-[#F2F0E9]/60 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-[#13315C]">Resumen: </span>
            {formatDocumentoAlcance({
              clusterId: esFichaTecnica || alcance === "especifico" ? clusterId || null : null,
              etapa: !esFichaTecnica && alcance === "especifico" ? etapa || null : null,
              prototipoId: esFichaTecnica ? prototipoId || null : null,
              clusterNombre: clusterSeleccionado?.nombre,
              prototipoNombre: prototipoSeleccionado?.nombre,
            })}
            {" · "}
            {documentoCategoriaLabel[categoria]}
          </div>

          {documentoActivoEnAlcance && !pendingReplace ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-semibold">Ya existe un documento activo para este alcance</p>
              <p className="mt-1 text-amber-900/80">
                <strong>{documentoActivoEnAlcance.nombre}</strong> · publicado{" "}
                {formatFecha(documentoActivoEnAlcance.created_at)}. Si publicas otro PDF, se
                te pedirá confirmación para reemplazarlo.
              </p>
            </div>
          ) : null}

          {pendingReplace ? (
            <div className="rounded-xl border border-[#13315C]/15 bg-[#F2F0E9] px-4 py-4">
              <p className="font-bold text-[#13315C]">¿Reemplazar documento existente?</p>
              <p className="mt-2 text-sm text-slate-600">
                Ya hay un <strong>{documentoCategoriaLabel[categoria].toLowerCase()}</strong>{" "}
                activo para{" "}
                <strong>
                  {formatDocumentoAlcance({
                    clusterId: esFichaTecnica || alcance === "especifico" ? clusterId || null : null,
                    etapa: !esFichaTecnica && alcance === "especifico" ? etapa || null : null,
                    prototipoId: esFichaTecnica ? prototipoId || null : null,
                    clusterNombre: clusterSeleccionado?.nombre,
                    prototipoNombre: prototipoSeleccionado?.nombre,
                  })}
                </strong>
                :
              </p>
              <p className="mt-2 text-sm font-semibold text-[#13315C]">
                {pendingReplace.nombre}
                <span className="font-normal text-slate-500">
                  {" "}
                  · {formatFecha(pendingReplace.created_at)}
                </span>
              </p>
              <p className="mt-2 text-xs text-slate-500">
                La versión actual quedará inactiva en el historial; los asesores verán el PDF
                nuevo.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleConfirmReplace()}
                  disabled={uploading}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#13315C] px-4 text-sm font-bold text-white disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Sí, reemplazar
                </button>
                <button
                  type="button"
                  onClick={handleCancelReplace}
                  disabled={uploading}
                  className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Nombre visible
            </span>
            <input
              value={nombre}
              onChange={(event) => {
                setNombre(event.target.value);
                setNombrePersonalizado(true);
              }}
              required
              className="input-cotizador"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {nombreConfirmado ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  <Check className="h-3.5 w-3.5" />
                  Nombre sugerido confirmado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={confirmarNombreSugerido}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#13315C]/15 bg-white px-3 py-1 text-xs font-semibold text-[#13315C] hover:bg-slate-50"
                >
                  <Check className="h-3.5 w-3.5" />
                  Usar sugerido: {nombreSugerido}
                </button>
              )}
              <span className="text-xs text-slate-400">
                Se actualiza solo al cambiar desarrollo, tipo o producto.
              </span>
            </div>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Archivo PDF
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              required
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-[#13315C] file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-white"
            />
          </label>

          <button
            type="submit"
            disabled={uploading}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#2DD4BF] px-6 text-sm font-bold text-[#13315C] disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Subiendo..." : pendingReplace ? "Revisar reemplazo arriba" : "Publicar documento"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            {success}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[#13315C]/8 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#13315C]">Documentos publicados</h3>
            <p className="mt-1 text-xs text-slate-500">
              {showHistorial
                ? "Mostrando activos e historial de versiones reemplazadas."
                : "Solo documentos activos visibles para asesores."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {inactiveCount ? (
              <button
                type="button"
                onClick={() => setShowHistorial((current) => !current)}
                className="text-sm font-semibold text-[#13315C] hover:underline"
              >
                {showHistorial
                  ? "Ocultar historial"
                  : `Ver historial (${inactiveCount})`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void loadDocumentos()}
              className="text-sm font-semibold text-[#13315C] hover:underline"
            >
              Actualizar
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Cargando...</p>
        ) : documentosVisibles.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-3 pr-4">Nombre</th>
                  <th className="py-3 pr-4">Aplica a</th>
                  <th className="py-3 pr-4">Tipo</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Tamaño</th>
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentosVisibles.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-50">
                    <td className="py-3 pr-4 font-semibold text-[#13315C]">{doc.nombre}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {formatDocumentoAlcance({
                        clusterId: doc.cluster_id,
                        etapa: doc.etapa ?? null,
                        prototipoId: doc.prototipo_id ?? null,
                        clusterNombre: clusters.find((item) => item.id === doc.cluster_id)?.nombre,
                        prototipoNombre: prototipos.find((item) => item.id === doc.prototipo_id)?.nombre,
                      })}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">
                      {documentoCategoriaLabel[getCategoriaFromRecord(doc)]}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${
                          doc.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {doc.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{formatBytes(doc.tamano_bytes)}</td>
                    <td className="py-3 pr-4 text-slate-500">{formatFecha(doc.created_at)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#13315C]"
                          title="Ver PDF"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {doc.activo ? (
                          <button
                            type="button"
                            onClick={() => void handleDeactivate(doc.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600"
                            title="Desactivar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            {documentos.length && !showHistorial
              ? "No hay documentos activos. Activa «Ver historial» para versiones anteriores."
              : "Aún no hay documentos para este desarrollo."}
          </p>
        )}
      </div>
    </div>
  );
}

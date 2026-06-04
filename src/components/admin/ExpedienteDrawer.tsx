"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  FileCheck,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { ExpedienteDetail, ExpedienteDocumentoRecord } from "@/lib/admin/expediente-service";
import type { SolicitudComisionRecord } from "@/lib/admin/comision-service";
import type { ComisionElegibilidad, ComisionPagoTrigger } from "@/lib/comercial/comision-reglas";
import { evaluarElegibilidadComision } from "@/lib/comercial/comision-reglas";
import {
  checklistEtapaLabel,
  checklistParteLabel,
  type ExpedienteChecklistEtapa,
  type ExpedienteChecklistItem,
} from "@/lib/comercial/expediente-checklist";
import { estatusSembradoLabel } from "@/lib/comercial/sembrado-status";
import { formatPrice } from "@/lib/data";

type ExpedienteDrawerProps = {
  operacionId: string;
  onClose: () => void;
  onUpdated?: () => void;
};

const ETAPAS: ExpedienteChecklistEtapa[] = ["apartado", "contrato", "cancelacion"];

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

const solicitudEstadoLabel: Record<SolicitudComisionRecord["estado"], string> = {
  pendiente: "Pendiente autorización",
  autorizada: "Autorizada — listo para facturar",
  rechazada: "Rechazada",
  facturada: "Facturada",
};

export function ExpedienteDrawer({ operacionId, onClose, onUpdated }: ExpedienteDrawerProps) {
  const [detail, setDetail] = useState<ExpedienteDetail | null>(null);
  const [elegibilidad, setElegibilidad] = useState<ComisionElegibilidad | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudComisionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingEnganche, setSavingEnganche] = useState(false);
  const [solicitando, setSolicitando] = useState(false);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [checklistCodigo, setChecklistCodigo] = useState("OC");
  const [nombre, setNombre] = useState("");
  const [notas, setNotas] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pendingReplace, setPendingReplace] = useState<ExpedienteDocumentoRecord | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [etapaAbierta, setEtapaAbierta] = useState<ExpedienteChecklistEtapa | null>("contrato");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/expedientes/${operacionId}`);
      const data = (await response.json()) as {
        expediente?: ExpedienteDetail;
        comision?: { elegibilidad: ComisionElegibilidad; solicitudes: SolicitudComisionRecord[] };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el expediente.");
      }

      setDetail(data.expediente ?? null);
      setElegibilidad(data.comision?.elegibilidad ?? null);
      setSolicitudes(data.comision?.solicitudes ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const documentoPorCodigo = useMemo(() => {
    const map = new Map<string, ExpedienteDocumentoRecord>();
    for (const doc of detail?.documentos ?? []) {
      if (!map.has(doc.checklist_codigo)) {
        map.set(doc.checklist_codigo, doc);
      }
    }
    return map;
  }, [detail]);

  const checklistItems = useMemo(
    () =>
      (detail?.checklist ?? []).filter((item) => {
        if (item.soloPersonaMoral && !detail?.operacion.persona_moral) {
          return false;
        }
        return true;
      }),
    [detail],
  );
  const selectedItem = checklistItems.find((item) => item.codigo === checklistCodigo);

  const elegibilidadEscrituracion = useMemo(() => {
    if (!detail) {
      return null;
    }
    const op = detail.operacion;
    return evaluarElegibilidadComision({
      desarrolloId: op.desarrollo_id,
      precioVenta: op.precio_venta ? Number(op.precio_venta) : null,
      esquemaPago: op.esquema_pago,
      engancheCubierto: Boolean(op.enganche_cubierto),
      formalizacionCompleta: detail.progreso.formalizacionCompleta,
      escriturado: op.escriturado,
      trigger: "escrituracion",
    });
  }, [detail]);

  const performUpload = async (confirmReplace: boolean) => {
    if (!file || !selectedItem) {
      setError("Selecciona un archivo y tipo de documento.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("checklistCodigo", checklistCodigo);
      formData.append("etapaChecklist", selectedItem.etapa);
      formData.append("nombre", nombre.trim() || selectedItem.titulo);
      if (notas.trim()) {
        formData.append("notas", notas.trim());
      }
      if (confirmReplace) {
        formData.append("confirmReplace", "true");
      }

      const response = await fetch(`/api/admin/expedientes/${operacionId}`, {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        error?: string;
        existing?: ExpedienteDocumentoRecord;
      };

      if (response.status === 409 && data.error === "EXPEDIENTE_ALREADY_EXISTS") {
        setPendingReplace(data.existing ?? null);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo subir el documento.");
      }

      setFile(null);
      setNotas("");
      setPendingReplace(null);
      void loadDetail();
      onUpdated?.();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  };

  const togglePersonaMoral = async () => {
    if (!detail) {
      return;
    }

    setSavingEnganche(true);
    setError("");

    try {
      const next = !detail.operacion.persona_moral;
      const response = await fetch(`/api/admin/expedientes/${operacionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaMoral: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar.");
      }
      void loadDetail();
      onUpdated?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSavingEnganche(false);
    }
  };

  const toggleEnganche = async () => {
    if (!detail) {
      return;
    }

    setSavingEnganche(true);
    setError("");

    try {
      const next = !detail.operacion.enganche_cubierto;
      const response = await fetch(`/api/admin/expedientes/${operacionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engancheCubierto: next }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo actualizar el enganche.");
      }
      void loadDetail();
      onUpdated?.();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar.");
    } finally {
      setSavingEnganche(false);
    }
  };

  const solicitarComision = async (trigger?: ComisionPagoTrigger) => {
    setSolicitando(true);
    setError("");

    try {
      const response = await fetch("/api/admin/comisiones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operacionId, trigger }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo crear la solicitud.");
      }
      void loadDetail();
      onUpdated?.();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al solicitar.");
    } finally {
      setSolicitando(false);
    }
  };

  const resolverSolicitud = async (
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
        throw new Error(data.error ?? "No se pudo actualizar la solicitud.");
      }
      void loadDetail();
      onUpdated?.();
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : "Error al resolver.");
    } finally {
      setResolviendoId(null);
    }
  };

  const openDocumento = async (documentoId: string) => {
    setOpeningId(documentoId);
    setError("");
    try {
      const response = await fetch(`/api/admin/expedientes/documentos/${documentoId}`);
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "No se pudo abrir el documento.");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Error al abrir.");
    } finally {
      setOpeningId(null);
    }
  };

  const deleteDocumento = async (documentoId: string) => {
    if (!window.confirm("¿Eliminar este documento del expediente?")) {
      return;
    }
    setDeletingId(documentoId);
    try {
      const response = await fetch(`/api/admin/expedientes/documentos/${documentoId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo eliminar.");
      }
      void loadDetail();
      onUpdated?.();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error al eliminar.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderChecklistItem = (item: ExpedienteChecklistItem) => {
    const doc = documentoPorCodigo.get(item.codigo);
    const requerido = item.requeridoFormalizacion || item.requeridoApartado;

    return (
      <li
        key={item.codigo}
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
      >
        <div className="flex min-w-0 items-start gap-3">
          {doc ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <Circle className={`mt-0.5 h-4 w-4 shrink-0 ${requerido ? "text-amber-400" : "text-slate-300"}`} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              {item.codigo} · {item.titulo}
            </p>
            {doc ? (
              <p className="truncate text-xs text-slate-500">{doc.nombre}</p>
            ) : (
              <p className="text-xs text-slate-400">
                {item.opcionalCondicional ? "Cuando aplique" : requerido ? "Pendiente" : "Opcional"}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {!doc ? (
            <button
              type="button"
              onClick={() => {
                setChecklistCodigo(item.codigo);
                setNombre(item.titulo);
                setEtapaAbierta(item.etapa);
              }}
              className="rounded-lg px-2 py-1 text-xs font-bold text-gabi-forest hover:bg-slate-100"
            >
              Subir
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void openDocumento(doc.id)}
                disabled={openingId === doc.id}
                className="rounded-lg p-2 text-gabi-forest hover:bg-slate-100 disabled:opacity-50"
              >
                {openingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void deleteDocumento(doc.id)}
                disabled={deletingId === doc.id}
                className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Expediente legal · La Ceiba
            </p>
            <h3 className="text-xl font-black text-gabi-forest">
              {detail?.operacion.cliente_nombre ?? "Cargando…"}
            </h3>
            {detail ? (
              <p className="mt-1 text-sm text-slate-500">
                Unidad {detail.unidadNumero} ·{" "}
                {estatusSembradoLabel[detail.operacion.estatus_sembrado] ??
                  detail.operacion.estatus_sembrado}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando expediente…
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {detail ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-gabi-forest">Formalización (comisión)</p>
                  <p className="text-2xl font-black tabular-nums">{detail.progreso.formalizacion.pct}%</p>
                  <p className="text-xs text-slate-500">
                    {detail.progreso.formalizacion.completados}/{detail.progreso.formalizacion.requeridos}{" "}
                    documentos
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-gabi-forest">Apartado</p>
                  <p className="text-2xl font-black tabular-nums">{detail.progreso.apartado.pct}%</p>
                  <p className="text-xs text-slate-500">
                    {detail.progreso.apartado.completados}/{detail.progreso.apartado.requeridos} documentos
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gabi-forest/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gabi-forest">Requisitos para solicitar comisión</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        {detail.progreso.formalizacionCompleta ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-amber-400" />
                        )}
                        Expediente de formalización completo en plataforma
                      </li>
                      <li className="flex items-center gap-2">
                        {detail.operacion.enganche_cubierto ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-amber-400" />
                        )}
                        Enganche pagado / cubierto
                      </li>
                      <li className="flex items-center gap-2">
                        {detail.operacion.persona_moral ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Circle className="h-4 w-4 text-slate-300" />
                        )}
                        Persona moral (si aplica)
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => void toggleEnganche()}
                      disabled={savingEnganche}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
                        detail.operacion.enganche_cubierto
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {savingEnganche
                        ? "Guardando…"
                        : detail.operacion.enganche_cubierto
                          ? "Enganche ✓ cubierto"
                          : "Marcar enganche cubierto"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void togglePersonaMoral()}
                      disabled={savingEnganche}
                      className={`rounded-xl px-4 py-2 text-sm font-bold ${
                        detail.operacion.persona_moral
                          ? "bg-violet-100 text-violet-900"
                          : "border border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {detail.operacion.persona_moral ? "Persona moral ✓" : "Marcar persona moral"}
                    </button>
                  </div>
                </div>

                {elegibilidad?.regla ? (
                  <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-600">
                    <p>
                      Comisión desarrollo:{" "}
                      <strong>
                        {elegibilidad.regla.comisionPct != null
                          ? `${elegibilidad.regla.comisionPct}%`
                          : elegibilidad.regla.comisionNota}
                      </strong>
                    </p>
                    {elegibilidad.pagoRegla ? (
                      <p className="mt-1">
                        Tramo aplicable:{" "}
                        <strong>{elegibilidad.pagoRegla.porcentajePago}%</strong> —{" "}
                        {elegibilidad.pagoRegla.requisitos}
                      </p>
                    ) : null}
                    {elegibilidad.montoSolicitud != null ? (
                      <p className="mt-1 font-bold text-gabi-forest">
                        Monto solicitud: {formatPrice(elegibilidad.montoSolicitud)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {!elegibilidad?.elegible && elegibilidad?.razones.length ? (
                  <ul className="mt-3 list-disc pl-5 text-xs text-amber-800">
                    {elegibilidad.razones.map((razon) => (
                      <li key={razon}>{razon}</li>
                    ))}
                  </ul>
                ) : null}

                <button
                  type="button"
                  onClick={() => void solicitarComision()}
                  disabled={!elegibilidad?.elegible || solicitando}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {solicitando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileCheck className="h-4 w-4" />
                  )}
                  Solicitar comisión (enganche / contado)
                </button>

                {elegibilidadEscrituracion?.pagoRegla ? (
                  <button
                    type="button"
                    onClick={() => void solicitarComision("escrituracion")}
                    disabled={!elegibilidadEscrituracion.elegible || solicitando}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gabi-forest/20 bg-white px-4 py-3 text-sm font-bold text-gabi-forest disabled:opacity-50"
                  >
                    Solicitar tramo escrituración ({elegibilidadEscrituracion.pagoRegla.porcentajePago}%)
                  </button>
                ) : null}

                {solicitudes.length ? (
                  <div className="mt-4 space-y-2">
                    {solicitudes.map((sol) => (
                      <div
                        key={sol.id}
                        className="rounded-xl border border-slate-100 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold">{solicitudEstadoLabel[sol.estado]}</p>
                            <p className="text-xs text-slate-500">
                              {formatPrice(Number(sol.monto_solicitado))} · {sol.porcentaje_pago}% del total
                              comisión
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {sol.estado === "pendiente" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={resolviendoId === sol.id}
                                  onClick={() => void resolverSolicitud(sol.id, "autorizar")}
                                  className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white"
                                >
                                  Autorizar
                                </button>
                                <button
                                  type="button"
                                  disabled={resolviendoId === sol.id}
                                  onClick={() => void resolverSolicitud(sol.id, "rechazar")}
                                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-700"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : null}
                            {sol.estado === "autorizada" ? (
                              <button
                                type="button"
                                disabled={resolviendoId === sol.id}
                                onClick={() => void resolverSolicitud(sol.id, "facturar")}
                                className="rounded-lg bg-gabi-forest px-2 py-1 text-xs font-bold text-white"
                              >
                                Marcar facturada
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {ETAPAS.map((etapa) => {
                const items = checklistItems.filter((item) => item.etapa === etapa);
                if (!items.length) {
                  return null;
                }
                const abierta = etapaAbierta === etapa;
                return (
                  <div key={etapa} className="rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEtapaAbierta(abierta ? null : etapa)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="font-bold text-gabi-forest">{checklistEtapaLabel[etapa]}</span>
                      <span className="text-xs text-slate-500">{items.length} tipos</span>
                    </button>
                    {abierta ? (
                      <div className="border-t border-slate-100 p-4">
                        {(["empresa", "cliente"] as const).map((parte) => {
                          const parteItems = items.filter((item) => item.parte === parte);
                          if (!parteItems.length) {
                            return null;
                          }
                          return (
                            <div key={parte} className="mb-4 last:mb-0">
                              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                {checklistParteLabel[parte]}
                              </p>
                              <ul className="space-y-2">{parteItems.map(renderChecklistItem)}</ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-gabi-forest/10 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-gabi-forest" />
                  <h4 className="text-sm font-bold text-gabi-forest">Subir documento</h4>
                </div>

                {pendingReplace ? (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                    <p className="font-semibold">¿Reemplazar documento existente?</p>
                    <p className="mt-1">{pendingReplace.nombre}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPendingReplace(null)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void performUpload(true)}
                        disabled={uploading}
                        className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Reemplazar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">Documento del checklist</span>
                    <select
                      value={checklistCodigo}
                      onChange={(event) => {
                        const codigo = event.target.value;
                        setChecklistCodigo(codigo);
                        const item = checklistItems.find((i) => i.codigo === codigo);
                        if (item) {
                          setNombre(item.titulo);
                        }
                      }}
                      className={inputClass}
                    >
                      {checklistItems.map((item) => (
                        <option key={item.codigo} value={item.codigo}>
                          [{item.codigo}] {item.titulo}
                        </option>
                      ))}
                      <option value="OTRO">[OTRO] Documento adicional</option>
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">Nombre</span>
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">Archivo</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-600">Notas</span>
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      className={`${inputClass} min-h-[72px]`}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void performUpload(false)}
                  disabled={uploading || !file}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Subiendo…" : "Agregar al expediente"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

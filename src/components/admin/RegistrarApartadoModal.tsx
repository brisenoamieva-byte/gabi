"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { ApartadoAsesorOption } from "@/lib/admin/operaciones-service";
import type { ApartadoPrefill } from "@/lib/admin/operaciones-service";
import {
  listaPreciosEstadoLabel,
  type ListaPreciosRecord,
} from "@/lib/admin/listas-precios-types";
import type { DesarrolloSembradoSegment } from "@/lib/catalog/desarrollos-registry";
import { getSembradoSegmentsForDesarrollo } from "@/lib/catalog/desarrollos-registry";
import {
  EQUIPO_VENTA_OPTIONS,
  MEDIO_PUBLICITARIO_OPTIONS,
  PROMOTOR_ASESOR_OTRO,
  filterUnidadesBySembradoSegment,
  normalizeEquipoVentaSelect,
  normalizeMedioPublicitarioSelect,
  resolveSembradoSegmentIdForUnidad,
} from "@/lib/comercial/apartado-form-options";
import type { SembradoUnidadRow } from "@/lib/comercial/sembrado-status";
import { formatAmountInput, parseMoneyInput } from "@/lib/format/money-input";

type RegistrarApartadoModalProps = {
  desarrolloId: string;
  modo?: "registrar" | "completar";
  unidadesOpciones?: SembradoUnidadRow[];
  prospectoId?: string;
  initialUnidadId?: string;
  channel?: "admin" | "asesor";
  asesorId?: string;
  onClose: () => void;
  onSuccess: () => void;
};

type FormState = {
  unidadId: string;
  clienteNombre: string;
  origenCiudad: string;
  equipoVenta: string;
  promotorNombre: string;
  tipoInversion: string;
  listaPrecios: string;
  listaPreciosId: string;
  precioLista: string;
  descuentoPct: string;
  precioVenta: string;
  esquemaPago: string;
  fechaApartado: string;
  fechaCierre: string;
  medioPublicitario: string;
  observacionesPagos: string;
  observaciones: string;
  primerPago: string;
  prospectoEmail: string;
  prospectoTelefono: string;
  prospectoId: string;
  cotizacionId: string;
};

const emptyForm = (unidadId = ""): FormState => ({
  unidadId,
  clienteNombre: "",
  origenCiudad: "",
  equipoVenta: "",
  promotorNombre: "",
  tipoInversion: "",
  listaPrecios: "",
  listaPreciosId: "",
  precioLista: "",
  descuentoPct: "",
  precioVenta: "",
  esquemaPago: "",
  fechaApartado: new Date().toISOString().slice(0, 10),
  fechaCierre: "",
  medioPublicitario: "",
  observacionesPagos: "",
  observaciones: "",
  primerPago: "",
  prospectoEmail: "",
  prospectoTelefono: "",
  prospectoId: "",
  cotizacionId: "",
});

const prefillToForm = (prefill: ApartadoPrefill): FormState => ({
  unidadId: prefill.unidadId,
  clienteNombre: prefill.clienteNombre,
  origenCiudad: prefill.origenCiudad ?? "",
  equipoVenta: normalizeEquipoVentaSelect(prefill.equipoVenta),
  promotorNombre: prefill.promotorNombre ?? "",
  tipoInversion: prefill.tipoInversion ?? "",
  listaPrecios: prefill.listaPrecios ?? "",
  listaPreciosId: prefill.listaPreciosId ?? "",
  precioLista: prefill.precioLista ? formatAmountInput(prefill.precioLista) : "",
  descuentoPct: prefill.descuentoPct != null ? String(prefill.descuentoPct) : "",
  precioVenta: prefill.precioVenta ? formatAmountInput(prefill.precioVenta) : "",
  esquemaPago: prefill.esquemaPago ?? "",
  fechaApartado: new Date().toISOString().slice(0, 10),
  fechaCierre: "",
  medioPublicitario: normalizeMedioPublicitarioSelect(prefill.medioPublicitario),
  observacionesPagos: "",
  observaciones: "",
  primerPago: "",
  prospectoEmail: prefill.prospectoEmail ?? "",
  prospectoTelefono: prefill.prospectoTelefono ?? "",
  prospectoId: prefill.prospectoId ?? "",
  cotizacionId: prefill.cotizacionId ?? "",
});

const inferPromotorAsesorId = (
  equipoVenta: string,
  promotorNombre: string,
  asesores: ApartadoAsesorOption[],
  currentAsesorId?: string,
): string => {
  if (equipoVenta !== "Interno (BBR)") {
    return "";
  }

  const byNombre = asesores.find(
    (row) => row.nombre.trim().toLowerCase() === promotorNombre.trim().toLowerCase(),
  );
  if (byNombre) {
    return byNombre.id;
  }
  if (currentAsesorId && asesores.some((row) => row.id === currentAsesorId)) {
    return currentAsesorId;
  }
  if (promotorNombre.trim()) {
    return PROMOTOR_ASESOR_OTRO;
  }
  return currentAsesorId ?? "";
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
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

const isFailedFetchError = (message: string) =>
  message.toLowerCase().includes("failed to fetch") ||
  message.toLowerCase().includes("networkerror");

export function RegistrarApartadoModal({
  desarrolloId,
  modo = "registrar",
  unidadesOpciones: unidadesOpcionesProp,
  prospectoId,
  initialUnidadId,
  channel = "admin",
  asesorId,
  onClose,
  onSuccess,
}: RegistrarApartadoModalProps) {
  const esAsesor = channel === "asesor";
  const esCompletar = modo === "completar";
  const desdeLead = Boolean(prospectoId);
  const [unidadesOpciones, setUnidadesOpciones] = useState<SembradoUnidadRow[]>(
    () => unidadesOpcionesProp ?? [],
  );
  const [segmentos, setSegmentos] = useState<DesarrolloSembradoSegment[]>(() =>
    getSembradoSegmentsForDesarrollo(desarrolloId),
  );
  const [asesores, setAsesores] = useState<ApartadoAsesorOption[]>([]);
  const [tipoProducto, setTipoProducto] = useState("");
  const [promotorAsesorId, setPromotorAsesorId] = useState("");
  const [form, setForm] = useState<FormState>(() => emptyForm(initialUnidadId ?? ""));
  const [loadingContext, setLoadingContext] = useState(false);
  const [loadingUnidadPrefill, setLoadingUnidadPrefill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cotizacionHint, setCotizacionHint] = useState(false);
  const [listasPrecios, setListasPrecios] = useState<ListaPreciosRecord[]>([]);
  const asesoresRef = useRef(asesores);
  const unidadesOpcionesRef = useRef(unidadesOpciones);
  const prospectoMedioRef = useRef("");
  const initialLoadKeyRef = useRef<string | null>(null);

  asesoresRef.current = asesores;
  unidadesOpcionesRef.current = unidadesOpciones;

  const applyContextMeta = useCallback(
    (
      unidades: SembradoUnidadRow[],
      prefill: ApartadoPrefill | undefined,
      nextAsesores: ApartadoAsesorOption[],
      nextSegmentos?: DesarrolloSembradoSegment[],
    ) => {
      setUnidadesOpciones(unidades);
      if (nextSegmentos?.length) {
        setSegmentos(nextSegmentos);
      }

      setAsesores(nextAsesores);

      if (prefill) {
        const nextForm = prefillToForm(prefill);
        if (nextForm.medioPublicitario) {
          prospectoMedioRef.current = nextForm.medioPublicitario;
        }
        if (!nextForm.equipoVenta && esAsesor) {
          nextForm.equipoVenta = "Interno (BBR)";
        }
        setForm(nextForm);
        setCotizacionHint(prefill.cotizacionReciente);
        setPromotorAsesorId(
          inferPromotorAsesorId(
            nextForm.equipoVenta,
            nextForm.promotorNombre,
            nextAsesores,
            esAsesor ? asesorId : undefined,
          ),
        );

        if (prefill.unidadId) {
          const row = unidades.find((item) => item.unidadId === prefill.unidadId);
          if (row) {
            setTipoProducto(resolveSembradoSegmentIdForUnidad(desarrolloId, row) ?? "");
          }
        } else if (nextSegmentos?.length) {
          setTipoProducto(nextSegmentos[0]?.id ?? "");
        }
      }
    },
    [asesorId, desarrolloId, esAsesor],
  );

  const unidadesFiltradas = useMemo(
    () => filterUnidadesBySembradoSegment(unidadesOpciones, desarrolloId, tipoProducto),
    [desarrolloId, tipoProducto, unidadesOpciones],
  );

  const resolvePromotorNombre = useCallback(() => {
    if (form.equipoVenta === "Interno (BBR)") {
      if (promotorAsesorId && promotorAsesorId !== PROMOTOR_ASESOR_OTRO) {
        const asesor = asesores.find((row) => row.id === promotorAsesorId);
        if (asesor) {
          return asesor.nombre;
        }
      }
    }
    return form.promotorNombre.trim();
  }, [asesores, form.equipoVenta, form.promotorNombre, promotorAsesorId]);

  const loadPrefill = useCallback(
    async (unidadId: string, listaPreciosId?: string | null) => {
      if (!unidadId) {
        setForm(emptyForm());
        setCotizacionHint(false);
        return;
      }

      setLoadingUnidadPrefill(true);
      setError("");

      try {
        const asesoresActuales = asesoresRef.current;
        const unidadesActuales = unidadesOpcionesRef.current;

        if (esAsesor && prospectoId && asesorId) {
          const params = new URLSearchParams({ asesorId, unidadId });
          const response = await fetch(
            `/api/asesores/prospectos/${prospectoId}/apartado?${params.toString()}`,
          );
          const data = (await response.json()) as {
            prefill?: ApartadoPrefill;
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error ?? "No se pudo cargar la unidad.");
          }

          if (data.prefill) {
            const nextForm = prefillToForm(data.prefill);
            if (!nextForm.medioPublicitario && prospectoMedioRef.current) {
              nextForm.medioPublicitario = prospectoMedioRef.current;
            } else if (nextForm.medioPublicitario) {
              prospectoMedioRef.current = nextForm.medioPublicitario;
            }
            setForm(nextForm);
            setCotizacionHint(data.prefill.cotizacionReciente);
            setPromotorAsesorId(
              inferPromotorAsesorId(
                nextForm.equipoVenta,
                nextForm.promotorNombre,
                asesoresActuales,
                esAsesor ? asesorId : undefined,
              ),
            );
            const row = unidadesActuales.find((item) => item.unidadId === unidadId);
            if (row) {
              setTipoProducto(resolveSembradoSegmentIdForUnidad(desarrolloId, row) ?? "");
            }
          }
          return;
        }

        const params = new URLSearchParams({ desarrolloId, unidadId });
        if (listaPreciosId) {
          params.set("listaPreciosId", listaPreciosId);
        }
        const response = await fetch(`/api/admin/operaciones?${params.toString()}`);
        const data = (await response.json()) as {
          prefill?: ApartadoPrefill;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar la unidad.");
        }

        if (data.prefill) {
          const nextForm = prefillToForm(data.prefill);
          if (!nextForm.medioPublicitario && prospectoMedioRef.current) {
            nextForm.medioPublicitario = prospectoMedioRef.current;
          } else if (nextForm.medioPublicitario) {
            prospectoMedioRef.current = nextForm.medioPublicitario;
          }
          setForm((prev) => {
            const merged: FormState = {
              ...nextForm,
              ...(listaPreciosId
                ? {
                    clienteNombre: prev.clienteNombre || nextForm.clienteNombre,
                    origenCiudad: prev.origenCiudad || nextForm.origenCiudad,
                    equipoVenta: prev.equipoVenta || nextForm.equipoVenta,
                    promotorNombre: prev.promotorNombre || nextForm.promotorNombre,
                    tipoInversion: prev.tipoInversion || nextForm.tipoInversion,
                    medioPublicitario: prev.medioPublicitario || nextForm.medioPublicitario,
                    descuentoPct: prev.descuentoPct || nextForm.descuentoPct,
                    esquemaPago: prev.esquemaPago || nextForm.esquemaPago,
                    fechaApartado: prev.fechaApartado || nextForm.fechaApartado,
                    fechaCierre: prev.fechaCierre,
                    observacionesPagos: prev.observacionesPagos,
                    observaciones: prev.observaciones,
                    primerPago: prev.primerPago,
                    prospectoEmail: prev.prospectoEmail || nextForm.prospectoEmail,
                    prospectoTelefono: prev.prospectoTelefono || nextForm.prospectoTelefono,
                    prospectoId: prev.prospectoId || nextForm.prospectoId,
                    cotizacionId: prev.cotizacionId || nextForm.cotizacionId,
                  }
                : {}),
            };

            if (listaPreciosId && merged.descuentoPct && merged.precioLista) {
              const lista = parseMoneyInput(merged.precioLista);
              const pct = Number(merged.descuentoPct);
              if (lista != null && Number.isFinite(pct)) {
                merged.precioVenta = formatAmountInput(
                  Math.round(lista * (1 - pct / 100) * 100) / 100,
                );
              }
            }

            return merged;
          });
          if (!listaPreciosId) {
            setCotizacionHint(data.prefill.cotizacionReciente);
            setPromotorAsesorId(
              inferPromotorAsesorId(
                nextForm.equipoVenta,
                nextForm.promotorNombre,
                asesoresActuales,
                esAsesor ? asesorId : undefined,
              ),
            );
          }
          const row = unidadesActuales.find((item) => item.unidadId === unidadId);
          if (row && !listaPreciosId) {
            setTipoProducto(resolveSembradoSegmentIdForUnidad(desarrolloId, row) ?? "");
          }
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Error al cargar.";
        setError(
          isFailedFetchError(message)
            ? "No se pudo conectar con el servidor. Revisa tu red y pulsa «Reintentar»."
            : message,
        );
      } finally {
        setLoadingUnidadPrefill(false);
      }
    },
    [asesorId, desarrolloId, esAsesor, prospectoId],
  );

  useEffect(() => {
    if (esAsesor || !desarrolloId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/listas-precios?desarrolloId=${encodeURIComponent(desarrolloId)}`,
        );
        const data = (await response.json()) as {
          listas?: ListaPreciosRecord[];
          error?: string;
        };
        if (!response.ok || cancelled) {
          return;
        }
        const usable = (data.listas ?? []).filter(
          (item) => item.estado === "activa" || item.estado === "cerrada",
        );
        setListasPrecios(usable);
      } catch {
        // Sin listas versionadas: el select queda vacío y el precio sigue editable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [desarrolloId, esAsesor]);

  useEffect(() => {
    if (unidadesOpcionesProp !== undefined) {
      setUnidadesOpciones(unidadesOpcionesProp);
    }
  }, [unidadesOpcionesProp]);

  const loadFromProspecto = useCallback(async () => {
    if (!prospectoId) {
      return;
    }

    setLoadingContext(true);
    setError("");

    try {
      if (esAsesor && prospectoId && asesorId) {
        const response = await fetch(
          `/api/asesores/prospectos/${prospectoId}/apartado?asesorId=${encodeURIComponent(asesorId)}`,
        );
        const data = (await response.json()) as {
          prefill?: ApartadoPrefill;
          unidades?: SembradoUnidadRow[];
          asesores?: ApartadoAsesorOption[];
          segmentos?: DesarrolloSembradoSegment[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo cargar el prospecto.");
        }

        applyContextMeta(
          data.unidades ?? [],
          data.prefill,
          data.asesores ?? [],
          data.segmentos,
        );
        return;
      }

      const response = await fetch(
        `/api/admin/operaciones?prospectoId=${encodeURIComponent(prospectoId)}`,
      );
      const data = (await response.json()) as {
        prefill?: ApartadoPrefill;
        unidades?: SembradoUnidadRow[];
        asesores?: ApartadoAsesorOption[];
        segmentos?: DesarrolloSembradoSegment[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el prospecto.");
      }

      applyContextMeta(data.unidades ?? [], data.prefill, data.asesores ?? [], data.segmentos);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Error al cargar.";
      setError(
        isFailedFetchError(message)
          ? "No se pudo conectar con el servidor. Revisa tu red y pulsa «Reintentar»."
          : message,
      );
    } finally {
      setLoadingContext(false);
    }
  }, [prospectoId, esAsesor, asesorId, applyContextMeta]);

  useEffect(() => {
    if (!esAsesor && desarrolloId && asesores.length === 0) {
      void fetch(`/api/admin/asesores?desarrolloId=${encodeURIComponent(desarrolloId)}`)
        .then((response) => response.json())
        .then((data: { asesores?: ApartadoAsesorOption[] }) => {
          if (data.asesores?.length) {
            setAsesores(data.asesores.map((row) => ({ id: row.id, nombre: row.nombre })));
          }
        })
        .catch(() => {
          // opcional en modal admin sin sesión de asesores
        });
    }
  }, [asesores.length, desarrolloId, esAsesor]);

  useEffect(() => {
    const loadKey = prospectoId
      ? `prospecto:${prospectoId}:${asesorId ?? ""}`
      : initialUnidadId
        ? `unidad:${initialUnidadId}`
        : null;

    if (!loadKey || initialLoadKeyRef.current === loadKey) {
      return;
    }

    initialLoadKeyRef.current = loadKey;

    if (prospectoId) {
      void loadFromProspecto();
      return;
    }

    if (initialUnidadId) {
      void loadPrefill(initialUnidadId);
    }
  }, [prospectoId, initialUnidadId, asesorId, loadFromProspecto, loadPrefill]);

  const patch = (partial: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  };

  const handleTipoProductoChange = (nextTipo: string) => {
    setTipoProducto(nextTipo);
    if (form.unidadId) {
      const stillVisible = filterUnidadesBySembradoSegment(
        unidadesOpciones,
        desarrolloId,
        nextTipo,
      ).some((row) => row.unidadId === form.unidadId);
      if (!stillVisible) {
        patch({ unidadId: "" });
      }
    }
  };

  const handleEquipoVentaChange = (equipoVenta: string) => {
    patch({ equipoVenta });
    if (equipoVenta === "Interno (BBR)") {
      setPromotorAsesorId(
        esAsesor && asesorId && asesores.some((row) => row.id === asesorId)
          ? asesorId
          : promotorAsesorId,
      );
      patch({ promotorNombre: "" });
    } else {
      setPromotorAsesorId("");
    }
  };

  const handleUnidadChange = (unidadId: string) => {
    patch({ unidadId });
    void loadPrefill(unidadId);
  };

  const handleListaPreciosChange = (listaId: string) => {
    const lista = listasPrecios.find((item) => item.id === listaId);
    patch({
      listaPreciosId: listaId,
      listaPrecios: lista?.nombre ?? "",
    });
    if (form.unidadId && listaId) {
      void loadPrefill(form.unidadId, listaId);
    }
  };

  const finishApartadoSave = () => {
    setSaveSuccess(true);
    window.setTimeout(() => {
      onSuccess();
      onClose();
    }, 1800);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (esAsesor && prospectoId && asesorId) {
        const response = await fetch(`/api/asesores/prospectos/${prospectoId}/apartado`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asesorId,
            desarrolloId,
            unidadId: form.unidadId,
            prospectoId: form.prospectoId || prospectoId,
            cotizacionId: form.cotizacionId || undefined,
            clienteNombre: form.clienteNombre,
            estatusSembrado: "Apartado",
            origenCiudad: form.origenCiudad || undefined,
            equipoVenta: form.equipoVenta || undefined,
            promotorNombre: resolvePromotorNombre() || undefined,
            tipoInversion: form.tipoInversion || null,
            listaPrecios: form.listaPrecios || undefined,
            listaPreciosId: form.listaPreciosId || undefined,
            precioLista: parseMoneyInput(form.precioLista),
            descuentoPct: form.descuentoPct ? Number(form.descuentoPct) : null,
            precioVenta: parseMoneyInput(form.precioVenta),
            esquemaPago: form.esquemaPago || undefined,
            fechaApartado: form.fechaApartado,
            fechaCierre: form.fechaCierre || undefined,
            medioPublicitario: form.medioPublicitario || undefined,
            observacionesPagos: form.observacionesPagos || undefined,
            observaciones: form.observaciones || undefined,
            primerPago: parseMoneyInput(form.primerPago),
            prospectoEmail: form.prospectoEmail || undefined,
            prospectoTelefono: form.prospectoTelefono || undefined,
          }),
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "No se pudo registrar el apartado.");
        }

        finishApartadoSave();
        return;
      }

      const response = await fetch("/api/admin/operaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desarrolloId,
          unidadId: form.unidadId,
          prospectoId: form.prospectoId || undefined,
          cotizacionId: form.cotizacionId || undefined,
          clienteNombre: form.clienteNombre,
          estatusSembrado: "Apartado",
          origenCiudad: form.origenCiudad || undefined,
          equipoVenta: form.equipoVenta || undefined,
          promotorNombre: resolvePromotorNombre() || undefined,
          tipoInversion: form.tipoInversion || null,
          listaPrecios: form.listaPrecios || undefined,
          listaPreciosId: form.listaPreciosId || undefined,
          precioLista: parseMoneyInput(form.precioLista),
          descuentoPct: form.descuentoPct ? Number(form.descuentoPct) : null,
          precioVenta: parseMoneyInput(form.precioVenta),
          esquemaPago: form.esquemaPago || undefined,
          fechaApartado: form.fechaApartado,
          fechaCierre: form.fechaCierre || undefined,
          medioPublicitario: form.medioPublicitario || undefined,
          observacionesPagos: form.observacionesPagos || undefined,
          observaciones: form.observaciones || undefined,
          primerPago: parseMoneyInput(form.primerPago),
          prospectoEmail: form.prospectoEmail || undefined,
          prospectoTelefono: form.prospectoTelefono || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar el apartado.");
      }

      finishApartadoSave();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al guardar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              {esAsesor ? "Apartado" : "Gerencia"}
            </p>
            <h3 className="text-xl font-black text-gabi-forest">
              {esAsesor
                ? "Reportar apartado"
                : desdeLead
                  ? "Registrar apartado desde lead"
                  : esCompletar
                    ? "Completar apartado"
                    : "Registrar apartado"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {esAsesor
                ? "Registra la unidad en sembrado e inicia el expediente del cliente."
                : desdeLead
                  ? "Captura los datos del sembrado (cliente, precios, medio y pagos). La etapa del lead se actualiza al guardar."
                  : esCompletar
                    ? "La unidad ya está apartada en inventario. Completa cliente, contacto y operación."
                    : "Misma estructura que el Excel de sembrado: cliente, precios, pagos y fechas."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 p-5">
          {saveSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-900">
              <p className="text-base font-black text-emerald-950">Apartado registrado</p>
              <p className="mt-2">
                La unidad ya está en <strong>sembrado</strong> con estatus Apartado. El gerente la
                verá en Admin → Sembrado al actualizar la vista.
              </p>
              {esAsesor ? (
                <p className="mt-2 text-xs text-emerald-800">
                  Sube los documentos del cliente en el expediente de apartado del prospecto.
                </p>
              ) : null}
            </div>
          ) : null}

          {!saveSuccess && desdeLead && cotizacionHint ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Cotización del prospecto cargada. Confirma unidad, precio y medio antes de guardar.
            </div>
          ) : null}

          {!saveSuccess && esCompletar ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Este apartado viene del Excel o inventario. Completa nombre del cliente, medio y precio
              para activar la operación en sembrado.
            </div>
          ) : null}

          {!saveSuccess && cotizacionHint ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Se encontró una cotización reciente para esta unidad. Revisa y completa lo que falte.
            </div>
          ) : null}

          {!saveSuccess && error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              {prospectoId ? (
                <button
                  type="button"
                  onClick={() => void loadFromProspecto()}
                  className="mt-2 font-bold text-red-900 underline-offset-2 hover:underline"
                >
                  Reintentar
                </button>
              ) : null}
            </div>
          ) : null}

          {!saveSuccess && segmentos.length > 0 ? (
            <Field label="Tipo de producto *">
              <select
                required
                value={tipoProducto}
                onChange={(event) => handleTipoProductoChange(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecciona departamento u oficina</option>
                {segmentos.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {!saveSuccess ? (
            <>
          <Field label="Unidad *">
            <select
              required
              value={form.unidadId}
              onChange={(event) => handleUnidadChange(event.target.value)}
              className={inputClass}
              disabled={segmentos.length > 0 && !tipoProducto}
            >
              <option value="">
                {segmentos.length > 0 && !tipoProducto
                  ? "Primero elige departamento u oficina"
                  : desdeLead
                    ? "Selecciona unidad disponible"
                    : esCompletar
                      ? "Selecciona unidad pendiente"
                      : "Selecciona unidad disponible"}
              </option>
              {unidadesFiltradas.map((row) => (
                <option key={row.unidadId} value={row.unidadId}>
                  {row.unidad}
                  {row.listaPrecios ? ` · ${row.listaPrecios}` : ""}
                  {row.precio != null ? ` · ${formatAmountInput(row.precio)}` : ""}
                  {esCompletar ? " · pendiente" : ""}
                  {row.estatusInventario === "apartado" && !esCompletar ? " · apartada" : ""}
                </option>
              ))}
            </select>
            {segmentos.length > 0 && tipoProducto ? (
              <p className="mt-1 text-xs text-slate-500">
                {unidadesFiltradas.length} unidad(es) disponible(s) en sembrado
                {unidadesFiltradas.length === 0 && unidadesOpciones.length > 0 ? (
                  <span className="text-amber-700">
                    {" "}
                    — prueba el otro tipo de producto
                  </span>
                ) : null}
                {unidadesFiltradas.length === 0 && unidadesOpciones.length === 0 && prospectoId ? (
                  <button
                    type="button"
                    onClick={() => void loadFromProspecto()}
                    className="ml-2 font-bold text-[#201044] underline-offset-2 hover:underline"
                  >
                    Recargar unidades
                  </button>
                ) : null}
              </p>
            ) : null}
          </Field>

          {loadingContext ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando prospecto y unidades…
            </div>
          ) : null}

          {loadingUnidadPrefill ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos de cotización…
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente (nombre completo) *">
              <input
                required
                value={form.clienteNombre}
                onChange={(event) => patch({ clienteNombre: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Correo electrónico *">
              <input
                required
                type="email"
                value={form.prospectoEmail}
                onChange={(event) => patch({ prospectoEmail: event.target.value })}
                className={inputClass}
                placeholder="cliente@correo.com"
              />
            </Field>
            <Field label="Teléfono (10 dígitos) *">
              <input
                required
                value={form.prospectoTelefono}
                onChange={(event) => patch({ prospectoTelefono: event.target.value })}
                className={inputClass}
                inputMode="numeric"
                placeholder="4421234567"
              />
            </Field>
            <Field label="Origen (ciudad)">
              <input
                value={form.origenCiudad}
                onChange={(event) => patch({ origenCiudad: event.target.value })}
                className={inputClass}
                placeholder="Querétaro, CDMX…"
              />
            </Field>
            <Field label="Cómo se enteró del desarrollo (medio publicitario) *">
              <select
                required
                value={form.medioPublicitario}
                onChange={(event) => patch({ medioPublicitario: event.target.value })}
                className={inputClass}
              >
                <option value="">Selecciona medio</option>
                {MEDIO_PUBLICITARIO_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                {form.medioPublicitario &&
                !MEDIO_PUBLICITARIO_OPTIONS.includes(
                  form.medioPublicitario as (typeof MEDIO_PUBLICITARIO_OPTIONS)[number],
                ) ? (
                  <option value={form.medioPublicitario}>{form.medioPublicitario}</option>
                ) : null}
              </select>
              {desdeLead && form.medioPublicitario ? (
                <p className="mt-1 text-xs text-slate-500">
                  Medio del registro del prospecto — confirma o corrige si aplica.
                </p>
              ) : null}
            </Field>
            <Field label="Equipo de venta">
              <select
                value={form.equipoVenta}
                onChange={(event) => handleEquipoVentaChange(event.target.value)}
                className={inputClass}
              >
                <option value="">Selecciona equipo</option>
                {EQUIPO_VENTA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Promotor">
              {form.equipoVenta === "Interno (BBR)" ? (
                <div className="space-y-2">
                  <select
                    value={promotorAsesorId}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPromotorAsesorId(value);
                      if (value !== PROMOTOR_ASESOR_OTRO) {
                        patch({ promotorNombre: "" });
                      }
                    }}
                    className={inputClass}
                  >
                    <option value="">Selecciona asesor</option>
                    {asesores.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.nombre}
                      </option>
                    ))}
                    <option value={PROMOTOR_ASESOR_OTRO}>Otro (capturar nombre)</option>
                  </select>
                  {promotorAsesorId === PROMOTOR_ASESOR_OTRO ? (
                    <input
                      value={form.promotorNombre}
                      onChange={(event) => patch({ promotorNombre: event.target.value })}
                      className={inputClass}
                      placeholder="Nombre del promotor"
                    />
                  ) : null}
                </div>
              ) : form.equipoVenta === "Externo" ? (
                <input
                  value={form.promotorNombre}
                  onChange={(event) => patch({ promotorNombre: event.target.value })}
                  className={inputClass}
                  placeholder="Inmobiliaria, asesor externo u otro"
                />
              ) : (
                <input
                  disabled
                  value=""
                  className={`${inputClass} bg-slate-50 text-slate-400`}
                  placeholder="Elige equipo de venta primero"
                />
              )}
            </Field>
            <Field label="Tipo inversión">
              <select
                value={form.tipoInversion}
                onChange={(event) => patch({ tipoInversion: event.target.value })}
                className={inputClass}
              >
                <option value="">—</option>
                <option value="vivir">Vivir / Habitar</option>
                <option value="inversion">Inversión</option>
                <option value="trabajar">Trabajar</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Lista de precios">
              {listasPrecios.length > 0 && !esAsesor ? (
                <>
                  <select
                    value={form.listaPreciosId}
                    onChange={(event) => handleListaPreciosChange(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">— Elegir lista —</option>
                    {listasPrecios.map((lista) => (
                      <option key={lista.id} value={lista.id}>
                        {lista.nombre} ({listaPreciosEstadoLabel[lista.estado]})
                        {lista.vigencia_desde ? ` · ${lista.vigencia_desde}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Puedes vender con una lista cerrada; el inventario sigue en la activa.
                  </p>
                </>
              ) : (
                <input
                  value={form.listaPrecios}
                  onChange={(event) => patch({ listaPrecios: event.target.value })}
                  className={inputClass}
                  placeholder="F&F, Lista 4…"
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Precio lista">
              <input
                value={form.precioLista}
                onChange={(event) =>
                  patch({
                    precioLista: formatAmountInput(parseMoneyInput(event.target.value) ?? 0),
                  })
                }
                className={`${inputClass} tabular-nums`}
                inputMode="numeric"
              />
            </Field>
            <Field label="Descuento %">
              <input
                value={form.descuentoPct}
                onChange={(event) => patch({ descuentoPct: event.target.value })}
                className={`${inputClass} tabular-nums`}
                inputMode="decimal"
              />
            </Field>
            <Field label="Precio venta *">
              <input
                required
                value={form.precioVenta}
                onChange={(event) =>
                  patch({
                    precioVenta: formatAmountInput(parseMoneyInput(event.target.value) ?? 0),
                  })
                }
                className={`${inputClass} tabular-nums`}
                inputMode="numeric"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Forma / esquema de pago">
              <input
                value={form.esquemaPago}
                onChange={(event) => patch({ esquemaPago: event.target.value })}
                className={inputClass}
                placeholder="Contado, 30-30-40, MSI…"
              />
            </Field>
            <Field label="Primer pago / apartado">
              <input
                value={form.primerPago}
                onChange={(event) =>
                  patch({
                    primerPago: formatAmountInput(parseMoneyInput(event.target.value) ?? 0),
                  })
                }
                className={`${inputClass} tabular-nums`}
                inputMode="numeric"
                placeholder="50,000"
              />
            </Field>
            <Field label="Fecha apartado *">
              <input
                required
                type="date"
                value={form.fechaApartado}
                onChange={(event) => patch({ fechaApartado: event.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Fecha cierre de venta">
              <input
                type="date"
                value={form.fechaCierre}
                onChange={(event) => patch({ fechaCierre: event.target.value })}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Observaciones de pagos">
            <input
              value={form.observacionesPagos}
              onChange={(event) => patch({ observacionesPagos: event.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={(event) => patch({ observaciones: event.target.value })}
              className={`${inputClass} min-h-[80px]`}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                loadingContext ||
                loadingUnidadPrefill ||
                !form.unidadId ||
                (segmentos.length > 0 && !tipoProducto)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar apartado
            </button>
          </div>
            </>
          ) : null}
        </form>
      </div>
    </div>
  );
}

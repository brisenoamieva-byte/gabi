"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import type { ApartadoAsesorOption } from "@/lib/admin/operaciones-service";
import type { ApartadoPrefill } from "@/lib/admin/operaciones-service";
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
  precioLista: string;
  descuentoPct: string;
  precioVenta: string;
  esquemaPago: string;
  fechaApartado: string;
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
  precioLista: "",
  descuentoPct: "",
  precioVenta: "",
  esquemaPago: "",
  fechaApartado: new Date().toISOString().slice(0, 10),
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
  precioLista: prefill.precioLista ? formatAmountInput(prefill.precioLista) : "",
  descuentoPct: prefill.descuentoPct != null ? String(prefill.descuentoPct) : "",
  precioVenta: prefill.precioVenta ? formatAmountInput(prefill.precioVenta) : "",
  esquemaPago: prefill.esquemaPago ?? "",
  fechaApartado: new Date().toISOString().slice(0, 10),
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

export function RegistrarApartadoModal({
  desarrolloId,
  modo = "registrar",
  unidadesOpciones: unidadesOpcionesProp = [],
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
  const [unidadesOpciones, setUnidadesOpciones] = useState(unidadesOpcionesProp);
  const [segmentos, setSegmentos] = useState<DesarrolloSembradoSegment[]>(() =>
    getSembradoSegmentsForDesarrollo(desarrolloId),
  );
  const [asesores, setAsesores] = useState<ApartadoAsesorOption[]>([]);
  const [tipoProducto, setTipoProducto] = useState("");
  const [promotorAsesorId, setPromotorAsesorId] = useState("");
  const [form, setForm] = useState<FormState>(() => emptyForm(initialUnidadId ?? ""));
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cotizacionHint, setCotizacionHint] = useState(false);

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
    async (unidadId: string) => {
      if (!unidadId) {
        setForm(emptyForm());
        setCotizacionHint(false);
        return;
      }

      setLoadingPrefill(true);
      setError("");

      try {
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
            setForm(nextForm);
            setCotizacionHint(data.prefill.cotizacionReciente);
            setPromotorAsesorId(
              inferPromotorAsesorId(
                nextForm.equipoVenta,
                nextForm.promotorNombre,
                asesores,
                esAsesor ? asesorId : undefined,
              ),
            );
            const row = unidadesOpciones.find((item) => item.unidadId === unidadId);
            if (row) {
              setTipoProducto(resolveSembradoSegmentIdForUnidad(desarrolloId, row) ?? "");
            }
          }
          return;
        }

        const params = new URLSearchParams({ desarrolloId, unidadId });
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
          setForm(nextForm);
          setCotizacionHint(data.prefill.cotizacionReciente);
          setPromotorAsesorId(
            inferPromotorAsesorId(nextForm.equipoVenta, nextForm.promotorNombre, asesores),
          );
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
      } finally {
        setLoadingPrefill(false);
      }
    },
    [desarrolloId, esAsesor, asesorId, prospectoId, asesores, unidadesOpciones],
  );

  useEffect(() => {
    setUnidadesOpciones(unidadesOpcionesProp);
  }, [unidadesOpcionesProp]);

  const loadFromProspecto = useCallback(async () => {
    if (!prospectoId) {
      return;
    }

    setLoadingPrefill(true);
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
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoadingPrefill(false);
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
    if (prospectoId) {
      void loadFromProspecto();
      return;
    }

    if (initialUnidadId) {
      void loadPrefill(initialUnidadId);
    }
  }, [prospectoId, initialUnidadId, loadFromProspecto, loadPrefill]);

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
            precioLista: parseMoneyInput(form.precioLista),
            descuentoPct: form.descuentoPct ? Number(form.descuentoPct) : null,
            precioVenta: parseMoneyInput(form.precioVenta),
            esquemaPago: form.esquemaPago || undefined,
            fechaApartado: form.fechaApartado,
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

        onSuccess();
        onClose();
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
          precioLista: parseMoneyInput(form.precioLista),
          descuentoPct: form.descuentoPct ? Number(form.descuentoPct) : null,
          precioVenta: parseMoneyInput(form.precioVenta),
          esquemaPago: form.esquemaPago || undefined,
          fechaApartado: form.fechaApartado,
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

      onSuccess();
      onClose();
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
                ? "Registra la unidad en sembrado e inicia el expediente del cliente. Revisa unidad, precio y fecha de apartado."
                : desdeLead
                  ? "Datos del prospecto y su última cotización. Revisa la unidad y completa la operación."
                  : esCompletar
                    ? "La unidad ya está apartada en inventario. Captura al cliente y los datos de la operación."
                    : "Integra la operación al sembrado. Si hay cotización reciente del asesor, se pre-llena."}
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
          {desdeLead && cotizacionHint ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Cotización del prospecto cargada. Confirma unidad, precio y medio antes de guardar.
            </div>
          ) : null}

          {esCompletar ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Este apartado viene del Excel o inventario. Completa nombre del cliente, medio y precio
              para activar la operación en sembrado.
            </div>
          ) : null}

          {cotizacionHint ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Se encontró una cotización reciente para esta unidad. Revisa y completa lo que falte.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {segmentos.length > 0 ? (
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
              </p>
            ) : null}
          </Field>

          {loadingPrefill ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos de cotización…
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente *">
              <input
                required
                value={form.clienteNombre}
                onChange={(event) => patch({ clienteNombre: event.target.value })}
                className={inputClass}
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
            <Field label="Origen (ciudad)">
              <input
                value={form.origenCiudad}
                onChange={(event) => patch({ origenCiudad: event.target.value })}
                className={inputClass}
                placeholder="Querétaro, CDMX…"
              />
            </Field>
            <Field label="Medio publicitario">
              <select
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
                <option value="vivir">Vivir</option>
                <option value="inversion">Inversión</option>
                <option value="trabajar">Trabajar</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
            <Field label="Lista de precios">
              <input
                value={form.listaPrecios}
                onChange={(event) => patch({ listaPrecios: event.target.value })}
                className={inputClass}
                placeholder="F&F, Lista 4…"
              />
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
            <Field label="Esquema de pago">
              <input
                value={form.esquemaPago}
                onChange={(event) => patch({ esquemaPago: event.target.value })}
                className={inputClass}
                placeholder="Contado, 30-30-40…"
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
              disabled={submitting || loadingPrefill || !form.unidadId || (segmentos.length > 0 && !tipoProducto)}
              className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar apartado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

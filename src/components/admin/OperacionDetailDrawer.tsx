"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FolderOpen, Loader2, Save, Trash2, X } from "lucide-react";
import type { OperacionDetail } from "@/lib/admin/operaciones-service";
import {
  ESTATUS_SEMBRADO,
  estatusSembradoLabel,
} from "@/lib/comercial/sembrado-status";
import {
  SEMBRADO_COBRANZA_MESES,
  formatMesCobranzaLabel,
} from "@/lib/comercial/cobranza-meses";
import { formatPrice } from "@/lib/data";
import { formatAmountInput, parseMoneyInput } from "@/lib/format/money-input";

type OperacionDetailDrawerProps = {
  operacionId: string;
  onClose: () => void;
  onSuccess: () => void;
  onOpenExpediente?: (operacionId: string) => void;
};

type FormState = {
  estatusSembrado: string;
  clienteNombre: string;
  origenCiudad: string;
  equipoVenta: string;
  promotorNombre: string;
  listaPrecios: string;
  precioLista: string;
  descuentoPct: string;
  precioVenta: string;
  esquemaPago: string;
  fechaApartado: string;
  medioPublicitario: string;
  observacionesPagos: string;
  observaciones: string;
  personaMoral: boolean;
  cobranza: Record<string, string>;
};

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

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

const detailToForm = (detail: OperacionDetail): FormState => {
  const cobranza: Record<string, string> = {};
  for (const mes of SEMBRADO_COBRANZA_MESES) {
    cobranza[mes] = "";
  }
  for (const row of detail.cobranza) {
    const key = row.mes.slice(0, 10);
    if (Number(row.monto) > 0) {
      cobranza[key] = formatAmountInput(Number(row.monto));
    }
  }

  const op = detail.operacion;
  return {
    estatusSembrado: op.estatus_sembrado,
    clienteNombre: op.cliente_nombre,
    origenCiudad: op.origen_ciudad ?? "",
    equipoVenta: op.equipo_venta ?? "",
    promotorNombre: op.promotor_nombre ?? "",
    listaPrecios: op.lista_precios ?? "",
    precioLista: op.precio_lista ? formatAmountInput(Number(op.precio_lista)) : "",
    descuentoPct: op.descuento_pct != null ? String(op.descuento_pct) : "",
    precioVenta: op.precio_venta ? formatAmountInput(Number(op.precio_venta)) : "",
    esquemaPago: op.esquema_pago ?? "",
    fechaApartado: op.fecha_apartado ?? "",
    medioPublicitario: op.medio_publicitario ?? "",
    observacionesPagos: op.observaciones_pagos ?? "",
    observaciones: op.observaciones ?? "",
    personaMoral: Boolean(op.persona_moral),
    cobranza,
  };
};

export function OperacionDetailDrawer({
  operacionId,
  onClose,
  onSuccess,
  onOpenExpediente,
}: OperacionDetailDrawerProps) {
  const [detail, setDetail] = useState<OperacionDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/operaciones/${operacionId}`);
      const data = (await response.json()) as { detail?: OperacionDetail; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar la operación.");
      }

      if (data.detail) {
        setDetail(data.detail);
        setForm(detailToForm(data.detail));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const patch = (partial: Partial<FormState>) => {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const patchCobranza = (mes: string, value: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            cobranza: { ...prev.cobranza, [mes]: value },
          }
        : prev,
    );
  };

  const { totalCobrado, comprobacion } = useMemo(() => {
    if (!form) {
      return { totalCobrado: 0, comprobacion: null as number | null };
    }
    const total = SEMBRADO_COBRANZA_MESES.reduce((sum, mes) => {
      return sum + (parseMoneyInput(form.cobranza[mes]) ?? 0);
    }, 0);
    const precioVenta = parseMoneyInput(form.precioVenta);
    return {
      totalCobrado: total,
      comprobacion: precioVenta != null ? total - precioVenta : total || null,
    };
  }, [form]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const cobranza = SEMBRADO_COBRANZA_MESES.map((mes) => ({
        mes,
        monto: parseMoneyInput(form.cobranza[mes]) ?? 0,
      }));

      const response = await fetch(`/api/admin/operaciones/${operacionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estatusSembrado: form.estatusSembrado,
          clienteNombre: form.clienteNombre,
          origenCiudad: form.origenCiudad || undefined,
          equipoVenta: form.equipoVenta || undefined,
          promotorNombre: form.promotorNombre || undefined,
          listaPrecios: form.listaPrecios || undefined,
          precioLista: parseMoneyInput(form.precioLista),
          descuentoPct: form.descuentoPct ? Number(form.descuentoPct) : null,
          precioVenta: parseMoneyInput(form.precioVenta),
          esquemaPago: form.esquemaPago || undefined,
          fechaApartado: form.fechaApartado || null,
          medioPublicitario: form.medioPublicitario || undefined,
          observacionesPagos: form.observacionesPagos || undefined,
          observaciones: form.observaciones || undefined,
          personaMoral: form.personaMoral,
          cobranza,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }

      onSuccess();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  const puedeCancelar =
    detail != null &&
    !detail.operacion.cancelada &&
    detail.operacion.estatus_sembrado !== "Vendidas Cobradas";

  const handleCancel = async () => {
    setCancelling(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/operaciones/${operacionId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: motivoCancelacion.trim() || undefined,
          prospectoEtapa: "cita",
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cancelar el apartado.");
      }

      onSuccess();
      onClose();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Error al cancelar.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-4xl flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
              Operación
            </p>
            <h3 className="text-xl font-black text-gabi-forest">
              {detail ? `Unidad ${detail.unidad}` : "Cargando…"}
            </h3>
            {detail ? (
              <p className="mt-1 text-sm text-slate-500">{detail.operacion.cliente_nombre}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando operación…
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {form ? (
              <div className="space-y-6">
                <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Total cobrado</p>
                    <p className="text-lg font-black text-gabi-forest">{formatPrice(totalCobrado)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Precio venta</p>
                    <p className="text-lg font-black text-gabi-forest">
                      {form.precioVenta ? formatPrice(parseMoneyInput(form.precioVenta) ?? 0) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Comprobación</p>
                    <p
                      className={`text-lg font-black ${
                        comprobacion != null && comprobacion < 0 ? "text-red-600" : "text-gabi-forest"
                      }`}
                    >
                      {comprobacion != null ? formatPrice(comprobacion) : "—"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Estatus sembrado">
                    <select
                      value={form.estatusSembrado}
                      onChange={(event) => patch({ estatusSembrado: event.target.value })}
                      className={inputClass}
                    >
                      {ESTATUS_SEMBRADO.filter((item) => item !== "Disponibles").map((estatus) => (
                        <option key={estatus} value={estatus}>
                          {estatusSembradoLabel[estatus] ?? estatus}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Cliente *">
                    <input
                      required
                      value={form.clienteNombre}
                      onChange={(event) => patch({ clienteNombre: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.personaMoral}
                      onChange={(event) => patch({ personaMoral: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="font-semibold text-slate-600">
                      Persona moral (incluye acta constitutiva, poder e ID apoderado en checklist)
                    </span>
                  </label>
                  <Field label="Fecha apartado">
                    <input
                      type="date"
                      value={form.fechaApartado}
                      onChange={(event) => patch({ fechaApartado: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Esquema de pago">
                    <input
                      value={form.esquemaPago}
                      onChange={(event) => patch({ esquemaPago: event.target.value })}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Medio publicitario">
                    <input
                      value={form.medioPublicitario}
                      onChange={(event) => patch({ medioPublicitario: event.target.value })}
                      className={inputClass}
                      placeholder="Ej. Facebook, referido, piso de ventas…"
                    />
                  </Field>
                  <Field label="Precio venta">
                    <input
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
                  <Field label="Lista de precios">
                    <input
                      value={form.listaPrecios}
                      onChange={(event) => patch({ listaPrecios: event.target.value })}
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

                <div>
                  <h4 className="mb-3 text-sm font-bold text-gabi-forest">Cobranza mensual</h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <div className="flex min-w-max">
                      {SEMBRADO_COBRANZA_MESES.map((mes) => (
                        <div key={mes} className="w-24 shrink-0 border-r border-slate-100 p-2 last:border-r-0">
                          <p className="mb-1 text-center text-[10px] font-bold uppercase text-slate-500">
                            {formatMesCobranzaLabel(mes)}
                          </p>
                          <input
                            value={form.cobranza[mes] ?? ""}
                            onChange={(event) =>
                              patchCobranza(
                                mes,
                                formatAmountInput(parseMoneyInput(event.target.value) ?? 0),
                              )
                            }
                            className="w-full rounded-lg border border-slate-200 px-1 py-1 text-center text-xs tabular-nums"
                            inputMode="numeric"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Field label="Observaciones">
                  <textarea
                    value={form.observaciones}
                    onChange={(event) => patch({ observaciones: event.target.value })}
                    className={`${inputClass} min-h-[80px]`}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          {form ? (
            <div className="space-y-2 border-t border-slate-100 p-5">
              {puedeCancelar ? (
                <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
                  {!confirmCancel ? (
                    <button
                      type="button"
                      onClick={() => setConfirmCancel(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Cancelar apartado
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-red-800">
                        La unidad volverá a disponible. El historial del apartado se conserva para
                        reportes (cliente, fechas, cobranza, medio).
                      </p>
                      <Field label="Motivo (opcional)">
                        <textarea
                          value={motivoCancelacion}
                          onChange={(event) => setMotivoCancelacion(event.target.value)}
                          className={`${inputClass} min-h-[72px]`}
                          placeholder="Ej. cliente desistió, cambió de unidad, no pasó crédito…"
                        />
                      </Field>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmCancel(false);
                            setMotivoCancelacion("");
                          }}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
                        >
                          No, volver
                        </button>
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => void handleCancel()}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                        >
                          {cancelling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Confirmar cancelación
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
              {onOpenExpediente ? (
                <button
                  type="button"
                  onClick={() => onOpenExpediente(operacionId)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gabi-forest/15 bg-white px-4 py-3 text-sm font-bold text-gabi-forest"
                >
                  <FolderOpen className="h-4 w-4" />
                  Ver expediente del cliente
                </button>
              ) : null}
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar operación
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

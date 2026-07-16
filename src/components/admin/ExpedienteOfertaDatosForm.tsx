"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { ClienteKycDatos, PlanPagoDatos, PlanPagoTramo } from "@/lib/comercial/expediente-oferta-types";
import { emptyClienteKyc, emptyPlanPago } from "@/lib/comercial/expediente-oferta-types";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20";

type ExpedienteOfertaDatosFormProps = {
  operacionId: string;
  initialKyc: ClienteKycDatos;
  initialPlan: PlanPagoDatos;
  precioVenta: number | null;
  onSaved: () => void;
};

const emptyTramo = (): PlanPagoTramo => ({
  monto_total: 0,
  num_pagos: 1,
  monto_mensual: 0,
  dia_pago: 30,
  periodo_texto: "",
});

export function ExpedienteOfertaDatosForm({
  operacionId,
  initialKyc,
  initialPlan,
  precioVenta,
  onSaved,
}: ExpedienteOfertaDatosFormProps) {
  const [kyc, setKyc] = useState<ClienteKycDatos>({ ...emptyClienteKyc(), ...initialKyc });
  const [plan, setPlan] = useState<PlanPagoDatos>({
    ...emptyPlanPago(),
    ...initialPlan,
    tramos: initialPlan.tramos?.length ? initialPlan.tramos : [],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setKyc({ ...emptyClienteKyc(), ...initialKyc });
    setPlan({
      ...emptyPlanPago(),
      ...initialPlan,
      tramos: initialPlan.tramos?.length ? initialPlan.tramos : [],
    });
  }, [initialKyc, initialPlan, operacionId]);

  const patchKyc = (key: keyof ClienteKycDatos, value: string | boolean) => {
    setKyc((prev) => ({ ...prev, [key]: value }));
  };

  const patchPlan = (key: keyof PlanPagoDatos, value: string | number | null) => {
    setPlan((prev) => ({ ...prev, [key]: value }));
  };

  const patchTramo = (index: number, key: keyof PlanPagoTramo, value: string | number) => {
    setPlan((prev) => {
      const tramos = [...(prev.tramos ?? [])];
      const current: PlanPagoTramo = { ...emptyTramo(), ...tramos[index] };
      if (key === "periodo_texto") {
        current.periodo_texto = String(value);
      } else if (key === "dia_pago") {
        const num = typeof value === "number" ? value : Number(String(value).replace(/[,$]/g, ""));
        current.dia_pago = Number.isFinite(num) ? num : 30;
      } else if (key === "monto_total" || key === "num_pagos" || key === "monto_mensual") {
        const num = typeof value === "number" ? value : Number(String(value).replace(/[,$]/g, ""));
        current[key] = Number.isFinite(num) ? num : 0;
      }
      tramos[index] = current;
      return { ...prev, tramos };
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/expedientes/${operacionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteKyc: kyc, planPago: plan }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo guardar.");
      }
      setMessage("Datos de oferta guardados.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-gabi-forest/10 p-4">
      <div>
        <p className="text-sm font-bold text-gabi-forest">Datos del oferente (Anexo A)</p>
        <p className="text-xs text-slate-500">
          Se usan al generar el pack de oferta. Teléfono y correo vienen del prospecto si están.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(
          [
            ["identificacion_tipo", "Tipo ID"],
            ["identificacion_numero", "Número ID"],
            ["fecha_nacimiento", "Fecha de nacimiento"],
            ["lugar_nacimiento", "Lugar de nacimiento"],
            ["nacionalidad", "Nacionalidad"],
            ["estado_civil", "Estado civil / régimen"],
            ["curp", "CURP"],
            ["rfc", "RFC"],
            ["ocupacion", "Ocupación"],
            ["tipo_operacion", "Tipo de operación"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs font-semibold text-slate-500">
            {label}
            <input
              className={`mt-1 ${inputClass}`}
              value={String(kyc[key] ?? "")}
              onChange={(e) => patchKyc(key, e.target.value)}
            />
          </label>
        ))}
        <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
          Domicilio
          <input
            className={`mt-1 ${inputClass}`}
            value={kyc.domicilio ?? ""}
            onChange={(e) => patchKyc("domicilio", e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(kyc.consentir_transferencia)}
            onChange={(e) => patchKyc("consentir_transferencia", e.target.checked)}
          />
          Consiente transferencia de datos (Anexo F)
        </label>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-sm font-bold text-gabi-forest">Plan de pagos (Anexo B)</p>
        {precioVenta != null ? (
          <p className="text-xs text-slate-500">
            Precio venta operación:{" "}
            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
              precioVenta,
            )}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-500">
          Apartado / garantía
          <input
            type="number"
            className={`mt-1 ${inputClass}`}
            value={plan.apartado_monto ?? ""}
            onChange={(e) =>
              patchPlan("apartado_monto", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </label>
        <label className="block text-xs font-semibold text-slate-500">
          Fecha del apartado
          <input
            className={`mt-1 ${inputClass}`}
            placeholder="11 de abril 2026"
            value={plan.apartado_fecha ?? ""}
            onChange={(e) => patchPlan("apartado_fecha", e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-500">
          Finiquito
          <input
            type="number"
            className={`mt-1 ${inputClass}`}
            value={plan.finiquito_monto ?? ""}
            onChange={(e) =>
              patchPlan("finiquito_monto", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </label>
        <label className="block text-xs font-semibold text-slate-500">
          Fecha / momento finiquito
          <input
            className={`mt-1 ${inputClass}`}
            placeholder="enero 2028 y/o entrega"
            value={plan.finiquito_fecha ?? ""}
            onChange={(e) => patchPlan("finiquito_fecha", e.target.value)}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">
          Fuente del finiquito
          <input
            className={`mt-1 ${inputClass}`}
            value={plan.finiquito_fuente ?? ""}
            onChange={(e) => patchPlan("finiquito_fuente", e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Tramos</p>
          <button
            type="button"
            className="text-xs font-bold text-gabi-forest hover:underline"
            onClick={() =>
              setPlan((prev) => ({
                ...prev,
                tramos: [...(prev.tramos ?? []), emptyTramo()],
              }))
            }
          >
            + Agregar tramo
          </button>
        </div>
        {(plan.tramos ?? []).map((tramo, index) => (
          <div key={index} className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-4">
            <label className="text-[11px] font-semibold text-slate-500">
              Total tramo
              <input
                type="number"
                className={`mt-1 ${inputClass}`}
                value={tramo.monto_total || ""}
                onChange={(e) => patchTramo(index, "monto_total", e.target.value)}
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              # pagos
              <input
                type="number"
                className={`mt-1 ${inputClass}`}
                value={tramo.num_pagos || ""}
                onChange={(e) => patchTramo(index, "num_pagos", e.target.value)}
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              Mensualidad
              <input
                type="number"
                className={`mt-1 ${inputClass}`}
                value={tramo.monto_mensual || ""}
                onChange={(e) => patchTramo(index, "monto_mensual", e.target.value)}
              />
            </label>
            <label className="text-[11px] font-semibold text-slate-500">
              Periodo
              <input
                className={`mt-1 ${inputClass}`}
                placeholder="mayo del 2026 a julio de 2026"
                value={tramo.periodo_texto}
                onChange={(e) => patchTramo(index, "periodo_texto", e.target.value)}
              />
            </label>
            <button
              type="button"
              className="text-left text-[11px] font-bold text-red-600 sm:col-span-4"
              onClick={() =>
                setPlan((prev) => ({
                  ...prev,
                  tramos: (prev.tramos ?? []).filter((_, i) => i !== index),
                }))
              }
            >
              Quitar tramo
            </button>
          </div>
        ))}
      </div>

      <label className="block text-xs font-semibold text-slate-500">
        Texto libre del plan (opcional — sustituye tramos generados)
        <textarea
          className={`mt-1 min-h-[80px] ${inputClass}`}
          value={plan.texto_libre ?? ""}
          onChange={(e) => patchPlan("texto_libre", e.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="inline-flex items-center gap-2 rounded-xl bg-gabi-forest px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar datos de oferta
      </button>
    </div>
  );
}

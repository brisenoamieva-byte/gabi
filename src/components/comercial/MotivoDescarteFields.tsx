"use client";

import {
  MOTIVOS_DESCARTE,
  motivoDescarteDetalleLabel,
  motivoDescarteRequiresDetalle,
  type MotivoDescarteId,
} from "@/lib/comercial/motivo-descarte";

type MotivoDescarteFieldsProps = {
  value: string;
  detalle: string;
  onChange: (motivo: string) => void;
  onDetalleChange: (detalle: string) => void;
  disabled?: boolean;
  inputClassName?: string;
  required?: boolean;
};

export function MotivoDescarteFields({
  value,
  detalle,
  onChange,
  onDetalleChange,
  disabled = false,
  inputClassName = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-gabi-forest focus:outline-none focus:ring-2 focus:ring-gabi-forest/20",
  required = true,
}: MotivoDescarteFieldsProps) {
  const needsDetalle = motivoDescarteRequiresDetalle(value);

  return (
    <div className="space-y-3 rounded-xl border border-red-100 bg-red-50/50 p-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
          Motivo de descarte{required ? " *" : ""}
        </label>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={inputClassName}
          required={required}
        >
          <option value="">Selecciona un motivo…</option>
          {MOTIVOS_DESCARTE.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Obligatorio para estadísticas y reporte (distinto de Cancelado de apartado/venta).
        </p>
      </div>
      {needsDetalle || detalle ? (
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            {motivoDescarteDetalleLabel(value)}
            {needsDetalle ? " *" : ""}
          </label>
          <input
            type="text"
            value={detalle}
            disabled={disabled}
            onChange={(event) => onDetalleChange(event.target.value)}
            className={inputClassName}
            placeholder={
              (value as MotivoDescarteId) === "compro_otro_lado"
                ? "Ej. Desarrollo X en Juriquilla"
                : "Detalle del motivo"
            }
            required={needsDetalle}
          />
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { formatPrice } from "@/lib/data";
import type { ProspectoOperacionHistorial } from "@/lib/admin/prospectos-service";
import {
  canceladaEnEtapaLabel,
  estatusSembradoLabel,
  resolveCanceladaEnEtapa,
} from "@/lib/comercial/sembrado-status";

type ProspectoHistorialComercialProps = {
  operaciones: ProspectoOperacionHistorial[] | undefined;
  accentClassName?: string;
};

const formatFecha = (iso: string | null | undefined) => {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso.slice(0, 10);
  }
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const motivoFromObservaciones = (observaciones: string | null) => {
  if (!observaciones?.trim()) {
    return null;
  }
  const lines = observaciones.trim().split("\n");
  const cancelLine = [...lines].reverse().find((line) => line.includes("[Cancelado"));
  if (!cancelLine) {
    return null;
  }
  return cancelLine.replace(/^\[Cancelado[^\]]*\]\s*/, "").trim() || null;
};

export function ProspectoHistorialComercial({
  operaciones = [],
  accentClassName = "text-gabi-forest",
}: ProspectoHistorialComercialProps) {
  if (!operaciones.length) {
    return null;
  }

  return (
    <div>
      <h4 className={`mb-3 text-sm font-bold ${accentClassName}`}>
        Historial comercial ({operaciones.length})
      </h4>
      <div className="space-y-2">
        {operaciones.map((op) => {
          const cancelada = Boolean(op.cancelada);
          const enEtapa = cancelada
            ? (op.cancelada_en_etapa ?? resolveCanceladaEnEtapa(op.estatus_sembrado))
            : null;
          const motivo = cancelada ? motivoFromObservaciones(op.observaciones) : null;
          const fechaCancel = formatFecha(op.cancelada_at);
          const fechaApartado = formatFecha(op.fecha_apartado ?? op.created_at);

          return (
            <div
              key={op.id}
              className={`rounded-xl border px-4 py-3 text-sm ${
                cancelada
                  ? "border-amber-200 bg-amber-50/70"
                  : "border-slate-100 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`font-bold ${accentClassName}`}>
                    {op.unidad ? `Unidad ${op.unidad}` : "Operación"}
                  </p>
                  <p className="text-slate-500">
                    {cancelada
                      ? `Canceló · ${canceladaEnEtapaLabel[enEtapa!]}`
                      : (estatusSembradoLabel[op.estatus_sembrado] ?? op.estatus_sembrado)}
                  </p>
                </div>
                {op.precio_venta != null || op.precio_lista != null ? (
                  <p className="shrink-0 font-bold tabular-nums text-slate-700">
                    {formatPrice(Number(op.precio_venta ?? op.precio_lista))}
                  </p>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {cancelada
                  ? `Cancelado${fechaCancel ? ` · ${fechaCancel}` : ""}${
                      fechaApartado ? ` · Apartó ${fechaApartado}` : ""
                    }`
                  : fechaApartado
                    ? `Desde ${fechaApartado}`
                    : null}
              </p>
              {motivo ? (
                <p className="mt-1.5 text-xs text-amber-900/80">Motivo: {motivo}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

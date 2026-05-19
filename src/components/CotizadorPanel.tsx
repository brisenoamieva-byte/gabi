"use client";

import { CheckCircle2, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  buildCotizacionSummary,
  computeCotizacion,
  getCotizadorRules,
  getPrototiposCotizables,
  getUnidadesCotizables,
  type CotizacionResult,
  type CotizadorEsquema,
} from "@/lib/cotizador";
import { clusters, formatPrice } from "@/lib/data";

export type CotizadorPanelProps = {
  desarrolloId: string;
  desarrolloNombre: string;
  clusterId: string;
  prototipoId?: string;
  unidadId?: string;
  descuento: number;
  esquema: CotizadorEsquema;
  clienteNombre?: string;
  showSelectors?: boolean;
  showCopy?: boolean;
  onClusterChange?: (clusterId: string) => void;
  onPrototipoChange?: (prototipoId: string | undefined) => void;
  onUnidadChange?: (unidadId: string | undefined) => void;
  onDescuentoChange?: (descuento: number) => void;
  onEsquemaChange?: (esquema: CotizadorEsquema) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "accent" | "hero";
}) {
  if (variant === "hero") {
    return (
      <div className="rounded-2xl bg-[#C8A276] px-5 py-6 text-white shadow-lg shadow-[#C8A276]/25">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
          {label}
        </p>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight sm:text-4xl lg:text-[2.75rem]">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl px-4 py-4 ${
        variant === "accent" ? "bg-[#1B4332]/5 ring-1 ring-[#1B4332]/8" : "bg-slate-50"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 font-black tabular-nums tracking-tight ${
          variant === "accent"
            ? "text-xl text-[#1B4332] sm:text-2xl"
            : "text-lg text-[#1B4332] sm:text-xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ToggleGroup({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-lg px-3 text-sm font-bold transition sm:text-base ${
            value === option.value ? "bg-[#1B4332] text-white shadow-sm" : "text-slate-500"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CotizadorPanel({
  desarrolloId,
  desarrolloNombre,
  clusterId,
  prototipoId,
  unidadId,
  descuento,
  esquema,
  clienteNombre,
  showSelectors = false,
  showCopy = false,
  onClusterChange,
  onPrototipoChange,
  onUnidadChange,
  onDescuentoChange,
  onEsquemaChange,
}: CotizadorPanelProps) {
  const [copied, setCopied] = useState(false);
  const rules = getCotizadorRules(desarrolloId);

  const cotizacion = useMemo(
    () =>
      computeCotizacion({
        desarrolloId,
        clusterId,
        prototipoId,
        unidadId,
        descuento,
        esquema,
      }),
    [clusterId, descuento, desarrolloId, esquema, prototipoId, unidadId],
  );

  const prototipos = useMemo(
    () => (clusterId ? getPrototiposCotizables(clusterId) : []),
    [clusterId],
  );

  const unidades = useMemo(
    () => (clusterId ? getUnidadesCotizables(clusterId) : []),
    [clusterId],
  );

  const unidadesFiltradas = useMemo(
    () =>
      prototipoId
        ? unidades.filter((unit) => !unit.prototipoId || unit.prototipoId === prototipoId)
        : unidades,
    [prototipoId, unidades],
  );

  const handleCopy = async (result: CotizacionResult) => {
    try {
      await navigator.clipboard.writeText(
        buildCotizacionSummary(result, desarrolloNombre, clienteNombre, desarrolloId),
      );
    } catch {
      // El portapapeles puede fallar en HTTP o sin permisos del navegador.
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const selectorBlock = showSelectors ? (
    <div className="grid gap-4">
      <label className="block">
        <FieldLabel>Cluster</FieldLabel>
        <select
          value={clusterId}
          onChange={(event) => onClusterChange?.(event.target.value)}
          className="input-cotizador"
        >
          {clusters.map((cluster) => (
            <option key={cluster.id} value={cluster.id}>
              {cluster.nombre}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block min-w-0">
          <FieldLabel>Prototipo</FieldLabel>
          <select
            value={prototipoId ?? ""}
            onChange={(event) =>
              onPrototipoChange?.(event.target.value ? event.target.value : undefined)
            }
            className="input-cotizador"
            title={
              prototipoId
                ? prototipos.find((item) => item.id === prototipoId)?.nombre
                : "Sin prototipo"
            }
          >
            <option value="">Sin prototipo (usar unidad)</option>
            {prototipos.map((prototipo) => (
              <option key={prototipo.id} value={prototipo.id}>
                {prototipo.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <FieldLabel>Unidad (inventario)</FieldLabel>
          <select
            value={unidadId ?? ""}
            onChange={(event) =>
              onUnidadChange?.(event.target.value ? event.target.value : undefined)
            }
            className="input-cotizador"
            title={
              unidadId
                ? unidadesFiltradas.find((item) => item.id === unidadId)?.unidad
                : "Precio de prototipo"
            }
          >
            <option value="">Precio de prototipo</option>
            {unidadesFiltradas.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unidad}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  ) : null;

  if (!cotizacion) {
    return (
      <div className="space-y-6">
        {selectorBlock}
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-base font-black text-[#1B4332] sm:text-lg">
            Selecciona un producto para cotizar
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Elige cluster y prototipo, o una unidad del inventario disponible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showSelectors ? (
        <div className="grid gap-4">
          {selectorBlock}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Selección actual
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-[#1B4332] sm:text-base">
              {cotizacion.clusterNombre}
              {cotizacion.prototipoNombre ? ` · ${cotizacion.prototipoNombre}` : ""}
              {cotizacion.unidadNombre ? ` · ${cotizacion.unidadNombre}` : ""}
            </p>
            <p className="mt-0.5 text-sm tabular-nums text-slate-500">
              Lista {formatPrice(cotizacion.precioLista)}
              {unidadId ? " · precio de unidad" : ""}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#1B4332]/5 px-4 py-3.5 ring-1 ring-[#1B4332]/8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C8A276]">
            Producto seleccionado
          </p>
          <p className="mt-1 text-base font-black leading-snug text-[#1B4332] sm:text-lg">
            {cotizacion.clusterNombre} · {cotizacion.prototipoNombre}
            {cotizacion.unidadNombre ? ` · ${cotizacion.unidadNombre}` : ""}
          </p>
          {cotizacion.entrega ? (
            <p className="mt-1 text-sm text-slate-500">Entrega: {cotizacion.entrega}</p>
          ) : null}
        </div>
      )}

      <div className="space-y-4">
        {showSelectors ? (
          <div className="border-t border-slate-100 pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C8A276]">
              Paso 2 · Números
            </p>
            <h3 className="mt-1 text-base font-black text-[#1B4332] sm:text-lg">
              Propuesta comercial
            </h3>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label={unidadId ? "Precio unidad" : "Precio lista"}
            value={formatPrice(cotizacion.precioLista)}
            variant="accent"
          />
          <MetricCard label="Bono máximo" value={formatPrice(cotizacion.bonoMaximo)} />
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-bold text-[#1B4332] sm:text-base">Descuento</label>
            <span className="text-lg font-black tabular-nums text-[#C8A276] sm:text-xl">
              {formatPrice(cotizacion.descuento)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={cotizacion.bonoMaximo}
            step={rules.descuentoStep}
            value={cotizacion.descuento}
            onChange={(event) => onDescuentoChange?.(Number(event.target.value))}
            disabled={!onDescuentoChange || cotizacion.bonoMaximo === 0}
            className="mt-3 h-2 w-full cursor-pointer accent-[#C8A276] disabled:cursor-not-allowed disabled:opacity-40"
          />
          {cotizacion.bonoMaximo === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Sin bono configurable en este producto; se usa precio de lista o unidad.
            </p>
          ) : null}
        </div>

        <MetricCard
          label="Precio final"
          value={formatPrice(cotizacion.precioFinal)}
          variant="hero"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label={`Enganche ${Math.round(rules.enganchePct * 100)}%`}
            value={formatPrice(cotizacion.enganche)}
          />
          <MetricCard label="Apartado" value={formatPrice(cotizacion.apartado)} />
          <MetricCard
            label="Saldo enganche"
            value={formatPrice(cotizacion.saldoEnganche)}
          />
        </div>

        <label className="block">
          <FieldLabel>Esquema de pago</FieldLabel>
          <ToggleGroup
            value={esquema}
            options={rules.esquemas.map((item) => ({
              value: item,
              label: item === "mensualidades" ? "Mensualidades" : "Contado",
            }))}
            onChange={(value) => onEsquemaChange?.(value as CotizadorEsquema)}
          />
        </label>
      </div>

      {showCopy ? (
        <button
          type="button"
          onClick={() => void handleCopy(cotizacion)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1B4332] px-5 text-sm font-bold text-white transition hover:bg-[#245A42] active:scale-[0.99] sm:min-h-14 sm:text-base"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Resumen copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
              Copiar resumen para WhatsApp / CRM
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

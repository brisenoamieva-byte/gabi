"use client";

import { CheckCircle2, Copy } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  getPrototiposCotizables,
  getUnidadesCotizables,
  type CotizadorCatalog,
} from "@/lib/cotizador";
import { calcDescuentoPct, saveCotizacionClient } from "@/lib/comercial/save-cotizacion-client";
import { formatAreaM2, formatPrice } from "@/lib/format/money";
import { formatMonthYear } from "@/lib/cotizador/pasaje-simulador";
import { MISION_LA_GAVIA_UNIDADES } from "@/lib/corredor/mision-la-gavia-unidades.generated";
import {
  buildMisionLaGaviaSimulacionSummary,
  formatPctShort,
  getMisionLaGaviaEsquemas,
  resolveMisionLaGaviaUnidadFromInventario,
  simularMisionLaGavia,
  simularTodosEsquemasMisionLaGavia,
  type MisionLaGaviaEsquemaId,
  type MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador";
import type { DisponibilidadUnidad } from "@/lib/data";

export type MisionLaGaviaSimuladorPanelProps = {
  desarrolloId: string;
  desarrolloNombre: string;
  desarrolloLogo?: string;
  prospectoRegistrado?: string;
  clusterId: string;
  prototipoId?: string;
  unidadId?: string;
  inventarioUnidades?: DisponibilidadUnidad[];
  catalog?: CotizadorCatalog;
  clienteNombre?: string;
  asesorNombre?: string;
  asesorId?: string;
  prospectoId?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  esquema?: MisionLaGaviaEsquemaId;
  showSelectors?: boolean;
  showCopy?: boolean;
  onClusterChange?: (clusterId: string) => void;
  onPrototipoChange?: (prototipoId: string | undefined) => void;
  onUnidadChange?: (unidadId: string | undefined) => void;
  onEsquemaChange?: (esquema: MisionLaGaviaEsquemaId) => void;
  onClienteNombreChange?: (value: string) => void;
};

function MetricCard({
  label,
  value,
  helper,
  variant = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  variant?: "default" | "accent" | "hero";
}) {
  if (variant === "hero") {
    return (
      <div className="rounded-2xl bg-[#14453D] px-5 py-6 text-white shadow-lg shadow-[#14453D]/20">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">{label}</p>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight sm:text-4xl">{value}</p>
        {helper ? <p className="mt-1 text-xs text-white/70">{helper}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl px-4 py-4 ${
        variant === "accent" ? "bg-[#5B8A7D]/15 ring-1 ring-[#5B8A7D]/30" : "bg-slate-50"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p
        className={`mt-1.5 font-black tabular-nums tracking-tight ${
          variant === "accent" ? "text-xl text-[#14453D] sm:text-2xl" : "text-lg text-[#14453D] sm:text-xl"
        }`}
      >
        {value}
      </p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
      {children}
    </span>
  );
}

function resolveUnidadRecord(
  inventario: DisponibilidadUnidad[] | undefined,
  unidadId: string | undefined,
  edificio: string,
  unidadCode: string,
  prototipoModelo?: string,
): MisionLaGaviaUnidadRecord | undefined {
  const fromInventario = resolveMisionLaGaviaUnidadFromInventario(inventario, unidadId);
  if (fromInventario) {
    return fromInventario;
  }
  if (unidadCode) {
    return MISION_LA_GAVIA_UNIDADES.find((item) => item.unidad === unidadCode);
  }
  if (edificio && prototipoModelo) {
    const candidates = MISION_LA_GAVIA_UNIDADES.filter(
      (item) =>
        item.edificio === edificio &&
        item.modelo === prototipoModelo &&
        item.estatus === "disponible",
    );
    return candidates[0];
  }
  return undefined;
}

export function MisionLaGaviaSimuladorPanel({
  desarrolloNombre,
  desarrolloLogo,
  prospectoRegistrado,
  clusterId,
  prototipoId,
  unidadId,
  inventarioUnidades,
  catalog,
  clienteNombre,
  asesorId,
  prospectoId,
  clienteEmail,
  clienteTelefono,
  esquema = "contado",
  showSelectors = false,
  showCopy = false,
  onPrototipoChange,
  onUnidadChange,
  onEsquemaChange,
  onClienteNombreChange,
}: MisionLaGaviaSimuladorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [edificio, setEdificio] = useState("");
  const [unidadCode, setUnidadCode] = useState("");
  const [esquemaLocal, setEsquemaLocal] = useState<MisionLaGaviaEsquemaId>(esquema);

  useEffect(() => {
    setEsquemaLocal(esquema);
  }, [esquema]);

  const esquemas = useMemo(() => getMisionLaGaviaEsquemas(), []);
  const prototipos = useMemo(
    () => (clusterId ? getPrototiposCotizables(clusterId, catalog) : []),
    [catalog, clusterId],
  );
  const unidadesInventario = useMemo(
    () => (clusterId ? getUnidadesCotizables(clusterId, inventarioUnidades) : []),
    [clusterId, inventarioUnidades],
  );

  const prototipo = prototipoId ? prototipos.find((item) => item.id === prototipoId) : undefined;

  const edificios = useMemo(
    () => Array.from(new Set(MISION_LA_GAVIA_UNIDADES.map((item) => item.edificio))).sort(),
    [],
  );

  const unidadesEdificio = useMemo(() => {
    if (!edificio) return [];
    return MISION_LA_GAVIA_UNIDADES.filter((item) => item.edificio === edificio).sort((a, b) =>
      a.unidad.localeCompare(b.unidad, "es", { numeric: true }),
    );
  }, [edificio]);

  useEffect(() => {
    if (unidadId && inventarioUnidades?.length) {
      const inv = inventarioUnidades.find((item) => item.id === unidadId);
      if (inv?.unidad) {
        const [torre] = inv.unidad.split("-");
        if (torre) setEdificio(torre);
        setUnidadCode(inv.unidad);
      }
    }
  }, [unidadId, inventarioUnidades]);

  useEffect(() => {
    if (!edificio && edificios.length) {
      setEdificio(edificios[0] ?? "");
    }
  }, [edificio, edificios]);

  useEffect(() => {
    if (!unidadCode && unidadesEdificio.length) {
      const preferida =
        unidadesEdificio.find((item) => item.estatus === "disponible") ?? unidadesEdificio[0];
      setUnidadCode(preferida?.unidad ?? "");
    }
  }, [unidadCode, unidadesEdificio]);

  const unidadRecord = useMemo(() => {
    const modeloFromProto = prototipo?.nombre;
    return resolveUnidadRecord(
      inventarioUnidades,
      unidadId,
      edificio,
      unidadCode,
      modeloFromProto,
    );
  }, [edificio, inventarioUnidades, prototipo?.nombre, unidadCode, unidadId]);

  const simulacion = useMemo(() => {
    if (!unidadRecord) return null;
    return simularMisionLaGavia({ unidad: unidadRecord, esquema: esquemaLocal });
  }, [esquemaLocal, unidadRecord]);

  const comparativo = useMemo(() => {
    if (!unidadRecord) return [];
    return simularTodosEsquemasMisionLaGavia(unidadRecord);
  }, [unidadRecord]);

  const handleEsquema = (value: MisionLaGaviaEsquemaId) => {
    setEsquemaLocal(value);
    onEsquemaChange?.(value);
  };

  const handleCopy = async () => {
    if (!simulacion) return;
    const summary = buildMisionLaGaviaSimulacionSummary(
      simulacion,
      desarrolloNombre,
      clienteNombre,
    );
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // clipboard puede fallar sin HTTPS.
    }

    saveCotizacionClient({
      desarrolloId: "mision-la-gavia",
      asesorId,
      prospectoId,
      clienteNombre,
      clienteEmail,
      clienteTelefono,
      clusterId,
      prototipoId,
      unidadId,
      unidadNumero: simulacion.unidad,
      tipoUnidad: "departamento",
      precioLista: simulacion.precioLista,
      esquemaPago: simulacion.esquemaLabel,
      descuentoPct: calcDescuentoPct(
        simulacion.precioLista - simulacion.precioTotal,
        simulacion.precioLista,
      ),
      precioTotal: simulacion.precioTotal,
      payload: { simulacion, origen: "mision_la_gavia_simulador" },
    });

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  if (!unidadRecord || !simulacion) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-base font-black text-[#14453D] sm:text-lg">Selecciona una unidad</p>
        <p className="mt-2 text-sm text-slate-500">
          Elige edificio y departamento para cotizar con lista mar26.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {desarrolloLogo ? (
          <Image
            src={desarrolloLogo}
            alt={desarrolloNombre}
            width={120}
            height={48}
            className="h-10 w-auto object-contain"
          />
        ) : null}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#5B8A7D]">
            Simulador oficial · mar26
          </p>
          <p className="text-sm font-bold text-[#14453D]">{desarrolloNombre}</p>
        </div>
      </div>

      {prospectoRegistrado ? (
        <p className="rounded-xl bg-[#14453D]/5 px-4 py-3 text-sm text-slate-600">
          Prospecto en recorrido:{" "}
          <span className="font-bold text-[#14453D]">{prospectoRegistrado}</span>
        </p>
      ) : null}

      {showSelectors ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <FieldLabel>Edificio</FieldLabel>
            <select
              value={edificio}
              onChange={(event) => {
                setEdificio(event.target.value);
                setUnidadCode("");
              }}
              className="input-cotizador"
            >
              {edificios.map((item) => (
                <option key={item} value={item}>
                  Torre {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Unidad</FieldLabel>
            <select
              value={unidadCode}
              onChange={(event) => {
                setUnidadCode(event.target.value);
                const inv = unidadesInventario.find((item) => item.unidad === event.target.value);
                onUnidadChange?.(inv?.id);
              }}
              className="input-cotizador"
            >
              {unidadesEdificio.map((item) => (
                <option key={item.unidad} value={item.unidad}>
                  {item.unidad} · {item.modelo}
                  {item.estatus !== "disponible" ? ` (${item.estatus})` : ""}
                </option>
              ))}
            </select>
          </label>
          {prototipos.length > 0 ? (
            <label className="block md:col-span-2">
              <FieldLabel>Prototipo (referencia)</FieldLabel>
              <select
                value={prototipoId ?? ""}
                onChange={(event) =>
                  onPrototipoChange?.(event.target.value ? event.target.value : undefined)
                }
                className="input-cotizador"
              >
                <option value="">Sin filtro de prototipo</option>
                {prototipos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl bg-[#14453D]/5 px-4 py-3.5 ring-1 ring-[#14453D]/8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#5B8A7D]">
            Unidad seleccionada
          </p>
          <p className="mt-1 text-base font-black text-[#14453D]">
            {simulacion.unidad} · {simulacion.modelo}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            Torre {simulacion.edificio} · {simulacion.lado} ·{" "}
            {formatAreaM2(simulacion.m2Totales)}
          </p>
        </div>
      )}

      <div>
        <FieldLabel>Esquema de pago</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {esquemas.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleEsquema(item.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                esquemaLocal === item.id
                  ? "bg-[#14453D] text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {simulacion.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {simulacion.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Precio lista mar26" value={formatPrice(simulacion.precioLista)} variant="accent" />
        <MetricCard
          label="Descuento vs lista"
          value={formatPctShort(simulacion.descuentoVsListaPct)}
        />
      </div>

      <MetricCard
        label={`Total ${simulacion.esquemaLabel}`}
        value={formatPrice(simulacion.precioTotal)}
        helper={simulacion.descripcionPago}
        variant="hero"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={`Enganche ${formatPctShort(simulacion.enganchePct)}`}
          value={formatPrice(simulacion.enganche)}
        />
        {simulacion.mensualidad && simulacion.numMensualidades ? (
          <MetricCard
            label={`${simulacion.numMensualidades} pagos`}
            value={formatPrice(simulacion.mensualidad)}
            helper={
              simulacion.fechaPrimerPago && simulacion.fechaUltimoPago
                ? `${formatMonthYear(simulacion.fechaPrimerPago)} – ${formatMonthYear(simulacion.fechaUltimoPago)}`
                : undefined
            }
          />
        ) : null}
        {simulacion.finiquito ? (
          <MetricCard
            label={`Finiquito ${formatPctShort(simulacion.finiquitoPct ?? 0)}`}
            value={formatPrice(simulacion.finiquito)}
            helper={
              simulacion.fechaFiniquito
                ? formatMonthYear(simulacion.fechaFiniquito)
                : simulacion.entregaLabel
            }
          />
        ) : null}
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Comparativo rápido
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-3">Esquema</th>
                <th className="pb-2 pr-3">Total</th>
                <th className="pb-2">Enganche</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.map((row) => (
                <tr
                  key={row.esquema}
                  className={
                    row.esquema === esquemaLocal ? "font-bold text-[#14453D]" : "text-slate-600"
                  }
                >
                  <td className="py-1.5 pr-3">{row.esquemaLabel}</td>
                  <td className="py-1.5 pr-3 tabular-nums">{formatPrice(row.precioTotal)}</td>
                  <td className="py-1.5 tabular-nums">{formatPrice(row.enganche)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {onClienteNombreChange ? (
        <label className="block">
          <FieldLabel>Nombre del prospecto (cotización)</FieldLabel>
          <input
            type="text"
            value={clienteNombre ?? ""}
            onChange={(event) => onClienteNombreChange(event.target.value)}
            className="input-cotizador"
            placeholder="Como aparecerá en el resumen"
          />
        </label>
      ) : null}

      {showCopy ? (
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#14453D] px-5 text-sm font-bold text-white transition hover:bg-[#0f332d] active:scale-[0.99] sm:min-h-14 sm:text-base"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
              Resumen copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
              Copiar cotización para WhatsApp / CRM
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

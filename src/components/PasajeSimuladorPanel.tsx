"use client";

import { CheckCircle2, Copy, FileDown, UserRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  PASAJE_ESQUEMA_LABELS,
  PASAJE_FECHA_ENTREGA,
  computePasajeSimulador,
  formatMonthYear,
  formatPctShort,
  getPasajeSimuladorConfig,
  type PasajeEsquemaPago,
  type PasajeSimuladorResultado,
  type PasajeUnidadTipo,
} from "@/lib/cotizador/pasaje-simulador";
import {
  getPrototiposCotizables,
  getUnidadesCotizables,
  type CotizadorCatalog,
} from "@/lib/cotizador";
import { downloadPasajeSimuladorPdf } from "@/lib/cotizador/pasaje-simulador-pdf";
import { formatAmountInput, parseMoneyInput } from "@/lib/format/money-input";
import { formatAreaM2 } from "@/lib/format/money";
import { enrichPasajeUnidad, computePasajeSuperficieTotalM2 } from "@/lib/catalog/pasaje-unidad-detalles";
import { formatPrice, type DisponibilidadUnidad } from "@/lib/data";
import { saveCotizacionClient } from "@/lib/comercial/save-cotizacion-client";

export type PasajeSimuladorPanelProps = {
  desarrolloId: string;
  desarrolloNombre: string;
  desarrolloLogo?: string;
  /** Nombre capturado en recorrido (paso 1), para mostrar ayuda de autollenado. */
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
  esquema?: PasajeEsquemaPago;
  libreEnganchePct?: number;
  libreMensualidadesPct?: number;
  libreFechaFiniquito?: string;
  libreSinMensEnganchePct?: number;
  libreSinMensPagoPct?: number;
  libreSinMensFechaPago?: string;
  libreSinMensFechaFiniquito?: string;
  showSelectors?: boolean;
  showCopy?: boolean;
  showPdf?: boolean;
  onClusterChange?: (clusterId: string) => void;
  onPrototipoChange?: (prototipoId: string | undefined) => void;
  onUnidadChange?: (unidadId: string | undefined) => void;
  onEsquemaChange?: (esquema: PasajeEsquemaPago) => void;
  onLibreEngancheChange?: (value: number) => void;
  onLibreMensualidadesChange?: (value: number) => void;
  onLibreFechaFiniquitoChange?: (value: string) => void;
  onLibreSinMensEngancheChange?: (value: number) => void;
  onLibreSinMensPagoChange?: (value: number) => void;
  onLibreSinMensFechaPagoChange?: (value: string) => void;
  onLibreSinMensFechaFiniquitoChange?: (value: string) => void;
  onClienteNombreChange?: (value: string) => void;
};

const PASAJE_ESQUEMAS: PasajeEsquemaPago[] = [
  "contado",
  "contado-diferido",
  "msi",
  "30-30-40",
  "libre",
  "libre-sin-mensualidades",
];

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
      <div className="rounded-2xl bg-[#242E38] px-5 py-6 text-white shadow-lg shadow-[#242E38]/20">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
          {label}
        </p>
        <p className="mt-2 text-3xl font-black tabular-nums tracking-tight sm:text-4xl lg:text-[2.5rem]">
          {value}
        </p>
        {helper ? <p className="mt-1 text-xs text-white/70">{helper}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl px-4 py-4 ${
        variant === "accent"
          ? "bg-[#C7A694]/15 ring-1 ring-[#C7A694]/30"
          : "bg-slate-50"
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 font-black tabular-nums tracking-tight ${
          variant === "accent"
            ? "text-xl text-[#242E38] sm:text-2xl"
            : "text-lg text-[#242E38] sm:text-xl"
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function MoneyAmountInput({
  label,
  amount,
  onAmountChange,
  helper,
  disabled,
}: {
  label: string;
  amount: number;
  onAmountChange?: (amount: number) => void;
  helper?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(() => formatAmountInput(amount));

  useEffect(() => {
    setDraft(formatAmountInput(amount));
  }, [amount]);

  const handleChange = (raw: string) => {
    const parsed = parseMoneyInput(raw);
    if (parsed === null) {
      setDraft(raw.replace(/[^\d,.\s$]/g, ""));
      return;
    }
    setDraft(formatAmountInput(parsed));
  };

  const commit = () => {
    if (!onAmountChange) {
      setDraft(formatAmountInput(amount));
      return;
    }
    const parsed = parseMoneyInput(draft);
    if (parsed === null) {
      setDraft(formatAmountInput(amount));
      return;
    }
    onAmountChange(parsed);
    setDraft(formatAmountInput(parsed));
  };

  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          disabled={disabled || !onAmountChange}
          className="input-cotizador pl-7 tabular-nums disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </label>
  );
}

function EditableAmountCard({
  label,
  amount,
  onAmountChange,
  helper,
}: {
  label: string;
  amount: number;
  onAmountChange?: (amount: number) => void;
  helper?: string;
}) {
  if (!onAmountChange) {
    return <MetricCard label={label} value={formatPrice(amount)} helper={helper} />;
  }

  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-4">
      <MoneyAmountInput
        label={label}
        amount={amount}
        onAmountChange={onAmountChange}
        helper={helper}
      />
    </div>
  );
}

function PercentSlider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange?: (value: number) => void;
  label: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        <span className="text-base font-black tabular-nums text-[#242E38]">
          {formatPctShort(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange?.(Number(event.target.value))}
        disabled={!onChange}
        className="mt-2 h-2 w-full cursor-pointer accent-[#C7A694] disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
}

const resolveUnidadTipo = (
  cluster: { tipo?: string; descripcion?: string } | undefined,
  unidad?: DisponibilidadUnidad,
): PasajeUnidadTipo => {
  if (unidad?.tipo === "oficina") return "oficina";
  if (unidad?.tipo === "departamento") return "departamento";
  if (cluster?.tipo === "oficinas") return "oficina";
  return "departamento";
};

const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseISODate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const parts = value.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
};

const buildResumen = (
  result: PasajeSimuladorResultado,
  desarrolloNombre: string,
  context: {
    clienteNombre?: string;
    asesorNombre?: string;
    clusterNombre?: string;
    prototipoNombre?: string;
    unidadNombre?: string;
    unidad?: DisponibilidadUnidad;
    tipo: PasajeUnidadTipo;
    recamaras?: number;
  },
): string => {
  const tipoLabel = context.tipo === "oficina" ? "Oficina" : "Departamento";
  const ivaLabel = context.tipo === "oficina" ? " (precios más IVA)" : "";
  const supLines: string[] = [];
  if (context.recamaras) supLines.push(`Recámaras: ${context.recamaras}`);
  if (context.unidad?.cajones) supLines.push(`Cajones: ${context.unidad.cajones}`);
  const supInterna = formatAreaM2(context.unidad?.superficieInternaM2);
  if (supInterna) {
    supLines.push(`Sup. interna: ${supInterna}`);
  }
  const supExterna = formatAreaM2(context.unidad?.superficieExternaM2);
  if (supExterna) {
    supLines.push(`Terraza: ${supExterna}`);
  }
  const supBodega = formatAreaM2(context.unidad?.superficieBodegaM2);
  if (supBodega) {
    supLines.push(`Bodega: ${supBodega}`);
  }
  const supTotal = formatAreaM2(computePasajeSuperficieTotalM2(context.unidad));
  if (supTotal) {
    supLines.push(`Sup. total: ${supTotal}`);
  }

  const lines = [
    `Cotización · ${desarrolloNombre}${ivaLabel}`,
    context.clienteNombre ? `Cliente: ${context.clienteNombre}` : null,
    context.asesorNombre ? `Asesor: ${context.asesorNombre}` : null,
    "",
    `${tipoLabel} ${context.unidadNombre ?? "—"}`,
    context.prototipoNombre ? `Modelo: ${context.prototipoNombre}` : null,
    context.unidad?.nivel ? `Nivel: ${context.unidad.nivel}` : null,
    context.clusterNombre ? `Producto: ${context.clusterNombre}` : null,
    ...supLines,
    `Entrega estimada: ${formatMonthYear(PASAJE_FECHA_ENTREGA)}`,
    "",
    `Precio lista: ${formatPrice(result.precioLista)}`,
    `Precio contado (−${formatPctShort(result.descuentoContadoPct)}): ${formatPrice(result.precioContado)}`,
    `Esquema: ${result.esquemaLabel}`,
    `Total cliente: ${formatPrice(result.precioTotal)}`,
    `Descuento efectivo: ${formatPctShort(result.descuentoEfectivoPct)}`,
    "",
    `Enganche (${formatPctShort(result.enganchePct)}): ${formatPrice(result.enganche)}`,
    result.numMensualidades && result.mensualidadCliente
      ? `${result.numMensualidades} mensualidades de ${formatPrice(result.mensualidadCliente)}`
      : null,
    result.fechaPrimerMes && result.fechaUltimoMes
      ? `  · de ${formatMonthYear(result.fechaPrimerMes)} a ${formatMonthYear(result.fechaUltimoMes)}`
      : null,
    result.pagoIntermedio && result.fechaPagoIntermedio
      ? `Pago intermedio (${formatPctShort(result.pagoIntermedioPct ?? 0)}): ${formatPrice(result.pagoIntermedio)} en ${formatMonthYear(result.fechaPagoIntermedio)}`
      : null,
    result.finiquito && result.fechaFiniquito
      ? `Finiquito (${formatPctShort(result.finiquitoPct ?? 0)}): ${formatPrice(result.finiquito)} en ${formatMonthYear(result.fechaFiniquito)}`
      : null,
    "",
    "Ejercicio de rentas (estimado):",
    `  · Renta mensual: ${formatPrice(result.rentaMensual)}`,
    `  · Rendimiento rentas: ${formatPctShort(result.rendimientoRentasAnual)}`,
    `  · Rendimiento total est.: ${formatPctShort(result.rendimientoTotalAnual)}`,
    "",
    "* Vigencia 7 días, sujeto a cambio sin previo aviso.",
    "* Apartado de $50,000 se aplica a cuenta de enganche.",
    "* Valores referenciales; esta consulta no constituye preaprobación.",
    "* Plusvalía estimada es aproximada, no constituye compromiso del desarrollador.",
  ].filter(Boolean);

  return lines.join("\n");
};

export function PasajeSimuladorPanel({
  desarrolloId,
  desarrolloNombre,
  desarrolloLogo,
  prospectoRegistrado,
  clusterId,
  prototipoId,
  unidadId,
  inventarioUnidades,
  catalog,
  clienteNombre,
  asesorNombre,
  asesorId,
  prospectoId,
  clienteEmail,
  clienteTelefono,
  esquema = "contado",
  libreEnganchePct,
  libreMensualidadesPct,
  libreFechaFiniquito,
  libreSinMensEnganchePct,
  libreSinMensPagoPct,
  libreSinMensFechaPago,
  libreSinMensFechaFiniquito,
  showSelectors = false,
  showCopy = false,
  showPdf = false,
  onClusterChange,
  onPrototipoChange,
  onUnidadChange,
  onEsquemaChange,
  onLibreEngancheChange,
  onLibreMensualidadesChange,
  onLibreFechaFiniquitoChange,
  onLibreSinMensEngancheChange,
  onLibreSinMensPagoChange,
  onLibreSinMensFechaPagoChange,
  onLibreSinMensFechaFiniquitoChange,
  onClienteNombreChange,
}: PasajeSimuladorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const cluster = useMemo(
    () => catalog?.clusters.find((item) => item.id === clusterId),
    [catalog, clusterId],
  );

  const prototipos = useMemo(
    () => (clusterId ? getPrototiposCotizables(clusterId, catalog, inventarioUnidades) : []),
    [catalog, clusterId, inventarioUnidades],
  );

  const unidades = useMemo(
    () => (clusterId ? getUnidadesCotizables(clusterId, inventarioUnidades) : []),
    [clusterId, inventarioUnidades],
  );

  const unidad = useMemo(() => {
    if (!unidadId) {
      return undefined;
    }
    const fromInventario = inventarioUnidades?.find((item) => item.id === unidadId);
    const resolved =
      fromInventario ?? unidades.find((item) => item.id === unidadId);
    return resolved ? enrichPasajeUnidad(resolved) : undefined;
  }, [inventarioUnidades, unidadId, unidades]);
  const prototipo = prototipoId
    ? prototipos.find((p) => p.id === prototipoId)
    : unidad?.prototipoId
      ? prototipos.find((p) => p.id === unidad.prototipoId)
      : undefined;

  const unidadesFiltradas = useMemo(
    () =>
      prototipoId
        ? unidades.filter((u) => !u.prototipoId || u.prototipoId === prototipoId)
        : unidades,
    [prototipoId, unidades],
  );

  const tipo = resolveUnidadTipo(cluster, unidad);
  const config = useMemo(() => getPasajeSimuladorConfig(tipo), [tipo]);

  const precioLista = unidad?.precio ?? prototipo?.precioBase ?? 0;

  const libreEnganche = libreEnganchePct ?? config.defaults.libreEnganche;
  const libreMensualidades =
    libreMensualidadesPct ?? config.defaults.libreMensualidades;
  const libreSinMensEnganche =
    libreSinMensEnganchePct ?? config.defaults.libreSinMensEnganche;
  const libreSinMensPago = libreSinMensPagoPct ?? config.defaults.libreSinMensPago;

  const fechaFiniquitoLibre = parseISODate(libreFechaFiniquito) ?? config.fechaEntrega;
  const fechaPagoSinMens = parseISODate(libreSinMensFechaPago) ?? config.fechaEntrega;
  const fechaFiniquitoSinMens =
    parseISODate(libreSinMensFechaFiniquito) ?? config.fechaEntrega;

  const minDateISO = useMemo(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + 1);
    return toISODate(today);
  }, []);
  const maxDateISO = useMemo(() => toISODate(config.fechaEntrega), [config.fechaEntrega]);

  const resultado = useMemo(
    () =>
      computePasajeSimulador({
        precioLista,
        tipo,
        esquema,
        libre: {
          enganchePct: libreEnganche,
          mensualidadesPct: libreMensualidades,
          fechaFiniquito: fechaFiniquitoLibre,
        },
        libreSinMens: {
          enganchePct: libreSinMensEnganche,
          pagoPct: libreSinMensPago,
          fechaPagoIntermedio: fechaPagoSinMens,
          fechaFiniquito: fechaFiniquitoSinMens,
        },
      }),
    [
      esquema,
      fechaFiniquitoLibre,
      fechaFiniquitoSinMens,
      fechaPagoSinMens,
      libreEnganche,
      libreMensualidades,
      libreSinMensEnganche,
      libreSinMensPago,
      precioLista,
      tipo,
    ],
  );

  const pdfContext = useMemo(
    () => ({
      clienteNombre,
      asesorNombre,
      clusterNombre: cluster?.nombre,
      prototipoNombre: prototipo?.nombre,
      unidadNombre: unidad?.unidad,
      unidad,
      tipo,
      recamaras: prototipo?.recamaras,
    }),
    [
      asesorNombre,
      clienteNombre,
      cluster?.nombre,
      prototipo?.nombre,
      prototipo?.recamaras,
      tipo,
      unidad,
    ],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        buildResumen(resultado, desarrolloNombre, pdfContext),
      );
    } catch {
      // El portapapeles puede fallar en HTTP/permisos.
    }

    saveCotizacionClient({
      desarrolloId,
      asesorId,
      prospectoId,
      clienteNombre,
      clienteEmail,
      clienteTelefono,
      unidadId: unidad?.id,
      clusterId,
      prototipoId,
      unidadNumero: unidad?.unidad,
      tipoUnidad: tipo === "oficina" ? "oficina" : "departamento",
      precioLista: resultado.precioLista,
      esquemaPago: resultado.esquemaLabel,
      descuentoPct: resultado.descuentoEfectivoPct,
      precioTotal: resultado.precioTotal,
      payload: { resultado, pdfContext, origen: "pasaje_simulador" },
    });

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (precioLista <= 0 || resultado.error) {
      return;
    }
    setPdfLoading(true);
    try {
      await downloadPasajeSimuladorPdf({
        desarrolloNombre,
        desarrolloLogo,
        resultado,
        ...pdfContext,
      });

      saveCotizacionClient({
        desarrolloId,
        asesorId,
        prospectoId,
        clienteNombre,
        clienteEmail,
        clienteTelefono,
        unidadId: unidad?.id,
        clusterId,
        prototipoId,
        unidadNumero: unidad?.unidad,
        tipoUnidad: tipo === "oficina" ? "oficina" : "departamento",
        precioLista: resultado.precioLista,
        esquemaPago: resultado.esquemaLabel,
        descuentoPct: resultado.descuentoEfectivoPct,
        precioTotal: resultado.precioTotal,
        pdfGenerado: true,
        payload: { resultado, pdfContext, origen: "pasaje_simulador_pdf" },
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const unidadTitulo =
    tipo === "oficina"
      ? `Oficina ${unidad?.unidad ?? "—"}`
      : `Departamento ${unidad?.unidad ?? "—"}`;
  const fechaHoy = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const m2Interna = unidad?.superficieInternaM2 ?? null;
  const m2Externa = unidad?.superficieExternaM2 ?? null;
  const m2Bodega = unidad?.superficieBodegaM2 ?? null;
  const m2Total = computePasajeSuperficieTotalM2(unidad) ?? prototipo?.construccionM2 ?? null;
  const recamaras = prototipo?.recamaras ?? 0;
  const cajones = unidad?.cajones ?? null;
  const fmtM2 = (value: number | null) => formatAreaM2(value) || "—";

  const puedeEditarMontosLibre =
    esquema === "libre" &&
    Boolean(onLibreEngancheChange && onLibreMensualidadesChange);
  const puedeEditarMontosLibreSinMens =
    esquema === "libre-sin-mensualidades" &&
    Boolean(
      onLibreSinMensEngancheChange &&
        onLibreSinMensPagoChange,
    );

  const syncLibreEngancheFromAmount = (amount: number) => {
    if (!onLibreEngancheChange || resultado.precioContado <= 0) {
      return;
    }
    onLibreEngancheChange(clamp(amount / resultado.precioContado, 0.15, 0.5));
  };

  const syncLibreMensualidadFromAmount = (monthlyAmount: number) => {
    if (!onLibreMensualidadesChange || resultado.precioTotal <= 0) {
      return;
    }
    const numMeses = resultado.numMensualidades ?? 1;
    onLibreMensualidadesChange(
      clamp((monthlyAmount * numMeses) / resultado.precioTotal, 0.05, 0.5),
    );
  };

  const syncLibreFiniquitoFromAmount = (amount: number) => {
    if (!onLibreMensualidadesChange || resultado.precioTotal <= 0) {
      return;
    }
    const finiquitoPct = clamp(amount / resultado.precioTotal, 0, 1 - libreEnganche - 0.05);
    onLibreMensualidadesChange(clamp(1 - libreEnganche - finiquitoPct, 0.05, 0.5));
  };

  const syncLibreSinMensEngancheFromAmount = (amount: number) => {
    if (!onLibreSinMensEngancheChange || resultado.precioContado <= 0) {
      return;
    }
    onLibreSinMensEngancheChange(clamp(amount / resultado.precioContado, 0.15, 0.5));
  };

  const syncLibreSinMensPagoFromAmount = (amount: number) => {
    if (!onLibreSinMensPagoChange || resultado.precioTotal <= 0) {
      return;
    }
    onLibreSinMensPagoChange(clamp(amount / resultado.precioTotal, 0.05, 0.5));
  };

  const syncLibreSinMensFiniquitoFromAmount = (amount: number) => {
    if (!onLibreSinMensPagoChange || resultado.precioTotal <= 0) {
      return;
    }
    const finiquitoPct = clamp(
      amount / resultado.precioTotal,
      0,
      1 - libreSinMensEnganche - 0.05,
    );
    onLibreSinMensPagoChange(clamp(1 - libreSinMensEnganche - finiquitoPct, 0.05, 0.5));
  };

  const prospectoAutollenado =
    Boolean(prospectoRegistrado?.trim()) &&
    prospectoRegistrado?.trim() === (clienteNombre ?? "").trim();

  const cotizadorHeader = (
    <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#242E38] via-[#2a3540] to-[#1a232b] text-white shadow-lg ring-1 ring-[#242E38]/20">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          {desarrolloLogo ? (
            <div className="flex h-[4.5rem] w-[11rem] shrink-0 items-center justify-center rounded-xl bg-white px-3 py-2 shadow-sm">
              <Image
                src={desarrolloLogo}
                alt={desarrolloNombre}
                width={220}
                height={88}
                className="h-auto max-h-14 w-full object-contain"
                priority
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C7A694]">
              Cotización
            </p>
            <h2 className="text-balance text-xl font-black leading-tight sm:text-2xl">
              {desarrolloNombre}
            </h2>
            {asesorNombre ? (
              <p className="mt-1 text-xs text-white/55">Asesor: {asesorNombre}</p>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right text-xs text-white/50">
          <p className="font-semibold text-white/70">Elaboración</p>
          <p className="mt-0.5">{fechaHoy}</p>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/15 px-5 py-4">
        <label className="block">
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            En atención a:
          </span>
          {onClienteNombreChange ? (
            <input
              type="text"
              value={clienteNombre ?? ""}
              onChange={(event) => onClienteNombreChange(event.target.value)}
              placeholder="Nombre para personalizar la cotización"
              className="mt-2 w-full rounded-xl border border-white/12 bg-white/10 px-4 py-3 text-lg font-bold text-white placeholder:text-white/35 focus:border-[#C7A694] focus:outline-none focus:ring-2 focus:ring-[#C7A694]/35"
            />
          ) : (
            <p className="mt-2 text-lg font-bold leading-snug">
              {clienteNombre?.trim() || "Sin nombre"}
            </p>
          )}
          {prospectoAutollenado ? (
            <p className="mt-2 text-xs text-[#C7A694]">
              Nombre del registro inicial · puedes editarlo para personalizar.
            </p>
          ) : prospectoRegistrado?.trim() ? (
            <p className="mt-2 text-xs text-white/45">
              Registrado como «{prospectoRegistrado.trim()}» en el recorrido.
            </p>
          ) : onClienteNombreChange ? (
            <p className="mt-2 text-xs text-white/45">
              Se llena solo si ya capturaste al cliente en el primer paso del recorrido.
            </p>
          ) : null}
        </label>
      </div>
    </header>
  );

  const selectorBlock = showSelectors ? (
    <div className="grid gap-4">
      <label className="block">
        <FieldLabel>Producto</FieldLabel>
        <select
          value={clusterId}
          onChange={(event) => onClusterChange?.(event.target.value)}
          className="input-cotizador"
        >
          {(catalog?.clusters ?? []).map((cluster) => (
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
          >
            <option value="">Cualquier modelo</option>
            {prototipos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0">
          <FieldLabel>Unidad</FieldLabel>
          <select
            value={unidadId ?? ""}
            onChange={(event) =>
              onUnidadChange?.(event.target.value ? event.target.value : undefined)
            }
            className="input-cotizador"
          >
            <option value="">Precio de prototipo</option>
            {unidadesFiltradas.map((u) => (
              <option key={u.id} value={u.id}>
                {u.unidad}
                {typeof u.nivelOrden === "number" ? ` · N${u.nivelOrden}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  ) : null;

  if (precioLista === 0) {
    return (
      <div className="space-y-6">
        {cotizadorHeader}
        {selectorBlock}
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-base font-black text-[#242E38] sm:text-lg">
            Selecciona un producto para cotizar
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Elige producto, prototipo o unidad para correr el simulador con los precios reales.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cotizadorHeader}
      {selectorBlock}

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C7A694]">
          {tipo === "oficina" ? "Oficina" : "Departamento"}
        </p>
        <p className="mt-1 text-2xl font-black leading-snug text-[#242E38]">{unidadTitulo}</p>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {prototipo?.nombre ?? cluster?.nombre ?? "Sin modelo"}
          {unidad?.nivel ? ` · Nivel ${unidad.nivel}` : ""}
        </p>
        {unidad?.notas ? (
          <p className="mt-1 text-xs text-slate-500">{unidad.notas}</p>
        ) : null}

        <div className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {tipo === "departamento" && recamaras > 0 ? (
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <span className="text-slate-500">Recámaras</span>
              <span className="font-bold tabular-nums text-[#242E38]">{recamaras}</span>
            </div>
          ) : null}
          {cajones ? (
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <span className="text-slate-500">Cajones</span>
              <span className="font-bold tabular-nums text-[#242E38]">{cajones}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
            <span className="text-slate-500">Sup. interna</span>
            <span className="font-bold tabular-nums text-[#242E38]">{fmtM2(m2Interna)}</span>
          </div>
          {m2Externa && m2Externa > 0 ? (
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <span className="text-slate-500">Terraza / balcón</span>
              <span className="font-bold tabular-nums text-[#242E38]">{fmtM2(m2Externa)}</span>
            </div>
          ) : null}
          {m2Bodega && m2Bodega > 0 ? (
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
              <span className="text-slate-500">Bodega</span>
              <span className="font-bold tabular-nums text-[#242E38]">{fmtM2(m2Bodega)}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
            <span className="text-slate-500">Sup. total</span>
            <span className="font-black tabular-nums text-[#242E38]">{fmtM2(m2Total)}</span>
          </div>
        </div>

      </section>

      {tipo === "oficina" ? (
        <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-center text-sm font-black uppercase tracking-wider text-amber-900 ring-1 ring-amber-200">
          Precios más IVA
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Precio lista"
          value={formatPrice(resultado.precioLista)}
        />
        <MetricCard
          label={`Precio contado (−${formatPctShort(resultado.descuentoContadoPct)})`}
          value={formatPrice(resultado.precioContado)}
          variant="accent"
          helper={`Ahorro ${formatPrice(resultado.ahorroContado)}`}
        />
      </section>

      <section>
        <FieldLabel>Esquema de pago</FieldLabel>
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 lg:grid-cols-3">
          {PASAJE_ESQUEMAS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onEsquemaChange?.(value)}
              className={`min-h-14 rounded-xl px-3 text-xs font-black uppercase tracking-wide transition md:text-sm ${
                esquema === value
                  ? "bg-[#242E38] text-white shadow"
                  : "text-slate-500"
              }`}
            >
              {PASAJE_ESQUEMA_LABELS[value]}
            </button>
          ))}
        </div>
      </section>

      {esquema === "libre" && (
        <div className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:grid-cols-2">
          <div className="space-y-3">
            <PercentSlider
              label="Enganche"
              value={libreEnganche}
              min={0.15}
              max={0.5}
              step={0.01}
              onChange={onLibreEngancheChange}
            />
            <MoneyAmountInput
              label="Monto enganche"
              amount={resultado.enganche}
              onAmountChange={
                puedeEditarMontosLibre ? syncLibreEngancheFromAmount : undefined
              }
            />
          </div>
          <div className="space-y-3">
            <PercentSlider
              label="Mensualidades"
              value={libreMensualidades}
              min={0.05}
              max={0.5}
              step={0.01}
              onChange={onLibreMensualidadesChange}
            />
            {resultado.mensualidadCliente ? (
              <MoneyAmountInput
                label="Monto mensualidad"
                amount={resultado.mensualidadCliente}
                onAmountChange={
                  puedeEditarMontosLibre ? syncLibreMensualidadFromAmount : undefined
                }
              />
            ) : null}
          </div>
          <label className="block sm:col-span-2">
            <FieldLabel>Fecha de finiquito</FieldLabel>
            <input
              type="date"
              min={minDateISO}
              max={maxDateISO}
              value={libreFechaFiniquito ?? toISODate(config.fechaEntrega)}
              onChange={(event) => onLibreFechaFiniquitoChange?.(event.target.value)}
              disabled={!onLibreFechaFiniquitoChange}
              className="input-cotizador"
            />
          </label>
          <div className="sm:col-span-2">
            <MoneyAmountInput
              label={`Finiquito (${formatPctShort(Math.max(0, 1 - libreEnganche - libreMensualidades))})`}
              amount={resultado.finiquito ?? 0}
              onAmountChange={
                puedeEditarMontosLibre ? syncLibreFiniquitoFromAmount : undefined
              }
              helper="Mínimos: enganche 15%, enganche + mensualidades 30%."
            />
          </div>
        </div>
      )}

      {esquema === "libre-sin-mensualidades" && (
        <div className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:grid-cols-2">
          <div className="space-y-3">
            <PercentSlider
              label="Enganche"
              value={libreSinMensEnganche}
              min={0.15}
              max={0.5}
              step={0.01}
              onChange={onLibreSinMensEngancheChange}
            />
            <MoneyAmountInput
              label="Monto enganche"
              amount={resultado.enganche}
              onAmountChange={
                puedeEditarMontosLibreSinMens
                  ? syncLibreSinMensEngancheFromAmount
                  : undefined
              }
            />
          </div>
          <div className="space-y-3">
            <PercentSlider
              label="Pago intermedio"
              value={libreSinMensPago}
              min={0.05}
              max={0.5}
              step={0.01}
              onChange={onLibreSinMensPagoChange}
            />
            {resultado.pagoIntermedio ? (
              <MoneyAmountInput
                label="Monto pago intermedio"
                amount={resultado.pagoIntermedio}
                onAmountChange={
                  puedeEditarMontosLibreSinMens
                    ? syncLibreSinMensPagoFromAmount
                    : undefined
                }
              />
            ) : null}
          </div>
          <label className="block">
            <FieldLabel>Fecha pago intermedio</FieldLabel>
            <input
              type="date"
              min={minDateISO}
              max={maxDateISO}
              value={libreSinMensFechaPago ?? toISODate(config.fechaEntrega)}
              onChange={(event) => onLibreSinMensFechaPagoChange?.(event.target.value)}
              disabled={!onLibreSinMensFechaPagoChange}
              className="input-cotizador"
            />
          </label>
          <label className="block">
            <FieldLabel>Fecha finiquito</FieldLabel>
            <input
              type="date"
              min={minDateISO}
              max={maxDateISO}
              value={libreSinMensFechaFiniquito ?? toISODate(config.fechaEntrega)}
              onChange={(event) => onLibreSinMensFechaFiniquitoChange?.(event.target.value)}
              disabled={!onLibreSinMensFechaFiniquitoChange}
              className="input-cotizador"
            />
          </label>
          <div className="sm:col-span-2">
            <MoneyAmountInput
              label={`Finiquito (${formatPctShort(Math.max(0, 1 - libreSinMensEnganche - libreSinMensPago))})`}
              amount={resultado.finiquito ?? 0}
              onAmountChange={
                puedeEditarMontosLibreSinMens
                  ? syncLibreSinMensFiniquitoFromAmount
                  : undefined
              }
              helper="El pago intermedio debe ser anterior o igual al finiquito."
            />
          </div>
        </div>
      )}

      {resultado.error ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-200">
          {resultado.error}
        </div>
      ) : null}

      <section aria-label="Total">
        <MetricCard
          label="Total cliente"
          value={formatPrice(resultado.precioTotal)}
          helper={`Descuento efectivo ${formatPctShort(resultado.descuentoEfectivoPct)}`}
          variant="hero"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <EditableAmountCard
          label={`Enganche (${formatPctShort(resultado.enganchePct)})`}
          amount={resultado.enganche}
          onAmountChange={
            puedeEditarMontosLibre
              ? syncLibreEngancheFromAmount
              : puedeEditarMontosLibreSinMens
                ? syncLibreSinMensEngancheFromAmount
                : undefined
          }
        />
        {resultado.mensualidadCliente && resultado.numMensualidades ? (
          <EditableAmountCard
            label={`${resultado.numMensualidades} mensualidades`}
            amount={resultado.mensualidadCliente}
            onAmountChange={
              puedeEditarMontosLibre ? syncLibreMensualidadFromAmount : undefined
            }
            helper={
              resultado.fechaPrimerMes && resultado.fechaUltimoMes
                ? `${formatMonthYear(resultado.fechaPrimerMes)} → ${formatMonthYear(resultado.fechaUltimoMes)}`
                : undefined
            }
          />
        ) : null}
        {resultado.pagoIntermedio && resultado.pagoIntermedioPct ? (
          <EditableAmountCard
            label={`Pago (${formatPctShort(resultado.pagoIntermedioPct)})`}
            amount={resultado.pagoIntermedio}
            onAmountChange={
              puedeEditarMontosLibreSinMens ? syncLibreSinMensPagoFromAmount : undefined
            }
            helper={
              resultado.fechaPagoIntermedio
                ? formatMonthYear(resultado.fechaPagoIntermedio)
                : undefined
            }
          />
        ) : null}
        {resultado.finiquito ? (
          <EditableAmountCard
            label={`Finiquito (${formatPctShort(resultado.finiquitoPct ?? 0)})`}
            amount={resultado.finiquito}
            onAmountChange={
              puedeEditarMontosLibre
                ? syncLibreFiniquitoFromAmount
                : puedeEditarMontosLibreSinMens
                  ? syncLibreSinMensFiniquitoFromAmount
                  : undefined
            }
            helper={
              resultado.fechaFiniquito
                ? formatMonthYear(resultado.fechaFiniquito)
                : undefined
            }
          />
        ) : null}
      </section>

      <section className="rounded-2xl bg-[#C7A694]/10 p-4 ring-1 ring-[#C7A694]/25">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#7d5b46]">
          Ejercicio de rentas (estimado)
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Renta mensual</p>
            <p className="text-lg font-black tabular-nums text-[#242E38]">
              {formatPrice(resultado.rentaMensual)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Rendimiento rentas</p>
            <p className="text-lg font-black tabular-nums text-[#242E38]">
              {formatPctShort(resultado.rendimientoRentasAnual)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Rendimiento total est.</p>
            <p className="text-lg font-black tabular-nums text-[#6CC24A]">
              {formatPctShort(resultado.rendimientoTotalAnual)}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/90 px-4 py-3 text-[11px] italic leading-relaxed text-slate-500">
        <p>
          Todos los precios tienen una vigencia de una semana y están sujetos a cambio sin
          previo aviso.
        </p>
        <p>Apartado de $50,000 pesos se tomará a cuenta de enganche.</p>
        <p>
          Los valores anteriores son sólo referenciales e informativos, por lo que esta
          consulta no constituye preaprobación.
        </p>
        <p>
          La plusvalía estimada a la entrega es un cálculo aproximado y no representa un
          compromiso por parte del desarrollador.
        </p>
      </div>

      {showCopy || showPdf ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {showPdf ? (
            <button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={pdfLoading || precioLista <= 0 || Boolean(resultado.error)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C7A694] px-5 text-sm font-bold text-[#242E38] transition hover:bg-[#b89582] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-14 sm:text-base"
            >
              <FileDown className="h-4 w-4 sm:h-5 sm:w-5" />
              {pdfLoading ? "Generando PDF…" : "Descargar PDF (carta)"}
            </button>
          ) : null}
          {showCopy ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#242E38] px-5 text-sm font-bold text-white transition hover:bg-[#1a232b] active:scale-[0.99] sm:min-h-14 sm:text-base ${
                showPdf ? "" : "sm:col-span-2"
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  Resumen copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 sm:h-5 sm:w-5" />
                  Copiar resumen
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

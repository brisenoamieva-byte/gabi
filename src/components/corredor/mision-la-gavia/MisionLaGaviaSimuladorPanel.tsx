"use client";

import { CheckCircle2, ChevronDown, Copy, FileDown, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  getUnidadesCotizables,
  type CotizadorCatalog,
} from "@/lib/cotizador";
import { DescuentoEspecialField } from "@/components/cotizador/DescuentoEspecialField";
import { calcDescuentoPct, saveCotizacionClient } from "@/lib/comercial/save-cotizacion-client";
import { formatAreaM2, formatPrice } from "@/lib/format/money";
import { formatAmountInput, parseMoneyInput } from "@/lib/format/money-input";
import { endOfMonth, formatMonthYear } from "@/lib/cotizador/pasaje-simulador";
import { downloadMisionLaGaviaSimuladorPdf } from "@/lib/cotizador/mision-la-gavia-simulador-pdf";
import { MISION_LA_GAVIA_UNIDADES } from "@/lib/corredor/mision-la-gavia-unidades.generated";
import {
  buildCalendarioPagosMisionLaGavia,
  buildMisionLaGaviaSimulacionSummary,
  clampMsiMensualidades,
  defaultMsiMensualidadesForEsquema,
  formatPctShort,
  getMisionLaGaviaEsquemas,
  labelDiaPagoMisionLaGavia,
  MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
  MISION_LA_GAVIA_ENTREGA_ETAPA1_ISO,
  MISION_LA_GAVIA_LIBRE_DEFAULTS,
  MISION_LA_GAVIA_MSI_DEFAULTS,
  normalizeMisionLaGaviaEsquema,
  resolveMisionLaGaviaUnidadFromInventario,
  simularMisionLaGavia,
  type MisionLaGaviaDiaPago,
  type MisionLaGaviaEsquemaId,
  type MisionLaGaviaFilaPago,
  type MisionLaGaviaUnidadRecord,
} from "@/lib/corredor/mision-la-gavia-simulador";
import {
  decodeMisionLaGaviaUnidad,
  MISION_LA_GAVIA_EDIFICIOS,
  type GaviaTipologia,
} from "@/lib/disponibilidad/planos/mision-la-gavia";
import { resolveGaviaPlantaAssets } from "@/lib/disponibilidad/planos/plantas";
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
  /** Rol del asesor en sesión (gerente/director ven descuento especial). */
  asesorRol?: string | null;
  prospectoId?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  esquema?: MisionLaGaviaEsquemaId;
  showSelectors?: boolean;
  showCopy?: boolean;
  showPdf?: boolean;
  libreEnganchePct?: number;
  libreMensualidadesPct?: number;
  libreFechaFiniquito?: string;
  /** Número de mensualidades del esquema MSI unificado. */
  msiNumMensualidades?: number;
  onClusterChange?: (clusterId: string) => void;
  onPrototipoChange?: (prototipoId: string | undefined) => void;
  onUnidadChange?: (unidadId: string | undefined) => void;
  onEsquemaChange?: (esquema: MisionLaGaviaEsquemaId) => void;
  onLibreEngancheChange?: (value: number) => void;
  onLibreMensualidadesChange?: (value: number) => void;
  onLibreFechaFiniquitoChange?: (value: string) => void;
  onMsiNumMensualidadesChange?: (value: number) => void;
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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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
  const safeMax = Math.max(max, min);
  const safeValue = clamp(value, min, safeMax);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </span>
        <span className="text-base font-black tabular-nums text-[#14453D]">
          {formatPctShort(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={safeMax}
        step={step}
        value={safeValue}
        onChange={(event) => onChange?.(Number(event.target.value))}
        disabled={!onChange || safeMax <= min}
        className="mt-2 h-2 w-full cursor-pointer accent-[#5B8A7D] disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
}

function MoneyAmountInput({
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
          disabled={!onAmountChange}
          className="input-cotizador pl-7 tabular-nums disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </label>
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
  clienteNombre,
  asesorNombre,
  asesorId,
  asesorRol,
  prospectoId,
  clienteEmail,
  clienteTelefono,
  esquema = "contado",
  showSelectors = false,
  showCopy = false,
  showPdf = false,
  libreEnganchePct,
  libreMensualidadesPct,
  libreFechaFiniquito,
  msiNumMensualidades,
  onUnidadChange,
  onEsquemaChange,
  onLibreEngancheChange,
  onLibreMensualidadesChange,
  onLibreFechaFiniquitoChange,
  onMsiNumMensualidadesChange,
  onClienteNombreChange,
}: MisionLaGaviaSimuladorPanelProps) {
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [edificio, setEdificio] = useState("");
  const [unidadCode, setUnidadCode] = useState("");
  const [esquemaLocal, setEsquemaLocal] = useState<MisionLaGaviaEsquemaId>(() =>
    normalizeMisionLaGaviaEsquema(esquema),
  );
  const [msiMensualidadesLocal, setMsiMensualidadesLocal] = useState(() =>
    clampMsiMensualidades(
      msiNumMensualidades ?? defaultMsiMensualidadesForEsquema(esquema),
    ),
  );
  const [diaPago, setDiaPago] = useState<MisionLaGaviaDiaPago>(
    MISION_LA_GAVIA_DIA_PAGO_DEFAULT,
  );
  const [plantasOpen, setPlantasOpen] = useState(false);
  const [descuentoEspecialPct, setDescuentoEspecialPct] = useState(0);

  useEffect(() => {
    setEsquemaLocal(normalizeMisionLaGaviaEsquema(esquema));
    if (esquema === "6msi" || esquema === "12msi") {
      setMsiMensualidadesLocal(defaultMsiMensualidadesForEsquema(esquema));
    }
  }, [esquema]);

  useEffect(() => {
    if (msiNumMensualidades != null) {
      setMsiMensualidadesLocal(clampMsiMensualidades(msiNumMensualidades));
    }
  }, [msiNumMensualidades]);

  const esquemas = useMemo(() => getMisionLaGaviaEsquemas(), []);
  const unidadesInventario = useMemo(
    () => (clusterId ? getUnidadesCotizables(clusterId, inventarioUnidades) : []),
    [clusterId, inventarioUnidades],
  );

  const edificios = useMemo(() => {
    const ids = new Set<string>(
      MISION_LA_GAVIA_EDIFICIOS.filter((item) => item.cotizable).map((item) => item.id),
    );
    for (const unit of unidadesInventario) {
      const decoded = decodeMisionLaGaviaUnidad(unit.unidad);
      if (decoded) {
        ids.add(decoded.edificio);
      }
    }
    if (unidadId && inventarioUnidades?.length) {
      const selected = inventarioUnidades.find((item) => item.id === unidadId);
      const decoded = selected?.unidad
        ? decodeMisionLaGaviaUnidad(selected.unidad)
        : null;
      if (decoded) {
        ids.add(decoded.edificio);
      }
    }
    return Array.from(ids).sort();
  }, [inventarioUnidades, unidadId, unidadesInventario]);

  const unidadesEdificio = useMemo(() => {
    if (!edificio) return [];
    const fromCatalog = MISION_LA_GAVIA_UNIDADES.filter((item) => item.edificio === edificio);
    const fromInventarioCodes = new Set(
      unidadesInventario
        .filter((item) => {
          const decoded = decodeMisionLaGaviaUnidad(item.unidad);
          return decoded?.edificio === edificio;
        })
        .map((item) => item.unidad),
    );
    // Preferir unidades presentes en inventario vivo; si no hay, catálogo del edificio.
    const filtered = fromInventarioCodes.size
      ? fromCatalog.filter((item) => fromInventarioCodes.has(item.unidad))
      : fromCatalog;
    return filtered.sort((a, b) => a.unidad.localeCompare(b.unidad, "es", { numeric: true }));
  }, [edificio, unidadesInventario]);

  // Al elegir unidad en el recorrido (o URL), sincronizar selectores del simulador.
  useEffect(() => {
    if (!unidadId) {
      return;
    }
    const inv =
      inventarioUnidades?.find((item) => item.id === unidadId) ??
      unidadesInventario.find((item) => item.id === unidadId);
    if (!inv?.unidad) {
      return;
    }
    const decoded = decodeMisionLaGaviaUnidad(inv.unidad);
    const torre = decoded?.edificio ?? inv.unidad.split("-")[0]?.toUpperCase();
    if (!torre) {
      return;
    }
    setEdificio(torre);
    setUnidadCode(inv.unidad);
  }, [unidadId, inventarioUnidades, unidadesInventario]);

  useEffect(() => {
    if (!edificio && edificios.length) {
      setEdificio(edificios[0] ?? "");
      return;
    }
    // No pisar la torre si viene de una unidad ya elegida en el recorrido.
    if (
      !unidadId &&
      edificio &&
      !edificios.includes(edificio) &&
      edificios.length
    ) {
      setEdificio(edificios[0] ?? "");
      setUnidadCode("");
    }
  }, [edificio, edificios, unidadId]);

  useEffect(() => {
    if (unidadId) {
      return;
    }
    if (!unidadCode && unidadesEdificio.length) {
      const preferida =
        unidadesEdificio.find((item) => item.estatus === "disponible") ?? unidadesEdificio[0];
      setUnidadCode(preferida?.unidad ?? "");
    }
  }, [unidadCode, unidadesEdificio, unidadId]);

  const unidadRecord = useMemo(() => {
    return resolveUnidadRecord(inventarioUnidades, unidadId, edificio, unidadCode);
  }, [edificio, inventarioUnidades, unidadCode, unidadId]);

  const plantasAssets = useMemo(() => {
    if (!unidadRecord) {
      return null;
    }
    const decoded = decodeMisionLaGaviaUnidad(unidadRecord.unidad);
    if (!decoded) {
      return null;
    }
    const tipologia: GaviaTipologia = unidadRecord.recamaras >= 3 ? "3R" : "2R";
    return resolveGaviaPlantaAssets(tipologia, decoded.lado, decoded.nivel);
  }, [unidadRecord]);

  useEffect(() => {
    setPlantasOpen(false);
  }, [unidadRecord?.unidad]);

  const libreEnganche = libreEnganchePct ?? MISION_LA_GAVIA_LIBRE_DEFAULTS.enganchePct;
  const libreMensualidades =
    libreMensualidadesPct ?? MISION_LA_GAVIA_LIBRE_DEFAULTS.mensualidadesPct;

  const fechaEntregaDefault = useMemo(() => {
    if (unidadRecord?.entregaIso) {
      return parseISODate(unidadRecord.entregaIso) ?? parseISODate(MISION_LA_GAVIA_ENTREGA_ETAPA1_ISO)!;
    }
    return parseISODate(MISION_LA_GAVIA_ENTREGA_ETAPA1_ISO) ?? endOfMonth(new Date(2027, 11, 1), 0);
  }, [unidadRecord?.entregaIso]);

  const simulacion = useMemo(() => {
    if (!unidadRecord) return null;
    const fechaFiniquito =
      parseISODate(libreFechaFiniquito) ?? fechaEntregaDefault;
    return simularMisionLaGavia({
      unidad: unidadRecord,
      esquema: esquemaLocal,
      descuentoEspecialPct,
      libre:
        esquemaLocal === "libre"
          ? {
              enganchePct: libreEnganche,
              mensualidadesPct: libreMensualidades,
              fechaFiniquito,
            }
          : undefined,
      msi:
        esquemaLocal === "msi"
          ? { numMensualidades: msiMensualidadesLocal }
          : undefined,
    });
  }, [
    descuentoEspecialPct,
    esquemaLocal,
    fechaEntregaDefault,
    libreEnganche,
    libreFechaFiniquito,
    libreMensualidades,
    msiMensualidadesLocal,
    unidadRecord,
  ]);

  const calendarioPagos = useMemo(() => {
    if (!simulacion) return [];
    return buildCalendarioPagosMisionLaGavia(simulacion, { diaPago });
  }, [diaPago, simulacion]);

  const rangoMensualidades = useMemo(() => {
    const mens = calendarioPagos.filter((fila) => fila.tipo === "mensualidad");
    if (mens.length === 0) return undefined;
    const first = mens[0]!;
    const last = mens[mens.length - 1]!;
    return `${formatMonthYear(first.fechaPago)} – ${formatMonthYear(last.fechaPago)}`;
  }, [calendarioPagos]);

  const puedeEditarMontosLibre =
    esquemaLocal === "libre" &&
    Boolean(onLibreEngancheChange && onLibreMensualidadesChange);

  // Finiquito = remanente; puede ser 0% si enganche + mensualidades = 100%.
  const libreMensualidadesMax = Math.max(0, 1 - libreEnganche);

  const handleLibreEngancheChange = (value: number) => {
    if (!onLibreEngancheChange) return;
    const nextEnganche = clamp(value, 0.15, 1);
    onLibreEngancheChange(nextEnganche);
    if (onLibreMensualidadesChange) {
      const maxMens = Math.max(0, 1 - nextEnganche);
      if (libreMensualidades > maxMens) {
        onLibreMensualidadesChange(maxMens);
      }
    }
  };

  const handleLibreMensualidadesChange = (value: number) => {
    if (!onLibreMensualidadesChange) return;
    onLibreMensualidadesChange(clamp(value, 0, libreMensualidadesMax));
  };

  const syncLibreEngancheFromAmount = (amount: number) => {
    // En Libre el % de enganche se aplica al precio de contado (como en el Excel).
    const base = simulacion?.precioContado ?? unidadRecord?.precioContado ?? 0;
    if (!onLibreEngancheChange || base <= 0) {
      return;
    }
    handleLibreEngancheChange(amount / base);
  };

  const syncLibreMensualidadFromAmount = (monthlyAmount: number) => {
    if (!onLibreMensualidadesChange || !simulacion || simulacion.precioTotal <= 0) {
      return;
    }
    const numMeses = Math.max(1, simulacion.numMensualidades ?? 1);
    handleLibreMensualidadesChange(
      (monthlyAmount * numMeses) / simulacion.precioTotal,
    );
  };

  const syncLibreFiniquitoFromAmount = (amount: number) => {
    const precioContado = simulacion?.precioContado ?? 0;
    if (!onLibreMensualidadesChange || !simulacion || precioContado <= 0) {
      return;
    }
    if (amount <= 0) {
      // Todo en enganche + mensualidades (finiquito 0%).
      handleLibreMensualidadesChange(1 - libreEnganche);
      return;
    }
    // Aproxima el % de contado con el monto capturado (remanente hasta 100%).
    const finiquitoPct = clamp(amount / precioContado, 0, 1 - libreEnganche);
    handleLibreMensualidadesChange(1 - libreEnganche - finiquitoPct);
  };

  const handleEsquema = (value: MisionLaGaviaEsquemaId) => {
    const normalized = normalizeMisionLaGaviaEsquema(value);
    setEsquemaLocal(normalized);
    onEsquemaChange?.(normalized);
  };

  const handleMsiMensualidades = (value: number) => {
    const next = clampMsiMensualidades(value);
    setMsiMensualidadesLocal(next);
    onMsiNumMensualidadesChange?.(next);
  };

  const persistCotizacion = (opts?: { pdfGenerado?: boolean; origen?: string }) => {
    if (!simulacion) return;
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
      pdfGenerado: opts?.pdfGenerado ?? false,
      payload: {
        simulacion,
        origen: opts?.origen ?? "mision_la_gavia_simulador",
      },
    });
  };

  const handleCopy = async () => {
    if (!simulacion) return;
    const summary = buildMisionLaGaviaSimulacionSummary(
      simulacion,
      desarrolloNombre,
      clienteNombre,
      undefined,
      diaPago,
    );
    try {
      await navigator.clipboard.writeText(summary);
    } catch {
      // clipboard puede fallar sin HTTPS.
    }

    persistCotizacion({ origen: "mision_la_gavia_simulador" });

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPdf = async () => {
    if (!simulacion || simulacion.error) {
      return;
    }
    if (!clienteNombre?.trim()) {
      window.alert("Escribe el nombre del prospecto para generar el PDF y registrarlo en seguimiento.");
      return;
    }

    setPdfLoading(true);
    try {
      await downloadMisionLaGaviaSimuladorPdf({
        desarrolloNombre,
        desarrolloLogo,
        simulacion,
        clienteNombre,
        asesorNombre,
        recamaras: unidadRecord?.recamaras,
        diaPago,
      });
      persistCotizacion({
        pdfGenerado: true,
        origen: "mision_la_gavia_simulador_pdf",
      });
    } catch (error) {
      console.error("[gavia-pdf]", error);
      window.alert(
        error instanceof Error
          ? `No se pudo generar el PDF: ${error.message}`
          : "No se pudo generar el PDF. Intenta de nuevo.",
      );
    } finally {
      setPdfLoading(false);
    }
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

      {plantasAssets ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <button
            type="button"
            onClick={() => setPlantasOpen((open) => !open)}
            className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-[#14453D] transition hover:bg-slate-100"
            aria-expanded={plantasOpen}
          >
            <span>
              {plantasOpen
                ? "Ocultar planta arquitectónica"
                : plantasAssets.roofSrc
                  ? "Ver planta y roof garden"
                  : "Ver planta arquitectónica"}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition ${plantasOpen ? "rotate-180" : ""}`}
              strokeWidth={2.25}
            />
          </button>
          {plantasOpen ? (
            <div
              className={`mt-3 grid gap-3 ${
                plantasAssets.roofSrc ? "sm:grid-cols-2" : "justify-items-center"
              }`}
            >
              <figure className="w-full max-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:max-w-[240px]">
                <figcaption className="border-b border-slate-100 bg-white px-2.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Planta · {simulacion.unidad}
                </figcaption>
                <div className="flex h-44 items-center justify-center p-2 sm:h-48">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={plantasAssets.plantaSrc}
                    alt={`Planta arquitectónica ${simulacion.unidad}`}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </figure>
              {plantasAssets.roofSrc ? (
                <figure className="w-full max-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:max-w-[240px] sm:justify-self-stretch">
                  <figcaption className="border-b border-slate-100 bg-white px-2.5 py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Roof garden
                  </figcaption>
                  <div className="flex h-44 items-center justify-center p-2 sm:h-48">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={plantasAssets.roofSrc}
                      alt={`Roof garden ${simulacion.unidad}`}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </figure>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

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

      {esquemaLocal === "msi" ? (
        <label className="block max-w-xs">
          <FieldLabel>Número de mensualidades</FieldLabel>
          <input
            type="number"
            inputMode="numeric"
            min={MISION_LA_GAVIA_MSI_DEFAULTS.minMensualidades}
            max={MISION_LA_GAVIA_MSI_DEFAULTS.maxMensualidades}
            step={1}
            value={msiMensualidadesLocal}
            onChange={(event) => handleMsiMensualidades(Number(event.target.value))}
            className="input-cotizador"
          />
          <p className="mt-1.5 text-[11px] text-slate-500">
            Escribe cuántas mensualidades quiere el cliente (antes 6MSI / 12MSI).
            Rango {MISION_LA_GAVIA_MSI_DEFAULTS.minMensualidades}–
            {MISION_LA_GAVIA_MSI_DEFAULTS.maxMensualidades}.
          </p>
        </label>
      ) : null}

      <DescuentoEspecialField
        asesorRol={asesorRol}
        value={descuentoEspecialPct}
        onChange={setDescuentoEspecialPct}
        accent="gavia"
      />

      {esquemaLocal === "libre" ? (
        <div className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#5B8A7D]/20 sm:grid-cols-2">
          <div className="space-y-3">
            <PercentSlider
              label="Enganche"
              value={libreEnganche}
              min={0.15}
              max={1}
              step={0.01}
              onChange={onLibreEngancheChange ? handleLibreEngancheChange : undefined}
            />
            <MoneyAmountInput
              label="Monto enganche"
              amount={simulacion.enganche}
              onAmountChange={puedeEditarMontosLibre ? syncLibreEngancheFromAmount : undefined}
            />
          </div>
          <div className="space-y-3">
            <PercentSlider
              label="Mensualidades"
              value={Math.min(libreMensualidades, libreMensualidadesMax)}
              min={0}
              max={libreMensualidadesMax}
              step={0.01}
              onChange={
                onLibreMensualidadesChange && libreMensualidadesMax > 0
                  ? handleLibreMensualidadesChange
                  : undefined
              }
            />
            {simulacion.mensualidad && libreMensualidadesMax > 0 ? (
              <MoneyAmountInput
                label="Monto mensualidad"
                amount={simulacion.mensualidad}
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
              min={toISODate(new Date())}
              max={toISODate(fechaEntregaDefault)}
              value={libreFechaFiniquito ?? toISODate(fechaEntregaDefault)}
              onChange={(event) => onLibreFechaFiniquitoChange?.(event.target.value)}
              disabled={!onLibreFechaFiniquitoChange}
              className="input-cotizador"
            />
          </label>
          <div className="sm:col-span-2">
            <MoneyAmountInput
              label={`Finiquito (${formatPctShort(Math.max(0, 1 - libreEnganche - libreMensualidades))})`}
              amount={simulacion.finiquito ?? 0}
              onAmountChange={puedeEditarMontosLibre ? syncLibreFiniquitoFromAmount : undefined}
              helper="Finiquito puede ser 0% si enganche + mensualidades suman 100%."
            />
          </div>
        </div>
      ) : null}

      {simulacion.error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {simulacion.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <MetricCard label="Precio lista" value={formatPrice(simulacion.precioLista)} variant="accent" />
        <MetricCard
          label="Descuento vs lista"
          value={formatPctShort(simulacion.descuentoVsListaPct)}
          helper={
            descuentoEspecialPct > 0
              ? `Incluye especial ${formatPctShort(descuentoEspecialPct)}`
              : undefined
          }
        />
      </div>

      <MetricCard
        label={`Total ${simulacion.esquemaLabel}`}
        value={formatPrice(simulacion.precioTotal)}
        variant="hero"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={`Enganche ${formatPctShort(simulacion.enganchePct)}`}
          value={formatPrice(simulacion.enganche)}
          helper={
            simulacion.precioContado
              ? `Contado ${formatPrice(simulacion.precioContado)}`
              : undefined
          }
        />
        {simulacion.mensualidad && simulacion.numMensualidades ? (
          <MetricCard
            label={`${simulacion.numMensualidades} pagos`}
            value={formatPrice(simulacion.mensualidad)}
            helper={rangoMensualidades}
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

      {calendarioPagos.length > 0 ? (
        <div className="space-y-3">
          <label className="block max-w-sm">
            <FieldLabel>Día de pago (enganche y mensualidades)</FieldLabel>
            <select
              value={diaPago}
              onChange={(event) => setDiaPago(event.target.value as MisionLaGaviaDiaPago)}
              className="input-cotizador"
            >
              <option value="fin-mes">Último día de cada mes</option>
              <option value="dia-15">Día 15 de cada mes</option>
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500">
              Enganche y mensualidades: {labelDiaPagoMisionLaGavia(diaPago)}. Finiquito según
              entrega.
            </p>
          </label>
          <CalendarioPagosGavia
            filas={calendarioPagos}
            titulo={`Plan de pagos — ${simulacion.esquemaLabel}`}
          />
        </div>
      ) : null}

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

      {showCopy || showPdf ? (
        <div className={`grid gap-2 ${showCopy && showPdf ? "sm:grid-cols-2" : ""}`}>
          {showPdf ? (
            <button
              type="button"
              disabled={pdfLoading || Boolean(simulacion.error)}
              onClick={() => void handleDownloadPdf()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#14453D]/20 bg-white px-5 text-sm font-bold text-[#14453D] transition hover:bg-[#14453D]/5 disabled:opacity-50 sm:min-h-14 sm:text-base"
            >
              {pdfLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
                  Generando PDF…
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 sm:h-5 sm:w-5" />
                  Descargar PDF / enviar a prospecto
                </>
              )}
            </button>
          ) : null}
          {showCopy ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#14453D] px-5 text-sm font-bold text-white transition hover:bg-[#0f332d] active:scale-[0.99] sm:min-h-14 sm:text-base ${
                showPdf ? "" : ""
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
                  Copiar cotización para WhatsApp / CRM
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function fmtFechaPago(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

function CalendarioPagosGavia({
  filas,
  titulo,
}: {
  filas: MisionLaGaviaFilaPago[];
  titulo: string;
}) {
  const totalPagado = filas.reduce((sum, fila) => sum + fila.pagoTotal, 0);

  return (
    <div className="mt-2">
      <div className="mb-3">
        <h3 className="text-base font-bold text-[#14453D]">{titulo}</h3>
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[420px] border-collapse text-left text-[12px]">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2.5 font-medium">No.</th>
              <th className="px-3 py-2.5 font-medium">Mes</th>
              <th className="px-3 py-2.5 font-medium">Concepto</th>
              <th className="px-3 py-2.5 text-right font-medium">Pago total</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr
                key={`${fila.tipo}-${fila.numero}`}
                className={`border-b border-slate-100 ${
                  fila.tipo === "enganche"
                    ? "bg-amber-50/50"
                    : fila.tipo === "finiquito"
                      ? "bg-emerald-50/40"
                      : ""
                }`}
              >
                <td className="px-3 py-2 tabular-nums text-slate-500">{fila.numero}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtFechaPago(fila.fechaPago)}</td>
                <td className="px-3 py-2 text-slate-600">{fila.concepto}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-[#14453D]">
                  {formatPrice(fila.pagoTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-medium">
              <td colSpan={3} className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-slate-500">
                Total
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-[#14453D]">
                {formatPrice(totalPagado)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

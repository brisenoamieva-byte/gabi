"use client";

import { Printer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAmountInput, formatPrice, parseMoneyInput } from "@/lib/format/money";
import { investtiCatalogDesarrollos } from "@/lib/catalog/investti-desarrollos";
import {
  filasProspectoToPrint,
  labelAportacionCadaMeses,
  saveInvesttiSimuladorPrintSnapshot,
} from "@/lib/corredor/investti-simulador-print";
import { setInvesttiSimuladorConfigData } from "@/lib/corredor/investti-simulador-config-store";
import type { InvesttiSimuladorConfigData } from "@/lib/corredor/investti-simulador-data-types";
import {
  createCalendarioPagoDefault,
  formatInvesttiEntrega,
  getInvesttiEsquemasVenta,
  getInvesttiReglas,
  isInvesttiSimuladorDesarrollo,
  labelDiaPagosSubsecuentes,
  parseFechaPrimerPagoISO,
  simularLoteInvestti,
  simularPlanPersonalizadoInvestti,
  calcResumenDescuentoInvestti,
  pagoMotorDesdeProspecto,
  toFechaPrimerPagoISO,
  INVESTTI_TIPOS_COMPRA,
  INVESTTI_APORTACION_AL_FINAL,
  INVESTTI_PLAZO_MAX_CREDITO_MESES,
  getEngancheDiferidoMaxInvestti,
  getPlazoMaxPlanInvestti,
  isInvesttiTipoCredito,
  labelInvesttiTipoCompra,
  type InvesttiCalendarioPago,
  type InvesttiTipoCompra,
  type InvesttiDiaPagoSubsecuente,
  type InvesttiAmortizacionFila,
  type InvesttiEsquemaId,
  type InvesttiEsquemaResult,
  type InvesttiLoteRecord,
  toFilasProspecto,
  type InvesttiFilaProspecto,
  type InvesttiPlanPersonalizadoResult,
  type InvesttiResumenDescuento,
} from "@/lib/corredor/investti-simulador";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";
import { InvesttiAutorizacionesEspeciales } from "@/components/corredor/investti/InvesttiAutorizacionesEspeciales";
import { InvesttiDesarrolloLogo } from "@/components/corredor/investti/InvesttiDesarrolloLogo";
import { evaluarAutorizacionesInvestti } from "@/lib/corredor/investti-autorizaciones";
import type { ReactNode } from "react";

type InvesttiSimuladorPanelProps = {
  desarrolloId: string;
  /** Estilo memo Investti vs. ficha corredor */
  presentation?: "corredor" | "report";
};

type SimuladorApiPayload = {
  config: InvesttiSimuladorConfigData;
  lotes: InvesttiLoteRecord[];
  meta?: { source: string; updatedAt: string; origin: string };
};

type SimuladorTab = "esquemas" | "propuesta";

export function InvesttiSimuladorPanel({
  desarrolloId,
  presentation = "corredor",
}: InvesttiSimuladorPanelProps) {
  const [lotes, setLotes] = useState<InvesttiLoteRecord[] | null>(null);
  const [configReady, setConfigReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manzana, setManzana] = useState("");
  const [loteId, setLoteId] = useState("");
  const [esquemaAmortId, setEsquemaAmortId] = useState<InvesttiEsquemaId>("m24");
  const [tab, setTab] = useState<SimuladorTab>("esquemas");
  const [enganchePct, setEnganchePct] = useState(30);
  const [engancheDiferido, setEngancheDiferido] = useState(1);
  const [plazoPropuesta, setPlazoPropuesta] = useState(24);
  const [aportacionCada, setAportacionCada] = useState(1);
  const [mensualidadDeseada, setMensualidadDeseada] = useState(0);
  const [descuentoEspecialPct, setDescuentoEspecialPct] = useState(0);
  const [mostrarCampoDescuento, setMostrarCampoDescuento] = useState(false);
  const [pagosEditados, setPagosEditados] = useState<Record<number, number>>({});
  const [fechaPrimerPagoISO, setFechaPrimerPagoISO] = useState(() =>
    toFechaPrimerPagoISO(createCalendarioPagoDefault().fechaPrimerPago),
  );
  const [diaPagosSubsecuentes, setDiaPagosSubsecuentes] =
    useState<InvesttiDiaPagoSubsecuente>("dia-15");
  const [tipoCompra, setTipoCompra] = useState<InvesttiTipoCompra>("recursos-propios");

  const reglas = configReady ? getInvesttiReglas(desarrolloId) : undefined;
  const esquemasVenta = useMemo(
    () => (configReady ? getInvesttiEsquemasVenta() : []),
    [configReady],
  );

  useEffect(() => {
    if (!configReady) return;
    const r = getInvesttiReglas(desarrolloId);
    if (r) {
      setEnganchePct(Math.max(30, Math.round(r.engancheMinPct * 100)));
      setPlazoPropuesta(Math.min(24, r.plazoMaxMeses));
      setPagosEditados({});
      setMensualidadDeseada(0);
      setDescuentoEspecialPct(0);
      setMostrarCampoDescuento(false);
    }
  }, [desarrolloId, configReady]);

  useEffect(() => {
    if (!isInvesttiSimuladorDesarrollo(desarrolloId)) return;
    let cancelled = false;
    setConfigReady(false);
    setLotes(null);
    fetch("/api/catalog/investti-simulador")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar lista de precios");
        return r.json() as Promise<SimuladorApiPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        setInvesttiSimuladorConfigData(data.config);
        setConfigReady(true);
        const slugExcel = data.config.slugDesarrollo[desarrolloId];
        const filtered = data.lotes.filter((l) => l.desarrollo === slugExcel);
        setLotes(filtered);
        if (filtered.length > 0) {
          setManzana(filtered[0].manzana);
          setLoteId(filtered[0].lote);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar datos");
      });
    return () => {
      cancelled = true;
    };
  }, [desarrolloId]);

  const manzanas = useMemo(() => {
    if (!lotes) return [];
    return Array.from(new Set(lotes.map((l) => l.manzana))).sort();
  }, [lotes]);

  const lotesManzana = useMemo(() => {
    if (!lotes || !manzana) return [];
    return lotes
      .filter((l) => l.manzana === manzana)
      .sort((a, b) => Number(a.lote) - Number(b.lote));
  }, [lotes, manzana]);

  const loteSel = useMemo(
    () => lotesManzana.find((l) => l.lote === loteId) ?? lotesManzana[0] ?? null,
    [lotesManzana, loteId],
  );

  const calendarioPago = useMemo((): InvesttiCalendarioPago | null => {
    const fecha = parseFechaPrimerPagoISO(fechaPrimerPagoISO);
    if (!fecha) return null;
    return { fechaPrimerPago: fecha, diaPagosSubsecuentes };
  }, [fechaPrimerPagoISO, diaPagosSubsecuentes]);

  const simulacion = useMemo(() => {
    if (!loteSel || !calendarioPago) return null;
    return simularLoteInvestti(loteSel, {
      calendario: calendarioPago,
    });
  }, [loteSel, calendarioPago]);

  const esquemaAmort = useMemo(() => {
    if (!simulacion) return null;
    return simulacion.esquemas.find((e) => e.id === esquemaAmortId) ?? null;
  }, [simulacion, esquemaAmortId]);

  const planPersonalizado = useMemo(() => {
    if (!simulacion || !calendarioPago) return null;
    return simularPlanPersonalizadoInvestti(desarrolloId, {
      precioContado: simulacion.precioContado,
      enganchePct: enganchePct / 100,
      engancheDiferidoMeses: engancheDiferido,
      plazoMeses: plazoPropuesta,
      aportacionCadaMeses: aportacionCada,
      mensualidadDeseada: mensualidadDeseada > 0 ? mensualidadDeseada : undefined,
      pagosEditados,
      calendario: calendarioPago,
      tipoCompra,
    });
  }, [
    simulacion,
    calendarioPago,
    desarrolloId,
    enganchePct,
    engancheDiferido,
    plazoPropuesta,
    aportacionCada,
    mensualidadDeseada,
    pagosEditados,
    tipoCompra,
  ]);

  const engancheDiferidoMax = getEngancheDiferidoMaxInvestti(tipoCompra);
  const plazoMaxPlan = getPlazoMaxPlanInvestti(desarrolloId, tipoCompra);

  const mensMinima =
    reglas && "mensualidadMinima" in reglas
      ? (reglas as { mensualidadMinima: number }).mensualidadMinima
      : 0;

  const descuentoFraccion = descuentoEspecialPct / 100;

  const resumenDescuento = useMemo(() => {
    const filas =
      tab === "propuesta" && planPersonalizado
        ? planPersonalizado.tablaAmortizacion
        : esquemaAmort?.tablaAmortizacion ?? [];
    return calcResumenDescuentoInvestti(filas, descuentoFraccion);
  }, [tab, planPersonalizado, esquemaAmort, descuentoFraccion]);

  const autorizaciones = useMemo(() => {
    if (tab === "propuesta" && planPersonalizado) {
      return evaluarAutorizacionesInvestti({
        desarrolloId,
        descuentoFraccion,
        plazoMeses: plazoPropuesta,
        mensualidadDeseada,
        aportacionCadaMeses: aportacionCada,
        aportacionDeseada: planPersonalizado.aportacionDeseada,
        tipoCompra,
      });
    }
    if (tab === "esquemas" && esquemaAmort) {
      return evaluarAutorizacionesInvestti({
        desarrolloId,
        descuentoFraccion,
        plazoMeses: esquemaAmort.plazoMeses,
        aportacionCadaMeses: 1,
        mensualidadEsquema: esquemaAmort.mensualidad,
        aportacionDeseada: esquemaAmort.mensualidad,
      });
    }
    return evaluarAutorizacionesInvestti({
      desarrolloId,
      descuentoFraccion,
      plazoMeses: 0,
    });
  }, [
    tab,
    planPersonalizado,
    esquemaAmort,
    desarrolloId,
    descuentoFraccion,
    plazoPropuesta,
    mensualidadDeseada,
    aportacionCada,
    tipoCompra,
  ]);

  const isReport = presentation === "report";
  const desarrolloNombre =
    investtiCatalogDesarrollos.find((d) => d.id === desarrolloId)?.nombre ?? desarrolloId;

  const handleExportPdf = useCallback(() => {
    if (!simulacion || !loteSel || !calendarioPago) return;

    const apartado = reglas?.apartado ?? 0;
    const filasProspecto =
      tab === "propuesta" && planPersonalizado
        ? toFilasProspecto(planPersonalizado.tablaAmortizacion, apartado, descuentoFraccion)
        : esquemaAmort
          ? toFilasProspecto(esquemaAmort.tablaAmortizacion, apartado, descuentoFraccion)
          : [];

    if (filasProspecto.length === 0) {
      window.alert(
        "No hay pagos para exportar. Elige un esquema con calendario o completa la propuesta del prospecto.",
      );
      return;
    }

    const entrega = formatInvesttiEntrega(loteSel.entrega);
    const tipoEntrega = `${loteSel.tipo}${entrega ? ` · ${entrega}` : ""}`;
    const reglasLine = `Enganche mín. ${Math.round((reglas?.engancheMinPct ?? 0.15) * 100)}% · plazo hasta ${reglas?.plazoMaxMeses ?? 60} meses${mensMinima > 0 ? ` · mens. mín. ${formatPrice(mensMinima)}` : ""}.`;

    const saved = saveInvesttiSimuladorPrintSnapshot({
      savedAt: new Date().toISOString(),
      desarrolloId,
      desarrolloNombre,
      tab,
      lote: {
        manzana: loteSel.manzana,
        lote: loteSel.lote,
        superficie: loteSel.superficie,
        tipo: loteSel.tipo,
        entrega: loteSel.entrega,
        precioLista: loteSel.precioLista,
      },
      precioContado: simulacion.precioContado,
      tipoEntrega,
      tipoCompra,
      tipoCompraLabel: labelInvesttiTipoCompra(tipoCompra),
      calendario: {
        fechaPrimerPagoISO: fechaPrimerPagoISO,
        diaPagosSubsecuentes,
        diaPagosLabel: labelDiaPagosSubsecuentes(diaPagosSubsecuentes),
      },
      apartado,
      descuentoEspecialPct,
      resumenDescuento: {
        totalSinDescuento: resumenDescuento.totalSinDescuento,
        totalConDescuento: resumenDescuento.totalConDescuento,
        requiereAutorizacion: resumenDescuento.requiereAutorizacion,
      },
      autorizaciones,
      reglasLine,
      esquemaAmort:
        tab === "esquemas" && esquemaAmort
          ? {
              label: esquemaAmort.label,
              descripcionPago: esquemaAmort.descripcionPago,
            }
          : undefined,
      propuesta:
        tab === "propuesta" && planPersonalizado
          ? {
              enganchePct,
              engancheDiferido,
              plazoMeses: plazoPropuesta,
              aportacionCadaMeses: aportacionCada,
              aportacionCadaLabel: labelAportacionCadaMeses(aportacionCada),
              mensualidadDeseada,
              engancheTotal: planPersonalizado.engancheTotal,
              aportacionDeseada: planPersonalizado.aportacionDeseada,
              montoMesAportacion: planPersonalizado.montoMesAportacion,
              totalPagado: planPersonalizado.totalPagado,
              errores: planPersonalizado.errores,
            }
          : undefined,
      filasProspecto: filasProspectoToPrint(filasProspecto),
      calendarioTitulo:
        tab === "propuesta"
          ? "Calendario de pagos — propuesta"
          : `Calendario de pagos — ${esquemaAmort?.label ?? "esquema"}`,
      calendarioDescripcion: `${filasProspecto.length} pagos · total ${formatPrice(filasProspecto.reduce((s, f) => s + f.pagoTotal, 0))} · vista prospecto.`,
    });

    if (!saved) {
      window.alert("No se pudo preparar el PDF. Intenta de nuevo o reduce el tamaño de la simulación.");
      return;
    }

    const printUrl = `/simulador-investti/print?ts=${Date.now()}`;
    const opened = window.open(printUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.alert(
        "El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio e intenta de nuevo.",
      );
    }
  }, [
    simulacion,
    loteSel,
    calendarioPago,
    tab,
    planPersonalizado,
    esquemaAmort,
    reglas,
    desarrolloId,
    desarrolloNombre,
    fechaPrimerPagoISO,
    diaPagosSubsecuentes,
    mensMinima,
    enganchePct,
    engancheDiferido,
    plazoPropuesta,
    aportacionCada,
    mensualidadDeseada,
    descuentoEspecialPct,
    descuentoFraccion,
    resumenDescuento,
    autorizaciones,
    tipoCompra,
  ]);

  const canExportPdf = Boolean(simulacion && loteSel && calendarioPago) && !isReport;

  const shell = isReport
    ? `border ${investtiReport.rule} bg-white`
    : "rounded-2xl border border-slate-200/90 bg-white shadow-sm";
  const pad = isReport ? "p-5 md:p-6" : "p-5 md:p-6";

  if (!isInvesttiSimuladorDesarrollo(desarrolloId)) {
    return null;
  }

  if (error) {
    return (
      <div className={`${shell} ${pad} text-sm text-red-700`}>
        {error}
      </div>
    );
  }

  if (!lotes || !configReady || !reglas) {
    return (
      <div className={`${shell} ${pad} text-sm text-neutral-500`}>
        Cargando simulador Investti…
      </div>
    );
  }

  return (
    <div className={`${shell} ${pad}`}>
      <header className="mb-5 flex flex-wrap items-start gap-4">
        <InvesttiDesarrolloLogo desarrolloId={desarrolloId} size="compact" />
        <div className="min-w-0 flex-1">
          <p
            className={
              isReport
                ? investtiReport.label
                : "text-[10px] font-bold uppercase tracking-wide text-slate-400"
            }
          >
            Simulador oficial Grupo Investti
          </p>
          <h2
            className={
              isReport
                ? `${investtiReport.serif} mt-1 text-xl text-[#1C1830]`
                : "mt-1 text-lg font-black"
            }
          >
            Esquemas de pago por lote
          </h2>
          <p
            className={`mt-2 text-[13px] leading-relaxed ${isReport ? "text-neutral-600" : "text-slate-600"}`}
          >
            Lista feb 2026 · enganche mínimo{" "}
            {Math.round((reglas?.engancheMinPct ?? 0.15) * 100)}% · plazo hasta{" "}
            {reglas?.plazoMaxMeses ?? 60} meses
            {mensMinima > 0 ? ` · mens. mín. ${formatPrice(mensMinima)}` : ""}.
          </p>
        </div>
        {canExportPdf ? (
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#201044]/15 bg-white px-4 py-2.5 text-[13px] font-semibold text-[#201044] shadow-sm transition hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Exportar PDF
          </button>
        ) : null}
      </header>

      <div
        className={`mb-5 inline-flex rounded-xl p-1 ${isReport ? "border border-neutral-200 bg-neutral-50" : "bg-slate-100"}`}
        role="tablist"
        aria-label="Vista del simulador"
      >
        {(
          [
            ["esquemas", "Esquemas estándar"],
            ["propuesta", "Propuesta del prospecto"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
              tab === id
                ? isReport
                  ? "bg-white text-[#201044] shadow-sm"
                  : "bg-white text-[#201044] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Manzana" isReport={isReport}>
          <select
            value={manzana}
            onChange={(e) => {
              setManzana(e.target.value);
              const first = lotes.find((l) => l.manzana === e.target.value);
              if (first) setLoteId(first.lote);
            }}
            className={inputClass(isReport)}
          >
            {manzanas.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lote" isReport={isReport}>
          <select
            value={loteSel?.lote ?? ""}
            onChange={(e) => setLoteId(e.target.value)}
            className={inputClass(isReport)}
          >
            {lotesManzana.map((l) => (
              <option key={l.key} value={l.lote}>
                {l.lote} · {l.tipo} · {l.superficie} m²
              </option>
            ))}
          </select>
        </Field>
        {loteSel ? (
          <>
            <Stat label="Superficie" value={`${loteSel.superficie} m²`} isReport={isReport} />
            <Stat label="Precio lista" value={formatPrice(loteSel.precioLista)} isReport={isReport} />
          </>
        ) : null}
      </div>

      <div
        className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isReport ? "mt-4" : "mt-4 rounded-xl border border-slate-200/80 bg-[#F2F0E9]/60 p-4"}`}
      >
        <Field label="Tipo de compra" isReport={isReport}>
          <select
            value={tipoCompra}
            onChange={(e) => {
              const next = e.target.value as InvesttiTipoCompra;
              setTipoCompra(next);
              const engMax = getEngancheDiferidoMaxInvestti(next);
              const plazoMax = getPlazoMaxPlanInvestti(desarrolloId, next);
              if (engancheDiferido > engMax) setEngancheDiferido(engMax);
              if (plazoPropuesta > plazoMax) setPlazoPropuesta(plazoMax);
              if (isInvesttiTipoCredito(next) && aportacionCada > INVESTTI_PLAZO_MAX_CREDITO_MESES) {
                setAportacionCada(1);
              }
            }}
            className={inputClass(isReport)}
          >
            {INVESTTI_TIPOS_COMPRA.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha del primer pago" isReport={isReport}>
          <input
            type="date"
            value={fechaPrimerPagoISO}
            onChange={(e) => setFechaPrimerPagoISO(e.target.value)}
            className={inputClass(isReport)}
          />
        </Field>
        <Field label="Pagos subsecuentes" isReport={isReport}>
          <select
            value={diaPagosSubsecuentes}
            onChange={(e) =>
              setDiaPagosSubsecuentes(e.target.value as InvesttiDiaPagoSubsecuente)
            }
            className={inputClass(isReport)}
          >
            <option value="dia-15">Día 15 de cada mes</option>
            <option value="fin-mes">Último día de cada mes</option>
          </select>
          <p className={`mt-1.5 text-[11px] ${isReport ? "text-neutral-500" : "text-slate-500"}`}>
            El primer pago usa la fecha indicada; los siguientes caen en{" "}
            {labelDiaPagosSubsecuentes(diaPagosSubsecuentes)}.
          </p>
        </Field>
      </div>

      {simulacion ? (
        <>
          <div
            className={`mt-4 grid gap-3 sm:grid-cols-2 ${isReport ? "" : "rounded-xl bg-[#F2F0E9] p-4"}`}
          >
            <Stat
              label="Precio contado (−8.99%)"
              value={formatPrice(simulacion.precioContado)}
              isReport={isReport}
              highlight
            />
            <Stat
              label="Tipo / entrega"
              value={(() => {
                const entrega = formatInvesttiEntrega(loteSel!.entrega);
                return `${loteSel!.tipo}${entrega ? ` · ${entrega}` : ""}`;
              })()}
              isReport={isReport}
            />
          </div>

          <DescuentoEspecialAsesor
            isReport={isReport}
            descuentoEspecialPct={descuentoEspecialPct}
            mostrarCampo={mostrarCampoDescuento}
            resumenDescuento={resumenDescuento}
            onToggleCampo={() => setMostrarCampoDescuento((v) => !v)}
            onDescuentoChange={setDescuentoEspecialPct}
            onQuitarDescuento={() => {
              setDescuentoEspecialPct(0);
              setMostrarCampoDescuento(false);
            }}
          />

          <InvesttiAutorizacionesEspeciales autorizaciones={autorizaciones} />

          {tab === "propuesta" && planPersonalizado ? (
            <PlanPersonalizadoSection
              isReport={isReport}
              reglas={reglas}
              tipoCompra={tipoCompra}
              engancheDiferidoMax={engancheDiferidoMax}
              plazoMaxPlan={plazoMaxPlan}
              mensMinima={mensMinima}
              enganchePct={enganchePct}
              engancheDiferido={engancheDiferido}
              plazoPropuesta={plazoPropuesta}
              aportacionCada={aportacionCada}
              mensualidadDeseada={mensualidadDeseada}
              plan={planPersonalizado}
              descuentoFraccion={descuentoFraccion}
              resumenDescuento={resumenDescuento}
              onEnganchePctChange={setEnganchePct}
              onEngancheDiferidoChange={setEngancheDiferido}
              onPlazoChange={setPlazoPropuesta}
              onAportacionCadaChange={setAportacionCada}
              onMensualidadDeseadaChange={(v) => {
                setMensualidadDeseada(v);
                setPagosEditados({});
              }}
              onPagoEditado={(mes, monto) => {
                const fila = planPersonalizado.tablaAmortizacion.find((f) => f.numero === mes);
                const montoMotor =
                  fila && descuentoFraccion > 0
                    ? pagoMotorDesdeProspecto(
                        fila,
                        monto,
                        resumenDescuento.factorMensAport,
                      )
                    : monto;
                setPagosEditados((prev) => {
                  const next = { ...prev };
                  if (montoMotor <= 0) delete next[mes];
                  else next[mes] = montoMotor;
                  return next;
                });
              }}
              onResetPagos={() => setPagosEditados({})}
              tienePagosEditados={Object.keys(pagosEditados).length > 0}
            />
          ) : null}

          {tab === "esquemas" ? (
          <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr
                  className={`border-b text-[11px] uppercase tracking-wide ${isReport ? "border-neutral-200 text-neutral-500" : "border-slate-200 text-slate-400"}`}
                >
                  <th className="py-2 pr-3 font-medium">Esquema</th>
                  <th className="py-2 pr-3 font-medium">Descuento*</th>
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 pr-3 font-medium">Enganche</th>
                  <th className="py-2 pr-3 font-medium">Mensualidad</th>
                  <th className="py-2 font-medium">$/m²</th>
                </tr>
              </thead>
              <tbody>
                {simulacion.esquemas
                  .filter((e) => esquemasVenta.some((s) => s.id === e.id))
                  .map((e) => (
                    <EsquemaRow
                      key={e.id}
                      esquema={e}
                      isReport={isReport}
                      selected={esquemaAmortId === e.id}
                      onSelect={() => setEsquemaAmortId(e.id)}
                    />
                  ))}
              </tbody>
            </table>
          </div>

          {esquemaAmort && esquemaAmort.tablaAmortizacion.length > 0 ? (
            <TablaAmortizacion
              esquema={esquemaAmort}
              filas={esquemaAmort.tablaAmortizacion}
              apartado={reglas?.apartado ?? 0}
              descuentoFraccion={descuentoFraccion}
              diaPagosSubsecuentes={diaPagosSubsecuentes}
              isReport={isReport}
            />
          ) : null}
          </>
          ) : null}
        </>
      ) : null}

      <footer className={`mt-6 border-t pt-4 text-[11px] leading-relaxed ${isReport ? "border-neutral-200 text-neutral-500" : "border-slate-100 text-slate-500"}`}>
        <p>*Descuento sobre precio de lista. Negativo = recargo por plazo largo.</p>
        <p className="mt-2">
          Vigencia 5 días hábiles. Apartado {formatPrice(reglas?.apartado ?? 50000)}.
          Solo referencia; no es preaprobación.
        </p>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
  isReport,
}: {
  label: string;
  children: ReactNode;
  isReport: boolean;
}) {
  return (
    <label className="block">
      <span
        className={
          isReport ? investtiReport.label : "text-[10px] font-bold uppercase text-slate-400"
        }
      >
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function DescuentoEspecialAsesor({
  isReport,
  descuentoEspecialPct,
  mostrarCampo,
  resumenDescuento,
  onToggleCampo,
  onDescuentoChange,
  onQuitarDescuento,
}: {
  isReport: boolean;
  descuentoEspecialPct: number;
  mostrarCampo: boolean;
  resumenDescuento: InvesttiResumenDescuento;
  onToggleCampo: () => void;
  onDescuentoChange: (pct: number) => void;
  onQuitarDescuento: () => void;
}) {
  if (!mostrarCampo) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={onToggleCampo}
          className={`text-[12px] font-semibold underline-offset-2 hover:underline ${
            isReport ? "text-neutral-500" : "text-slate-500"
          }`}
        >
          {descuentoEspecialPct > 0 ? "Editar ajuste comercial" : "Ajuste comercial"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`mt-4 ${isReport ? "" : "rounded-xl border border-slate-200/80 bg-white p-4"}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className={`text-[12px] font-semibold ${isReport ? "text-neutral-700" : "text-slate-700"}`}>
          Ajuste comercial (solo asesor)
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onToggleCampo}
            className={`text-[11px] font-semibold underline-offset-2 hover:underline ${
              isReport ? "text-neutral-600" : "text-slate-500"
            }`}
          >
            Ocultar
          </button>
          {descuentoEspecialPct > 0 ? (
            <button
              type="button"
              onClick={onQuitarDescuento}
              className={`text-[11px] font-semibold underline-offset-2 hover:underline ${
                isReport ? "text-neutral-600" : "text-slate-500"
              }`}
            >
              Quitar
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Descuento (%)" isReport={isReport}>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={descuentoEspecialPct || ""}
            onChange={(e) => onDescuentoChange(Math.max(0, Number(e.target.value) || 0))}
            className={inputClass(isReport)}
            placeholder="0"
          />
          <p className={`mt-1.5 text-[11px] ${isReport ? "text-neutral-500" : "text-slate-500"}`}>
            Afecta mensualidades y aportaciones; el enganche no cambia.
          </p>
        </Field>
        {descuentoEspecialPct > 0 ? (
          <>
            <Stat
              label="Total sin ajuste"
              value={formatPrice(resumenDescuento.totalSinDescuento)}
              isReport={isReport}
            />
            <Stat
              label="Total con ajuste"
              value={formatPrice(resumenDescuento.totalConDescuento)}
              isReport={isReport}
              highlight
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  isReport,
  highlight = false,
}: {
  label: string;
  value: string;
  isReport: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={highlight && !isReport ? "rounded-xl bg-[#6cc24a]/15 p-3" : ""}>
      <p className={isReport ? investtiReport.label : "text-[10px] font-bold uppercase text-slate-400"}>
        {label}
      </p>
      <p
        className={`mt-1 tabular-nums ${isReport ? `${investtiReport.serif} text-lg` : "text-base font-black"}`}
      >
        {value}
      </p>
    </div>
  );
}

function EsquemaRow({
  esquema,
  isReport,
  selected,
  onSelect,
}: {
  esquema: InvesttiEsquemaResult;
  isReport: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const desc =
    esquema.descuentoVsListaPct >= 0
      ? `${esquema.descuentoVsListaPct.toFixed(2)}%`
      : `${esquema.descuentoVsListaPct.toFixed(2)}%`;
  return (
    <tr
      className={`border-b cursor-pointer transition-colors ${isReport ? "border-neutral-100" : "border-slate-100"} ${selected ? (isReport ? "bg-neutral-50" : "bg-[#6cc24a]/10") : "hover:bg-neutral-50/80"}`}
      onClick={onSelect}
    >
      <td className="py-2.5 pr-3 font-medium">{esquema.label}</td>
      <td className="py-2.5 pr-3 tabular-nums">{desc}</td>
      <td className="py-2.5 pr-3 tabular-nums">{formatPrice(esquema.total)}</td>
      <td className="py-2.5 pr-3 tabular-nums">
        {esquema.id === "contado"
          ? formatPrice(esquema.engancheTotal)
          : `${Math.round(esquema.enganchePct * 100)}% · ${formatPrice(esquema.engancheTotal)}`}
      </td>
      <td className="py-2.5 pr-3 tabular-nums">
        {esquema.mensualidad > 0 ? formatPrice(esquema.mensualidad) : "—"}
      </td>
      <td className="py-2.5 tabular-nums">{formatPrice(esquema.precioM2).replace(".00", "")}</td>
    </tr>
  );
}

function inputClass(isReport: boolean) {
  return isReport
    ? "w-full border border-neutral-300 bg-white px-3 py-2 text-[13px]"
    : "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";
}

function InvesttiMoneyInput({
  amount,
  onAmountChange,
  placeholder = "",
  isReport,
  className,
}: {
  amount: number;
  onAmountChange: (amount: number) => void;
  placeholder?: string;
  isReport: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState(() => formatAmountInput(amount));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatAmountInput(amount));
    }
  }, [amount, focused]);

  const handleChange = (raw: string) => {
    setDraft(raw.replace(/[^\d,.\s]/g, ""));
  };

  const commit = () => {
    const parsed = parseMoneyInput(draft);
    if (parsed === null || !draft.trim()) {
      onAmountChange(0);
      setDraft("");
      return;
    }
    onAmountChange(parsed);
    setDraft(formatAmountInput(parsed));
  };

  return (
    <div className="relative">
      <span
        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-bold ${isReport ? "text-[12px] text-neutral-400" : "text-sm text-slate-400"}`}
      >
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className={`${className ?? inputClass(isReport)} pl-7 tabular-nums`}
      />
    </div>
  );
}

function fmtFecha(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

function PlanPersonalizadoSection({
  isReport,
  reglas,
  tipoCompra,
  engancheDiferidoMax,
  plazoMaxPlan,
  mensMinima,
  enganchePct,
  engancheDiferido,
  plazoPropuesta,
  aportacionCada,
  mensualidadDeseada,
  plan,
  descuentoFraccion,
  resumenDescuento,
  onEnganchePctChange,
  onEngancheDiferidoChange,
  onPlazoChange,
  onAportacionCadaChange,
  onMensualidadDeseadaChange,
  onPagoEditado,
  onResetPagos,
  tienePagosEditados,
}: {
  isReport: boolean;
  reglas: ReturnType<typeof getInvesttiReglas>;
  tipoCompra: InvesttiTipoCompra;
  engancheDiferidoMax: number;
  plazoMaxPlan: number;
  mensMinima: number;
  enganchePct: number;
  engancheDiferido: number;
  plazoPropuesta: number;
  aportacionCada: number;
  mensualidadDeseada: number;
  plan: InvesttiPlanPersonalizadoResult;
  descuentoFraccion: number;
  resumenDescuento: InvesttiResumenDescuento;
  onEnganchePctChange: (v: number) => void;
  onEngancheDiferidoChange: (v: number) => void;
  onPlazoChange: (v: number) => void;
  onAportacionCadaChange: (v: number) => void;
  onMensualidadDeseadaChange: (v: number) => void;
  onPagoEditado: (mes: number, monto: number) => void;
  onResetPagos: () => void;
  tienePagosEditados: boolean;
}) {
  const engMinPct = Math.round((reglas?.engancheMinPct ?? 0.15) * 100);
  const aportacionCadaMax = isInvesttiTipoCredito(tipoCompra)
    ? INVESTTI_PLAZO_MAX_CREDITO_MESES
    : 12;
  const aportacionOpciones = [
    { meses: 1, label: "1 — mensual" },
    { meses: 3, label: "3 — trimestral" },
    { meses: 6, label: "6 — semestral" },
    { meses: 12, label: "12 — anual" },
    { meses: INVESTTI_APORTACION_AL_FINAL, label: "final — al término del plazo" },
  ].filter(
    (o) =>
      o.meses === INVESTTI_APORTACION_AL_FINAL || o.meses <= aportacionCadaMax,
  );
  const filaMesAport = plan.tablaAmortizacion.find(
    (f) => (f.aportacionProgramada ?? 0) > 0.01 || f.tipo === "aportacion",
  );
  const montoMesAportacionDisplay =
    descuentoFraccion > 0 && filaMesAport
      ? toFilasProspecto(plan.tablaAmortizacion, 0, descuentoFraccion).find(
          (f) => f.mesCalendario === filaMesAport.numero,
        )?.pagoTotal ?? plan.montoMesAportacion
      : plan.montoMesAportacion;

  return (
    <div className="mt-6">
      <h3
        className={
          isReport
            ? `${investtiReport.serif} text-[1.05rem] text-[#1C1830]`
            : "text-base font-bold text-[#201044]"
        }
      >
        Plan propuesto por el prospecto
      </h3>
      <p className={`mt-1 text-[12px] ${isReport ? "text-neutral-600" : "text-slate-600"}`}>
        Ingresa enganche, plazo y aportaciones como en el Excel «llenado amortización». Deja
        mensualidad en 0 para calcular la aportación automática.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={`Enganche (%) · mín. ${engMinPct}%`} isReport={isReport}>
          <input
            type="number"
            min={engMinPct}
            max={100}
            step={1}
            value={enganchePct}
            onChange={(e) => onEnganchePctChange(Number(e.target.value))}
            className={inputClass(isReport)}
          />
        </Field>
        <Field label={`Enganche diferido (meses) · máx. ${engancheDiferidoMax}`} isReport={isReport}>
          <input
            type="number"
            min={1}
            max={engancheDiferidoMax}
            value={engancheDiferido}
            onChange={(e) => onEngancheDiferidoChange(Number(e.target.value))}
            className={inputClass(isReport)}
          />
        </Field>
        <Field label={`Plazo (meses) · máx. ${plazoMaxPlan}`} isReport={isReport}>
          <input
            type="number"
            min={1}
            max={plazoMaxPlan}
            value={plazoPropuesta}
            onChange={(e) => onPlazoChange(Number(e.target.value))}
            className={inputClass(isReport)}
          />
        </Field>
        <Field label="Aportación cada (meses)" isReport={isReport}>
          <select
            value={aportacionCada}
            onChange={(e) => onAportacionCadaChange(Number(e.target.value))}
            className={inputClass(isReport)}
          >
            {aportacionOpciones.map((o) => (
              <option key={o.meses} value={o.meses}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={`Mensualidad deseada${mensMinima > 0 ? ` · mín. ${formatPrice(mensMinima)}` : ""}`}
          isReport={isReport}
        >
          <InvesttiMoneyInput
            amount={mensualidadDeseada}
            onAmountChange={onMensualidadDeseadaChange}
            placeholder="Automática"
            isReport={isReport}
          />
          <p className={`mt-1.5 text-[11px] ${isReport ? "text-neutral-500" : "text-slate-500"}`}>
            {aportacionCada === INVESTTI_APORTACION_AL_FINAL
              ? "Con mensualidad en 0, todo el saldo se liquida en el último mes del plazo."
              : aportacionCada > 1
                ? "La mensualidad se aplica cada mes; las aportaciones extra se calculan en la periodicidad elegida para cerrar en $0."
                : "Captura la mensualidad del prospecto. Si queda vacío, se usa la aportación calculada para cerrar en $0."}
          </p>
        </Field>
        {aportacionCada !== 1 || mensualidadDeseada <= 0 ? (
          <div>
            <Stat
              label={
                mensualidadDeseada > 0
                  ? "Pago en mes de aportación"
                  : "Aportación calculada (automática)"
              }
              value={formatPrice(montoMesAportacionDisplay)}
              isReport={isReport}
              highlight={mensualidadDeseada <= 0}
            />
            {mensualidadDeseada > 0 && plan.aportacionDeseada > 0 ? (
              <p className={`mt-1.5 text-[11px] ${isReport ? "text-neutral-500" : "text-slate-500"}`}>
                {formatPrice(
                  descuentoFraccion > 0
                    ? mensualidadDeseada * resumenDescuento.factorMensAport
                    : mensualidadDeseada,
                )}{" "}
                mensualidad +{" "}
                {formatPrice(
                  descuentoFraccion > 0
                    ? plan.aportacionDeseada * resumenDescuento.factorMensAport
                    : plan.aportacionDeseada,
                )}{" "}
                aportación extra
              </p>
            ) : null}
          </div>
        ) : (
          <Stat
            label="Modo de pago"
            value="Solo mensualidad"
            isReport={isReport}
          />
        )}
      </div>

      <div
        className={`mt-4 grid gap-3 sm:grid-cols-2 ${isReport ? "" : "rounded-xl bg-[#F2F0E9] p-4"}`}
      >
        <Stat label="Enganche total" value={formatPrice(plan.engancheTotal)} isReport={isReport} />
        <Stat
          label="Total pagado (simulación)"
          value={formatPrice(
            descuentoFraccion > 0
              ? resumenDescuento.totalConDescuento
              : plan.totalPagado,
          )}
          isReport={isReport}
        />
      </div>

      {plan.errores.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-800">
          {plan.errores.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      {plan.advertencias.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          {plan.advertencias.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      ) : null}

      <TablaAmortizacionEditable
        filas={plan.tablaAmortizacion}
        apartado={reglas?.apartado ?? 0}
        descuentoFraccion={descuentoFraccion}
        isReport={isReport}
        onPagoEditado={onPagoEditado}
        onResetPagos={onResetPagos}
        tieneEdiciones={tienePagosEditados}
      />
    </div>
  );
}

function TablaAmortizacionProspecto({
  filas,
  isReport,
  titulo,
  descripcion,
  apartado,
  editable,
  onPagoEditado,
  onResetPagos,
  tieneEdiciones,
}: {
  filas: InvesttiFilaProspecto[];
  isReport: boolean;
  titulo: string;
  descripcion: string;
  apartado: number;
  editable?: boolean;
  onPagoEditado?: (mesCalendario: number, monto: number) => void;
  onResetPagos?: () => void;
  tieneEdiciones?: boolean;
}) {
  const totalPagado = filas.reduce((s, f) => s + f.pagoTotal, 0);
  const muestraApartado = apartado > 0 && filas.some((f) => f.apartado !== undefined);

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3
            className={
              isReport
                ? `${investtiReport.serif} text-[1.05rem] text-[#1C1830]`
                : "text-base font-bold text-[#201044]"
            }
          >
            {titulo}
          </h3>
          <p className={`mt-1 text-[12px] ${isReport ? "text-neutral-600" : "text-slate-600"}`}>
            {descripcion}
          </p>
        </div>
        {editable && tieneEdiciones && onResetPagos ? (
          <button
            type="button"
            onClick={onResetPagos}
            className="text-[12px] font-semibold text-[#201044] underline-offset-2 hover:underline"
          >
            Restablecer pagos editados
          </button>
        ) : null}
      </div>

      <div
        className={`max-h-[28rem] overflow-auto border ${isReport ? investtiReport.rule : "border-slate-200 rounded-xl"}`}
      >
        <table className="w-full min-w-[420px] border-collapse text-left text-[12px]">
          <thead className={`sticky top-0 z-10 bg-white ${isReport ? "" : "bg-slate-50"}`}>
            <tr
              className={`border-b text-[10px] uppercase tracking-wide ${isReport ? "border-neutral-200 text-neutral-500" : "border-slate-200 text-slate-400"}`}
            >
              <th className="px-3 py-2.5 font-medium">No.</th>
              <th className="px-3 py-2.5 font-medium">Mes</th>
              <th className="px-3 py-2.5 text-right font-medium">Pago total</th>
              {muestraApartado ? (
                <th className="px-3 py-2.5 text-right font-medium">Apartado</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr
                key={`${fila.mesCalendario}-${fila.numero}`}
                className={`border-b ${isReport ? "border-neutral-100" : "border-slate-100"} ${fila.tipo === "enganche" ? (isReport ? "bg-neutral-50/60" : "bg-amber-50/50") : ""}`}
              >
                <td className="px-3 py-2 tabular-nums text-neutral-600">{fila.numero}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtFecha(fila.fechaPago)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-[#1C1830]">
                  {editable && onPagoEditado ? (
                    <div className="ml-auto w-36">
                      <InvesttiMoneyInput
                        amount={fila.pagoTotal}
                        onAmountChange={(monto) => onPagoEditado(fila.mesCalendario, monto)}
                        isReport={isReport}
                        className={`w-full border px-2 py-1 text-right text-[12px] font-medium ${isReport ? "border-neutral-300 bg-white" : "rounded border-slate-200"}`}
                      />
                    </div>
                  ) : (
                    formatPrice(fila.pagoTotal)
                  )}
                </td>
                {muestraApartado ? (
                  <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                    {fila.apartado !== undefined ? formatPrice(fila.apartado) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              className={`border-t font-medium ${isReport ? "border-neutral-200 bg-neutral-50/80" : "border-slate-200 bg-slate-50"}`}
            >
              <td colSpan={2} className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-neutral-500">
                Total
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(totalPagado)}</td>
              {muestraApartado ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function TablaAmortizacionEditable({
  filas,
  apartado,
  descuentoFraccion,
  isReport,
  onPagoEditado,
  onResetPagos,
  tieneEdiciones,
}: {
  filas: InvesttiAmortizacionFila[];
  apartado: number;
  descuentoFraccion: number;
  isReport: boolean;
  onPagoEditado: (mes: number, monto: number) => void;
  onResetPagos: () => void;
  tieneEdiciones: boolean;
}) {
  const filasProspecto = toFilasProspecto(filas, apartado, descuentoFraccion);

  return (
    <TablaAmortizacionProspecto
      filas={filasProspecto}
      apartado={apartado}
      isReport={isReport}
      titulo="Calendario de pagos — propuesta"
      descripcion={`${filasProspecto.length} pagos · vista prospecto (como «Para Imprimir») · edita el pago total por mes.`}
      editable
      onPagoEditado={onPagoEditado}
      onResetPagos={onResetPagos}
      tieneEdiciones={tieneEdiciones}
    />
  );
}

function TablaAmortizacion({
  esquema,
  filas,
  apartado,
  descuentoFraccion,
  diaPagosSubsecuentes,
  isReport,
}: {
  esquema: InvesttiEsquemaResult;
  filas: InvesttiAmortizacionFila[];
  apartado: number;
  descuentoFraccion: number;
  diaPagosSubsecuentes: InvesttiDiaPagoSubsecuente;
  isReport: boolean;
}) {
  const filasProspecto = toFilasProspecto(filas, apartado, descuentoFraccion);
  const totalPagado = filasProspecto.reduce((s, f) => s + f.pagoTotal, 0);

  return (
    <>
      <TablaAmortizacionProspecto
        filas={filasProspecto}
        apartado={apartado}
        isReport={isReport}
        titulo={`Calendario de pagos — ${esquema.label}`}
        descripcion={`${filasProspecto.length} pagos · total ${formatPrice(totalPagado)} · vista prospecto.`}
      />
      <p className={`mt-2 text-[11px] ${isReport ? investtiReport.caption : "text-slate-500"}`}>
        Clic en un esquema de la tabla superior para cambiar el calendario. Pagos subsecuentes:{" "}
        {labelDiaPagosSubsecuentes(diaPagosSubsecuentes)}.
      </p>
    </>
  );
}

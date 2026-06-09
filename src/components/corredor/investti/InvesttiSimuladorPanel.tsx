"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/format/money";
import {
  getInvesttiReglas,
  INVESTTI_ESQUEMAS_VENTA,
  INVESTTI_SLUG_TO_EXCEL,
  isInvesttiSimuladorDesarrollo,
  simularLoteInvestti,
  type InvesttiAmortizacionFila,
  type InvesttiEsquemaId,
  type InvesttiEsquemaResult,
  type InvesttiLoteRecord,
} from "@/lib/corredor/investti-simulador";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";
import type { ReactNode } from "react";

type InvesttiSimuladorPanelProps = {
  desarrolloId: string;
  /** Estilo memo Investti vs. ficha corredor */
  presentation?: "corredor" | "report";
};

type LotesPayload = {
  lotes: InvesttiLoteRecord[];
  source: string;
};

export function InvesttiSimuladorPanel({
  desarrolloId,
  presentation = "corredor",
}: InvesttiSimuladorPanelProps) {
  const [lotes, setLotes] = useState<InvesttiLoteRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manzana, setManzana] = useState("");
  const [loteId, setLoteId] = useState("");
  const [plazoLibre, setPlazoLibre] = useState(36);
  const [esquemaAmortId, setEsquemaAmortId] = useState<InvesttiEsquemaId>("m24");

  const excelNombre = INVESTTI_SLUG_TO_EXCEL[desarrolloId];
  const reglas = getInvesttiReglas(desarrolloId);

  useEffect(() => {
    if (!isInvesttiSimuladorDesarrollo(desarrolloId)) return;
    let cancelled = false;
    fetch("/data/investti-simulador-lotes.json")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar lista de precios");
        return r.json() as Promise<LotesPayload>;
      })
      .then((data) => {
        if (cancelled) return;
        const filtered = data.lotes.filter((l) => l.desarrollo === excelNombre);
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
  }, [desarrolloId, excelNombre]);

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

  const simulacion = useMemo(() => {
    if (!loteSel) return null;
    return simularLoteInvestti(loteSel, { plazoLibreMeses: plazoLibre });
  }, [loteSel, plazoLibre]);

  const esquemaAmort = useMemo(() => {
    if (!simulacion) return null;
    if (esquemaAmortId === "libre") {
      return simulacion.esquemas.find((e) => e.id === "libre") ?? null;
    }
    return simulacion.esquemas.find((e) => e.id === esquemaAmortId) ?? null;
  }, [simulacion, esquemaAmortId]);

  const isReport = presentation === "report";
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

  if (!lotes) {
    return (
      <div className={`${shell} ${pad} text-sm text-neutral-500`}>
        Cargando simulador Investti…
      </div>
    );
  }

  return (
    <div className={`${shell} ${pad}`}>
      <header className="mb-5">
        <p className={isReport ? investtiReport.label : "text-[10px] font-bold uppercase tracking-wide text-slate-400"}>
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
        <p className={`mt-2 text-[13px] leading-relaxed ${isReport ? "text-neutral-600" : "text-slate-600"}`}>
          Lista feb 2026 · interés 12% anual · enganche mínimo{" "}
          {Math.round((reglas?.engancheMinPct ?? 0.15) * 100)}% · plazo hasta{" "}
          {reglas?.plazoMaxMeses ?? 60} meses (72 en esquema libre).
        </p>
      </header>

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
              value={`${loteSel!.tipo}${loteSel!.entrega ? ` · ${loteSel!.entrega}` : ""}`}
              isReport={isReport}
            />
          </div>

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
                  .filter((e) => INVESTTI_ESQUEMAS_VENTA.some((s) => s.id === e.id))
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

          <details className="mt-5">
            <summary className="cursor-pointer text-[13px] font-medium text-[#201044]">
              Esquema LIBRE (plazo configurable)
            </summary>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <Field label="Plazo (meses)" isReport={isReport}>
                <input
                  type="number"
                  min={6}
                  max={reglas?.plazoMaxMeses ?? 72}
                  value={plazoLibre}
                  onChange={(e) => setPlazoLibre(Number(e.target.value))}
                  className={`${inputClass(isReport)} w-28`}
                />
              </Field>
              {simulacion.esquemas.find((e) => e.id === "libre") ? (
                <EsquemaLibreResumen
                  esquema={simulacion.esquemas.find((e) => e.id === "libre")!}
                  isReport={isReport}
                  selected={esquemaAmortId === "libre"}
                  onSelect={() => setEsquemaAmortId("libre")}
                />
              ) : null}
            </div>
          </details>

          {esquemaAmort && esquemaAmort.tablaAmortizacion.length > 0 ? (
            <TablaAmortizacion
              esquema={esquemaAmort}
              filas={esquemaAmort.tablaAmortizacion}
              isReport={isReport}
            />
          ) : null}
        </>
      ) : null}

      <footer className={`mt-6 border-t pt-4 text-[11px] leading-relaxed ${isReport ? "border-neutral-200 text-neutral-500" : "border-slate-100 text-slate-500"}`}>
        <p>*Descuento sobre precio de lista. Negativo = recargo por plazo largo.</p>
        <p className="mt-2">
          Vigencia 5 días hábiles. Apartado ${(reglas?.apartado ?? 50000).toLocaleString("es-MX")} a
          cuenta de enganche. Solo referencia; no es preaprobación.
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

function EsquemaLibreResumen({
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
  return (
    <div
      className={`cursor-pointer rounded-lg border p-3 text-[13px] transition-colors ${isReport ? "text-neutral-700" : "text-slate-700"} ${selected ? (isReport ? "border-[#201044] bg-neutral-50" : "border-[#6cc24a] bg-[#6cc24a]/10") : "border-transparent hover:bg-neutral-50"}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
      role="button"
      tabIndex={0}
    >
      <p>
        Total <strong>{formatPrice(esquema.total)}</strong> · Mensualidad{" "}
        <strong>{formatPrice(esquema.mensualidad)}</strong>
      </p>
      <p className="mt-1 max-w-xl text-[12px] text-neutral-500">{esquema.descripcionPago}</p>
    </div>
  );
}

function inputClass(isReport: boolean) {
  return isReport
    ? "w-full border border-neutral-300 bg-white px-3 py-2 text-[13px]"
    : "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";
}

function fmtFecha(d: Date): string {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" });
}

function TablaAmortizacion({
  esquema,
  filas,
  isReport,
}: {
  esquema: InvesttiEsquemaResult;
  filas: InvesttiAmortizacionFila[];
  isReport: boolean;
}) {
  const totalPagado = filas.reduce((s, f) => s + f.aportacion, 0);
  const totalInteres = filas.reduce((s, f) => s + f.interes, 0);

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
            Tabla de amortización — {esquema.label}
          </h3>
          <p className={`mt-1 text-[12px] ${isReport ? "text-neutral-600" : "text-slate-600"}`}>
            {filas.length} pagos · interés 12% anual · total pagado {formatPrice(totalPagado)}
            {totalInteres > 0 ? ` (intereses ${formatPrice(totalInteres)})` : ""}
          </p>
        </div>
      </div>

      <div
        className={`max-h-[28rem] overflow-auto border ${isReport ? investtiReport.rule : "border-slate-200 rounded-xl"}`}
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-[12px]">
          <thead className={`sticky top-0 z-10 bg-white ${isReport ? "" : "bg-slate-50"}`}>
            <tr
              className={`border-b text-[10px] uppercase tracking-wide ${isReport ? "border-neutral-200 text-neutral-500" : "border-slate-200 text-slate-400"}`}
            >
              <th className="px-3 py-2.5 font-medium">No.</th>
              <th className="px-3 py-2.5 font-medium">Fecha pago</th>
              <th className="px-3 py-2.5 font-medium">Vencimiento</th>
              <th className="px-3 py-2.5 text-right font-medium">Saldo</th>
              <th className="px-3 py-2.5 text-right font-medium">Interés</th>
              <th className="px-3 py-2.5 text-right font-medium">Pago</th>
              <th className="px-3 py-2.5 text-right font-medium">Saldo final</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr
                key={fila.numero}
                className={`border-b ${isReport ? "border-neutral-100" : "border-slate-100"} ${fila.tipo === "enganche" ? (isReport ? "bg-neutral-50/60" : "bg-amber-50/50") : ""}`}
              >
                <td className="px-3 py-2 tabular-nums text-neutral-600">{fila.numero}</td>
                <td className="px-3 py-2 whitespace-nowrap">{fmtFecha(fila.fechaPago)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-neutral-600">
                  {fmtFecha(fila.fechaVencimiento)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPrice(fila.saldoInicial)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                  {fila.interes > 0 ? formatPrice(fila.interes) : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-[#1C1830]">
                  {formatPrice(fila.aportacion)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-neutral-600">
                  {formatPrice(fila.saldoFinal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={`border-t font-medium ${isReport ? "border-neutral-200 bg-neutral-50/80" : "border-slate-200 bg-slate-50"}`}>
              <td colSpan={4} className="px-3 py-2.5 text-[11px] uppercase tracking-wide text-neutral-500">
                Totales
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(totalInteres)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{formatPrice(totalPagado)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">$0</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className={`mt-2 text-[11px] ${isReport ? investtiReport.caption : "text-slate-500"}`}>
        Clic en un esquema de la tabla superior para cambiar la amortización. Pagos el día 15 de cada mes.
      </p>
    </div>
  );
}

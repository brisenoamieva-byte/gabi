import type { ReactNode } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format/money";
import { INVESTTI_GRUPO_LOGO } from "@/lib/catalog/investti-desarrollos";
import { InvesttiDesarrolloLogo } from "@/components/corredor/investti/InvesttiDesarrolloLogo";
import { InvesttiAutorizacionesEspeciales } from "@/components/corredor/investti/InvesttiAutorizacionesEspeciales";
import {
  formatManzanaLabel,
  getInvesttiTerminosCondiciones,
  type InvesttiSimuladorPrintSnapshot,
} from "@/lib/corredor/investti-simulador-print";
import { investtiReport } from "@/components/corredor/investti/InvesttiReportUi";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";

function fmtFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtFechaDoc(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

function PrintStatGrid({
  children,
  cols = 4,
  className = "",
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    cols === 4 ? "lg:grid-cols-4" : cols === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";
  return (
    <div
      className={`investti-sim-print-stat-grid grid gap-px bg-neutral-300/75 sm:grid-cols-2 ${colClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function PrintStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="investti-sim-print-stat bg-[#FDFCFA] px-3 py-2">
      <p className={investtiReport.label}>{label}</p>
      <p
        className={`${investtiReport.serif} mt-0.5 text-[15px] leading-tight tabular-nums text-[#1C1830]`}
      >
        {value}
      </p>
    </div>
  );
}

const amortThClass =
  "px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500";
const amortTdClass = "px-2.5 py-1.5 text-[11px] leading-snug text-neutral-800";
const amortTdNumClass = `${amortTdClass} tabular-nums`;
const amortTdMoneyClass = `${amortTdNumClass} text-right`;

function PrintSectionHead({
  label,
  title,
  meta,
}: {
  label: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="investti-sim-print-section-head">
      <p className={investtiReport.label}>{label}</p>
      <h2 className={`${investtiReport.serif} mt-0.5 text-lg font-normal text-[#1C1830]`}>
        {title}
      </h2>
      {meta ? (
        <p className="mt-1 max-w-3xl text-[12px] leading-snug text-neutral-600">{meta}</p>
      ) : null}
    </div>
  );
}

export function InvesttiSimuladorPrintSheet({
  snapshot,
}: {
  snapshot: InvesttiSimuladorPrintSnapshot;
}) {
  const totalPagado = snapshot.filasProspecto.reduce((s, f) => s + f.pagoTotal, 0);
  const muestraApartado =
    snapshot.apartado > 0 && snapshot.filasProspecto.some((f) => f.apartado !== undefined);
  const fechaDoc = fmtFechaDoc(snapshot.savedAt);
  const manzanaLabel = formatManzanaLabel(snapshot.lote.manzana);
  const terminos = getInvesttiTerminosCondiciones(snapshot.apartado);
  const autorizaciones = snapshot.autorizaciones ?? {
    descuento: false,
    mensualidadBaja: false,
    plazoMayor: false,
    algunaRequerida: false,
    detalle: {},
  };

  const esquemaMeta = [
    `Tipo de compra: ${snapshot.tipoCompraLabel ?? "Recursos propios"}.`,
    snapshot.reglasLine,
    `Pagos subsecuentes: ${snapshot.calendario.diaPagosLabel}.`,
    snapshot.esquemaAmort?.descripcionPago,
  ]
    .filter(Boolean)
    .join(" ");

  const propuestaMeta =
    snapshot.propuesta && snapshot.propuesta.errores.length === 0
      ? `${snapshot.tipoCompraLabel ?? "Recursos propios"} · ${snapshot.propuesta.plazoMeses} meses · ${snapshot.propuesta.aportacionCadaLabel} · total ${formatPrice(snapshot.propuesta.totalPagado)}`
      : `Tipo de compra: ${snapshot.tipoCompraLabel ?? "Recursos propios"}.`;

  return (
    <article
      className={`investti-report-article investti-sim-print-sheet ${investtiReport.sans} px-6 py-6 md:px-8 md:py-7`}
    >
      <header className="investti-sim-print-header investti-sim-print-cover border-b border-neutral-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <InvesttiDesarrolloLogo desarrolloId={snapshot.desarrolloId} size="print" />
            <div className="min-w-0">
              <p className={investtiReport.label}>Simulación de pago</p>
              <h1 className={`${investtiReport.serif} mt-0.5 text-xl text-[#1C1830]`}>
                {snapshot.desarrolloNombre}
              </h1>
              <p className="mt-0.5 text-[12px] text-neutral-600">
                Mza. {manzanaLabel} · Lote {snapshot.lote.lote} · {snapshot.lote.superficie} m² ·{" "}
                {snapshot.lote.tipo}
              </p>
              {snapshot.entregaLabel ? (
                <p className="mt-0.5 text-[12px] text-neutral-600">
                  Entrega estimada: {snapshot.entregaLabel}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2.5">
            <Image
              src={INVESTTI_GRUPO_LOGO}
              alt="Grupo Investti"
              width={112}
              height={40}
              className="investti-grupo-logo-print h-8 w-auto max-w-[6.5rem] object-contain"
              unoptimized
              priority
            />
            <dl className="text-right text-[11px] text-neutral-600">
              <dt className={investtiReport.label}>Documento</dt>
              <dd className="mt-0.5 font-medium capitalize text-[#1C1830]">{fechaDoc}</dd>
              <dd className="mt-1 text-[10px] text-neutral-500">Vigencia 5 días hábiles</dd>
            </dl>
          </div>
        </div>

        <PrintStatGrid cols={4} className="mt-4">
          <PrintStat label="Precio lista" value={formatPrice(snapshot.lote.precioLista)} />
          <PrintStat label="Precio contado" value={formatPrice(snapshot.precioContado)} />
          <PrintStat
            label="Tipo de compra"
            value={snapshot.tipoCompraLabel ?? "Recursos propios"}
          />
          <PrintStat label="Primer pago" value={fmtFecha(snapshot.calendario.fechaPrimerPagoISO)} />
        </PrintStatGrid>
      </header>

      <section className="investti-sim-print-section mt-4 border-t border-neutral-200 pt-4">
        <PrintSectionHead
          label={snapshot.tab === "propuesta" ? "Plan personalizado" : "Esquema seleccionado"}
          title={
            snapshot.tab === "propuesta"
              ? "Plan personalizado de pagos"
              : (snapshot.esquemaAmort?.label ?? "Esquema de financiamiento")
          }
          meta={snapshot.tab === "propuesta" ? propuestaMeta : esquemaMeta}
        />

        {snapshot.descuentoEspecialPct > 0 ? (
          <PrintStatGrid cols={3} className="mt-3">
            <PrintStat
              label="Total sin descuento"
              value={formatPrice(snapshot.resumenDescuento.totalSinDescuento)}
            />
            <PrintStat
              label="Descuento especial"
              value={`${snapshot.descuentoEspecialPct.toFixed(2)}%`}
            />
            <PrintStat
              label="Total con descuento"
              value={formatPrice(snapshot.resumenDescuento.totalConDescuento)}
            />
          </PrintStatGrid>
        ) : null}
      </section>

      <InvesttiAutorizacionesEspeciales autorizaciones={autorizaciones} variant="print" />

      {snapshot.tab === "propuesta" && snapshot.propuesta ? (
        <section className="investti-sim-print-section mt-4">
          <PrintSectionHead label="Parámetros" title="Detalle del plan personalizado" />
          <PrintStatGrid cols={4} className="mt-2">
            <PrintStat label="Enganche" value={`${snapshot.propuesta.enganchePct}%`} />
            <PrintStat
              label="Enganche diferido"
              value={`${snapshot.propuesta.engancheDiferido} mes(es)`}
            />
            <PrintStat label="Plazo" value={`${snapshot.propuesta.plazoMeses} meses`} />
            <PrintStat label="Aportación" value={snapshot.propuesta.aportacionCadaLabel} />
            <PrintStat
              label="Mensualidad deseada"
              value={
                snapshot.propuesta.mensualidadDeseada > 0
                  ? formatPrice(snapshot.propuesta.mensualidadDeseada)
                  : "Automática"
              }
            />
            <PrintStat
              label={
                snapshot.propuesta.mensualidadDeseada > 0
                  ? "Pago en mes de aportación"
                  : "Aportación calculada"
              }
              value={formatPrice(snapshot.propuesta.montoMesAportacion)}
            />
            <PrintStat
              label="Enganche total"
              value={formatPrice(snapshot.propuesta.engancheTotal)}
            />
            <PrintStat label="Total pagado" value={formatPrice(snapshot.propuesta.totalPagado)} />
          </PrintStatGrid>
          {snapshot.propuesta.errores.length > 0 ? (
            <div className="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-800">
              {snapshot.propuesta.errores.map((e) => (
                <p key={e}>{e}</p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="investti-sim-print-section investti-sim-print-calendar mt-4">
        <PrintSectionHead
          label="Calendario"
          title={snapshot.calendarioTitulo.replace(" — ", " · ")}
          meta={`${snapshot.filasProspecto.length} pagos · total ${formatPrice(totalPagado)}`}
        />

        <div className="investti-sim-print-table-wrap mt-2 overflow-hidden border border-neutral-200">
          <table className="investti-sim-print-table w-full border-collapse text-left">
            <thead className="bg-neutral-50">
              <tr className="border-b border-neutral-200">
                <th className={amortThClass}>No.</th>
                <th className={amortThClass}>Fecha</th>
                <th className={`${amortThClass} text-right`}>Pago total</th>
                {muestraApartado ? (
                  <th className={`${amortThClass} text-right`}>Apartado</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {snapshot.filasProspecto.map((fila) => (
                <tr
                  key={`${fila.numero}-${fila.fechaPagoISO}`}
                  className={`border-b border-neutral-100 ${fila.tipo === "enganche" ? "bg-amber-50/50" : ""}`}
                >
                  <td className={amortTdNumClass}>{fila.numero}</td>
                  <td className={`${amortTdClass} whitespace-nowrap`}>
                    {fmtFecha(fila.fechaPagoISO)}
                  </td>
                  <td className={amortTdMoneyClass}>{formatPrice(fila.pagoTotal)}</td>
                  {muestraApartado ? (
                    <td className={amortTdMoneyClass}>
                      {fila.apartado !== undefined ? formatPrice(fila.apartado) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-300 bg-neutral-50">
                <td colSpan={2} className={amortThClass}>
                  Total
                </td>
                <td className={`${amortTdMoneyClass} font-medium text-neutral-900`}>
                  {formatPrice(totalPagado)}
                </td>
                {muestraApartado ? <td className={amortTdClass} /> : null}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="investti-sim-print-terminos investti-sim-print-section mt-5 border-t border-neutral-200 pt-4">
        <h2 className={`${investtiReport.serif} text-base font-normal text-[#1C1830]`}>
          Términos y condiciones
        </h2>
        <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-neutral-600">
          {terminos.parrafos.map((parrafo) => (
            <li key={parrafo} className="pl-3 [text-indent:-0.65rem]">
              · {parrafo}
            </li>
          ))}
          <li className="pl-3 font-medium text-[#1C1830] [text-indent:-0.65rem]">
            · {terminos.notaAportacionesAnuales}
          </li>
        </ul>
      </section>

      <footer className="investti-sim-print-footer mt-4 border-t border-neutral-200 pt-3 text-[10px] leading-relaxed text-neutral-500">
        <p>
          Lista feb 2026 · simulación con inventario oficial Grupo Investti · documento informativo, no
          constituye preaprobación.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[9px] uppercase tracking-wide text-neutral-400">
            Uso comercial · Grupo Investti
          </p>
          <GabiSistemaMark size="sm" align="end" tone="report" />
        </div>
      </footer>
    </article>
  );
}

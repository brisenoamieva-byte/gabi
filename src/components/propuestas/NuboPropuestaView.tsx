"use client";

import { ConsultoriaBrandLogo } from "@/components/brand/ConsultoriaBrandLogo";
import { ConsultoriaDocumentFooter } from "@/components/brand/ConsultoriaDocumentFooter";
import { useConsultoriaMarca } from "@/components/brand/ConsultoriaMarcaProvider";
import {
  InvesttiCallout,
  InvesttiCoverStat,
  InvesttiSection,
  investtiReport,
} from "@/components/corredor/investti/InvesttiReportUi";
import { PropuestaDesarrollosLogos } from "@/components/propuestas/PropuestaDesarrollosLogos";
import type { PropuestaComercialData } from "@/lib/propuestas/types";
import { formatTicket } from "@/lib/data";

function pctLabel(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function PropuestaCover({ data }: { data: PropuestaComercialData }) {
  const { meta, escenario } = data;
  return (
    <header className={`border-b ${investtiReport.rule} px-8 py-10 md:px-12 md:py-12`}>
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div className="space-y-4">
          <ConsultoriaBrandLogo height={40} priority />
          <p className={`${investtiReport.sans} text-[12px] text-neutral-600`}>
            Elaborado por {meta.elaboradoPor}
          </p>
        </div>
        <dl className={`${investtiReport.sans} space-y-1 text-right text-[12px] text-neutral-600`}>
          <div>
            <dt className={investtiReport.label}>Preparado para</dt>
            <dd className="mt-0.5 font-semibold text-[#1C1830]">{meta.preparadoPara}</dd>
          </div>
          <div>
            <dt className={investtiReport.label}>Fecha</dt>
            <dd className="mt-0.5 tabular-nums">{meta.fecha}</dd>
          </div>
          <div>
            <dt className={investtiReport.label}>Clasificación</dt>
            <dd className="mt-0.5">{meta.clasificacion}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-10 max-w-2xl">
        <p className={investtiReport.label}>Propuesta comercial</p>
        <h1
          className={`${investtiReport.serif} mt-3 text-[1.75rem] font-normal leading-[1.2] text-[#1C1830] md:text-[2.125rem]`}
        >
          {meta.titulo}
        </h1>
        <p className={`${investtiReport.sans} mt-2 text-[15px] text-neutral-600`}>{meta.ubicacion}</p>
        <p className={`${investtiReport.sans} mt-4 text-[15px] leading-relaxed text-neutral-600`}>
          {meta.subtitulo}
        </p>
      </div>

      <div
        className={`${investtiReport.sans} mt-10 grid gap-px bg-neutral-300 sm:grid-cols-2 lg:grid-cols-4`}
      >
        <InvesttiCoverStat
          label="Objetivo de venta"
          value={`${escenario.totalLotes} lotes`}
          note={`${escenario.mesesVenta} meses · ${escenario.absorcionMensual}/mes`}
        />
        <InvesttiCoverStat
          label="Ingreso proyectado"
          value={formatTicket(escenario.ingresoTotal)}
          note="Inventario Etapa 1"
        />
        <InvesttiCoverStat
          label="Ticket promedio"
          value={formatTicket(escenario.ticketPromedio)}
          note={`${Math.round(escenario.lotePromedioM2)} m² promedio`}
        />
        <InvesttiCoverStat
          label="Precio / m²"
          value={formatTicket(escenario.precioM2Promedio)}
          note={`Base lista ${formatTicket(escenario.precioBaseM2)}/m²`}
        />
      </div>
    </header>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className={`overflow-x-auto border ${investtiReport.rule}`}>
      <table className={`${investtiReport.sans} w-full min-w-[32rem] text-left text-[12px]`}>
        <thead className="bg-neutral-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold text-neutral-600">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-neutral-200">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 tabular-nums text-neutral-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NuboPropuestaView({ data }: { data: PropuestaComercialData }) {
  const { marca } = useConsultoriaMarca();
  const { escenario, esquemas, tiposLote, tipoCounts, publicidad, propuestaBbr, narrativa, lotes } =
    data;

  const tiposOrdenados = [...tiposLote].sort((a, b) => a.tipo.localeCompare(b.tipo));
  const tipoCountsOrdenados = Object.entries(tipoCounts).sort(([a], [b]) => a.localeCompare(b));
  const lotesOrdenados = [...lotes].sort(
    (a, b) =>
      a.tipo.localeCompare(b.tipo) ||
      a.manzana.localeCompare(b.manzana, undefined, { numeric: true }) ||
      a.lote.localeCompare(b.lote, undefined, { numeric: true }),
  );

  return (
    <div className={investtiReport.body}>
      <PropuestaCover data={data} />

      <div className="mt-10 space-y-12">
        <InvesttiSection
          number="01"
          title="Quiénes somos"
          lead="BBR Habitarea como operador de comercialización en exclusiva."
        >
          <p className={`${investtiReport.sans} text-[14px] leading-relaxed text-neutral-700`}>
            {narrativa.quienesSomos}
          </p>
          <PropuestaDesarrollosLogos className="mt-6" />
        </InvesttiSection>

        <InvesttiSection
          number="02"
          title="Escenario comercial"
          lead="Supuestos del modelo financiero importado desde el inventario del proyecto."
        >
          <ul className={`${investtiReport.sans} space-y-2 text-[14px] text-neutral-700`}>
            {narrativa.estrategia.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-neutral-400">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <InvesttiCallout title="Supuestos clave">
            <ul className="space-y-1.5">
              <li>
                Absorción: <strong>{escenario.absorcionMensual} lotes/mes</strong> durante{" "}
                {escenario.mesesVenta} meses.
              </li>
              <li>
                Listas de precio: <strong>{escenario.listasPrecio}</strong> incrementos de{" "}
                {pctLabel(escenario.incrementoLista)} cada {escenario.mesesEntreListas} meses.
              </li>
              <li>
                Mix contado estimado: <strong>{pctLabel(escenario.pctContado)}</strong> · Tasa de
                descuento financiero: <strong>{pctLabel(data.tasaDescuentoAnual)}</strong> anual.
              </li>
              <li>
                Superficie: {escenario.terrenoMinM2}–{escenario.terrenoMaxM2} m² por lote ·{" "}
                {Math.round(escenario.areaTotalM2).toLocaleString("es-MX")} m² vendibles.
              </li>
            </ul>
          </InvesttiCallout>
        </InvesttiSection>

        <InvesttiSection
          number="03"
          title="Clasificación y precios"
          lead={narrativa.clasificacionLotes}
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {tipoCountsOrdenados.map(([tipo, count]) => (
              <span
                key={tipo}
                className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-medium text-neutral-700"
              >
                Tipo {tipo}: {count} lotes
              </span>
            ))}
          </div>
          <DataTable
            headers={["Tipo", "$/m² lista", "Contado", "12 MSI", "18 MSI", "24 MSI", "30-70"]}
            rows={tiposOrdenados.map((t) => [
              t.tipo,
              formatTicket(t.precioM2Lista),
              formatTicket(t.precioM2Contado),
              formatTicket(t.precioM212Msi),
              formatTicket(t.precioM218Msi),
              formatTicket(t.precioM224Msi),
              formatTicket(t.precioM23070),
            ])}
          />
        </InvesttiSection>

        <InvesttiSection
          number="04"
          title="Esquemas de pago"
          lead={`Descuentos equivalentes a tasa del ${pctLabel(data.tasaDescuentoAnual)} anual.`}
        >
          <DataTable
            headers={["Esquema", "Descuento", "Enganche", "Mensualidades", "Finiquito"]}
            rows={esquemas.map((e) => [
              e.nombre,
              pctLabel(e.descuento),
              pctLabel(e.enganche),
              e.mensualidades ? `${e.mensualidades} meses (${pctLabel(e.pctMensualidades)})` : "—",
              e.finiquito ? pctLabel(e.pctFiniquito) : "—",
            ])}
          />
        </InvesttiSection>

        <InvesttiSection
          number="05"
          title="Lista de precios"
          lead={`${lotes.length} lotes · Lista 0 · ordenados por tipo, manzana y lote.`}
        >
          <DataTable
            headers={["Mz", "Lote", "m²", "Tipo", "Lista", "Contado", "12 MSI/mes"]}
            rows={lotesOrdenados.map((l) => [
              l.manzana,
              l.lote,
              l.superficieM2,
              l.tipo,
              l.precioLista ? formatTicket(l.precioLista) : "—",
              l.precioContado ? formatTicket(l.precioContado) : "—",
              l.mensual12 ? formatTicket(l.mensual12) : "—",
            ])}
          />
        </InvesttiSection>

        <InvesttiSection
          number="06"
          title="Publicidad y lanzamiento"
          lead={`${pctLabel(publicidad.porcentaje)} del ingreso proyectado · ${formatTicket(publicidad.total)} total.`}
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <InvesttiCoverStat
              label="Presupuesto total"
              value={formatTicket(publicidad.total)}
            />
            <InvesttiCoverStat
              label="Disponible al mes"
              value={formatTicket(publicidad.mensual)}
            />
          </div>
          <ol className={`${investtiReport.sans} space-y-2 text-[13px] text-neutral-700`}>
            {publicidad.rubros.map((rubro, i) => (
              <li key={rubro} className="flex gap-3">
                <span className="shrink-0 tabular-nums text-neutral-400">
                  {String(i + 1).padStart(2, "0")}.
                </span>
                {rubro}
              </li>
            ))}
          </ol>
        </InvesttiSection>

        <InvesttiSection
          number="07"
          title="Propuesta BBR Habitarea"
          lead="Contrato de exclusiva y conformación de equipo comercial."
        >
          <InvesttiCallout title="Condiciones comerciales">
            <ul className="space-y-2">
              <li>
                <strong>Exclusiva de venta</strong> y conformación de equipo:{" "}
                {propuestaBbr.equipo.join(", ")}.
              </li>
              <li>
                <strong>Comisión {pctLabel(propuestaBbr.comision)} + IVA</strong> — venta interna
                (equipo BBR); pago del 100% a firma de oferta de compra o contrato y pago de
                enganche.
              </li>
              {propuestaBbr.comisionInmobiliaria != null ? (
                <li>
                  Comisión{" "}
                  <strong>{pctLabel(propuestaBbr.comisionInmobiliaria)} + IVA</strong> — venta
                  externa por inmobiliarias aliadas.
                </li>
              ) : (
                <li>
                  Venta directa por desarrollador: comisión{" "}
                  <strong>{pctLabel(propuestaBbr.comisionVentaDirecta)} + IVA</strong>.
                </li>
              )}
              <li>
                Horizonte de construcción considerado: <strong>{propuestaBbr.mesesConstruccion} meses</strong>.
              </li>
              <li>{propuestaBbr.pagoComision}</li>
            </ul>
          </InvesttiCallout>
        </InvesttiSection>
      </div>

      <ConsultoriaDocumentFooter
        marca={marca}
        className={`${investtiReport.sans} mt-14`}
        extra={`Los números provienen del modelo financiero del proyecto (${data.id}). Validar con inventario y listas vigentes antes de firma.`}
        elaboradoPor={`${data.meta.elaboradoPor}`}
        fecha={data.meta.fecha}
      />
    </div>
  );
}

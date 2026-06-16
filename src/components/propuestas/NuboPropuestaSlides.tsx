"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BbrHabitareaLogo } from "@/components/brand/BbrHabitareaLogo";
import { NuboOrganigramaSlide } from "@/components/propuestas/NuboOrganigramaSlide";
import { PropuestaDesarrollosLogos } from "@/components/propuestas/PropuestaDesarrollosLogos";
import {
  PropuestaSlideDeck,
  SlideCanvas,
  SlideKpi,
  SlidePortada,
  type PropuestaSlide,
} from "@/components/propuestas/PropuestaSlideDeck";
import { NuboPropuestaView } from "@/components/propuestas/NuboPropuestaView";
import { NUBO_MEDIA } from "@/lib/propuestas/nubo-media";
import type { PropuestaComercialMedia } from "@/lib/propuestas/vita-alta-media";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";
import type { PropuestaComercialData } from "@/lib/propuestas/types";
import { formatTicket } from "@/lib/data";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function sortedTipoEntries(tipoCounts: Record<string, number>) {
  return Object.entries(tipoCounts).sort(([a], [b]) => a.localeCompare(b));
}

function sortedTiposLote(tiposLote: PropuestaComercialData["tiposLote"]) {
  return [...tiposLote].sort((a, b) => a.tipo.localeCompare(b.tipo));
}

const SERVICIOS_BBR = [
  "Planeación de proyectos inmobiliarios",
  "Estrategias de comercialización",
  "Conformación y capacitación de equipo comercial",
  "Atención post-venta",
  "Tramitología y titulación (Infonavit, Fovissste, bancos)",
  "Estudios de mercado y análisis de la competencia",
];

function MixVentasChart({ pctContado }: { pctContado: number }) {
  const rest = 1 - pctContado;
  const segments = [
    { label: "Contado", pct: pctContado, color: "#6cc24a" },
    { label: "12 MSI", pct: rest * 0.32, color: "#94c77d" },
    { label: "18 MSI", pct: rest * 0.26, color: "#7eb8d4" },
    { label: "24 MSI", pct: rest * 0.24, color: "#a8a0c4" },
    { label: "30-70", pct: rest * 0.18, color: "#c4a88a" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex h-8 overflow-hidden rounded-sm border border-slate-200">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${s.pct * 100}%`, backgroundColor: s.color }}
            title={`${s.label} ${pct(s.pct)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((s) => (
          <span key={s.label} className={`text-[13px] ${t.body}`}>
            {s.label} {pct(s.pct)}
          </span>
        ))}
      </div>
    </div>
  );
}

function EsquemasPanel({
  esquemas,
  tasa,
}: {
  esquemas: PropuestaComercialData["esquemas"];
  tasa: number;
}) {
  const [active, setActive] = useState(0);
  const e = esquemas[active];
  if (!e) return null;
  return (
    <>
      <div className="propuesta-print-interactive propuesta-print-esquemas-grid grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          {esquemas.map((item, i) => (
            <button
              key={item.nombre}
              type="button"
              onClick={() => setActive(i)}
              className={`block w-full rounded-lg border px-4 py-3 text-left text-[15px] transition ${
                i === active ? t.btnActive : t.btnIdle
              }`}
            >
              {item.nombre}
            </button>
          ))}
        </div>
        <div className={`rounded-lg border p-6 ${t.border} bg-slate-50`}>
          <table className="w-full text-left text-[14px]">
            <tbody className={`divide-y ${t.tableRow}`}>
              <tr>
                <td className={`py-2.5 ${t.body}`}>Descuento</td>
                <td className={`py-2.5 text-right font-semibold tabular-nums ${t.bodyStrong}`}>
                  {pct(e.descuento)}
                </td>
              </tr>
              <tr>
                <td className={`py-2.5 ${t.body}`}>Enganche</td>
                <td className={`py-2.5 text-right font-semibold tabular-nums ${t.bodyStrong}`}>
                  {pct(e.enganche)}
                </td>
              </tr>
              <tr>
                <td className={`py-2.5 ${t.body}`}>Mensualidades</td>
                <td className={`py-2.5 text-right font-semibold ${t.bodyStrong}`}>
                  {e.mensualidades ? `${e.mensualidades} meses` : "—"}
                </td>
              </tr>
              <tr>
                <td className={`py-2.5 ${t.body}`}>Finiquito</td>
                <td className={`py-2.5 text-right font-semibold tabular-nums ${t.bodyStrong}`}>
                  {e.finiquito ? pct(e.pctFiniquito) : "—"}
                </td>
              </tr>
            </tbody>
          </table>
          <p className={`mt-4 text-[12px] ${t.body}`}>
            Tasa de descuento: {pct(tasa)} anual (equivalente en cada esquema).
          </p>
        </div>
      </div>
      <div className={`propuesta-print-static hidden overflow-hidden rounded-lg border ${t.border}`}>
        <table className="w-full text-left">
          <thead className={`text-[10px] uppercase tracking-wide ${t.tableHead}`}>
            <tr>
              <th className="px-3 py-2">Esquema</th>
              <th className="px-3 py-2 text-right">Descuento</th>
              <th className="px-3 py-2 text-right">Enganche</th>
              <th className="px-3 py-2 text-right">Mensualidades</th>
              <th className="px-3 py-2 text-right">Finiquito</th>
            </tr>
          </thead>
          <tbody>
            {esquemas.map((item) => (
              <tr key={item.nombre} className={`border-t ${t.tableRow}`}>
                <td className={`px-3 py-2 font-semibold ${t.bodyStrong}`}>{item.nombre}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${t.body}`}>{pct(item.descuento)}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${t.body}`}>{pct(item.enganche)}</td>
                <td className={`px-3 py-2 text-right ${t.body}`}>
                  {item.mensualidades ? `${item.mensualidades} meses` : "—"}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${t.body}`}>
                  {item.finiquito ? pct(item.pctFiniquito) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={`border-t px-3 py-2 text-[11px] ${t.body}`}>
          Tasa de descuento: {pct(tasa)} anual (equivalente en cada esquema).
        </p>
      </div>
    </>
  );
}

function TiposLoteResumenTable({ data }: { data: PropuestaComercialData }) {
  const tipos = sortedTiposLote(data.tiposLote);
  return (
    <div className={`overflow-hidden rounded-lg border text-[13px] ${t.border}`}>
      <table className="w-full text-left">
        <thead className={`text-[11px] uppercase tracking-wide ${t.tableHead}`}>
          <tr>
            <th className="px-3 py-2">Tipo</th>
            <th className="px-3 py-2 text-right">Lotes</th>
            <th className="px-3 py-2 text-right">$/m² lista</th>
            <th className="px-3 py-2 text-right">$/m² contado</th>
          </tr>
        </thead>
        <tbody>
          {tipos.map((item) => (
            <tr key={item.tipo} className={`border-t ${t.tableRow}`}>
              <td className={`px-3 py-2 font-semibold ${t.bodyStrong}`}>Tipo {item.tipo}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${t.body}`}>
                {data.tipoCounts[item.tipo] ?? "—"}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${t.body}`}>
                {formatTicket(item.precioM2Lista)}
              </td>
              <td className={`px-3 py-2 text-right tabular-nums ${t.body}`}>
                {formatTicket(item.precioM2Contado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TiposLotePanel({ data }: { data: PropuestaComercialData }) {
  const tiposOrdenados = useMemo(() => sortedTipoEntries(data.tipoCounts), [data.tipoCounts]);
  const [tipo, setTipo] = useState(() => tiposOrdenados[0]?.[0] ?? "A");
  const resumen = data.tiposLote.find((item) => item.tipo === tipo);

  return (
    <>
      <div className="propuesta-print-interactive space-y-4">
        <p className={`text-[13px] ${t.body}`}>
          Clasificación por tamaño, esquina y área verde.
        </p>
        <div className="flex flex-wrap gap-2">
          {tiposOrdenados.map(([tipoKey, count]) => (
            <button
              key={tipoKey}
              type="button"
              onClick={() => setTipo(tipoKey)}
              className={`rounded-lg border px-4 py-3 text-left transition ${
                tipo === tipoKey ? t.btnActive : t.btnIdle
              }`}
            >
              <span className="text-lg font-semibold">Tipo {tipoKey}</span>
              <span className={`ml-2 text-sm ${t.body}`}>({count})</span>
            </button>
          ))}
        </div>
        {resumen ? (
          <p className={`text-[14px] ${t.bodyStrong}`}>
            Tipo {tipo}: lista {formatTicket(resumen.precioM2Lista)}/m² · contado{" "}
            {formatTicket(resumen.precioM2Contado)}/m²
          </p>
        ) : null}
        <TiposLoteResumenTable data={data} />
        <p className={`text-[12px] ${t.body}`}>
          {data.lotes.length} lotes en inventario.
        </p>
      </div>
      <div className="propuesta-print-static hidden">
        <TiposLoteResumenTable data={data} />
      </div>
    </>
  );
}

function MasterPlanSlide({
  media,
  projectName,
  clasificacionLotes,
}: {
  media: PropuestaComercialMedia;
  projectName: string;
  clasificacionLotes: string;
}) {
  const isPdf = media.masterPlan.toLowerCase().endsWith(".pdf");

  return (
    <div className="propuesta-slide-root flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3 md:px-6">
        <h2 className={`text-2xl md:text-3xl ${t.title}`}>Master plan</h2>
        <p className={`mt-1 text-[13px] ${t.body}`}>{clasificacionLotes}</p>
      </div>
      <div className="propuesta-slide-inner relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-white p-2 md:p-4">
        {isPdf ? (
          <>
            <iframe
              src={`${media.masterPlan}#view=FitH`}
              title={`Lotificación ${projectName}`}
              className="propuesta-print-master-img h-full min-h-[320px] w-full border-0"
            />
            <a
              href={media.masterPlan}
              target="_blank"
              rel="noopener noreferrer"
              className={`absolute bottom-3 right-3 rounded-lg border bg-white/95 px-3 py-1.5 text-[11px] font-semibold shadow-sm ${t.border} ${t.bodyStrong}`}
            >
              Abrir PDF
            </a>
          </>
        ) : (
          <Image
            src={media.masterPlan}
            alt={`Master plan ${projectName}`}
            width={1200}
            height={800}
            className="propuesta-print-master-img h-auto max-h-full w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}

function buildPropuestaSlides(
  data: PropuestaComercialData,
  media: PropuestaComercialMedia,
): PropuestaSlide[] {
  const { meta, escenario, publicidad, propuestaBbr, narrativa } = data;

  return [
    {
      id: "portada",
      label: "Portada",
      content: (
        <SlidePortada>
          <BbrHabitareaLogo height={36} className="mx-auto" />
          <h1 className={`mt-12 text-5xl font-normal tracking-tight md:text-6xl ${t.title}`}>
            {meta.titulo}
          </h1>
          <p className={`mt-4 text-xl ${t.body}`}>{meta.ubicacion}</p>
          <p className={`mt-8 text-lg ${t.body}`}>{meta.subtitulo}</p>
          <p className={`mt-10 text-sm ${t.body}`}>{meta.fecha}</p>
        </SlidePortada>
      ),
    },
    {
      id: "quienes-somos",
      label: "Quiénes somos",
      content: (
        <SlideCanvas align="start">
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>¿Quiénes somos?</h2>
          <p className={`mt-4 max-w-3xl text-[14px] leading-relaxed md:text-[15px] ${t.body}`}>
            {narrativa.quienesSomos}
          </p>
          <PropuestaDesarrollosLogos compact className="mt-5" />
          <ul className="propuesta-print-servicios-list mt-5 grid gap-1.5 sm:grid-cols-2">
            {SERVICIOS_BBR.map((s) => (
              <li key={s} className={`text-[13px] leading-snug ${t.body}`}>
                · {s}
              </li>
            ))}
          </ul>
        </SlideCanvas>
      ),
    },
    {
      id: "organigrama",
      label: "Organigrama",
      content: <NuboOrganigramaSlide />,
    },
    {
      id: "objetivo",
      label: "Objetivo",
      content: (
        <SlideCanvas>
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>{meta.titulo}</h2>
          <p className={`mt-4 text-[15px] ${t.body}`}>
            Objetivo: venta de <strong className={t.bodyStrong}>{escenario.totalLotes} lotes habitacionales</strong> (
            {escenario.mesesVenta} meses · absorción {escenario.absorcionMensual}/mes).
          </p>
          <div className="propuesta-kpi-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SlideKpi
              label="Área vendible"
              value={`${Math.round(escenario.areaTotalM2).toLocaleString("es-MX")} m²`}
            />
            <SlideKpi label="Ingreso inventario" value={formatTicket(escenario.ingresoTotal)} accent />
            <SlideKpi label="Absorción mensual" value={`${escenario.absorcionMensual} lotes`} />
            <SlideKpi label="Ticket promedio" value={formatTicket(escenario.ticketPromedio)} />
            <SlideKpi label="$/m² promedio" value={formatTicket(escenario.precioM2Promedio)} />
            <SlideKpi label="Lote promedio" value={`${Math.round(escenario.lotePromedioM2)} m²`} />
          </div>
          <p className={`mt-8 text-[14px] leading-relaxed ${t.body}`}>
            Incremento de precio del {pct(escenario.incrementoLista)} cada{" "}
            {escenario.mesesEntreListas} meses. Esquemas: contado, 12, 18 y 24 MSI y 30-70.
            Plusvalía conservadora del 8% anual en el escenario.
          </p>
        </SlideCanvas>
      ),
    },
    {
      id: "estrategia",
      label: "Estrategia",
      content: (
        <SlideCanvas>
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>Estrategia comercial</h2>
          <ul className={`mt-8 space-y-3 text-[15px] leading-relaxed ${t.body}`}>
            {narrativa.estrategia.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SlideCanvas>
      ),
    },
    {
      id: "mix",
      label: "Mix de ventas",
      content: (
        <SlideCanvas>
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>Mix de ventas</h2>
          <p className={`mt-3 text-[14px] ${t.body}`}>Resumen del escenario financiero</p>
          <div className="mt-10">
            <MixVentasChart pctContado={escenario.pctContado} />
          </div>
        </SlideCanvas>
      ),
    },
    {
      id: "master-plan",
      label: "Master plan",
      content: (
        <MasterPlanSlide
          media={media}
          projectName={meta.titulo}
          clasificacionLotes={narrativa.clasificacionLotes}
        />
      ),
    },
    {
      id: "precios",
      label: "Lista de precios",
      content: (
        <SlideCanvas>
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>Lista de precios</h2>
          <p className={`mt-2 text-[14px] ${t.body}`}>Lista 0 · {data.lotes.length} lotes</p>
          <div className="mt-8">
            <TiposLotePanel data={data} />
          </div>
        </SlideCanvas>
      ),
    },
    {
      id: "esquemas",
      label: "Esquemas",
      content: (
        <SlideCanvas>
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>Esquemas de pago</h2>
          <p className={`mt-2 text-[14px] ${t.body}`}>
            {propuestaBbr.mesesConstruccion} meses de construcción considerados en el modelo.
          </p>
          <div className="mt-8">
            <EsquemasPanel esquemas={data.esquemas} tasa={data.tasaDescuentoAnual} />
          </div>
        </SlideCanvas>
      ),
    },
    {
      id: "publicidad",
      label: "Publicidad",
      content: (
        <SlideCanvas>
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>Publicidad</h2>
          <p className={`mt-3 text-[15px] ${t.body}`}>
            Porcentaje considerado: {pct(publicidad.porcentaje)} del total de venta.
          </p>
          <div className="propuesta-kpi-grid mt-8 grid gap-4 sm:grid-cols-2">
            <SlideKpi label="Total" value={formatTicket(publicidad.total)} accent />
            <SlideKpi label="Disponible al mes" value={formatTicket(publicidad.mensual)} />
          </div>
          <ul className={`mt-10 space-y-2.5 text-[14px] leading-relaxed ${t.body}`}>
            {publicidad.rubros.map((rubro) => (
              <li key={rubro}>{rubro}</li>
            ))}
          </ul>
        </SlideCanvas>
      ),
    },
    {
      id: "propuesta",
      label: "Propuesta",
      content: (
        <SlideCanvas>
          <h2 className={`text-3xl md:text-4xl ${t.title}`}>Propuesta</h2>
          <div className={`mt-8 space-y-6 text-[15px] leading-relaxed ${t.bodyStrong}`}>
            <p>
              Contrato de <strong>exclusiva de venta</strong> y conformación de equipo comercial:{" "}
              {propuestaBbr.equipo.join(", ")}.
            </p>
            <p>
              <strong>Comisión del {pct(propuestaBbr.comision)} + IVA</strong> en venta interna (equipo
              BBR). Pago del 100% a la firma de oferta de compra o contrato y pago de enganche de los
              lotes.
            </p>
            {propuestaBbr.comisionInmobiliaria != null ? (
              <p>
                Comisión del{" "}
                <strong>{pct(propuestaBbr.comisionInmobiliaria)} + IVA</strong> en venta externa por
                inmobiliarias aliadas.
              </p>
            ) : (
              <p>
                En caso de venta por el desarrollador, la comisión será del{" "}
                {pct(propuestaBbr.comisionVentaDirecta)} + IVA.
              </p>
            )}
          </div>
        </SlideCanvas>
      ),
    },
    {
      id: "cierre",
      label: "Cierre",
      content: (
        <SlidePortada>
          <BbrHabitareaLogo height={40} className="mx-auto" />
          <p className={`mt-10 text-lg ${t.body}`}>Preparado para {meta.preparadoPara}</p>
          <p className={`mt-2 text-sm ${t.body}`}>{meta.fecha}</p>
        </SlidePortada>
      ),
    },
  ];
}

export function NuboPropuestaSlides({
  data,
  media = NUBO_MEDIA,
  viewerMode = "operator",
}: {
  data: PropuestaComercialData;
  media?: PropuestaComercialMedia;
  viewerMode?: "operator" | "developer";
}) {
  const slides = useMemo(() => buildPropuestaSlides(data, media), [data, media]);
  const isDeveloper = viewerMode === "developer";

  return (
    <PropuestaSlideDeck
      titulo={`${data.meta.titulo} · ${data.meta.ubicacion}`}
      slides={slides}
      backHref="/propuestas"
      backLabel="Propuestas"
      viewerMode={viewerMode}
      documentView={
        isDeveloper ? undefined : (
          <div className="propuesta-document-print mx-auto max-w-[880px] bg-[#FDFCFA] shadow-lg">
            <NuboPropuestaView data={data} />
          </div>
        )
      }
    />
  );
}

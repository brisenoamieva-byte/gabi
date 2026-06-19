"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calculator,
  FileText,
  MapPin,
  Sparkles,
  Trees,
} from "lucide-react";
import { GabiSistemaMark } from "@/components/brand/GabiLogo";
import { CorredorDesarrolloCard } from "@/components/corredor/CorredorDesarrolloCard";
import { CorredorEntityLogo } from "@/components/corredor/CorredorEntityLogo";
import { CorredorMap } from "@/components/corredor/CorredorMap";
import { AMENIDADES_TIER } from "@/lib/corredor/contexto-mercado";
import { getCorredorMapsUrl, getDesarrolloUbicacion } from "@/lib/corredor/coordinates";
import { estimateMensualidad, estimateTicketPromedio } from "@/lib/corredor/filters";
import { isInvesttiCatalogDesarrollo } from "@/lib/catalog/investti-desarrollos";
import {
  CANADAS_DEL_VALLE_ID,
  getCompetidoresDirectosCDV,
} from "@/lib/corredor/investti-analisis";
import { CORREDOR_DESARROLLADORES } from "@/lib/corredor/zona-sur-seed";
import { useResolvedCorredorCatalog } from "@/lib/corredor/use-resolved-corredor-catalog";
import { CORREDOR_INMOBILIARIA } from "@/lib/corredor/inmobiliaria";
import { CORREDOR_FICHA_ETAPAS, type CorredorFichaEtapa } from "@/lib/corredor/types";
import { formatPrice, formatTicket } from "@/lib/data";
import { useRequireAsesorSession } from "@/lib/session/useRequireAsesorSession";

export default function CorredorDesarrolloPage() {
  const params = useParams();
  const desarrolloId = typeof params.desarrolloId === "string" ? params.desarrolloId : "";
  const { authReady } = useRequireAsesorSession({ requireDesarrollo: false });
  const { desarrollos, loading: catalogLoading, getById } = useResolvedCorredorCatalog();
  const desarrollo = getById(desarrolloId);
  const [etapa, setEtapa] = useState<CorredorFichaEtapa>("desarrollador");
  const [loteM2, setLoteM2] = useState(330);
  const [enganchePct, setEnganchePct] = useState(15);
  const [plazoMeses, setPlazoMeses] = useState(60);

  useEffect(() => {
    if (desarrollo) {
      setLoteM2(Math.round((desarrollo.loteMinM2 + desarrollo.loteMaxM2) / 2));
      setEnganchePct(desarrollo.enganchePct ?? 15);
      setPlazoMeses(desarrollo.plazoMeses ?? 60);
    }
  }, [desarrollo]);

  const comparables = useMemo(() => {
    if (!desarrollo) return [];
    if (desarrollo.id === CANADAS_DEL_VALLE_ID) {
      return getCompetidoresDirectosCDV();
    }
    return desarrollos.filter(
      (d) => d.id !== desarrollo.id && d.desarrolladorId !== desarrollo.desarrolladorId,
    ).slice(0, 5);
  }, [desarrollo, desarrollos]);

  const desarrolladorInfo = useMemo(() => {
    if (!desarrollo) return null;
    return CORREDOR_DESARROLLADORES.find((d) => d.id === desarrollo.desarrolladorId);
  }, [desarrollo]);

  const simulacion = useMemo(() => {
    if (!desarrollo) return null;
    const precioM2 = (desarrollo.precioMinM2 + desarrollo.precioMaxM2) / 2;
    const ticket = loteM2 * precioM2;
    const enganche = ticket * (enganchePct / 100);
    const financiado = ticket - enganche;
    const mensualidad = plazoMeses > 0 ? Math.round(financiado / plazoMeses) : 0;
    return { ticket, enganche, financiado, mensualidad, precioM2 };
  }, [desarrollo, loteM2, enganchePct, plazoMeses]);

  if (!authReady || catalogLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-[#201044]">
        <p className="text-lg font-semibold">Cargando ficha...</p>
      </main>
    );
  }

  if (!desarrollo) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8FAFC] p-6 text-[#201044]">
        <p className="font-semibold">Desarrollo no encontrado.</p>
        <Link href="/corredor" className="text-sm font-bold text-[#6cc24a] underline">
          Volver al corredor
        </Link>
      </main>
    );
  }

  const etapaIndex = CORREDOR_FICHA_ETAPAS.findIndex((e) => e.id === etapa);
  const ubicacion = getDesarrolloUbicacion(desarrollo);
  const mapsUrl = getCorredorMapsUrl(desarrollo);

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#201044]">
      <header className="border-b border-black/8 bg-white px-5 py-4 shadow-sm md:px-10">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            href="/corredor"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
            aria-label="Volver al corredor"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <GabiSistemaMark size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#201044]/50">
              Ficha · {desarrollo.kmLabel}
            </p>
            <h1 className="truncate text-lg font-black">{desarrollo.nombre}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-6 md:px-10 md:py-8">
        <section className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Pin del desarrollo
              </p>
              <p className="mt-1 text-sm font-semibold text-[#201044]">
                {desarrollo.kmLabel} · {desarrollo.desarrollador}
              </p>
              {ubicacion.aproximada ? (
                <p className="mt-1 text-xs text-amber-700">Ubicación aproximada en mapa.</p>
              ) : (
                <p className="mt-1 text-xs text-slate-500">{desarrollo.mapQuery}</p>
              )}
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-[#6cc24a] underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              Google Maps
            </a>
          </div>
          <div className="mt-3">
            <CorredorMap
              desarrollos={desarrollos}
              selectedId={desarrollo.id}
              onSelect={() => undefined}
              singleDesarrolloId={desarrollo.id}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Contexto de Querétaro, corredor y servicios de la zona están en{" "}
            <Link href="/corredor" className="font-bold text-[#6cc24a] underline">
              la página principal del corredor
            </Link>
            .
          </p>
        </section>

        <nav className="mb-6 flex gap-1 overflow-x-auto pb-1">
          {CORREDOR_FICHA_ETAPAS.map((step, i) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setEtapa(step.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                etapa === step.id
                  ? "bg-[#201044] text-white"
                  : i <= etapaIndex
                    ? "bg-[#201044]/10 text-[#201044]"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {step.label}
            </button>
          ))}
        </nav>

        {etapa === "desarrollador" ? (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-3">
              {desarrolladorInfo ? (
                <CorredorEntityLogo
                  tipo="desarrollador"
                  id={desarrolladorInfo.id}
                  nombre={desarrollo.desarrollador}
                  size="lg"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#201044]/6">
                  <Building2 className="h-6 w-6" />
                </span>
              )}
              <div>
                <h2 className="text-lg font-black">{desarrollo.desarrollador}</h2>
                <p className="text-sm text-slate-500">
                  {desarrolladorInfo?.proyectos.length ?? 1} proyecto(s) en el corredor
                </p>
              </div>
            </div>
            {desarrolladorInfo ? (
              <ul className="mt-4 space-y-2 text-sm">
                {desarrolladorInfo.proyectos.map((pid) => {
                  const p = getById(pid);
                  if (!p) return null;
                  return (
                    <li key={pid} className="rounded-lg bg-[#F2F0E9] px-3 py-2">
                      <span className="font-semibold">{p.nombre}</span>
                      <span className="text-slate-500"> · {p.kmLabel}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {desarrollo.guiaAsesor ? (
              <p className="mt-4 rounded-xl border border-[#201044]/10 bg-[#F2F0E9] p-3 text-sm">
                <strong>Guía asesor:</strong> {desarrollo.guiaAsesor}
              </p>
            ) : null}
          </section>
        ) : null}

        {etapa === "producto" ? (
          <section className="space-y-4">
            {desarrollo.convenioDirecto === true ? (
              <div className="rounded-2xl border border-[#6cc24a]/30 bg-[#6cc24a]/10 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#201044]/60">
                  {CORREDOR_INMOBILIARIA.nombre}
                </p>
                <p className="mt-1 text-sm font-black text-[#201044]">
                  Representante autorizado · precios vigentes · trato directo
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {CORREDOR_INMOBILIARIA.pilares[0].detalle} {CORREDOR_INMOBILIARIA.pilares[1].detalle}
                </p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Trees className="h-5 w-5 text-[#6cc24a]" />
                <h2 className="text-lg font-black">Producto — terrenos</h2>
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F2F0E9] p-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Tipología</dt>
                  <dd className="font-black">
                    {desarrollo.loteMinM2}–{desarrollo.loteMaxM2} m²
                  </dd>
                </div>
                <div className="rounded-xl bg-[#F2F0E9] p-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Precio / m²</dt>
                  <dd className="font-black">
                    {formatPrice(desarrollo.precioMinM2)} – {formatPrice(desarrollo.precioMaxM2)}
                  </dd>
                </div>
                <div className="rounded-xl bg-[#F2F0E9] p-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Ticket desde</dt>
                  <dd className="font-black">{formatTicket(desarrollo.ticketDesde)}</dd>
                </div>
                <div className="rounded-xl bg-[#F2F0E9] p-3">
                  <dt className="text-[10px] font-bold uppercase text-slate-400">Absorción</dt>
                  <dd className="font-black">
                    {desarrollo.absorcionMes != null
                      ? `${desarrollo.absorcionMes} lotes/mes`
                      : "Sin dato"}
                  </dd>
                </div>
              </dl>
              {desarrollo.notas ? (
                <p className="mt-3 text-sm text-slate-600">{desarrollo.notas}</p>
              ) : null}
              {desarrollo.brochureUrl ? (
                <a
                  href={desarrollo.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#201044]/15 bg-white px-4 py-2.5 text-sm font-bold text-[#201044] transition hover:bg-[#F2F0E9]"
                >
                  <FileText className="h-4 w-4 text-[#6cc24a]" />
                  Ver brochure oficial
                </a>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black">Amenidades</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {desarrollo.amenidades.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>

            {desarrollo.argumentosVenta?.length ? (
              <div className="rounded-2xl border border-[#6cc24a]/30 bg-[#6cc24a]/10 p-5">
                <h3 className="text-sm font-black">Argumentos de venta</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {desarrollo.argumentosVenta.map((arg) => (
                    <li key={arg} className="flex gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#201044]" />
                      {arg}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-black">Benchmark de amenidades (mercado)</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {Object.entries(AMENIDADES_TIER).map(([tier, items]) => (
                  <div key={tier} className="rounded-xl bg-[#F2F0E9] p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-400">{tier}</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                      {items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {etapa === "comparativo" ? (
          <section className="space-y-4">
            <p className="text-sm text-slate-600">
              Ticket promedio estimado de {desarrollo.nombre}:{" "}
              <strong>{formatTicket(estimateTicketPromedio(desarrollo))}</strong> · Mensual est.:{" "}
              <strong>{formatPrice(estimateMensualidad(desarrollo))}</strong>
            </p>
            {comparables.map((c) => (
              <CorredorDesarrolloCard key={c.id} desarrollo={c} />
            ))}
          </section>
        ) : null}

        {etapa === "simulador" ? (
          isInvesttiCatalogDesarrollo(desarrollo.id) ? (
            <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-black">Simulador oficial</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                El simulador de pagos Investti está en el recorrido y en el cotizador del desarrollo
                — mismo flujo que Pasaje Álamos.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/recorrido"
                  className="inline-flex items-center rounded-xl bg-[#6cc24a] px-4 py-2.5 text-sm font-bold text-[#201044]"
                >
                  Ir al recorrido
                </Link>
                <Link
                  href="/cotizador"
                  className="inline-flex items-center rounded-xl border border-[#201044]/15 px-4 py-2.5 text-sm font-semibold text-[#201044]"
                >
                  Cotizador
                </Link>
              </div>
            </section>
          ) : simulacion ? (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#6cc24a]" />
              <h2 className="text-lg font-black">Simulador rápido</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-400">Lote (m²)</span>
                <input
                  type="number"
                  min={desarrollo.loteMinM2}
                  max={desarrollo.loteMaxM2}
                  value={loteM2}
                  onChange={(e) => setLoteM2(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-400">Enganche %</span>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={enganchePct}
                  onChange={(e) => setEnganchePct(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-slate-400">Meses</span>
                <input
                  type="number"
                  min={12}
                  max={120}
                  value={plazoMeses}
                  onChange={(e) => setPlazoMeses(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[#F2F0E9] p-4">
                <dt className="text-[10px] font-bold uppercase text-slate-400">Ticket</dt>
                <dd className="text-xl font-black">{formatTicket(simulacion.ticket)}</dd>
              </div>
              <div className="rounded-xl bg-[#6cc24a]/20 p-4">
                <dt className="text-[10px] font-bold uppercase text-slate-400">Mensualidad</dt>
                <dd className="text-xl font-black">{formatPrice(simulacion.mensualidad)}</dd>
              </div>
              <div className="rounded-xl bg-[#F2F0E9] p-4">
                <dt className="text-[10px] font-bold uppercase text-slate-400">Enganche</dt>
                <dd className="text-lg font-black">{formatPrice(simulacion.enganche)}</dd>
              </div>
              <div className="rounded-xl bg-[#F2F0E9] p-4">
                <dt className="text-[10px] font-bold uppercase text-slate-400">A financiar</dt>
                <dd className="text-lg font-black">{formatPrice(simulacion.financiado)}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-400">
              Simulación orientativa con precio/m² promedio del desarrollo. Inventario real y
              esquemas oficiales se integrarán por proyecto.
            </p>
          </section>
          ) : null
        ) : null}

        <div className="mt-8 flex justify-between gap-3">
          <button
            type="button"
            disabled={etapaIndex <= 0}
            onClick={() => setEtapa(CORREDOR_FICHA_ETAPAS[etapaIndex - 1]?.id ?? "desarrollador")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={etapaIndex >= CORREDOR_FICHA_ETAPAS.length - 1}
            onClick={() => setEtapa(CORREDOR_FICHA_ETAPAS[etapaIndex + 1]?.id ?? "simulador")}
            className="rounded-xl bg-[#201044] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </main>
  );
}

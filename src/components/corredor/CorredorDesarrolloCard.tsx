"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, Sparkles } from "lucide-react";
import { formatPrice, formatTicket } from "@/lib/data";
import { getDesarrolloUbicacion } from "@/lib/corredor/coordinates";
import { estimateMensualidad } from "@/lib/corredor/filters";
import type { CorredorDesarrollo } from "@/lib/corredor/types";

type CorredorDesarrolloCardProps = {
  desarrollo: CorredorDesarrollo;
  selected?: boolean;
  onSelect?: () => void;
};

export function CorredorDesarrolloCard({
  desarrollo,
  selected,
  onSelect,
}: CorredorDesarrolloCardProps) {
  const mensualidad = estimateMensualidad(desarrollo);
  const ubicacion = getDesarrolloUbicacion(desarrollo);
  const convenio = desarrollo.convenioDirecto === true;

  return (
    <article
      className={`rounded-2xl border bg-white p-4 shadow-sm transition md:p-5 ${
        selected
          ? "border-[#6cc24a] ring-2 ring-[#6cc24a]/30"
          : "border-slate-200/90 hover:border-[#201044]/12"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-[#201044] md:text-lg">{desarrollo.nombre}</h3>
            {desarrollo.esProyectoPropio ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#6cc24a]/20 px-2 py-0.5 text-[10px] font-bold uppercase text-[#201044]">
                <Sparkles className="h-3 w-3" />
                BBR
              </span>
            ) : null}
            {desarrollo.destacado ? (
              <span className="rounded-full bg-[#6cc24a] px-2 py-0.5 text-[10px] font-bold uppercase text-[#201044]">
                Líder absorción
              </span>
            ) : null}
            {convenio ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#201044]/10 bg-[#F2F0E9] px-2 py-0.5 text-[10px] font-bold uppercase text-[#201044]">
                <BadgeCheck className="h-3 w-3 text-[#6cc24a]" />
                Convenio directo
              </span>
            ) : null}
            {!ubicacion.aproximada ? (
              <span className="rounded-full bg-[#201044]/8 px-2 py-0.5 text-[10px] font-semibold text-[#201044]">
                Pin verificado
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            {desarrollo.kmLabel} · {desarrollo.desarrollador}
          </p>
        </div>
        {onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600"
          >
            Mapa
          </button>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-400">Lote</dt>
          <dd className="font-semibold text-[#201044]">
            {desarrollo.loteMinM2}–{desarrollo.loteMaxM2} m²
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-400">$/m²</dt>
          <dd className="font-semibold text-[#201044]">
            {formatPrice(desarrollo.precioMinM2).replace(".00", "")}–
            {formatPrice(desarrollo.precioMaxM2).replace(".00", "")}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-400">Desde</dt>
          <dd className="font-semibold text-[#201044]">{formatTicket(desarrollo.ticketDesde)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase text-slate-400">
            {desarrollo.absorcionMes != null ? "Absorción" : "Mensual est."}
          </dt>
          <dd className="font-semibold text-[#201044]">
            {desarrollo.absorcionMes != null
              ? `${desarrollo.absorcionMes}/mes`
              : formatPrice(mensualidad)}
          </dd>
        </div>
      </dl>

      {desarrollo.amenidades.length > 0 ? (
        <p className="mt-3 line-clamp-2 text-xs text-slate-500">
          {desarrollo.amenidades.slice(0, 4).join(" · ")}
          {desarrollo.amenidades.length > 4 ? "…" : ""}
        </p>
      ) : null}

      <Link
        href={`/corredor/${desarrollo.id}`}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#201044] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#201044]/90"
      >
        Ver ficha y recorrido
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

"use client";

import { useState } from "react";
import { Building2, Globe2, MapPin, Route, Sparkles, TrendingUp } from "lucide-react";
import {
  CORREDOR_CONTEXTO,
  CORREDOR_STATS,
} from "@/lib/corredor/contexto-mercado";
import { CORREDOR_ZONA_ETAPAS, type CorredorZonaEtapa } from "@/lib/corredor/types";
import { CORREDOR_ZONA } from "@/lib/corredor/zona-sur-seed";
import { CORREDOR_ZONA_MACRO } from "@/lib/corredor/zona-macro";
import { CorredorZonaMacroPanel } from "@/components/corredor/CorredorZonaMacroPanel";
import { formatPrice } from "@/lib/data";

const categoriaIcon = (categoria: string) => {
  if (categoria.includes("Comercial")) return Building2;
  if (categoria.includes("Salud")) return Sparkles;
  return MapPin;
};

export function CorredorZonaContextoPanel() {
  const [etapa, setEtapa] = useState<CorredorZonaEtapa>("macro");

  return (
    <section className="overflow-hidden rounded-2xl border border-[#201044]/10 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 md:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#201044]/50">
          Contexto de la zona
        </p>
        <h2 className="mt-1 text-lg font-black md:text-xl">
          Aplica a todos los desarrollos del corredor
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Presenta Querétaro, el corredor y la ubicación una sola vez aquí. En cada ficha verás
          solo lo específico del proyecto.
        </p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 pt-3 md:px-6">
        {CORREDOR_ZONA_ETAPAS.map((step) => {
          const Icon =
            step.id === "macro" ? Globe2 : step.id === "corredor" ? Route : MapPin;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setEtapa(step.id)}
              className={`mb-3 flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                etapa === step.id
                  ? "bg-[#201044] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {step.label}
            </button>
          );
        })}
      </nav>

      <div className="p-5 md:p-6">
        {etapa === "macro" ? (
          <CorredorZonaMacroPanel compact embedded />
        ) : null}

        {etapa === "corredor" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#6cc24a]/20 text-[#201044]">
                <Route className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-black">{CORREDOR_ZONA.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{CORREDOR_ZONA.subtitulo}</p>
                <p className="mt-2 text-xs text-slate-500">{CORREDOR_ZONA.mensajeAsesor}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-[#F2F0E9]/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#6cc24a]" />
                <h4 className="text-sm font-black">{CORREDOR_CONTEXTO.titulo}</h4>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {CORREDOR_CONTEXTO.indicadores.map((item) => (
                  <div key={item.etiqueta} className="rounded-xl bg-white p-3 shadow-sm">
                    <p className="text-xl font-black text-[#201044]">{item.valor}</p>
                    <p className="text-xs font-semibold">{item.etiqueta}</p>
                    {item.detalle ? (
                      <p className="mt-1 text-[10px] text-slate-500">{item.detalle}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {CORREDOR_CONTEXTO.narrativa.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="text-[#6cc24a]">•</span>
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">{CORREDOR_CONTEXTO.fuente}</p>
              <p className="mt-2 text-xs text-slate-500">
                Rango corredor: {formatPrice(CORREDOR_STATS.precioMinM2)}/m² –{" "}
                {formatPrice(CORREDOR_STATS.precioMaxM2)}/m² · Promedio{" "}
                {formatPrice(CORREDOR_STATS.precioPromM2)}/m²
              </p>
            </div>
          </div>
        ) : null}

        {etapa === "zona" ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black">Servicios y conectividad del corredor</h3>
              <p className="mt-1 text-sm text-slate-600">
                Puntos de referencia comunes para ubicar cualquier desarrollo en el mapa de abajo.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {CORREDOR_ZONA.puntosCercanos.map((punto) => {
                const Icon = categoriaIcon(punto.categoria);
                return (
                  <div
                    key={punto.id}
                    className={`rounded-xl border p-4 ${
                      punto.destacado
                        ? "border-[#6cc24a]/40 bg-[#6cc24a]/10"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#201044]" />
                      <div>
                        <p className="font-bold text-sm">{punto.nombre}</p>
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          {punto.categoria} · {punto.tiempo}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">{punto.detalle}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400">{CORREDOR_ZONA_MACRO.fuente}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

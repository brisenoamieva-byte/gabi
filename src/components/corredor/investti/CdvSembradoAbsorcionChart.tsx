"use client";

import { Database } from "lucide-react";
import {
  CDV_SEMBRADO_FUENTE,
  CDV_SEMBRADO_RANGOS,
  CDV_SEMBRADO_RESUMEN,
  getCdvSembradoConclusiones,
} from "@/lib/corredor/cdv-sembrado-analisis";
import { METRAJE_RECOMENDADO_MAX, METRAJE_RECOMENDADO_MIN } from "@/lib/corredor/investti-analisis";

export function CdvSembradoAbsorcionChart() {
  const maxDemanda = Math.max(...CDV_SEMBRADO_RANGOS.map((r) => r.vendidosYApartados));
  const conclusiones = getCdvSembradoConclusiones();

  return (
    <section className="overflow-hidden rounded-3xl border border-[#201044]/10 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#F2F0E9] to-white px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-[#6cc24a]" />
              <h3 className="text-lg font-black text-[#201044]">
                Sembrado real — Cañadas del Valle
              </h3>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {CDV_SEMBRADO_RESUMEN.vendidas} ventas · {CDV_SEMBRADO_RESUMEN.apartados} apartados
              · {CDV_SEMBRADO_RESUMEN.disponibles} disponibles · mediana venta{" "}
              {CDV_SEMBRADO_RESUMEN.medianaVentaM2} m²
            </p>
          </div>
          <div className="rounded-xl border border-[#6cc24a]/30 bg-[#6cc24a]/10 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase text-[#201044]/50">Apartados (pipeline)</p>
            <p className="text-lg font-black text-[#201044]">
              mediana {CDV_SEMBRADO_RESUMEN.medianaApartadoM2} m²
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 md:p-6">
        <p className="mb-4 text-xs text-slate-500">
          Barras = ventas + apartados por rango · línea gris = inventario disponible · banda verde
          = propuesta nueva etapa ({METRAJE_RECOMENDADO_MIN}–{METRAJE_RECOMENDADO_MAX} m²)
        </p>

        <div className="space-y-2.5">
          {CDV_SEMBRADO_RANGOS.map((r) => {
            const enRecomendacion =
              r.maxM2 > METRAJE_RECOMENDADO_MIN && r.minM2 < METRAJE_RECOMENDADO_MAX;
            const barPct = (r.vendidosYApartados / maxDemanda) * 100;
            const stPct = Math.round(r.sellThrough * 100);
            const alta = r.sellThrough >= 0.9 && r.vendidosYApartados >= 10;

            return (
              <div
                key={r.rango}
                className={`grid items-center gap-3 rounded-xl px-2 py-1.5 md:grid-cols-[5rem_1fr_4.5rem] ${
                  enRecomendacion ? "bg-[#6cc24a]/[0.06] ring-1 ring-[#6cc24a]/20" : ""
                }`}
              >
                <span className="text-xs font-bold tabular-nums text-[#201044]">{r.rango}</span>
                <div className="relative h-8">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div
                      className={`h-5 rounded-full transition-all ${
                        alta
                          ? "bg-gradient-to-r from-[#6cc24a] to-[#5ab83f]"
                          : "bg-gradient-to-r from-[#201044]/70 to-[#201044]/45"
                      }`}
                      style={{ width: `${Math.max(barPct, r.vendidosYApartados > 0 ? 4 : 0)}%` }}
                    />
                    {r.disponibles > 0 ? (
                      <span
                        className="absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-slate-300"
                        style={{
                          left: `${barPct + 2}%`,
                          boxShadow: `0 0 0 3px white`,
                        }}
                        title={`${r.disponibles} disponibles`}
                      />
                    ) : null}
                  </div>
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500">
                    {r.disponibles > 0 ? `${r.disponibles} disp.` : ""}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black tabular-nums text-[#201044]">
                    {r.vendidosYApartados}
                  </p>
                  <p
                    className={`text-[10px] font-bold ${alta ? "text-[#6cc24a]" : "text-slate-400"}`}
                  >
                    {stPct}% ST
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          {conclusiones.map((c) => (
            <li key={c} className="flex gap-2 text-sm leading-relaxed text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6cc24a]" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <p className="border-t border-slate-100 px-5 py-2.5 text-[10px] text-slate-400 md:px-6">
        {CDV_SEMBRADO_FUENTE}. ST = sell-through (vendidos+apartados ÷ total del rango).
      </p>
    </section>
  );
}

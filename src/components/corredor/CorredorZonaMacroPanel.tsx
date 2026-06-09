"use client";

import { useState } from "react";
import {
  Building2,
  Globe2,
  MapPinned,
  Mountain,
  type LucideIcon,
} from "lucide-react";
import { CORREDOR_ZONA_MACRO } from "@/lib/corredor/zona-macro";
import type { CorredorZonaMacroBloque } from "@/lib/corredor/types";

const BLOQUE_ICONS: Record<CorredorZonaMacroBloque["id"], LucideIcon> = {
  queretaro: Globe2,
  corregidora: Building2,
  huimilpan: Mountain,
};

const BLOQUE_ACCENT: Record<CorredorZonaMacroBloque["id"], string> = {
  queretaro: "border-[#201044]/15 bg-[#201044]/[0.03]",
  corregidora: "border-[#6cc24a]/40 bg-[#6cc24a]/10",
  huimilpan: "border-amber-200/80 bg-amber-50/80",
};

type CorredorZonaMacroPanelProps = {
  compact?: boolean;
  /** Sin contenedor propio — para incrustar en CorredorZonaContextoPanel */
  embedded?: boolean;
  /** Resalta Huimilpan si el desarrollo está en ese municipio */
  highlightHuimilpan?: boolean;
};

export function CorredorZonaMacroPanel({
  compact = false,
  embedded = false,
  highlightHuimilpan = false,
}: CorredorZonaMacroPanelProps) {
  const [activeId, setActiveId] = useState<CorredorZonaMacroBloque["id"]>("queretaro");
  const active =
    CORREDOR_ZONA_MACRO.bloques.find((b) => b.id === activeId) ??
    CORREDOR_ZONA_MACRO.bloques[0];

  const body = (
    <>
      {!embedded ? (
        <div className="border-b border-slate-100 px-5 py-5 md:px-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
              <MapPinned className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#201044]/50">
                Contexto macro
              </p>
              <h2 className="text-lg font-black md:text-xl">{CORREDOR_ZONA_MACRO.titulo}</h2>
              <p className="mt-1 text-sm text-slate-600">{CORREDOR_ZONA_MACRO.subtitulo}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <h3 className="text-lg font-black">{CORREDOR_ZONA_MACRO.titulo}</h3>
          <p className="mt-1 text-sm text-slate-600">{CORREDOR_ZONA_MACRO.subtitulo}</p>
        </div>
      )}

      <div
        className={`flex gap-1 overflow-x-auto ${embedded ? "" : "border-b border-slate-100 px-4 pt-3 md:px-6"}`}
      >
        {CORREDOR_ZONA_MACRO.bloques.map((bloque) => {
          const Icon = BLOQUE_ICONS[bloque.id];
          const on = activeId === bloque.id;
          const huimilpanHint = bloque.id === "huimilpan" && highlightHuimilpan;
          return (
            <button
              key={bloque.id}
              type="button"
              onClick={() => setActiveId(bloque.id)}
              className={`mb-3 flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                on
                  ? "bg-[#201044] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              } ${huimilpanHint && !on ? "ring-2 ring-amber-300" : ""}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {bloque.titulo}
            </button>
          );
        })}
      </div>

      <div className={embedded ? "pt-4" : "p-5 md:p-6"}>
        <div className={`rounded-2xl border p-4 md:p-5 ${BLOQUE_ACCENT[active.id]}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {active.badge}
              </span>
              <h3 className="mt-0.5 text-base font-black text-[#201044] md:text-lg">
                {active.titulo}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{active.subtitulo}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {active.indicadores.map((item) => (
              <div
                key={item.etiqueta}
                className="rounded-xl border border-white/80 bg-white/90 p-3 shadow-sm"
              >
                <p className="text-lg font-black tabular-nums text-[#201044] md:text-xl">
                  {item.valor}
                </p>
                <p className="text-[11px] font-semibold text-[#201044]/80">{item.etiqueta}</p>
                {item.detalle ? (
                  <p className="mt-1 text-[10px] leading-snug text-slate-500">{item.detalle}</p>
                ) : null}
              </div>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {active.puntosClave.map((punto) => (
              <li key={punto} className="flex gap-2 text-sm leading-relaxed text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6cc24a]" />
                {punto}
              </li>
            ))}
          </ul>

          {active.notaAplicabilidad ? (
            <p className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/90 px-3 py-2 text-xs text-amber-900">
              {active.notaAplicabilidad}
            </p>
          ) : null}
        </div>

        {!compact ? (
          <p className="mt-4 rounded-xl bg-[#F2F0E9] px-4 py-3 text-xs leading-relaxed text-slate-600">
            <strong className="text-[#201044]">Guía asesor:</strong> {CORREDOR_ZONA_MACRO.guiaAsesor}
          </p>
        ) : null}
      </div>

      {!embedded ? (
        <p className="border-t border-slate-100 px-5 py-2.5 text-[10px] text-slate-400 md:px-6">
          {CORREDOR_ZONA_MACRO.fuente}
        </p>
      ) : (
        <p className="mt-4 text-[10px] text-slate-400">{CORREDOR_ZONA_MACRO.fuente}</p>
      )}
    </>
  );

  if (embedded) return body;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#201044]/10 bg-white shadow-sm">
      {body}
    </section>
  );
}

/** Vista en columnas para pantallas anchas (hub corredor). */
export function CorredorZonaMacroOverview() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#201044]/10 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 md:px-6">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#201044]/6 text-[#201044]">
            <MapPinned className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#201044]/50">
              Contexto macro · antes del corredor
            </p>
            <h2 className="text-lg font-black md:text-xl">{CORREDOR_ZONA_MACRO.titulo}</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">{CORREDOR_ZONA_MACRO.subtitulo}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-3 md:p-6">
        {CORREDOR_ZONA_MACRO.bloques.map((bloque) => {
          const Icon = BLOQUE_ICONS[bloque.id];
          return (
            <div
              key={bloque.id}
              className={`flex flex-col rounded-2xl border p-4 ${BLOQUE_ACCENT[bloque.id]}`}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/80 text-[#201044] shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    {bloque.badge}
                  </p>
                  <h3 className="text-sm font-black">{bloque.titulo}</h3>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600">{bloque.subtitulo}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {bloque.indicadores.slice(0, 4).map((item) => (
                  <div key={item.etiqueta} className="rounded-lg bg-white/90 p-2 shadow-sm">
                    <p className="text-sm font-black text-[#201044]">{item.valor}</p>
                    <p className="text-[9px] font-semibold leading-tight text-slate-600">
                      {item.etiqueta}
                    </p>
                  </div>
                ))}
              </div>
              <ul className="mt-3 flex-1 space-y-1.5">
                {bloque.puntosClave.slice(0, 3).map((p) => (
                  <li key={p} className="flex gap-1.5 text-[11px] leading-snug text-slate-700">
                    <span className="text-[#6cc24a]">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 bg-[#F2F0E9]/50 px-5 py-3 md:px-6">
        <p className="text-xs text-slate-600">
          <strong className="text-[#201044]">Guía asesor:</strong> {CORREDOR_ZONA_MACRO.guiaAsesor}
        </p>
        <p className="mt-1 text-[10px] text-slate-400">{CORREDOR_ZONA_MACRO.fuente}</p>
      </div>
    </section>
  );
}

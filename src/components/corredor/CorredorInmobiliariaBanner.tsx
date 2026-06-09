"use client";

import { BadgeCheck, Handshake, RefreshCw, ShieldCheck } from "lucide-react";
import { CORREDOR_INMOBILIARIA } from "@/lib/corredor/inmobiliaria";

const ICONS = [Handshake, RefreshCw, ShieldCheck, BadgeCheck];

export function CorredorInmobiliariaBanner() {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#201044]/12 bg-[#201044] text-white shadow-lg">
      <div className="border-b border-white/10 bg-gradient-to-r from-[#201044] to-[#2d1866] px-5 py-5 md:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#6cc24a]">
          {CORREDOR_INMOBILIARIA.especialidad}
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight md:text-2xl">
          {CORREDOR_INMOBILIARIA.nombre}
        </h2>
        <p className="mt-1 text-sm font-semibold text-white/80">
          {CORREDOR_INMOBILIARIA.tagline}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
          {CORREDOR_INMOBILIARIA.propuesta}
        </p>
      </div>
      <div className="grid gap-px bg-white/10 sm:grid-cols-2">
        {CORREDOR_INMOBILIARIA.pilares.map((pilar, i) => {
          const Icon = ICONS[i] ?? BadgeCheck;
          return (
            <div key={pilar.titulo} className="bg-[#201044] px-5 py-4 md:px-6">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#6cc24a]/20 text-[#6cc24a]">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-black">{pilar.titulo}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">{pilar.detalle}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="border-t border-white/10 px-5 py-3 text-[11px] text-white/50 md:px-6">
        {CORREDOR_INMOBILIARIA.fraseAsesor}
      </p>
    </section>
  );
}

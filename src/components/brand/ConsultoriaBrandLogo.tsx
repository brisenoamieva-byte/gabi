"use client";

import type { ReactNode } from "react";
import { BbrHabitareaLogo } from "@/components/brand/BbrHabitareaLogo";
import { DmbLogo, DmbTagline } from "@/components/brand/DmbLogo";
import { useConsultoriaMarca } from "@/components/brand/ConsultoriaMarcaProvider";
import {
  CONSULTORIA_MARCA_CONTACT,
  type ConsultoriaMarcaPresentacion,
} from "@/lib/brand/consultoria-marca";

type LogoProps = {
  className?: string;
  height?: number;
  href?: string;
  priority?: boolean;
  /** Si se omite, usa el contexto de marca. */
  marca?: ConsultoriaMarcaPresentacion;
};

export function ConsultoriaBrandLogo({
  className = "",
  height = 36,
  href,
  priority = false,
  marca: marcaProp,
}: LogoProps) {
  const { marca: marcaCtx } = useConsultoriaMarca();
  const marca = marcaProp ?? marcaCtx;

  if (marca === "dmb") {
    const variant = height >= 40 ? "header" : height >= 32 ? "plain" : "plain";
    return <DmbLogo variant={variant} className={className} href={href} />;
  }

  return (
    <BbrHabitareaLogo
      height={height}
      className={className}
      href={href}
      priority={priority}
    />
  );
}

export function ConsultoriaSlideMark({
  className = "",
  height = 24,
  marca: marcaProp,
}: {
  className?: string;
  height?: number;
  marca?: ConsultoriaMarcaPresentacion;
}) {
  const { marca: marcaCtx } = useConsultoriaMarca();
  const marca = marcaProp ?? marcaCtx;

  return (
    <div className={`pointer-events-none shrink-0 ${className}`.trim()} aria-hidden>
      <ConsultoriaBrandLogo
        marca={marca}
        height={height}
        className={marca === "dmb" ? "opacity-90" : "opacity-[0.82]"}
      />
    </div>
  );
}

export function SlideBrandHeader({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 flex shrink-0 justify-end sm:mb-3" aria-hidden>
      {children}
    </div>
  );
}

export function ConsultoriaAnalisisCredit({
  className = "",
  compact = false,
  inline = false,
  marca: marcaProp,
  elaboradoPor,
}: {
  className?: string;
  compact?: boolean;
  inline?: boolean;
  marca?: ConsultoriaMarcaPresentacion;
  elaboradoPor?: string;
}) {
  const { marca: marcaCtx } = useConsultoriaMarca();
  const marca = marcaProp ?? marcaCtx;
  const contact = CONSULTORIA_MARCA_CONTACT[marca];
  const shell = inline ? "" : compact ? "" : "rounded-2xl border border-[#201044]/10 bg-white px-4 py-3 shadow-sm";

  return (
    <div className={`flex items-center gap-3 ${shell} ${className}`.trim()}>
      <ConsultoriaBrandLogo marca={marca} height={compact ? 28 : 34} />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#201044]/45">
          Elaborado por
        </p>
        <p className="text-xs font-bold text-[#201044] md:text-sm">
          {elaboradoPor ?? contact.elaboradoDefault}
          {marca === "bbr" ? " · Estudios de mercado" : " · Consultoría comercial"}
        </p>
      </div>
    </div>
  );
}

export function ConsultoriaBrandTagline({
  className = "",
  marca: marcaProp,
}: {
  className?: string;
  marca?: ConsultoriaMarcaPresentacion;
}) {
  const { marca: marcaCtx } = useConsultoriaMarca();
  const marca = marcaProp ?? marcaCtx;

  if (marca === "dmb") {
    return <DmbTagline className={className} />;
  }

  return (
    <p className={`text-xs font-medium tracking-wide text-[#201044]/55 ${className}`.trim()}>
      Comercialización inmobiliaria
    </p>
  );
}

import Image from "next/image";
import Link from "next/link";

export const BBR_HABITAREA_LOGO_SRC = "/brand/bbr-habitarea-logo.png";

type BbrHabitareaLogoProps = {
  className?: string;
  /** Altura del logo (ancho proporcional). */
  height?: number;
  href?: string;
  priority?: boolean;
};

export function BbrHabitareaLogo({
  className = "",
  height = 36,
  href,
  priority = false,
}: BbrHabitareaLogoProps) {
  const img = (
    <Image
      src={BBR_HABITAREA_LOGO_SRC}
      alt="BBR Habitarea"
      width={Math.round(height * 3.2)}
      height={height}
      priority={priority}
      className={`h-auto w-auto object-contain ${className}`.trim()}
      style={{ height }}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 items-center"
        aria-label="BBR Habitarea"
      >
        {img}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0 items-center">{img}</span>;
}

/** Bloque de crédito: quién elaboró el análisis. */
export function BbrAnalisisCredit({
  className = "",
  compact = false,
  inline = false,
}: {
  className?: string;
  compact?: boolean;
  /** Sin borde ni fondo — para insertar sobre panel blanco existente. */
  inline?: boolean;
}) {
  const shell = inline
    ? ""
    : compact
      ? ""
      : "rounded-2xl border border-[#201044]/10 bg-white px-4 py-3 shadow-sm";

  return (
    <div className={`flex items-center gap-3 ${shell} ${className}`.trim()}>
      <BbrHabitareaLogo height={compact ? 28 : 34} />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#201044]/45">
          Elaborado por
        </p>
        <p className="text-xs font-bold text-[#201044] md:text-sm">
          BBR Habitarea · Estudios de mercado
        </p>
      </div>
    </div>
  );
}

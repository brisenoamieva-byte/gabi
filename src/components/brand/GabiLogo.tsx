import Link from "next/link";

type GabiLogoVariant = "header" | "hero" | "footer" | "platform" | "plain";

type GabiLogoProps = {
  variant?: GabiLogoVariant;
  className?: string;
  priority?: boolean;
  href?: string;
};

const variantClasses: Record<GabiLogoVariant, string> = {
  header: "text-[1.35rem] md:text-[1.5rem]",
  hero: "text-[1.75rem] md:text-[2rem]",
  footer: "text-[clamp(1.1rem,3.5vw,1.35rem)]",
  platform: "text-[0.95rem] md:text-[1.05rem]",
  plain: "text-[1.5rem]",
};

function GabiWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline leading-none ${className}`.trim()}
      aria-hidden
    >
      <span className="font-black tracking-[-0.03em] text-gabi-teal">g</span>
      <span className="font-black tracking-[-0.03em] text-gabi-navy">abi</span>
    </span>
  );
}

export function GabiLogo({
  variant = "plain",
  className = "",
  href,
}: GabiLogoProps) {
  const mark = (
    <span className={`inline-flex shrink-0 items-center ${variantClasses[variant]} ${className}`.trim()}>
      <GabiWordmark />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center" aria-label="gabi inicio">
        {mark}
      </Link>
    );
  }

  return mark;
}

export function GabiLogoBadge({
  className = "",
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-gabi-surface px-3.5 py-2 shadow-[inset_0_0_0_1px_rgba(19,49,92,0.08)] ${className}`.trim()}
    >
      <GabiLogo variant="plain" className="text-[1.35rem]" />
    </span>
  );
}

export function GabiLogoOnDark({
  className = "",
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm ${className}`.trim()}
    >
      <GabiLogo variant="platform" />
    </span>
  );
}

type GabiSistemaMarkProps = {
  /** Tamaño del wordmark gabi */
  size?: "sm" | "md";
  /** Alineación del bloque Sistema + gabi */
  align?: "start" | "center" | "end";
  /** Estilo editorial (memo Investti) vs. app corredor */
  tone?: "app" | "report";
  /** Línea opcional bajo el logo */
  tagline?: string;
  href?: string;
  className?: string;
};

const sistemaLogoSize: Record<NonNullable<GabiSistemaMarkProps["size"]>, GabiLogoVariant> = {
  sm: "platform",
  md: "header",
};

/** Marca compuesta: “Sistema” sobre el wordmark gabi */
export function GabiSistemaMark({
  size = "md",
  align = "start",
  tone = "app",
  tagline,
  href,
  className = "",
}: GabiSistemaMarkProps) {
  const alignClass =
    align === "end" ? "items-end text-right" : align === "center" ? "items-center text-center" : "items-start text-left";

  const sistemaLabelClass =
    tone === "report"
      ? "text-[10px] font-medium uppercase tracking-[0.16em] text-neutral-500"
      : "text-[9px] font-bold uppercase tracking-[0.2em] text-[#201044]/45";

  const taglineClass =
    tone === "report"
      ? "mt-1.5 max-w-[14rem] text-[11px] leading-relaxed text-neutral-500"
      : "mt-1 max-w-[12rem] text-[10px] leading-snug text-slate-500";

  const block = (
    <span className={`inline-flex flex-col ${alignClass} ${className}`.trim()}>
      <span className={sistemaLabelClass}>Sistema</span>
      <GabiLogo variant={sistemaLogoSize[size]} className="-mt-0.5" />
      {tagline ? <span className={taglineClass}>{tagline}</span> : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0" aria-label="Sistema gabi inicio">
        {block}
      </Link>
    );
  }

  return block;
}

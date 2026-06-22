import Link from "next/link";

type DmbLogoVariant = "header" | "hero" | "plain";

type DmbLogoProps = {
  variant?: DmbLogoVariant;
  className?: string;
  href?: string;
};

const variantClasses: Record<DmbLogoVariant, string> = {
  header: "text-[1.5rem] md:text-[1.65rem]",
  hero: "text-[2rem] md:text-[2.5rem]",
  plain: "text-[1.35rem]",
};

function DmbWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-baseline font-black leading-none tracking-[-0.04em] text-dmb-ink ${className}`.trim()}
      aria-hidden
    >
      DMB
    </span>
  );
}

export function DmbLogo({ variant = "plain", className = "", href }: DmbLogoProps) {
  const mark = (
    <span className={`inline-flex shrink-0 items-center ${variantClasses[variant]} ${className}`.trim()}>
      <DmbWordmark />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center" aria-label="DMB inicio">
        {mark}
      </Link>
    );
  }

  return mark;
}

export function DmbTagline({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs font-medium tracking-wide text-dmb-muted ${className}`.trim()}>
      Consultoría comercial inmobiliaria
    </p>
  );
}

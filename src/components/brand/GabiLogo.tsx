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

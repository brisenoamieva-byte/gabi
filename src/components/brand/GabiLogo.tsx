import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/logos/gabi-logo-transparent.png";
const LOGO_WIDTH = 1018;
const LOGO_HEIGHT = 559;

type GabiLogoVariant = "header" | "hero" | "footer" | "platform" | "plain";

type GabiLogoProps = {
  variant?: GabiLogoVariant;
  className?: string;
  priority?: boolean;
  href?: string;
};

const variantClasses: Record<GabiLogoVariant, string> = {
  header: "h-7 w-auto md:h-8",
  hero: "h-10 w-auto md:h-12",
  footer: "h-[clamp(1.25rem,4vh,1.75rem)] w-auto opacity-90",
  platform: "h-4 w-auto opacity-80 md:h-[1.125rem]",
  plain: "h-8 w-auto",
};

export function GabiLogo({
  variant = "plain",
  className = "",
  priority = false,
  href,
}: GabiLogoProps) {
  const image = (
    <Image
      src={LOGO_SRC}
      alt="gabi"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={`object-contain object-left ${variantClasses[variant]} ${className}`.trim()}
    />
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex shrink-0 items-center">
        {image}
      </Link>
    );
  }

  return image;
}

/** Logo sobre fondos claros distintos al cream de marca */
export function GabiLogoBadge({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-gabi-cream px-3.5 py-2 shadow-[inset_0_0_0_1px_rgba(27,67,50,0.07)] ${className}`.trim()}
    >
      <GabiLogo variant="plain" priority={priority} className="h-7 md:h-8" />
    </span>
  );
}

/** Logo legible sobre headers oscuros o fotos */
export function GabiLogoOnDark({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl bg-gabi-cream/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm ${className}`.trim()}
    >
      <GabiLogo variant="platform" priority={priority} className="opacity-100" />
    </span>
  );
}

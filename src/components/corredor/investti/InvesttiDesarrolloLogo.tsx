import Image from "next/image";
import {
  getInvesttiDesarrolloLogo,
  investtiCatalogDesarrollos,
} from "@/lib/catalog/investti-desarrollos";

type InvesttiDesarrolloLogoProps = {
  desarrolloId: string;
  /** compact = panel simulador · print = hoja PDF */
  size?: "compact" | "print";
  className?: string;
};

/**
 * Logos diseñados para fondo oscuro (dorado/blanco sobre negro en el arte original).
 */
const LOGO_SHELL_STYLE: Partial<Record<string, string>> = {
  "canadas-la-porta":
    "border-[#2a2620]/60 bg-[#0C0B0A] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
};

export function InvesttiDesarrolloLogo({
  desarrolloId,
  size = "compact",
  className = "",
}: InvesttiDesarrolloLogoProps) {
  const logo = getInvesttiDesarrolloLogo(desarrolloId);
  const nombre =
    investtiCatalogDesarrollos.find((d) => d.id === desarrolloId)?.nombre ?? "Desarrollo";

  const shell =
    size === "print"
      ? "h-[4.5rem] w-[6.5rem] rounded-sm"
      : "h-[4.25rem] w-[7.5rem] rounded-xl";

  return (
    <div
      className={`investti-desarrollo-logo flex shrink-0 items-center justify-center border px-2 py-2 shadow-sm ${LOGO_SHELL_STYLE[desarrolloId] ?? "border-slate-200/90 bg-white"} ${shell} ${className}`}
      data-desarrollo-logo={desarrolloId}
    >
      <Image
        src={logo}
        alt={nombre}
        width={size === "print" ? 104 : 120}
        height={size === "print" ? 56 : 64}
        className="h-auto max-h-full w-full object-contain"
        unoptimized
        priority
      />
    </div>
  );
}

import Image from "next/image";
import {
  getInvesttiDesarrolloLogo,
  investtiCatalogDesarrollos,
} from "@/lib/catalog/investti-desarrollos";
import { investtiDesarrolloLogoShellClass } from "@/lib/catalog/investti-desarrollo-logo-shell";

type InvesttiDesarrolloLogoProps = {
  desarrolloId: string;
  /** thumb = selector · compact = panel · header = cotizador · print = PDF */
  size?: "thumb" | "compact" | "header" | "print";
  className?: string;
};

const LA_PORTA_BRAND = {
  backgroundColor: "#A68B6B",
  borderColor: "rgba(138, 115, 88, 0.35)",
} as const;

const SIZE_CLASS: Record<NonNullable<InvesttiDesarrolloLogoProps["size"]>, string> = {
  thumb: "h-12 w-[calc(3rem*872/566)] rounded-lg sm:h-14 sm:w-[calc(3.5rem*872/566)]",
  compact: "h-[4.25rem] w-[6.6rem] rounded-xl",
  header: "h-[4.75rem] w-[7.35rem] rounded-2xl",
  print: "h-[4.5rem] w-[6.95rem] rounded-sm",
};

export function InvesttiDesarrolloLogo({
  desarrolloId,
  size = "compact",
  className = "",
}: InvesttiDesarrolloLogoProps) {
  const logo = getInvesttiDesarrolloLogo(desarrolloId);
  const nombre =
    investtiCatalogDesarrollos.find((d) => d.id === desarrolloId)?.nombre ?? "Desarrollo";
  const isLaPorta = desarrolloId === "canadas-la-porta";

  return (
    <div
      className={`investti-desarrollo-logo flex shrink-0 items-center justify-center overflow-hidden border shadow-sm ${
        isLaPorta ? "p-0" : "px-2 py-2"
      } ${investtiDesarrolloLogoShellClass(desarrolloId)} ${SIZE_CLASS[size]} ${className}`}
      data-desarrollo-logo={desarrolloId}
      style={isLaPorta ? LA_PORTA_BRAND : undefined}
    >
      <Image
        src={logo}
        alt={nombre}
        width={
          size === "print" ? 104 : size === "header" ? 220 : size === "thumb" ? 112 : 120
        }
        height={size === "print" ? 56 : size === "header" ? 88 : size === "thumb" ? 72 : 64}
        className="h-full w-full object-contain object-center"
        unoptimized
        priority={size !== "thumb"}
      />
    </div>
  );
}

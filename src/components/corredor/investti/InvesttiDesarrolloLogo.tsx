import Image from "next/image";
import {
  getInvesttiDesarrolloLogo,
  investtiCatalogDesarrollos,
} from "@/lib/catalog/investti-desarrollos";
import { investtiDesarrolloLogoShellClass } from "@/lib/catalog/investti-desarrollo-logo-shell";

type InvesttiDesarrolloLogoProps = {
  desarrolloId: string;
  /** compact = panel simulador · header = cotizador · print = hoja PDF */
  size?: "compact" | "header" | "print";
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<InvesttiDesarrolloLogoProps["size"]>, string> = {
  compact: "h-[4.25rem] w-[7.5rem] rounded-xl",
  header: "h-[4.25rem] w-[10.5rem] rounded-2xl",
  print: "h-[4.5rem] w-[6.5rem] rounded-sm",
};

export function InvesttiDesarrolloLogo({
  desarrolloId,
  size = "compact",
  className = "",
}: InvesttiDesarrolloLogoProps) {
  const logo = getInvesttiDesarrolloLogo(desarrolloId);
  const nombre =
    investtiCatalogDesarrollos.find((d) => d.id === desarrolloId)?.nombre ?? "Desarrollo";

  return (
    <div
      className={`investti-desarrollo-logo flex shrink-0 items-center justify-center border px-2 py-2 shadow-sm ${investtiDesarrolloLogoShellClass(desarrolloId)} ${SIZE_CLASS[size]} ${className}`}
      data-desarrollo-logo={desarrolloId}
    >
      <Image
        src={logo}
        alt={nombre}
        width={size === "print" ? 104 : size === "header" ? 220 : 120}
        height={size === "print" ? 56 : size === "header" ? 88 : 64}
        className="h-auto max-h-full w-full object-contain"
        unoptimized
        priority
      />
    </div>
  );
}

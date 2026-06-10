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
  const shellPad = isLaPorta ? "p-1.5" : "px-2 py-2";

  return (
    <div
      className={`investti-desarrollo-logo flex shrink-0 items-center justify-center overflow-hidden border shadow-sm ${shellPad} ${investtiDesarrolloLogoShellClass(desarrolloId)} ${SIZE_CLASS[size]} ${className}`}
      data-desarrollo-logo={desarrolloId}
    >
      <Image
        src={logo}
        alt={nombre}
        width={size === "print" ? 104 : size === "header" ? 220 : 120}
        height={size === "print" ? 56 : size === "header" ? 88 : 64}
        className={
          isLaPorta
            ? "h-full w-full object-contain object-center"
            : "h-auto max-h-full w-full object-contain"
        }
        unoptimized
        priority
      />
    </div>
  );
}

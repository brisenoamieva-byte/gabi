import Image from "next/image";
import { InvesttiDesarrolloLogo } from "@/components/corredor/investti/InvesttiDesarrolloLogo";
import {
  getInvesttiDesarrolloLogo,
  investtiCatalogDesarrollos,
  isInvesttiCatalogDesarrollo,
} from "@/lib/catalog/investti-desarrollos";
import {
  DESARROLLO_SELECTOR_LOGO_THUMB_CLASS,
  desarrolloSelectorLogoPaddingClass,
  desarrolloSelectorLogoImageClass,
  desarrolloSelectorLogoShellClass,
  desarrolloSelectorLogoSrc,
} from "@/lib/catalog/desarrollo-selector-logo-shell";
import { getDesarrolloIniciales } from "@/lib/corredor/desarrollo-logos";

type DesarrolloSelectorLogoProps = {
  desarrolloId: string;
  nombre: string;
  logo?: string | null;
  /** Color de iniciales fallback (portal primary). */
  fallbackColor?: string;
};

export function DesarrolloSelectorLogo({
  desarrolloId,
  nombre,
  logo,
  fallbackColor = "#201044",
}: DesarrolloSelectorLogoProps) {
  if (isInvesttiCatalogDesarrollo(desarrolloId)) {
    return <InvesttiDesarrolloLogo desarrolloId={desarrolloId} size="thumb" />;
  }

  const src = desarrolloSelectorLogoSrc(desarrolloId, logo);
  const shell = desarrolloSelectorLogoShellClass(desarrolloId);
  const padding = desarrolloSelectorLogoPaddingClass(desarrolloId);
  const imageClass = desarrolloSelectorLogoImageClass(desarrolloId);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden border shadow-sm ${DESARROLLO_SELECTOR_LOGO_THUMB_CLASS} ${shell} ${padding}`}
      data-desarrollo-logo={desarrolloId}
    >
      {src ? (
        <Image
          src={src}
          alt={nombre}
          width={112}
          height={72}
          className={imageClass}
          unoptimized={src.endsWith(".png")}
        />
      ) : (
        <span
          className="text-[10px] font-black tracking-tight sm:text-xs"
          style={{ color: fallbackColor }}
        >
          {getDesarrolloIniciales(nombre)}
        </span>
      )}
    </div>
  );
}

/** Resuelve URL de logo para otros contextos (p. ej. cotizador). */
export function resolveDesarrolloSelectorLogoUrl(
  desarrolloId: string,
  logo?: string | null,
): string | undefined {
  if (isInvesttiCatalogDesarrollo(desarrolloId)) {
    return getInvesttiDesarrolloLogo(desarrolloId);
  }
  return desarrolloSelectorLogoSrc(desarrolloId, logo);
}

export function getDesarrolloSelectorNombre(desarrolloId: string): string {
  return investtiCatalogDesarrollos.find((d) => d.id === desarrolloId)?.nombre ?? desarrolloId;
}

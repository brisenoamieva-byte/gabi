import Image from "next/image";
import {
  DESARROLLO_LOGO_CELL,
  DESARROLLO_LOGO_CELL_COMPACT,
  DESARROLLOS_ALIANZA_LOGOS,
  desarrolloLogoDisplaySize,
  type DesarrolloAlianzaLogo,
} from "@/lib/propuestas/desarrollos-alianzas-logos";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

type PropuestaDesarrollosLogosProps = {
  logos?: DesarrolloAlianzaLogo[];
  compact?: boolean;
  className?: string;
};

export function PropuestaDesarrollosLogos({
  logos = DESARROLLOS_ALIANZA_LOGOS,
  compact = false,
  className = "",
}: PropuestaDesarrollosLogosProps) {
  const cell = compact ? DESARROLLO_LOGO_CELL_COMPACT : DESARROLLO_LOGO_CELL;

  return (
    <div className={className}>
      <p
        className={`${compact ? "text-[11px]" : "text-[12px]"} font-semibold uppercase tracking-[0.14em] ${t.headerMuted}`}
      >
        Desarrollos con los que hemos trabajado
      </p>
      <ul
        className={`propuesta-desarrollos-logos mt-3 grid justify-items-center ${
          compact
            ? "grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4"
            : "grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5"
        }`}
        style={{
          ["--logo-cell-w" as string]: `${cell.width}px`,
          ["--logo-cell-h" as string]: `${cell.height}px`,
        }}
      >
        {logos.map((logo) => {
          const size = desarrolloLogoDisplaySize(logo, cell);
          const cellW = Math.max(cell.width, size.width);
          const cellH = Math.max(cell.height, size.height);
          return (
            <li
              key={logo.id}
              className="propuesta-desarrollo-logo-cell flex items-center justify-center"
              style={{ width: cellW, height: cellH }}
            >
              <Image
                src={logo.src}
                alt={logo.nombre}
                width={logo.width}
                height={logo.height}
                className={`max-h-full max-w-full object-contain object-center ${
                  logo.id === "la-gota" ? "contrast-[1.08]" : ""
                }`}
                style={{ width: size.width, height: size.height }}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

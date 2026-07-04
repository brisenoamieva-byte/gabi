import { valleAllendeBrand } from "@/lib/brand/nubo-valle-allende";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

const c = valleAllendeBrand.colors;

/** Paleta Valle de Allende — valores hex para CSS inline / charts. */
export const nuboColors = {
  beige: c.beige,
  verde: c.verde,
  arena: c.arena,
  gris: c.gris,
  negro: c.negro,
  accent: c.arena,
  accentLabel: c.verde,
  accentLabelOnDark: c.arena,
} as const;

/** Tipografía y superficies — clases Tailwind estáticas (nubo-* en tailwind.config). */
export const nuboType = {
  h1: `font-nubo-heading text-4xl font-normal leading-tight tracking-tight text-nubo-negro sm:text-5xl md:text-6xl ${t.title}`,
  h2: `font-nubo-heading text-2xl leading-tight text-nubo-negro sm:text-[1.875rem] md:text-[2.125rem] ${t.title}`,
  lead: "font-nubo-body text-base leading-relaxed text-nubo-verde md:text-lg",
  body: "font-nubo-body text-[15px] leading-relaxed text-nubo-verde/90 md:text-[17px]",
  bodyStrong: "font-nubo-body text-[15px] leading-relaxed text-nubo-negro md:text-[17px]",
  small: "font-nubo-body text-sm leading-snug text-nubo-gris md:text-[15px]",
  label: "font-nubo-body text-[11px] font-semibold uppercase tracking-[0.14em] text-nubo-verde md:text-xs",
  labelMuted: "font-nubo-body text-[11px] font-semibold uppercase tracking-[0.14em] text-nubo-gris md:text-xs",
  cardTitle: "font-nubo-body text-base font-semibold text-nubo-negro md:text-lg",
  cardBody: "font-nubo-body text-sm leading-relaxed text-nubo-gris md:text-base",
  labelOnDark: "font-nubo-body text-[11px] font-semibold uppercase tracking-[0.14em] text-nubo-arena md:text-xs",
  bodyOnDark: "font-nubo-body text-sm leading-relaxed text-white/90 md:text-[15px]",
  accentInline: "font-semibold text-nubo-verde",
  subheading: "font-nubo-subheading italic text-nubo-gris",
} as const;

export const nuboSurface = {
  card: "rounded-xl border border-nubo-arena/60 bg-white shadow-sm shadow-nubo-negro/[0.04]",
  cardAccent:
    "rounded-xl border border-nubo-arena/60 border-t-2 border-t-nubo-arena bg-white shadow-sm shadow-nubo-negro/[0.05]",
  kpiStrip:
    "rounded-xl border border-nubo-arena/50 bg-gradient-to-br from-nubo-beige to-white px-4 py-4 shadow-sm shadow-nubo-negro/[0.03] md:px-5 md:py-5",
  portadaBadge:
    "inline-flex items-center rounded-full border border-nubo-arena/70 bg-nubo-beige/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-nubo-gris backdrop-blur-sm",
  panelDark: "nubo-panel-dark",
  accentBlock:
    "rounded-r-xl border-l-[3px] border-nubo-arena bg-gradient-to-br from-nubo-arena/20 to-transparent py-1 pl-4 pr-2",
  narrativeBlock: "border-l-2 border-nubo-arena/70 pl-4",
  quoteBlock: "border-l-[3px] border-nubo-negro pl-5",
  sectionDivider: "border-t border-nubo-arena/40 pt-5",
  ubicacionBar: "border-y border-nubo-arena/40 py-3",
} as const;

export { valleAllendeBrand };

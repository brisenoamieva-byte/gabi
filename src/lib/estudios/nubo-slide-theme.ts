import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

/** Paleta y tipografía unificada — presentación NUBO (sencilla, fina, legible). */
export const nuboColors = {
  accent: "#6cc24a",
  accentLabel: "#3f7a24",
  accentLabelOnDark: "#a8e070",
} as const;

/** Cada token incluye tamaño y color; no mezclar con overrides de color en className. */
export const nuboType = {
  h1: `text-4xl font-normal leading-tight tracking-tight sm:text-5xl md:text-6xl ${t.title}`,
  h2: `text-2xl leading-tight sm:text-[1.875rem] md:text-[2.125rem] ${t.title}`,
  lead: "text-base leading-relaxed text-slate-700 md:text-lg",
  body: "text-[15px] leading-relaxed text-slate-700 md:text-[17px]",
  bodyStrong: "text-[15px] leading-relaxed text-slate-900 md:text-[17px]",
  small: "text-sm leading-snug text-slate-600 md:text-[15px]",
  label: "text-[11px] font-semibold uppercase tracking-[0.12em] text-green-700 md:text-xs",
  labelMuted: "text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:text-xs",
  cardTitle: "text-base font-semibold text-slate-900 md:text-lg",
  cardBody: "text-sm leading-relaxed text-slate-600 md:text-base",
  labelOnDark:
    "text-[11px] font-semibold uppercase tracking-[0.12em] text-green-300 md:text-xs",
  bodyOnDark: "text-sm leading-relaxed text-white/90 md:text-[15px]",
  accentInline: "font-semibold text-green-700",
} as const;

export const nuboSurface = {
  card: "rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.03]",
  cardAccent:
    "rounded-xl border border-slate-200/90 border-t-2 border-t-[#6cc24a]/50 bg-white shadow-sm shadow-slate-900/[0.04]",
  kpiStrip:
    "rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white px-4 py-4 shadow-sm shadow-slate-900/[0.03] md:px-5 md:py-5",
  portadaBadge:
    "inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 backdrop-blur-sm",
  panelDark: "nubo-panel-dark",
  accentBlock:
    "rounded-r-xl border-l-[3px] border-[#6cc24a] bg-gradient-to-br from-[#6cc24a]/10 to-transparent py-1 pl-4 pr-2",
  narrativeBlock: "border-l-2 border-slate-200 pl-4",
  quoteBlock: "border-l-[3px] border-slate-900 pl-5",
  sectionDivider: "border-t border-slate-100 pt-5",
  ubicacionBar: "border-y border-slate-100 py-3",
} as const;

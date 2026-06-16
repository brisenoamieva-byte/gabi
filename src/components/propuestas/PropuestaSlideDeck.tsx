"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Maximize2,
  Minimize2,
  Printer,
  X,
} from "lucide-react";
import Link from "next/link";
import { SlideBrandHeader } from "@/components/brand/BbrHabitareaLogo";
import { PropuestaSlideFit } from "@/components/propuestas/PropuestaSlideFit";
import "@/lib/propuestas/propuesta-print.css";
import { refitAllPropuestaSlides } from "@/lib/propuestas/propuesta-slide-fit";
import { propuestaSlide as t } from "@/lib/propuestas/slide-theme";

export type PropuestaSlide = {
  id: string;
  label: string;
  content: ReactNode;
};

type PropuestaSlideDeckProps = {
  titulo: string;
  slides: PropuestaSlide[];
  backHref: string;
  backLabel: string;
  documentView?: ReactNode;
  viewerMode?: "operator" | "developer";
  /** Dentro de un layout con barra superior (p. ej. /estudios/nubo). */
  embedded?: boolean;
};

function printPropuestaPdf() {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  }
  requestAnimationFrame(() => {
    refitAllPropuestaSlides();
    requestAnimationFrame(() => {
      refitAllPropuestaSlides();
      window.print();
    });
  });
}

function slideFitCenter(id: string) {
  return id === "portada" || id === "cierre";
}

export function PropuestaSlideDeck({
  titulo,
  slides,
  backHref,
  backLabel,
  documentView,
  viewerMode = "operator",
  embedded = false,
}: PropuestaSlideDeckProps) {
  const isDeveloper = viewerMode === "developer";
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [modo, setModo] = useState<"slides" | "documento">("slides");

  const total = slides.length;
  const slide = slides[index];

  const go = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(total - 1, next)));
    },
    [total],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modo !== "slides") return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(total - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modo, next, prev, go, total]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      refitAllPropuestaSlides();
    });
  }, [index, modo]);

  const printLayout = (
    <div className="propuesta-print-only propuesta-print-deck">
      {slides.map((item, i) => (
        <div
          key={item.id}
          className={`propuesta-print-page propuesta-print-page--${item.id}`}
          data-slide={item.id}
        >
          <div className="propuesta-print-page__bar" />
          <div className="propuesta-print-page__head">
            <span className="propuesta-print-page__brand">{titulo}</span>
            <span className="propuesta-print-page__slide-name">{item.label}</span>
          </div>
          <div className="propuesta-print-page__body">
            <PropuestaSlideFit center={slideFitCenter(item.id)}>
              {item.content}
            </PropuestaSlideFit>
          </div>
          <div className="propuesta-print-page__foot">
            {i + 1} / {total}
          </div>
        </div>
      ))}
    </div>
  );

  if (modo === "documento" && documentView) {
    return (
      <div className="propuesta-document-root min-h-screen bg-[#EEEBE4]">
        <div className="gabi-no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
          <Link href={backHref} className="text-[12px] text-neutral-600 hover:underline">
            {backLabel}
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModo("slides")}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700"
            >
              Modo presentación
            </button>
            <button
              type="button"
              onClick={printPropuestaPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-800 px-3 py-1.5 text-[12px] font-semibold text-white"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF carta
            </button>
          </div>
        </div>
        <div className="propuesta-document-print">{documentView}</div>
      </div>
    );
  }

  const slideDots = slides.map((s, i) => (
    <button
      key={s.id}
      type="button"
      onClick={() => go(i)}
      title={s.label}
      className={`h-2 rounded-full transition-all ${
        i === index ? `w-6 ${t.dotActive}` : `w-2 ${t.dotIdle}`
      }`}
      aria-label={s.label}
    />
  ));

  return (
    <div
      className={`propuesta-deck-root propuesta-print-from-slides relative flex flex-col ${t.deck} ${
        embedded ?
          "propuesta-deck-viewport--embedded min-h-0 flex-1"
        : fullscreen ? "h-[100dvh] max-md:h-[100svh] max-md:max-h-[100svh]"
        : "propuesta-deck-viewport min-h-[100dvh] max-md:h-[100svh] max-md:max-h-[100svh]"
      }`}
    >
      <header
        className={`propuesta-deck-header propuesta-deck-chrome-x gabi-no-print relative z-30 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 md:gap-3 md:px-6 md:py-2.5 ${t.header}`}
      >
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          {isDeveloper ? (
            <div
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border md:h-9 md:w-9 ${t.border} bg-[#6cc24a]/10 text-[#4a9a32]`}
              aria-hidden
            >
              <span className="text-[10px] font-bold">BBR</span>
            </div>
          ) : (
            <Link
              href={backHref}
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border md:h-9 md:w-9 ${t.border} text-slate-500 hover:bg-slate-50`}
              aria-label="Salir"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0">
            <p
              className={`hidden truncate text-[11px] font-semibold uppercase tracking-[0.14em] sm:block ${t.headerMuted}`}
            >
              {isDeveloper ? "Presentación confidencial" : "Presentación comercial"}
            </p>
            <p className="truncate text-[11px] font-bold leading-snug text-slate-800 sm:text-sm">
              {titulo}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={printPropuestaPdf}
            className={`hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold sm:inline-flex ${t.border} text-slate-700 hover:bg-slate-50`}
          >
            <Printer className="h-3.5 w-3.5" />
            PDF carta
          </button>
          {!isDeveloper && documentView ? (
            <button
              type="button"
              onClick={() => setModo("documento")}
              className={`hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold sm:inline-flex ${t.border} text-slate-700`}
            >
              <FileText className="h-3.5 w-3.5" />
              Detalle
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${t.border} text-slate-500 hover:bg-slate-50`}
            aria-label="Pantalla completa"
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div
        className={`propuesta-screen-only relative flex min-h-0 flex-1 basis-0 flex-col overflow-hidden ${t.slideBg}`}
      >
        <div className="gabi-no-print pointer-events-none absolute inset-0 z-20 hidden md:block">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className={`pointer-events-auto absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full ${t.navBtn} disabled:opacity-0`}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={index === total - 1}
            className={`pointer-events-auto absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full ${t.navBtn} disabled:opacity-0`}
            aria-label="Siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 flex min-h-0 flex-col"
          >
            <PropuestaSlideFit key={slide.id} center={slideFitCenter(slide.id)}>
              {slide.content}
            </PropuestaSlideFit>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer
        className={`propuesta-deck-footer propuesta-deck-chrome-x gabi-no-print shrink-0 border-t px-3 pt-2 sm:px-4 md:px-6 md:py-3 ${t.footer}`}
      >
        <div className="mx-auto max-w-4xl md:hidden">
          <div className="mb-2 flex items-center justify-center gap-1.5">{slideDots}</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border disabled:opacity-30 ${t.border} bg-white shadow-sm`}
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className={`text-sm tabular-nums ${t.footerText}`}>
                <span className="font-bold text-slate-900">{index + 1}</span> / {total}
              </p>
              <p className="truncate text-[10px] text-slate-500">{slide.label}</p>
            </div>
            <button
              type="button"
              onClick={next}
              disabled={index === total - 1}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#6cc24a] text-slate-900 shadow-md disabled:opacity-30"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="mx-auto hidden max-w-4xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 md:flex">
          <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
            <p className={`min-w-0 flex-1 text-[11px] tabular-nums sm:flex-none sm:text-[12px] ${t.footerText}`}>
              <span className="font-bold text-slate-800">{index + 1}</span> / {total}
              <span className="mx-2 text-slate-300">·</span>
              <span className="line-clamp-1">{slide.label}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={printPropuestaPdf}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${t.border} text-slate-700 hover:bg-slate-50`}
            >
              <Printer className="h-3.5 w-3.5" />
              PDF carta
            </button>
            <div className="flex flex-wrap items-center gap-1.5">{slideDots}</div>
          </div>
        </div>
      </footer>

      {printLayout}
    </div>
  );
}

export function SlideCanvas({
  children,
  className = "",
  align = "center",
  brandMark,
}: {
  children: ReactNode;
  className?: string;
  align?: "center" | "start";
  brandMark?: ReactNode;
}) {
  return (
    <div
      className={`propuesta-slide-root relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white px-4 py-4 sm:px-5 sm:py-6 md:px-10 md:py-8 lg:px-12 ${className}`}
    >
      {brandMark ? <SlideBrandHeader>{brandMark}</SlideBrandHeader> : null}
      <div
        className={`propuesta-slide-inner mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col ${
          align === "start" ? "justify-start" : "justify-center"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function SlidePortada({ children }: { children: ReactNode }) {
  return (
    <div className="propuesta-slide-root flex h-full min-h-0 w-full flex-1 flex-col justify-center bg-white px-6 py-8 md:px-12 md:py-10">
      <div className="propuesta-slide-inner mx-auto w-full max-w-3xl text-center">{children}</div>
    </div>
  );
}

export function SlideKpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-5 py-4 ${accent ? t.kpiAccent : t.kpi}`}>
      <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${t.kpiLabel}`}>
        {label}
      </p>
      <p
        className={`mt-1 font-[Georgia,'Times_New_Roman',serif] text-2xl font-normal tabular-nums md:text-3xl ${t.kpiValue}`}
      >
        {value}
      </p>
    </div>
  );
}

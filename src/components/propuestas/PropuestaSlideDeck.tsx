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

  return (
    <div
      className={`propuesta-deck-root propuesta-print-from-slides relative flex min-h-[100dvh] flex-col ${t.deck} ${
        fullscreen ? "h-[100dvh]" : ""
      }`}
    >
      <header
        className={`gabi-no-print relative z-30 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 md:px-6 ${t.header}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {isDeveloper ? (
            <div
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${t.border} bg-[#6cc24a]/10 text-[#4a9a32]`}
              aria-hidden
            >
              <span className="text-[10px] font-bold">BBR</span>
            </div>
          ) : (
            <Link
              href={backHref}
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${t.border} text-slate-500 hover:bg-slate-50`}
              aria-label="Salir"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0">
            <p
              className={`truncate text-[11px] font-semibold uppercase tracking-[0.14em] ${t.headerMuted}`}
            >
              {isDeveloper ? "Presentación confidencial" : "Presentación comercial"}
            </p>
            <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-800 sm:text-sm">
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

      <div className={`propuesta-screen-only relative flex min-h-0 flex-1 flex-col ${t.slideBg}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <PropuestaSlideFit key={slide.id} center={slideFitCenter(slide.id)}>
              {slide.content}
            </PropuestaSlideFit>
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className={`gabi-no-print absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full md:flex ${t.navBtn} disabled:opacity-0`}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          disabled={index === total - 1}
          className={`gabi-no-print absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full md:flex ${t.navBtn} disabled:opacity-0`}
          aria-label="Siguiente"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <footer className={`gabi-no-print shrink-0 border-t px-3 py-2.5 sm:px-4 sm:py-3 md:px-6 ${t.footer}`}>
        <div className="mx-auto flex max-w-4xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border disabled:opacity-30 md:hidden ${t.border} bg-white`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className={`min-w-0 flex-1 text-[11px] tabular-nums sm:flex-none sm:text-[12px] ${t.footerText}`}>
              <span className="font-bold text-slate-800">{index + 1}</span> / {total}
              <span className="mx-2 text-slate-300">·</span>
              <span className="line-clamp-1">{slide.label}</span>
            </p>
            <button
              type="button"
              onClick={next}
              disabled={index === total - 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#6cc24a] text-slate-900 disabled:opacity-30 md:hidden"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={printPropuestaPdf}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 sm:hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF
            </button>
            <div className="flex flex-wrap items-center gap-1.5">
              {slides.map((s, i) => (
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
              ))}
            </div>
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
}: {
  children: ReactNode;
  className?: string;
  align?: "center" | "start";
}) {
  return (
    <div
      className={`propuesta-slide-root flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white px-4 py-4 sm:px-5 sm:py-6 md:px-10 md:py-8 lg:px-12 ${className}`}
    >
      <div
        className={`propuesta-slide-inner mx-auto flex w-full max-w-6xl flex-col ${
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

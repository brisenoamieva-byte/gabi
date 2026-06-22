"use client";

import { PropuestaSlideFit } from "@/components/propuestas/PropuestaSlideFit";
import type { PropuestaSlide } from "@/components/propuestas/PropuestaSlideDeck";
import "@/lib/propuestas/propuesta-print.css";

function slideFitCenter(id: string) {
  return id === "portada";
}

type PropuestaPrintDeckProps = {
  titulo: string;
  slides: PropuestaSlide[];
  /** Visible en pantalla (ruta /print); sin clase usa layout oculto del deck principal. */
  visible?: boolean;
  /** Carta horizontal en todo el documento (estudio NUBO). */
  landscape?: boolean;
};

export function PropuestaPrintDeck({
  titulo,
  slides,
  visible = false,
  landscape = false,
}: PropuestaPrintDeckProps) {
  const total = slides.length;

  return (
    <div
      className={`propuesta-print-deck${visible ? " propuesta-print-deck--visible" : ""}${
        landscape ? " propuesta-print-deck--landscape" : ""
      }`}
      data-print-visible={visible ? "true" : undefined}
    >
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
            <span>DMB · {titulo}</span>
            <span>
              {i + 1} / {total}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

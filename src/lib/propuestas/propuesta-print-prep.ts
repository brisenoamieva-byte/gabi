import {
  refitAllPropuestaSlides,
  resetAllPropuestaSlideFits,
} from "@/lib/propuestas/propuesta-slide-fit";

const PRINTING_CLASS = "propuesta-printing";

/** Expone el layout de impresión (oculto en pantalla) para medir y escalar antes del diálogo PDF. */
export function beginPropuestaPrintPrep(): () => void {
  document.body.classList.add(PRINTING_CLASS);
  refitAllPropuestaSlides();

  return () => {
    document.body.classList.remove(PRINTING_CLASS);
    resetAllPropuestaSlideFits();
  };
}

export function runPropuestaPrintWithPrep(printFn: () => void): void {
  const endPrep = beginPropuestaPrintPrep();

  const onBeforePrint = () => {
    refitAllPropuestaSlides();
    requestAnimationFrame(refitAllPropuestaSlides);
  };

  const onAfterPrint = () => {
    window.removeEventListener("beforeprint", onBeforePrint);
    window.removeEventListener("afterprint", onAfterPrint);
    endPrep();
  };

  window.addEventListener("beforeprint", onBeforePrint);
  window.addEventListener("afterprint", onAfterPrint);

  requestAnimationFrame(() => {
    refitAllPropuestaSlides();
    requestAnimationFrame(() => {
      refitAllPropuestaSlides();
      printFn();
    });
  });
}

import {
  isPropuestaMobilePrint,
  mobilePrintImageWaitMs,
  prepareMobilePrintViewport,
} from "@/lib/propuestas/propuesta-print-mobile";
import {
  refitAllPropuestaSlides,
  resetAllPropuestaSlideFits,
} from "@/lib/propuestas/propuesta-slide-fit";

const PRINTING_CLASS = "propuesta-printing";
const PRINTING_MOBILE_CLASS = "propuesta-printing-mobile";

function collectImageUrls(root: ParentNode): string[] {
  const urls = new Set<string>();

  root.querySelectorAll("img").forEach((img) => {
    if (img.currentSrc) urls.add(img.currentSrc);
    else if (img.src) urls.add(img.src);
    const srcset = img.getAttribute("srcset");
    if (srcset) {
      srcset.split(",").forEach((part) => {
        const url = part.trim().split(/\s+/)[0];
        if (url) urls.add(url);
      });
    }
  });

  return Array.from(urls);
}

function preloadUrl(url: string): Promise<void> {
  return new Promise((resolve) => {
    const probe = new window.Image();
    probe.onload = () => resolve();
    probe.onerror = () => resolve();
    probe.src = url;
  });
}

/** Espera a que las imágenes del layout de impresión estén decodificadas. */
export async function waitForPropuestaPrintImages(
  timeoutMs = mobilePrintImageWaitMs(),
): Promise<void> {
  const root = document.querySelector(".propuesta-print-deck");
  if (!root) return;

  const urls = collectImageUrls(root);
  const preload = Promise.all(urls.map(preloadUrl));

  const decodeExisting = Promise.all(
    Array.from(root.querySelectorAll("img")).map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return img.decode?.().catch(() => undefined) ?? Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        const done = () => {
          img.removeEventListener("load", done);
          img.removeEventListener("error", done);
          resolve();
        };
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    }),
  );

  await Promise.race([
    Promise.all([preload, decodeExisting]),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

/** Expone el layout de impresión (oculto en pantalla) para medir y escalar antes del diálogo PDF. */
export function beginPropuestaPrintPrep(): () => void {
  document.body.classList.add(PRINTING_CLASS);
  if (isPropuestaMobilePrint()) {
    document.body.classList.add(PRINTING_MOBILE_CLASS);
    prepareMobilePrintViewport();
  }
  refitAllPropuestaSlides();

  return () => {
    document.body.classList.remove(PRINTING_CLASS);
    document.body.classList.remove(PRINTING_MOBILE_CLASS);
    resetAllPropuestaSlideFits();
  };
}

export function runPropuestaPrintWithPrep(printFn: () => void): void {
  const endPrep = beginPropuestaPrintPrep();

  const onBeforePrint = () => {
    prepareMobilePrintViewport();
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

  void (async () => {
    await waitForPropuestaPrintImages();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        refitAllPropuestaSlides();
        requestAnimationFrame(() => {
          refitAllPropuestaSlides();
          resolve();
        });
      });
    });
    await waitForPropuestaPrintImages(isPropuestaMobilePrint() ? 6000 : 4000);
    printFn();
  })();
}

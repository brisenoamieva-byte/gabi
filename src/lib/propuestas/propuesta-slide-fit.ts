const FIT_HOST = ".propuesta-fit-host";
const FIT_STAGE = ".propuesta-fit-stage";
const MOBILE_FIT_QUERY = "(max-width: 767px)";
const NUBO_GALLERY_SLIDES = ["accesos", "restaurante"] as const;

function isOverflowing(host: HTMLElement, stage: HTMLElement, tolerance = 2): boolean {
  return stage.scrollHeight > host.clientHeight + tolerance;
}

/** Ajusta altura de referencias para que quepan sin recorte en accesos / restaurante. */
export function fitNuboReferenceGalleriesForPrint() {
  for (const id of NUBO_GALLERY_SLIDES) {
    const page = document.querySelector<HTMLElement>(`.propuesta-print-page--${id}`);
    if (!page) continue;

    const host = page.querySelector<HTMLElement>(FIT_HOST);
    const stage = page.querySelector<HTMLElement>(FIT_STAGE);
    if (!host || !stage) continue;

    const imgs = page.querySelectorAll<HTMLImageElement>(".propuesta-print-gallery__img");

    const applyImageMax = (inches: number) => {
      imgs.forEach((img) => {
        img.style.maxHeight = `${inches.toFixed(2)}in`;
        img.style.width = "100%";
        img.style.height = "auto";
        img.style.objectFit = "contain";
      });
    };

    stage.style.fontSize = "";
    applyImageMax(2.55);

    let maxIn = 2.55;
    while (isOverflowing(host, stage) && maxIn > 1.3) {
      maxIn -= 0.08;
      applyImageMax(maxIn);
    }

    if (isOverflowing(host, stage) && host.clientHeight > 0 && stage.scrollHeight > 0) {
      const scale = Math.min(1, host.clientHeight / stage.scrollHeight);
      stage.style.fontSize = `${(scale * 100).toFixed(1)}%`;
    }
  }
}

export function isPropuestaSlideMobileFit(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(MOBILE_FIT_QUERY).matches;
}

export function applyPropuestaSlideFit(host: HTMLElement, stage: HTMLElement) {
  const center = host.dataset.fitCenter === "true";
  const isPrintHost = Boolean(host.closest(".propuesta-print-page"));

  stage.style.transform = "none";
  stage.style.width = "100%";
  host.style.alignItems = center ? "center" : "flex-start";

  if (isPrintHost) {
    host.style.overflowY = "hidden";
    host.style.overflowX = "hidden";
    host.dataset.fitMode = "print";
    stage.style.transform = "none";
    stage.style.width = "100%";

    const ch = host.clientHeight;
    const cw = host.clientWidth;
    const sh = stage.scrollHeight;
    const sw = stage.scrollWidth;
    if (ch > 0 && cw > 0 && sh > 0 && sw > 0) {
      const scale = Math.min(1, ch / sh, cw / sw);
      if (scale < 0.985) {
        stage.style.fontSize = `${(scale * 100).toFixed(1)}%`;
      } else {
        stage.style.fontSize = "";
      }
    }
    return;
  }

  if (isPropuestaSlideMobileFit()) {
    host.style.overflowY = "auto";
    host.style.overflowX = "hidden";
    host.dataset.fitMode = "scroll";
    return;
  }

  host.style.overflowY = "hidden";
  host.style.overflowX = "hidden";
  host.dataset.fitMode = "scale";

  const ch = host.clientHeight;
  const cw = host.clientWidth;
  if (ch <= 0 || cw <= 0) return;

  const sh = stage.scrollHeight;
  const sw = stage.scrollWidth;
  if (sh <= 0 || sw <= 0) return;

  const rawScale = Math.min(1, ch / sh, cw / sw);
  const MIN_READABLE_SCALE = 0.9;

  if (rawScale < MIN_READABLE_SCALE) {
    host.style.overflowY = "auto";
    host.style.overflowX = "hidden";
    host.dataset.fitMode = "scroll";
    return;
  }

  const scale = rawScale;
  if (scale < 0.995) {
    stage.style.transform = `scale(${scale})`;
    stage.style.transformOrigin = center ? "center center" : "top center";
    host.style.alignItems = center ? "center" : "flex-start";
  }
}

export function refitAllPropuestaSlides() {
  document.querySelectorAll<HTMLElement>(FIT_HOST).forEach((host) => {
    const stage = host.querySelector<HTMLElement>(FIT_STAGE);
    if (stage) applyPropuestaSlideFit(host, stage);
  });
  fitNuboReferenceGalleriesForPrint();
}

export function resetAllPropuestaSlideFits() {
  document.querySelectorAll<HTMLElement>(FIT_STAGE).forEach((stage) => {
    stage.style.transform = "none";
    stage.style.width = "100%";
    stage.style.fontSize = "";
  });
  document.querySelectorAll<HTMLElement>(FIT_HOST).forEach((host) => {
    host.style.overflowY = "";
    host.style.overflowX = "";
    host.dataset.fitMode = "";
  });
  document.querySelectorAll<HTMLImageElement>(".propuesta-print-gallery__img").forEach((img) => {
    img.style.maxHeight = "";
    img.style.width = "";
    img.style.height = "";
    img.style.objectFit = "";
  });
}

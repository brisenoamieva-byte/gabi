const FIT_HOST = ".propuesta-fit-host";
const FIT_STAGE = ".propuesta-fit-stage";
const MOBILE_FIT_QUERY = "(max-width: 767px)";

export function isPropuestaSlideMobileFit(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(MOBILE_FIT_QUERY).matches;
}

export function applyPropuestaSlideFit(host: HTMLElement, stage: HTMLElement) {
  const center = host.dataset.fitCenter === "true";

  stage.style.transform = "none";
  stage.style.width = "100%";
  host.style.alignItems = center ? "center" : "flex-start";

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

  const scale = Math.min(1, ch / sh, cw / sw);
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
}

export function resetAllPropuestaSlideFits() {
  document.querySelectorAll<HTMLElement>(FIT_STAGE).forEach((stage) => {
    stage.style.transform = "none";
    stage.style.width = "100%";
  });
  document.querySelectorAll<HTMLElement>(FIT_HOST).forEach((host) => {
    host.style.overflowY = "";
    host.style.overflowX = "";
    host.dataset.fitMode = "";
  });
}

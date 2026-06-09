const FIT_HOST = ".propuesta-fit-host";
const FIT_STAGE = ".propuesta-fit-stage";

export function applyPropuestaSlideFit(host: HTMLElement, stage: HTMLElement) {
  const center = host.dataset.fitCenter === "true";

  stage.style.transform = "none";
  stage.style.width = "100%";
  host.style.alignItems = center ? "center" : "flex-start";

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
}

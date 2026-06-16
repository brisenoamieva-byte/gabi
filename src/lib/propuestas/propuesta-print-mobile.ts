const MOBILE_PRINT_QUERY = "(max-width: 767px)";

export type MobilePrintPlatform = "ios" | "android" | "generic";

export function isPropuestaMobilePrint(): boolean {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia(MOBILE_PRINT_QUERY).matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const mobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  return narrow || (coarse && mobileUa);
}

export function getMobilePrintPlatform(): MobilePrintPlatform {
  if (typeof navigator === "undefined") return "generic";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "generic";
}

export function mobilePrintImageWaitMs(): number {
  return isPropuestaMobilePrint() ? 14_000 : 10_000;
}

export function prepareMobilePrintViewport(): void {
  if (!isPropuestaMobilePrint()) return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

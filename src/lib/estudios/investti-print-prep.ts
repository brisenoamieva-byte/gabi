/** Ajusta SVGs y contenedores antes de imprimir / exportar PDF. */

let savedDocumentTitle = "";

export function prepareInvesttiChartsForPrint(printTitle?: string): void {
  if (printTitle) {
    savedDocumentTitle = document.title;
    document.title = printTitle;
  }

  const root = document.querySelector(".investti-report-article, .gabi-report-print");
  if (!root) return;

  root.querySelectorAll<SVGSVGElement>("svg[viewBox]").forEach((svg) => {
    const viewBox = svg.getAttribute("viewBox");
    if (!viewBox) return;

    const parts = viewBox.split(/\s+/).map(Number);
    const vbW = parts[2];
    const vbH = parts[3];
    if (!vbW || !vbH) return;

    const compact = svg.closest(".investti-print-figure-compact");
    const container = svg.parentElement;
    const containerWidth =
      container?.clientWidth || container?.getBoundingClientRect().width || 520;
    const maxW = compact ? 480 : 520;
    const width = Math.min(Math.max(containerWidth, 280), maxW);
    const height = (width * vbH) / vbW;

    svg.setAttribute("width", String(Math.round(width)));
    svg.setAttribute("height", String(Math.round(height)));
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.maxWidth = "100%";
    svg.style.display = "block";
  });
}

export function resetInvesttiChartsAfterPrint(): void {
  if (savedDocumentTitle) {
    document.title = savedDocumentTitle;
    savedDocumentTitle = "";
  }

  document
    .querySelectorAll<SVGSVGElement>(
      ".investti-report-article svg[viewBox], .gabi-report-print svg[viewBox]",
    )
    .forEach((svg) => {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "";
      svg.style.height = "";
      svg.style.maxWidth = "";
      svg.style.display = "";
    });
}

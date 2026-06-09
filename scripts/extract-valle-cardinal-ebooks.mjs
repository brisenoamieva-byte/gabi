import fs from "node:fs";
import path from "node:path";

const files = [
  "c:/Users/brise/Downloads/EBOOK - CORTIJO MIRAVALLE MAYO 2026.pdf",
  "c:/Users/brise/Downloads/EBOOK - HACIENDA HIGUERA MAYO 2026.pdf",
];

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

for (const file of files) {
  const data = new Uint8Array(fs.readFileSync(file));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((x) => ("str" in x ? x.str : "")).join(" ") + "\n";
  }
  console.log("\n===", path.basename(file), `(${doc.numPages} págs) ===\n`);
  console.log(text);
}

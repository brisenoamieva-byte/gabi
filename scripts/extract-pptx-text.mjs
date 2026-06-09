import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const path = process.argv[2];
if (!path || !existsSync(path)) {
  console.error("Usage: node scripts/extract-pptx-text.mjs <file.pptx>");
  process.exit(1);
}

const { default: AdmZip } = await import("adm-zip");
const zip = new AdmZip(path);
const slideRe = /ppt\/slides\/slide\d+\.xml/;
const slides = zip
  .getEntries()
  .filter((e) => slideRe.test(e.entryName))
  .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }));

for (let i = 0; i < slides.length; i++) {
  const xml = slides[i].getData().toString("utf8");
  const parts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]);
  console.log(`--- SLIDE ${i + 1} ---`);
  console.log(parts.join("\n"));
  console.log("");
}

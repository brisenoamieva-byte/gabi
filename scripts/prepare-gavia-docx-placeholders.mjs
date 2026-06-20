/**
 * Inyecta placeholders docxtemplater en plantillas Word de Misión La Gavia.
 *   node scripts/prepare-gavia-docx-placeholders.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import PizZip from "pizzip";

const TEMPLATE_DIR = join(process.cwd(), "public/documentos-templates/mision-la-gavia");

/** Orden: cadenas más específicas primero. */
const REPLACEMENTS = [
  ["ANA GUADALUPE ESCOBAR MIRABENT", "{cliente_nombre}"],
  ["3 de marzo 2026", "{fecha_hoy}"],
  [" R-202", " {unidad_numero}"],
  ["R-202", "{unidad_numero}"],
];

const injectPlaceholders = (xml) => {
  let out = xml;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
};

const files = readdirSync(TEMPLATE_DIR).filter((name) => name.endsWith(".docx"));

for (const file of files) {
  const path = join(TEMPLATE_DIR, file);
  const zip = new PizZip(readFileSync(path));
  const entry = zip.file("word/document.xml");
  if (!entry) {
    console.warn(`SKIP ${file}: sin word/document.xml`);
    continue;
  }

  const before = entry.asText();
  const after = injectPlaceholders(before);
  if (before === after) {
    console.log(`OK ${file}: sin cambios (ya tiene placeholders o sin coincidencias)`);
    continue;
  }

  zip.file("word/document.xml", after);
  writeFileSync(path, zip.generate({ type: "nodebuffer" }));
  console.log(`OK ${file}: placeholders inyectados`);
}

console.log("Listo.");

/**
 * Copia Word de expediente Gavia y sustituye datos por placeholders Docxtemplater.
 * Soporta texto partido en varios <w:t> (runs de Word).
 *
 *   node scripts/build-gavia-oferta-templates.mjs [ruta-documentos-word]
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import PizZip from "pizzip";

const OUT_DIR = join(process.cwd(), "public/documentos-templates/mision-la-gavia");
const DEFAULT_SRC =
  "g:\\Unidades compartidas\\Misión La Gavia\\3. Expediente Clientes\\N-201 Esteban Perez del Castillo Velasco\\DOCUMENTOS WORD";
const SRC_DIR = process.argv[2] || DEFAULT_SRC;

const FILES = [
  { src: "1. OfertaCompra N201.docx", out: "oferta-compra.docx" },
  { src: "2. (AnexoA)_DatosGrales.docx", out: "anexo-a-datos.docx" },
  { src: "3. (AnexoB)_ModPago.docx", out: "anexo-b-pago.docx" },
  { src: "5. (AnexoD)_CuotasMtto.docx", out: "anexo-d-mantenimiento.docx" },
  { src: "6. (AnexoE)_PrevLavadoDinero.docx", out: "anexo-e-pld.docx" },
  { src: "7. (AnexoF)_AvisoPrivacidad.docx", out: "anexo-f-privacidad.docx" },
];

/**
 * Reemplaza `search` por `replace` aunque esté partido entre varios <w:t>.
 * Deja el placeholder en el primer run y vacía el resto del rango.
 */
function replaceAcrossRuns(xml, search, replace) {
  const re = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  /** @type {{ start: number, end: number, attrs: string, text: string }[]} */
  const runs = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    runs.push({
      start: m.index,
      end: m.index + m[0].length,
      attrs: m[1],
      text: m[2],
    });
  }
  if (!runs.length) return xml;

  const joined = runs.map((r) => r.text).join("");
  let from = 0;
  /** @type {{ runStart: number, offsetInRun: number, runEnd: number, endOffset: number }[]} */
  const hits = [];

  while (true) {
    const idx = joined.indexOf(search, from);
    if (idx < 0) break;

    let cursor = 0;
    let runStart = -1;
    let offsetInRun = 0;
    let runEnd = -1;
    let endOffset = 0;
    for (let i = 0; i < runs.length; i++) {
      const next = cursor + runs[i].text.length;
      if (runStart < 0 && idx < next) {
        runStart = i;
        offsetInRun = idx - cursor;
      }
      if (idx + search.length <= next) {
        runEnd = i;
        endOffset = idx + search.length - cursor;
        break;
      }
      cursor = next;
    }
    if (runStart >= 0 && runEnd >= 0) {
      hits.push({ runStart, offsetInRun, runEnd, endOffset });
    }
    from = idx + search.length;
  }

  if (!hits.length) return xml;

  // Aplicar de atrás hacia adelante para no invalidar índices de XML
  let out = xml;
  for (let h = hits.length - 1; h >= 0; h--) {
    const hit = hits[h];
    const sliceRuns = runs.slice(hit.runStart, hit.runEnd + 1);
    const rebuilt = [];
    for (let i = 0; i < sliceRuns.length; i++) {
      const run = sliceRuns[i];
      const globalIndex = hit.runStart + i;
      let text = run.text;
      if (i === 0 && i === sliceRuns.length - 1) {
        text =
          text.slice(0, hit.offsetInRun) + replace + text.slice(hit.endOffset);
      } else if (i === 0) {
        text = text.slice(0, hit.offsetInRun) + replace;
      } else if (i === sliceRuns.length - 1) {
        text = text.slice(hit.endOffset);
      } else {
        text = "";
      }
      rebuilt.push(`<w:t${run.attrs}>${text}</w:t>`);
      // Actualizar modelo en memoria para siguientes hits del mismo pass no aplica;
      // como vamos de atrás, OK actualizar runs[globalIndex]
      runs[globalIndex] = { ...run, text };
    }

    const startXml = runs[hit.runStart].start;
    // Recalcular end: tras mutar texts, las posiciones XML originales siguen válidas
    // porque solo cambiamos contenido interno; longitudes de tags cambian.
    // Mejor: reconstruir desde start del primer run hasta end del último usando
    // las posiciones originales del hit.
    const originalStart = sliceRuns[0].start;
    const originalEnd = sliceRuns[sliceRuns.length - 1].end;

    // Re-leer posiciones: runs[].start/end quedan stale tras edits previos.
    // Re-parse from current `out` each hit for safety.
  }

  // Re-implementar de forma más simple: un hit a la vez re-parseando
  let current = xml;
  let guard = 0;
  while (guard++ < 50) {
    const runs2 = [];
    const re2 = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
    let m2;
    while ((m2 = re2.exec(current)) !== null) {
      runs2.push({
        full: m2[0],
        start: m2.index,
        end: m2.index + m2[0].length,
        attrs: m2[1],
        text: m2[2],
      });
    }
    const joined2 = runs2.map((r) => r.text).join("");
    const idx = joined2.indexOf(search);
    if (idx < 0) break;

    let cursor = 0;
    let runStart = -1;
    let offsetInRun = 0;
    let runEnd = -1;
    let endOffset = 0;
    for (let i = 0; i < runs2.length; i++) {
      const next = cursor + runs2[i].text.length;
      if (runStart < 0 && idx < next) {
        runStart = i;
        offsetInRun = idx - cursor;
      }
      if (idx + search.length <= next) {
        runEnd = i;
        endOffset = idx + search.length - cursor;
        break;
      }
      cursor = next;
    }
    if (runStart < 0 || runEnd < 0) break;

    const parts = [];
    for (let i = runStart; i <= runEnd; i++) {
      const run = runs2[i];
      let text = run.text;
      if (i === runStart && i === runEnd) {
        text = text.slice(0, offsetInRun) + replace + text.slice(endOffset);
      } else if (i === runStart) {
        text = text.slice(0, offsetInRun) + replace;
      } else if (i === runEnd) {
        text = text.slice(endOffset);
      } else {
        text = "";
      }
      parts.push(`<w:t${run.attrs}>${text}</w:t>`);
    }

    current =
      current.slice(0, runs2[runStart].start) +
      parts.join("") +
      current.slice(runs2[runEnd].end);
  }

  return current;
}

function applyAll(xml, pairs) {
  let out = xml;
  for (const [search, replace] of pairs) {
    out = replaceAcrossRuns(out, search, replace);
  }
  return out;
}

/** Pares globales (orden: largos / específicos primero). */
const GLOBAL = [
  ["ESTEBAN PEREZ DEL CASTILLO VELASCO", "{cliente_nombre}"],
  ["Esteban Perez del Castillo Velasco", "{cliente_nombre}"],
  ["11 de Abril 2026", "{fecha_hoy}"],
  ["11 de abril de 2026", "{fecha_apartado}"],
  ["11 de abril 2026", "{fecha_hoy}"],
  ["10 de Noviembre de 1989", "{fecha_nacimiento}"],
  ["Miguel Hidalgo, Ciudad de Mexico", "{lugar_nacimiento}"],
  ["Casado (Separación de Bienes)", "{estado_civil}"],
  ["Casado (Separacion de Bienes)", "{estado_civil}"],
  ["PECE891110HDFRSS00", "{curp}"],
  ["PECE891110JD0", "{rfc}"],
  [
    "Av. Paseo del Ahuehuete 8-26 Fracc. Paseos del Bosque C.P. 76910 Corregidora Qro.",
    "{domicilio}",
  ],
  ["Empresario", "{ocupacion}"],
  ["442 747 6402", "{telefono}"],
  ["esteban@konnekt.mx", "{email}"],
  ["0099079643688", "{identificacion_numero}"],
  ["Depto N 201 Planta Baja", "{ubicacion_unidad}"],
  ["departamento número N-201 modelo 3R planta baja", "departamento número {unidad_numero} {modelo_planta}"],
  ["Departamento N-201 modelo 3R planta baja", "Departamento {unidad_numero} {modelo_planta}"],
  ["departamento N-201 modelo 3R planta baja", "departamento {unidad_numero} {modelo_planta}"],
  ["N-201 modelo 3R planta baja", "{unidad_numero} {modelo_planta}"],
  ["modelo 3R planta baja", "{modelo_planta}"],
  ["Tres millones doscientos veintiocho mil treinta pesos 00/100 M.N.", "{precio_venta_letra}"],
  ["Cincuenta mil pesos 00/100 M.N.", "{garantia_letra}"],
  ["tres millones ciento setenta y ocho mil treinta pesos /100 M.N.", "{saldo_letra}"],
  ["mil ochocientos pesos 00/100 MN", "{cuota_mantenimiento_letra}"],
  ["$3,228,030.00", "{precio_venta}"],
  ["$3,178.030.00", "{saldo}"],
  ["$50,000.00", "{garantia}"],
  ["$1,800.00", "{cuota_mantenimiento}"],
  ["042180016008316037", "{banco_clabe}"],
  ["01600831603", "{banco_cuenta}"],
  ["FGF250918RF4", "{banco_rfc}"],
  ["Banca Mifel:", "{banco_nombre}"],
  ["Banca Mifel", "{banco_nombre}"],
  ["Libre Especial", "{tipo_operacion}"],
  ["N-201", "{unidad_numero}"],
];

const PER_FILE = {
  "oferta-compra.docx": [],
  "anexo-a-datos.docx": [
    ["identificación oficial INE número", "identificación oficial {identificacion_tipo} número"],
    ["Mexicana", "{nacionalidad}"],
  ],
  "anexo-b-pago.docx": [
    [
      "Pagos anticipados por la suma de {garantia} ({garantia_letra}), que fueron cubiertos el {fecha_hoy}.",
      "{plan_pago_apartado}",
    ],
    [
      "El saldo del precio, es decir, la cantidad de {saldo} ({saldo_letra}), de la siguiente manera:",
      "{plan_pago_saldo}",
    ],
  ],
  "anexo-d-mantenimiento.docx": [],
  "anexo-e-pld.docx": [],
  "anexo-f-privacidad.docx": [
    ["( X ) NO consiento", "({consentimiento_no}) NO consiento"],
    ["(  ) SI consiento", "({consentimiento_si}) SI consiento"],
  ],
};

function injectAnexoBTramos(xml) {
  if (xml.includes("{plan_pago_tramos}")) return xml;
  const searchStart = "a).- La cantidad";
  const searchEnd = "La forma de pago del precio";
  // Buscar en texto plano de runs
  const re = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  const runs = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    runs.push({ start: m.index, end: m.index + m[0].length, attrs: m[1], text: m[2] });
  }
  const joined = runs.map((r) => r.text).join("");
  const i0 = joined.indexOf(searchStart);
  const i1 = joined.indexOf(searchEnd);
  if (i0 < 0 || i1 <= i0) return xml;

  // Map i0..i1 to runs and replace with single placeholder in first run
  let cursor = 0;
  let runStart = -1;
  let offsetInRun = 0;
  let runEnd = -1;
  let endOffset = 0;
  for (let i = 0; i < runs.length; i++) {
    const next = cursor + runs[i].text.length;
    if (runStart < 0 && i0 < next) {
      runStart = i;
      offsetInRun = i0 - cursor;
    }
    if (i1 <= next) {
      runEnd = i;
      endOffset = i1 - cursor;
      break;
    }
    cursor = next;
  }
  if (runStart < 0 || runEnd < 0) return xml;

  const parts = [];
  for (let i = runStart; i <= runEnd; i++) {
    const run = runs[i];
    let text = run.text;
    if (i === runStart && i === runEnd) {
      text = text.slice(0, offsetInRun) + "{plan_pago_tramos}" + text.slice(endOffset);
    } else if (i === runStart) {
      text = text.slice(0, offsetInRun) + "{plan_pago_tramos}";
    } else if (i === runEnd) {
      text = text.slice(endOffset);
    } else {
      text = "";
    }
    parts.push(`<w:t${run.attrs}>${text}</w:t>`);
  }

  return (
    xml.slice(0, runs[runStart].start) +
    parts.join("") +
    xml.slice(runs[runEnd].end)
  );
}

mkdirSync(OUT_DIR, { recursive: true });
if (!existsSync(SRC_DIR)) {
  console.error(`No se encontró:\n  ${SRC_DIR}`);
  process.exit(1);
}

for (const file of FILES) {
  const srcPath = join(SRC_DIR, file.src);
  if (!existsSync(srcPath)) {
    console.warn(`SKIP missing: ${file.src}`);
    continue;
  }
  const outPath = join(OUT_DIR, file.out);
  copyFileSync(srcPath, outPath);
  const zip = new PizZip(readFileSync(outPath));
  const entry = zip.file("word/document.xml");
  if (!entry) {
    console.warn(`SKIP no xml: ${file.out}`);
    continue;
  }

  let xml = entry.asText();
  xml = applyAll(xml, GLOBAL);
  xml = applyAll(xml, PER_FILE[file.out] || []);
  if (file.out === "anexo-b-pago.docx") {
    xml = injectAnexoBTramos(xml);
  }

  // Titular bancario solo en menciones de cuenta (evitar romper títulos)
  if (file.out === "anexo-b-pago.docx") {
    xml = replaceAcrossRuns(xml, "Titular. - FIDEICOMISO 9268/2025 GFM", "Titular. - {banco_titular}");
    xml = replaceAcrossRuns(
      xml,
      "a nombre de FIDEICOMISO 9268/2025 GFM",
      "a nombre de {banco_titular}",
    );
  }

  zip.file("word/document.xml", xml);
  writeFileSync(outPath, zip.generate({ type: "nodebuffer" }));

  const flat = xml.replace(/<[^>]+>/g, "");
  const checks = ["{cliente_nombre}", "{unidad_numero}", "{garantia}", "{precio_venta}"];
  const missing = checks.filter((t) => !flat.includes(t.replace(/[{}]/g, "")) && !xml.includes(t));
  // simpler: check xml includes
  const miss = ["{cliente_nombre}", "{fecha_hoy}"].filter((t) => !xml.includes(t));
  console.log(`OK ${file.out}${miss.length ? ` (faltan: ${miss.join(", ")})` : ""}`);
}

console.log("Listo:", OUT_DIR);

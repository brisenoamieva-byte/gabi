import type { DisponibilidadUnidad } from "@/lib/data";
import type { ProductoRecomendadoInput, ProductoRecomendadoRecord } from "./productos-recomendados";

export const PRODUCTOS_CSV_HEADERS = [
  "orden",
  "unidad",
  "tipo",
  "prototipo",
  "precio",
  "superficie_terreno_m2",
  "superficie_construccion_m2",
  "entrega",
  "etapa",
  "visitable",
  "razones_venta",
  "instruccion_recorrido",
  "nota_acceso",
  "notas",
] as const;

/** Columnas opcionales al exportar (referencia; la importación usa el cluster del admin). */
export const PRODUCTOS_CSV_META_HEADERS = ["desarrollo", "cluster"] as const;

export type ProductosCsvRow = Record<(typeof PRODUCTOS_CSV_HEADERS)[number], string>;

export type TemplateCsvOptions = {
  clusterNombre?: string;
  desarrolloNombre?: string;
  clusterTipo?: "casas" | "departamentos" | "mixto" | "terrenos" | "oficinas";
  prototipos?: Array<{ nombre: string }>;
};

const CSV_BOM = "\uFEFF";

const tiposValidos = new Set<DisponibilidadUnidad["tipo"]>([
  "casa",
  "departamento",
  "terreno",
]);

const escapeCsvCell = (value: string) => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
};

export const recordToCsvRow = (
  record: ProductoRecomendadoRecord,
  prototipoNombre?: string,
): ProductosCsvRow => ({
  orden: String(record.orden),
  unidad: record.unidad,
  tipo: record.tipo,
  prototipo: prototipoNombre ?? record.prototipo_id ?? "",
  precio: record.precio?.toString() ?? "",
  superficie_terreno_m2: record.superficie_terreno_m2?.toString() ?? "",
  superficie_construccion_m2: record.superficie_construccion_m2?.toString() ?? "",
  entrega: record.entrega ?? "",
  etapa: record.etapa ?? "",
  visitable: record.visitable ? "si" : "no",
  razones_venta: (record.razones_venta ?? []).join(" | "),
  instruccion_recorrido: record.instruccion_recorrido ?? "",
  nota_acceso: record.nota_acceso ?? "",
  notas: record.notas ?? "",
});

export const rowsToCsv = (
  rows: ProductosCsvRow[],
  meta?: { desarrolloNombre?: string; clusterNombre?: string },
) => {
  const header = PRODUCTOS_CSV_HEADERS.join(",");
  const body = rows
    .map((row) => PRODUCTOS_CSV_HEADERS.map((key) => escapeCsvCell(row[key] ?? "")).join(","))
    .join("\r\n");

  const metaLine = meta?.desarrolloNombre || meta?.clusterNombre
    ? `# desarrollo: ${meta.desarrolloNombre ?? ""}; cluster: ${meta.clusterNombre ?? ""} (referencia — al importar se usa el cluster seleccionado en admin)\r\n`
    : "";

  return `${CSV_BOM}${metaLine}${header}\r\n${body}`;
};

export const templateCsv = (options?: TemplateCsvOptions) => {
  const prototipos = options?.prototipos ?? [];
  const clusterTipo = options?.clusterTipo ?? "mixto";
  const p0 = prototipos[0]?.nombre ?? "";
  const p1 = prototipos[1]?.nombre ?? p0;

  const examples: ProductosCsvRow[] = [];

  if (clusterTipo === "departamentos") {
    examples.push({
      orden: "1",
      unidad: "Depto 1204",
      tipo: "departamento",
      prototipo: p0,
      precio: "4200000",
      superficie_terreno_m2: "",
      superficie_construccion_m2: "108",
      entrega: "Inmediata",
      etapa: "Torre A",
      visitable: "si",
      razones_venta: "Entrega inmediata | Vista privilegiada",
      instruccion_recorrido: "Mostrar después de amenidades",
      nota_acceso: "",
      notas: "",
    });
    if (p1 && p1 !== p0) {
      examples.push({
        orden: "2",
        unidad: "Depto 805",
        tipo: "departamento",
        prototipo: p1,
        precio: "3900000",
        superficie_terreno_m2: "",
        superficie_construccion_m2: "106",
        entrega: "Inmediata",
        etapa: "Torre B",
        visitable: "si",
        razones_venta: "Planta alta con buena iluminación",
        instruccion_recorrido: "Segunda opción en recorrido",
        nota_acceso: "",
        notas: "",
      });
    }
  } else if (clusterTipo === "oficinas") {
    examples.push({
      orden: "1",
      unidad: "Oficina 306",
      tipo: "oficina",
      prototipo: p0,
      precio: "6400000",
      superficie_terreno_m2: "",
      superficie_construccion_m2: "131",
      entrega: "Inmediata",
      etapa: "Nivel 3",
      visitable: "si",
      razones_venta: "Vista Álamos | Coworking incluido",
      instruccion_recorrido: "Mostrar sala de juntas y rooftop",
      nota_acceso: "",
      notas: "",
    });
  } else {
    examples.push({
      orden: "1",
      unidad: "Vivienda 53",
      tipo: "casa",
      prototipo: p0,
      precio: "5400000",
      superficie_terreno_m2: "196",
      superficie_construccion_m2: "181",
      entrega: "Agosto 2026",
      etapa: "URB 2",
      visitable: "si",
      razones_venta: "Ideal para cliente familiar | Buen precio en el cluster",
      instruccion_recorrido: "Mostrar primero en recorrido",
      nota_acceso: "Confirmar acceso con caseta",
      notas: "",
    });

    if (clusterTipo === "mixto") {
      examples.push({
        orden: "2",
        unidad: "Lote 24",
        tipo: "terreno",
        prototipo: "",
        precio: "5240000",
        superficie_terreno_m2: "196",
        superficie_construccion_m2: "",
        entrega: "Agosto 2026",
        etapa: "URB 1",
        visitable: "si",
        razones_venta: "Cliente que quiere construir a su medida",
        instruccion_recorrido: "Segunda opción si no convence casa",
        nota_acceso: "",
        notas: "",
      });
    } else if (p1 && p1 !== p0) {
      examples.push({
        orden: "2",
        unidad: "Vivienda 12",
        tipo: "casa",
        prototipo: p1,
        precio: "4850000",
        superficie_terreno_m2: "137",
        superficie_construccion_m2: "197",
        entrega: "Inmediata",
        etapa: "URB 1",
        visitable: "si",
        razones_venta: "Mayor metraje | Entrega inmediata",
        instruccion_recorrido: "Mostrar si busca más espacio",
        nota_acceso: "",
        notas: "",
      });
    }
  }

  if (!examples.length) {
    examples.push({
      orden: "1",
      unidad: "Unidad 1",
      tipo: clusterTipo === "departamentos" ? "departamento" : "casa",
      prototipo: "",
      precio: "",
      superficie_terreno_m2: clusterTipo === "departamentos" ? "" : "180",
      superficie_construccion_m2: clusterTipo === "departamentos" ? "100" : "150",
      entrega: "",
      etapa: "",
      visitable: "si",
      razones_venta: "",
      instruccion_recorrido: "",
      nota_acceso: "",
      notas: "",
    });
  }

  return rowsToCsv(examples, {
    desarrolloNombre: options?.desarrolloNombre,
    clusterNombre: options?.clusterNombre,
  });
};

const REQUIRED_HEADERS = [...PRODUCTOS_CSV_HEADERS];

export const parseProductosCsv = (raw: string) => {
  const normalized = raw.replace(/^\uFEFF/, "").trim();
  if (!normalized) {
    return { rows: [] as ProductosCsvRow[], errors: ["El archivo está vacío."] };
  }

  const lines = normalized.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith("#"));
  if (!lines.length) {
    return { rows: [] as ProductosCsvRow[], errors: ["El archivo está vacío."] };
  }

  const headerCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const missing = REQUIRED_HEADERS.filter((key) => !headerCells.includes(key));

  if (missing.length) {
    return {
      rows: [] as ProductosCsvRow[],
      errors: [`Faltan columnas: ${missing.join(", ")}. Descarga la plantilla oficial.`],
    };
  }

  const indexes = Object.fromEntries(
    REQUIRED_HEADERS.map((key) => [key, headerCells.indexOf(key)]),
  ) as Record<(typeof PRODUCTOS_CSV_HEADERS)[number], number>;

  const legacySuperficieIndex = headerCells.indexOf("superficie_m2");

  const rows: ProductosCsvRow[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, lineIndex) => {
    const cells = parseCsvLine(line);
    if (cells.every((cell) => !cell)) {
      return;
    }

    const row = Object.fromEntries(
      REQUIRED_HEADERS.map((key) => [key, cells[indexes[key]] ?? ""]),
    ) as ProductosCsvRow;

    if (legacySuperficieIndex >= 0 && cells[legacySuperficieIndex]) {
      const legacy = cells[legacySuperficieIndex];
      const tipo = row.tipo.trim().toLowerCase();
      if (tipo === "terreno" && !row.superficie_terreno_m2) {
        row.superficie_terreno_m2 = legacy;
      } else if (tipo === "departamento" && !row.superficie_construccion_m2) {
        row.superficie_construccion_m2 = legacy;
      } else {
        if (!row.superficie_construccion_m2) {
          row.superficie_construccion_m2 = legacy;
        }
      }
    }

    if (!row.unidad.trim()) {
      errors.push(`Fila ${lineIndex + 2}: falta unidad.`);
      return;
    }

    rows.push(row);
  });

  return { rows, errors };
};

const parseBoolean = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "si" || normalized === "sí" || normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "no" || normalized === "false" || normalized === "0") {
    return false;
  }
  return true;
};

const parseNumber = (value: string) => {
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const csvRowToInput = (
  row: ProductosCsvRow,
  context: {
    desarrolloId: string;
    clusterId: string;
    prototipos: Array<{ id: string; nombre: string }>;
    fallbackOrden: number;
  },
): { input?: ProductoRecomendadoInput; error?: string } => {
  const tipo = row.tipo.trim().toLowerCase() as DisponibilidadUnidad["tipo"];

  if (!tiposValidos.has(tipo)) {
    return { error: `Unidad "${row.unidad}": tipo inválido (${row.tipo}).` };
  }

  const prototipoQuery = row.prototipo.trim().toLowerCase();
  const prototipo = prototipoQuery
    ? context.prototipos.find(
        (item) =>
          item.id.toLowerCase() === prototipoQuery ||
          item.nombre.toLowerCase() === prototipoQuery,
      )
    : undefined;

  if (prototipoQuery && !prototipo) {
    const disponibles = context.prototipos.map((item) => item.nombre).join(", ");
    const hint = disponibles
      ? ` Prototipos válidos en este cluster: ${disponibles}.`
      : " Este cluster no tiene prototipos configurados; deja la columna vacía para terrenos.";
    return {
      error: `Unidad "${row.unidad}": prototipo no encontrado (${row.prototipo}).${hint}`,
    };
  }

  const terreno = parseNumber(row.superficie_terreno_m2);
  const construccion = parseNumber(row.superficie_construccion_m2);

  if (tipo === "terreno" && terreno == null) {
    return { error: `Unidad "${row.unidad}": indica superficie_terreno_m2.` };
  }

  if (tipo === "departamento" && construccion == null) {
    return { error: `Unidad "${row.unidad}": indica superficie_construccion_m2.` };
  }

  if (tipo === "casa" && terreno == null && construccion == null) {
    return { error: `Unidad "${row.unidad}": indica al menos una superficie (terreno o construcción).` };
  }

  const ordenParsed = parseNumber(row.orden);
  const razones = row.razones_venta
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    input: {
      desarrolloId: context.desarrolloId,
      clusterId: context.clusterId,
      unidad: row.unidad.trim(),
      tipo,
      estatus: "disponible",
      prototipoId: prototipo?.id ?? null,
      precio: parseNumber(row.precio),
      superficieTerrenoM2: terreno,
      superficieConstruccionM2: construccion,
      entrega: row.entrega.trim() || null,
      etapa: row.etapa.trim() || null,
      notas: row.notas.trim() || null,
      orden: ordenParsed ? Math.round(ordenParsed) : context.fallbackOrden,
      visitable: parseBoolean(row.visitable),
      prioridadComercial: "alta",
      razonesVenta: razones,
      instruccionRecorrido: row.instruccion_recorrido.trim() || null,
      notaAcceso: row.nota_acceso.trim() || null,
    },
  };
};

export const exportRecordsToCsv = (
  records: ProductoRecomendadoRecord[],
  prototipos: Array<{ id: string; nombre: string }>,
  meta?: { desarrolloNombre?: string; clusterNombre?: string },
) => {
  const rows = [...records]
    .filter((item) => item.activo)
    .sort((a, b) => a.orden - b.orden)
    .map((record) => {
      const prototipo = prototipos.find((item) => item.id === record.prototipo_id);
      return recordToCsvRow(record, prototipo?.nombre);
    });

  return rowsToCsv(rows, meta);
};

export const superficieColumnHint = (tipo: DisponibilidadUnidad["tipo"]) => {
  if (tipo === "terreno") {
    return "Solo terreno_m2";
  }
  if (tipo === "departamento") {
    return "Solo construcción_m2";
  }
  return "Terreno + construcción";
};

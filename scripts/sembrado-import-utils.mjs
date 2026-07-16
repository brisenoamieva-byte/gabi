/**
 * Utilidades compartidas para import de sembrado (cualquier desarrollo).
 * Alias de columnas: Depa|Depto|Oficina, Esquema|Pago, Apartado|Fecha Apartado, etc.
 */

export const sembradoToInventario = (estatus) => {
  switch (String(estatus ?? "").trim()) {
    case "Disponibles":
      return "disponible";
    case "Apartado":
    case "Vendido Cobrado 1er Parte":
    case "Vendidas listas para cobro":
    case "Vendidas en espera de cobro":
      return "apartado";
    case "Vendidas Cobradas":
    case "Vendidas Desarrollador":
      return "vendido";
    case "Cancelado":
    case "Bloqueado":
    case "Asignado":
      return "bloqueado";
    default:
      return "disponible";
  }
};

export const operacionTieneCliente = (estatus, cliente) => {
  const nombre = String(cliente ?? "").trim();
  if (!nombre) return false;
  return !["Disponibles", "Asignado", "Bloqueado", "Cancelado"].includes(
    String(estatus ?? "").trim(),
  );
};

export const normalizeTipoInversion = (value) => {
  if (!value?.trim()) return null;
  const lower = String(value).trim().toLowerCase();
  if (lower.includes("vivir") || lower.includes("habitar")) return "vivir";
  if (lower.includes("invers")) return "inversion";
  if (lower.includes("trabaj")) return "trabajar";
  return "otro";
};

export const parseNumber = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parsePct = (value) => {
  const n = parseNumber(value);
  if (n == null) return null;
  if (Math.abs(n) <= 1) return n * 100;
  return n;
};

export const parseDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const utc = new Date((value - 25569) * 86400 * 1000);
    const local = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
    return local.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return null;
};

export const parseBoolCell = (value) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null || value === "") return false;
  const lower = String(value).trim().toLowerCase();
  return ["si", "sí", "yes", "true", "x", "1", "ok"].includes(lower);
};

export const parseSexo = (value) => {
  if (value == null || value === "") return null;
  const raw = String(value).trim().toUpperCase();
  if (raw === "M" || raw === "MASCULINO" || raw === "HOMBRE" || raw === "H") return "M";
  if (raw === "F" || raw === "FEMENINO" || raw === "MUJER") return "F";
  return raw.slice(0, 16) || null;
};

export const parseEdad = (value) => {
  const n = parseNumber(value);
  if (n == null) return null;
  const edad = Math.round(n);
  if (edad < 1 || edad > 120) return null;
  return edad;
};

export const prospectoEtapaFromSembrado = (estatus, cancelada) => {
  if (cancelada) return "perdido";
  const e = String(estatus ?? "").trim();
  if (e === "Apartado") return "apartado";
  if (
    e === "Vendidas Cobradas" ||
    e === "Vendidas Desarrollador" ||
    e === "Vendido Cobrado 1er Parte" ||
    e === "Vendidas listas para cobro" ||
    e === "Vendidas en espera de cobro"
  ) {
    return "vendido";
  }
  return "cita";
};

/** Normaliza encabezado para matching (sin acentos, espacios colapsados). */
export const normalizeHeaderKey = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const HEADER_ALIASES = {
  unidad: ["depa", "depto", "depto.", "oficina", "unidad", "departamento"],
  tipología: ["tipologia", "tipología", "tipo", "modelo"],
  lista: ["lista", "no. lista aplicable", "lista aplicable"],
  estatus: ["estatus", "status", "estado"],
  cliente: ["nombre cliente", "cliente", "nombre del cliente"],
  origen: ["origen"],
  residencia: ["lugar de residencia", "residencia", "ciudad"],
  equipo: ["equipo de venta", "equipo"],
  promotor: ["promotor", "asesor"],
  edad: ["edad", "edad "],
  sexo: ["sexo"],
  ocupacion: ["ocupacion", "ocupación"],
  tipoInversion: ["tipo inversion", "tipo inversión"],
  precioLista: ["precio lista", "precio de lista"],
  esquema: ["esquema", "pago", "forma de pago"],
  descuento: ["descuento"],
  precioVenta: ["precio venta", "precio de venta"],
  apartado: ["apartado", "fecha apartado", "fecha apartado "],
  cierre: [
    "cierre vta.",
    "cierre vta",
    "fecha cierre vta.",
    "fecha cierre vta",
    "fecha cierre de venta",
    "fecha cierre de venta ",
  ],
  contrato: ["contrato"],
  medio: ["medio publicitario", "medio"],
  entregado: ["entregado", "depa entregado"],
  escriturado: ["escriturado", "depa escriturado"],
  observacionesPagos: ["observaciones de pagos"],
  observaciones: ["observaciones"],
  comprobacion: ["comprobacion", "comprobación"],
  lado: ["lado"],
  edificio: ["edificio", "torre"],
  recamaras: ["recamaras", "recámaras"],
};

export const findHeaderIndex = (headers, aliasKey) => {
  const aliases = HEADER_ALIASES[aliasKey] ?? [aliasKey];
  const normalized = headers.map((h) =>
    h instanceof Date ? null : normalizeHeaderKey(h),
  );
  for (const alias of aliases) {
    const target = normalizeHeaderKey(alias);
    const idx = normalized.findIndex((h) => h === target);
    if (idx >= 0) return idx;
  }
  // Prefijo suave (ej. "edad " con espacio)
  for (const alias of aliases) {
    const target = normalizeHeaderKey(alias);
    const idx = normalized.findIndex((h) => h && (h === target || h.startsWith(target)));
    if (idx >= 0) return idx;
  }
  return -1;
};

export const parsePagosFromRow = (headers, row, compHeader = "Comprobación") => {
  const compIdx = headers.findIndex(
    (h) => normalizeHeaderKey(h) === normalizeHeaderKey(compHeader),
  );
  const pagos = [];
  if (compIdx < 0) return pagos;

  for (let c = compIdx + 1; c < headers.length; c++) {
    const header = headers[c];
    const monto = parseNumber(row[c]);
    if (!header || monto == null || monto === 0) continue;

    const mes = header instanceof Date ? header : new Date(header);
    if (Number.isNaN(mes.getTime()) || mes.getFullYear() < 2000) continue;

    pagos.push({
      mes: new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString().slice(0, 10),
      monto,
    });
  }

  return pagos;
};

/**
 * Parsea filas de una hoja de sembrado con alias de columnas.
 *
 * @param {unknown[][]} rows
 * @param {{
 *   headerRowIndex: number,
 *   tipoProducto?: string,
 *   cancelada?: boolean,
 *   unitValidator?: (unidad: string, row: unknown[]) => boolean,
 *   unitColumnIndex?: number,
 * }} options
 */
export const parseSembradoSheetRows = (rows, options) => {
  const headerRowIndex = options.headerRowIndex ?? 0;
  const headers = rows[headerRowIndex] ?? [];
  const idx = (key) => findHeaderIndex(headers, key);

  const unidadIdx =
    options.unitColumnIndex != null && options.unitColumnIndex >= 0
      ? options.unitColumnIndex
      : idx("unidad");

  const hasResidenciaCol = idx("residencia") >= 0;
  const result = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const unidadRaw = unidadIdx >= 0 ? row[unidadIdx] : "";
    const unidad = String(unidadRaw ?? "").trim();
    if (!unidad) continue;
    if (options.unitValidator && !options.unitValidator(unidad, row)) continue;

    const estatusRaw = idx("estatus") >= 0 ? row[idx("estatus")] : "Disponibles";
    const estatus = String(estatusRaw ?? "Disponibles").trim() || "Disponibles";
    if (estatus === "TOTALES") continue;

    const cliente = idx("cliente") >= 0 ? String(row[idx("cliente")] ?? "").trim() : "";
    const origenCell = idx("origen") >= 0 ? String(row[idx("origen")] ?? "").trim() : "";
    const residenciaCell =
      idx("residencia") >= 0 ? String(row[idx("residencia")] ?? "").trim() : "";

    let origenCaptacion = null;
    let origenCiudad = null;
    if (hasResidenciaCol) {
      origenCaptacion = origenCell || null;
      origenCiudad = residenciaCell || null;
    } else {
      // Pasaje / hojas sin "Lugar de residencia": Origen = ciudad
      origenCiudad = origenCell || null;
      origenCaptacion = null;
    }

    const medioPublicitario =
      idx("medio") >= 0 ? String(row[idx("medio")] ?? "").trim() : "";

    const cancelada = Boolean(options.cancelada) || estatus === "Cancelado";
    const hasOp = operacionTieneCliente(estatus, cliente) || cancelada;

    result.push({
      unidad,
      tipoProducto: options.tipoProducto ?? null,
      lado: idx("lado") >= 0 ? String(row[idx("lado")] ?? "").trim() : "",
      edificio: idx("edificio") >= 0 ? String(row[idx("edificio")] ?? "").trim() : "",
      tipologia: idx("tipología") >= 0 ? String(row[idx("tipología")] ?? "").trim() : "",
      listaPrecios: idx("lista") >= 0 && row[idx("lista")]
        ? String(row[idx("lista")]).trim()
        : null,
      estatus: cancelada && estatus !== "Cancelado" ? "Cancelado" : estatus,
      cliente,
      origenCaptacion,
      origenCiudad,
      equipoVenta: idx("equipo") >= 0 ? String(row[idx("equipo")] ?? "").trim() : "",
      promotor: idx("promotor") >= 0 ? String(row[idx("promotor")] ?? "").trim() : "",
      edad: idx("edad") >= 0 ? parseEdad(row[idx("edad")]) : null,
      sexo: idx("sexo") >= 0 ? parseSexo(row[idx("sexo")]) : null,
      ocupacion: idx("ocupacion") >= 0 ? String(row[idx("ocupacion")] ?? "").trim() || null : null,
      tipoInversion: normalizeTipoInversion(
        idx("tipoInversion") >= 0 ? row[idx("tipoInversion")] : null,
      ),
      precioLista: idx("precioLista") >= 0 ? parseNumber(row[idx("precioLista")]) : null,
      descuentoPct: idx("descuento") >= 0 ? parsePct(row[idx("descuento")]) : null,
      precioVenta: idx("precioVenta") >= 0 ? parseNumber(row[idx("precioVenta")]) : null,
      esquemaPago: idx("esquema") >= 0 && row[idx("esquema")]
        ? String(row[idx("esquema")]).trim()
        : null,
      fechaApartado: idx("apartado") >= 0 ? parseDate(row[idx("apartado")]) : null,
      fechaCierre: idx("cierre") >= 0 ? parseDate(row[idx("cierre")]) : null,
      contratoFirmado: idx("contrato") >= 0 ? parseBoolCell(row[idx("contrato")]) : false,
      medioPublicitario: medioPublicitario || (hasResidenciaCol ? origenCaptacion : null),
      observacionesPagos:
        idx("observacionesPagos") >= 0
          ? String(row[idx("observacionesPagos")] ?? "").trim() || null
          : null,
      observaciones:
        idx("observaciones") >= 0
          ? String(row[idx("observaciones")] ?? "").trim() || null
          : null,
      entregado: idx("entregado") >= 0 ? parseBoolCell(row[idx("entregado")]) : false,
      escriturado: idx("escriturado") >= 0 ? parseBoolCell(row[idx("escriturado")]) : false,
      comprobacion: idx("comprobacion") >= 0 ? parseNumber(row[idx("comprobacion")]) : null,
      hasOp,
      pagos: parsePagosFromRow(headers, row),
      cancelada,
    });
  }

  return result;
};

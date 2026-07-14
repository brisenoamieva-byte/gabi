import XLSX from "xlsx";

export const MISION_LA_GAVIA_DESARROLLO_ID = "mision-la-gavia";
export const MISION_LA_GAVIA_CLUSTER_ID = "mision-la-gavia-departamentos";

export const DEFAULT_SIMULADOR_XLSX =
  "C:/Users/brise/Downloads/Simulador La Gavia 13abr26 (2).xlsx";
export const DEFAULT_SEMBRADO_XLSX =
  "G:/Unidades compartidas/Misión La Gavia/6. Control Gerencia/1. Sembrado Misión La Agavia.xlsx";

export function excelSerialToDate(serial) {
  if (typeof serial !== "number" || !Number.isFinite(serial)) return null;
  const utc = new Date((serial - 25569) * 86400 * 1000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

export function formatIsoDate(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function sembradoToInventario(estatus) {
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
}

export function operacionTieneCliente(estatus, cliente) {
  const nombre = String(cliente ?? "").trim();
  if (!nombre) return false;
  return !["Disponibles", "Asignado", "Bloqueado", "Cancelado"].includes(String(estatus ?? "").trim());
}

function parseNumber(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePct(value) {
  const n = parseNumber(value);
  if (n == null) return null;
  if (Math.abs(n) <= 1) return n * 100;
  return n;
}

function parseDateCell(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatIsoDate(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatIsoDate(excelSerialToDate(value));
  }
  return null;
}

function normalizeTipoInversion(value) {
  if (!value || !String(value).trim()) return null;
  const lower = String(value).trim().toLowerCase();
  if (lower.includes("vivir") || lower.includes("habitar")) return "vivir";
  if (lower.includes("invers")) return "inversion";
  if (lower.includes("trabaj")) return "trabajar";
  return "otro";
}

function parsePagosMensuales(headers, row, compIdx) {
  const pagos = [];
  if (compIdx < 0) return pagos;
  for (let c = compIdx + 1; c < headers.length; c += 1) {
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
}

export function readWorkbook(path) {
  return XLSX.readFile(path, { cellDates: true, cellFormula: false });
}

export function parseEntregasMap(wb) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Depas, { header: 1, defval: "" });
  const map = new Map();
  for (let i = 15; i < rows.length; i += 1) {
    const row = rows[i];
    const torre = String(row[2] ?? "").trim();
    const numero = row[4];
    if (!torre || numero === "" || numero == null) continue;
    const unidad = `${torre}-${numero}`;
    const entrega = excelSerialToDate(Number(row[10]));
    map.set(unidad, formatIsoDate(entrega));
  }
  return map;
}

export function parseSembradoMaps(wb) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Sembrado Depas"], {
    header: 1,
    defval: "",
    raw: true,
  });
  const headerRow = 8;
  const headers = rows[headerRow];
  const idx = (name) => headers.findIndex((h) => h === name);
  const compIdx = idx("Comprobación");
  const byUnidad = new Map();

  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const unidad = String(row[idx("Depa")] ?? "").trim();
    if (!unidad.includes("-")) continue;
    const estatus = String(row[idx("Estatus")] ?? "Disponibles").trim();
    if (estatus === "TOTALES") continue;
    const cliente = String(row[idx("Nombre Cliente")] ?? "").trim();
    const medioPublicitario = row[idx("Medio Publicitario")]
      ? String(row[idx("Medio Publicitario")]).trim()
      : "";
    const origen = row[idx("Origen")] ? String(row[idx("Origen")]).trim() : "";
    byUnidad.set(unidad, {
      unidad,
      lado: String(row[idx("Lado")] ?? "").trim(),
      edificio: String(row[idx("Edificio")] ?? "").trim(),
      tipologia: String(row[idx("Tipología")] ?? "").trim(),
      listaPrecios: row[idx("Lista")] ? String(row[idx("Lista")]).trim() : null,
      estatus,
      cliente,
      origen,
      origenCiudad: row[idx("Lugar de residencia")]
        ? String(row[idx("Lugar de residencia")]).trim()
        : null,
      equipoVenta: row[idx("Equipo de Venta")] ? String(row[idx("Equipo de Venta")]).trim() : "",
      promotor: row[idx("Promotor")] ? String(row[idx("Promotor")]).trim() : "",
      tipoInversion: normalizeTipoInversion(row[idx("Tipo Inversión")]),
      precioLista: parseNumber(row[idx("Precio Lista")]),
      descuentoPct: parsePct(row[idx("Descuento")]),
      precioVenta: parseNumber(row[idx("Precio Venta")]),
      esquemaPago: row[idx("Esquema")] ? String(row[idx("Esquema")]).trim() : null,
      fechaApartado: parseDateCell(row[idx("Apartado")]),
      fechaCierre: parseDateCell(row[idx("Cierre Vta.")]),
      medioPublicitario: medioPublicitario || origen || null,
      observaciones: row[idx("Observaciones")] ? String(row[idx("Observaciones")]).trim() : null,
      entregado: Boolean(row[idx("Depa Entregado")]),
      escriturado: Boolean(row[idx("Depa Escriturado")]),
      comprobacion: parseNumber(row[idx("Comprobación")]),
      hasOp: operacionTieneCliente(estatus, cliente),
      pagos: parsePagosMensuales(headers, row, compIdx),
      cancelada: false,
    });
  }

  const cancelSheet = wb.Sheets["Cancelados "] ?? wb.Sheets.Cancelados;
  if (cancelSheet) {
    const cancelRows = XLSX.utils.sheet_to_json(cancelSheet, {
      header: 1,
      defval: "",
      raw: true,
    });
    const cancelHeaders = cancelRows[0];
    const cIdx = (name) => cancelHeaders.findIndex((h) => h === name);
    for (let i = 1; i < cancelRows.length; i += 1) {
      const row = cancelRows[i];
      const unidad = String(row[cIdx("Depa")] ?? "").trim();
      if (!unidad) continue;
      const prev = byUnidad.get(unidad) ?? { unidad, pagos: [] };
      byUnidad.set(unidad, {
        ...prev,
        estatus: "Cancelado",
        cliente: String(row[cIdx("Nombre Cliente")] ?? prev.cliente ?? "").trim(),
        cancelada: true,
        hasOp: Boolean(String(row[cIdx("Nombre Cliente")] ?? prev.cliente ?? "").trim()),
      });
    }
  }

  return byUnidad;
}

export function parsePreciosUnidades(wb) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets.Precios, { header: 1, defval: "" });
  const unidades = [];

  for (let i = 6; i < rows.length; i += 1) {
    const row = rows[i];
    const edificio = String(row[0] ?? "").trim();
    const lado = String(row[1] ?? "").trim();
    const modelo = String(row[2] ?? "").trim();
    const unidad = String(row[3] ?? "").trim();
    const precioLista = Math.round(Number(row[8] ?? 0));
    if (!unidad || !modelo || precioLista < 100_000) continue;

    unidades.push({
      edificio,
      lado,
      modelo,
      unidad,
      m2Internos: Number(row[4] ?? 0),
      m2Externos: Number(row[5] ?? 0),
      m2Totales: Number(row[6] ?? 0),
      recamaras: Number(row[7] ?? 0),
      precioLista,
      precioContado: Math.round(Number(row[9] ?? 0)),
      precio303040: Math.round(Number(row[10] ?? 0)) || null,
      precio3070: Math.round(Number(row[11] ?? 0)) || null,
      precio1585: Math.round(Number(row[12] ?? 0)) || null,
      estatusLista: String(row[13] ?? "").trim(),
    });
  }

  return unidades;
}

export function cellToIso(value) {
  if (value instanceof Date) return formatIsoDate(value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatIsoDate(excelSerialToDate(value));
  }
  return null;
}

export function parseSimuladorConfig(wb, excelSource) {
  const listasRows = XLSX.utils.sheet_to_json(wb.Sheets.Listas, { header: 1, defval: "" });
  const descRows = XLSX.utils.sheet_to_json(wb.Sheets.Descuentos, { header: 1, defval: "" });
  const preciosRows = XLSX.utils.sheet_to_json(wb.Sheets.Precios, { header: 1, defval: "" });

  const esquemasPago = [];
  for (let i = 4; i <= 8; i += 1) {
    const row = listasRows[i];
    const label = String(row[1] ?? "").trim();
    if (!label || label === "Tipo") continue;
    esquemasPago.push({
      id: label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
      label,
      descuentoPct: Number(row[2] ?? 0),
      enganchePct: Number(row[3] ?? 0),
      meses: row[4],
      finiquitoPct: Number(row[5] ?? 0),
    });
  }

  const areasExternas = [];
  for (let i = 11; i <= 19; i += 1) {
    const row = listasRows[i];
    const min = Number(row[1]);
    const max = Number(row[2]);
    const factor = Number(row[3]);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(factor)) continue;
    areasExternas.push({ minM2: min, maxM2: max, factor });
  }

  const modelosReferencia = [];
  for (let i = 11; i <= 16; i += 1) {
    const row = listasRows[i];
    const tipo = String(row[10] ?? "").trim();
    if (!tipo || tipo === "Tipo") continue;
    modelosReferencia.push({
      tipo,
      m2Internos: Number(row[11] ?? 0),
      jardinM2: Number(row[12] ?? 0),
      roofM2: Number(row[13] ?? 0),
    });
  }

  const incrementoNivel = [];
  for (let i = 13; i <= 15; i += 1) {
    const row = listasRows[i];
    const nivel = row[5];
    const inc = row[6];
    if (nivel === "" || inc === "" || typeof nivel !== "number") continue;
    incrementoNivel.push({ nivel: Number(nivel), incrementoPct: Number(inc) });
  }

  const areasInternasIncremento = [];
  for (let i = 21; i <= 24; i += 1) {
    const row = listasRows[i];
    const minM2 = Number(row[6]);
    const maxM2 = Number(row[7]);
    const factor = Number(row[8]);
    if (!Number.isFinite(minM2) || !Number.isFinite(maxM2) || !Number.isFinite(factor)) continue;
    areasInternasIncremento.push({ minM2, maxM2, factor });
  }

  const descuentosLista = {};
  const discountRow = preciosRows[5] ?? [];
  descuentosLista.contado = Number(discountRow[9] ?? 0);
  descuentosLista.msi303040 = Number(discountRow[10] ?? 0);
  descuentosLista.plazo3070 = Number(discountRow[11] ?? 0);
  descuentosLista.plazo1585 = Number(discountRow[12] ?? 0);

  const paquete1Unidades = Number(listasRows[1]?.[16] ?? 0);
  const paquete2Unidades = Number(listasRows[2]?.[16] ?? 0);
  const numUnidades = paquete1Unidades + paquete2Unidades || 105;

  return {
    desarrolloId: MISION_LA_GAVIA_DESARROLLO_ID,
    excelSource,
    listaPrecios: "mar26",
    numUnidades,
    numListasPrecio: Number(listasRows[32]?.[18] ?? 11),
    incrementoEntreListas: Number(preciosRows[5]?.[14] ?? 0.03),
    tasaAnual: Number(descRows[2]?.[3] ?? 0.11),
    mesesEntregaDefault: Number(descRows[1]?.[3] ?? 24),
    inicioVentas: cellToIso(listasRows[1]?.[15]),
    inicioConstruccion: cellToIso(listasRows[1]?.[12]),
    mesesConstruccionTorre: Number(listasRows[1]?.[13] ?? 18),
    esquemasPago,
    descuentosLista,
    areasExternas,
    modelosReferencia,
    incrementoNivel,
    areasInternasIncremento,
    areasInternasExtraPct: Number(listasRows[19]?.[7] ?? 0),
    areasInternasExtraUmbralM2: Number(listasRows[18]?.[6] ?? 105.22),
  };
}

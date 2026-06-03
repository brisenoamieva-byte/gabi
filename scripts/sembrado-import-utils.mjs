export const sembradoToInventario = (estatus) => {
  switch (estatus) {
    case "Disponibles":
      return "disponible";
    case "Apartado":
    case "Vendido Cobrado 1er Parte":
    case "Vendidas listas para cobro":
    case "Vendidas en espera de cobro":
      return "apartado";
    case "Vendidas Cobradas":
      return "vendido";
    case "Bloqueado":
    case "Asignado":
      return "bloqueado";
    default:
      return "disponible";
  }
};

export const operacionTieneCliente = (estatus) =>
  !["Disponibles", "Asignado", "Bloqueado"].includes(estatus);

export const normalizeTipoInversion = (value) => {
  if (!value?.trim()) return null;
  const lower = value.trim().toLowerCase();
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
  return null;
};

export const parsePagosFromRow = (headers, row, compHeader = "Comprobación") => {
  const compIdx = headers.findIndex((h) => h === compHeader);
  const pagos = [];

  if (compIdx < 0) {
    return pagos;
  }

  for (let c = compIdx + 1; c < headers.length; c++) {
    const header = headers[c];
    const monto = parseNumber(row[c]);
    if (!header || monto == null || monto === 0) continue;

    const mes = header instanceof Date ? header : new Date(header);
    if (Number.isNaN(mes.getTime())) continue;

    pagos.push({
      mes: new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString().slice(0, 10),
      monto,
    });
  }

  return pagos;
};

import { APARTADO_CANCELADO_NOTA_PREFIX } from "@/lib/comercial/apartado-cancelado-historial";

/** Prefijo de notas de seguimiento: `[AAAA-MM-DD HH:MM] texto` (hora CDMX). */
export const PROSPECTO_NOTA_STAMP_RE =
  /^\[(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?\]\s*(.*)$/;

export type ProspectoNotaEntry = {
  /** Índice estable en el blob (0 = primera línea del texto). */
  lineIndex: number;
  /** Fecha/hora local CDMX en ISO-like `YYYY-MM-DDTHH:MM` o null si legado. */
  at: string | null;
  texto: string;
  kind: "seguimiento" | "sistema" | "legado";
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Partes de fecha/hora en America/Mexico_City. */
export const getMexicoCityDateTimeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") === "24" ? "00" : get("hour"),
    minute: get("minute"),
  };
};

export const formatProspectoNotaStamp = (date = new Date()): string => {
  const { year, month, day, hour, minute } = getMexicoCityDateTimeParts(date);
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

export const formatProspectoNotaAtLabel = (at: string | null): string => {
  if (!at) {
    return "Sin fecha";
  }

  const match = at.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) {
    return at;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = match[4] != null ? Number(match[4]) : null;
  const minute = match[5] != null ? Number(match[5]) : null;

  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (hour == null || minute == null || Number.isNaN(hour) || Number.isNaN(minute)) {
    return dateLabel;
  }

  return `${dateLabel} · ${pad2(hour)}:${pad2(minute)}`;
};

const classifyLine = (texto: string, stamped: boolean): ProspectoNotaEntry["kind"] => {
  if (texto.includes(APARTADO_CANCELADO_NOTA_PREFIX) || /^\[Apartó/i.test(texto)) {
    return "sistema";
  }
  return stamped ? "seguimiento" : "legado";
};

/** Parsea `prospectos.notas` en entradas de histórico. */
export const parseProspectoNotasHistorial = (notas?: string | null): ProspectoNotaEntry[] => {
  const raw = notas?.replace(/\r\n/g, "\n").trim();
  if (!raw) {
    return [];
  }

  const lines = raw.split("\n");
  const entries: ProspectoNotaEntry[] = [];
  let legadoBuffer: string[] = [];
  let legadoStart = 0;

  const flushLegado = () => {
    const texto = legadoBuffer.join("\n").trim();
    if (texto) {
      entries.push({
        lineIndex: legadoStart,
        at: null,
        texto,
        kind: classifyLine(texto, false),
      });
    }
    legadoBuffer = [];
  };

  lines.forEach((line, index) => {
    const match = line.match(PROSPECTO_NOTA_STAMP_RE);
    if (match) {
      flushLegado();
      const date = match[1]!;
      const time = match[2];
      const texto = (match[3] ?? "").trim();
      if (!texto) {
        return;
      }
      entries.push({
        lineIndex: index,
        at: time ? `${date}T${time}` : date,
        texto,
        kind: classifyLine(texto, true),
      });
      return;
    }

    if (!legadoBuffer.length) {
      legadoStart = index;
    }
    legadoBuffer.push(line);
  });

  flushLegado();
  return entries;
};

/** Más recientes primero (legado sin fecha al final). */
export const sortProspectoNotasNewestFirst = (
  entries: ProspectoNotaEntry[],
): ProspectoNotaEntry[] =>
  [...entries].sort((a, b) => {
    if (a.at && b.at) {
      return b.at.localeCompare(a.at) || b.lineIndex - a.lineIndex;
    }
    if (a.at && !b.at) {
      return -1;
    }
    if (!a.at && b.at) {
      return 1;
    }
    return b.lineIndex - a.lineIndex;
  });

/** Agrega una nota fechada al blob de `notas`. */
export const appendProspectoNota = (
  existing: string | null | undefined,
  texto: string,
  at = new Date(),
): string => {
  const clean = texto.replace(/\r\n/g, "\n").trim();
  if (!clean) {
    throw new Error("Escribe la nota antes de agregarla.");
  }

  const singleLine = clean.replace(/\n+/g, " · ");
  const stamp = formatProspectoNotaStamp(at);
  const line = `[${stamp}] ${singleLine}`;
  const prev = existing?.replace(/\r\n/g, "\n").trim() ?? "";
  return prev ? `${prev}\n${line}` : line;
};

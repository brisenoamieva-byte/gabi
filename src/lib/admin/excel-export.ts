import * as XLSX from "xlsx";

export type ExcelSheetSpec = {
  name: string;
  /** Filas como objetos; las keys del primer row definen columnas si no hay headers. */
  rows: Array<Record<string, string | number | boolean | null | undefined>>;
  /** Orden explícito de columnas (opcional). */
  headers?: string[];
};

const sanitizeSheetName = (name: string) => {
  const cleaned = name.replace(/[\\/?*[\]]/g, " ").trim() || "Hoja";
  return cleaned.slice(0, 31);
};

const cellValue = (value: string | number | boolean | null | undefined): string | number | boolean => {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return value;
};

export const buildXlsxBuffer = (sheets: ExcelSheetSpec[]): Buffer => {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const headers =
      sheet.headers ??
      (sheet.rows[0] ? Object.keys(sheet.rows[0]) : ["(vacío)"]);

    const aoa: Array<Array<string | number | boolean>> = [headers];
    for (const row of sheet.rows) {
      aoa.push(headers.map((key) => cellValue(row[key])));
    }

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheet.name));
  }

  if (!workbook.SheetNames.length) {
    const empty = XLSX.utils.aoa_to_sheet([["(sin datos)"]]);
    XLSX.utils.book_append_sheet(workbook, empty, "Datos");
  }

  const raw = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
};

export const excelFilename = (base: string, desarrolloId?: string) => {
  const day = new Date().toISOString().slice(0, 10);
  const slug = (desarrolloId ?? "gabi").replace(/[^a-zA-Z0-9_-]+/g, "-");
  return `${base}-${slug}-${day}.xlsx`;
};

export const xlsxResponse = (buffer: Buffer, filename: string) =>
  new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });

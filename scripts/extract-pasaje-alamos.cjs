const fs = require("node:fs");
const path = require("node:path");
const XLSX = require("xlsx");

const findFile = (dir, pattern) => {
  if (!fs.existsSync(dir)) return null;
  const re = new RegExp(pattern, "i");
  for (const name of fs.readdirSync(dir)) {
    if (re.test(name)) return path.join(dir, name);
  }
  return null;
};

const downloads = "c:/Users/brise/Downloads";
const escritorio =
  "c:/Users/brise/OneDrive/Obsoletos/archivos/Escritorio9nov19/Escritorio2/Escritorio";

const pdfPath = findFile(downloads, "Tarjetas de Procesos Pasaje");
const deptosPath = findFile(escritorio, "^deptos\\.xlsx$");
const oficinasPath = findFile(escritorio, "Simulador oficinas 1may26");

const out = [];
const log = (...args) => {
  out.push(args.join(" "));
};

log("FILES", JSON.stringify({ pdfPath, deptosPath, oficinasPath }));

const dumpWorkbook = (filePath, label, maxRows = 120) => {
  log("\n==========", label, "==========");
  const wb = XLSX.readFile(filePath, { cellDates: true });
  for (const sheetName of wb.SheetNames) {
    log("\n--- Sheet:", sheetName, "---");
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    rows.slice(0, maxRows).forEach((row, i) => {
      const cells = row.filter((c) => c !== "" && c != null);
      if (cells.length) log(String(i + 1).padStart(3), JSON.stringify(cells));
    });
    if (rows.length > maxRows) log(`... ${rows.length - maxRows} more rows`);
  }
};

if (deptosPath) dumpWorkbook(deptosPath, "DEPTOS", 200);
if (oficinasPath) dumpWorkbook(oficinasPath, "OFICINAS", 200);

(async () => {
  if (pdfPath) {
    log("\n========== TARJETAS PDF ==========");
    try {
      const pdf = require("pdf-parse");
      const buffer = fs.readFileSync(pdfPath);
      const data = await pdf(buffer);
      log(data.text);
    } catch (error) {
      log("PDF parse error:", String(error));
    }
  }

  fs.writeFileSync(
    path.join(__dirname, "extract-output.txt"),
    out.join("\n"),
    "utf8",
  );
  console.log("Wrote extract-output.txt", out.length, "lines");
})();

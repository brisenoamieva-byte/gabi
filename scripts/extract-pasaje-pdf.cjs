const fs = require("node:fs");
const path = require("node:path");
const { PDFParse } = require("pdf-parse");

const findFile = (dir, pattern) => {
  const re = new RegExp(pattern, "i");
  for (const name of fs.readdirSync(dir)) {
    if (re.test(name)) return path.join(dir, name);
  }
  return null;
};

const pdfPath = findFile("c:/Users/brise/Downloads", "Tarjetas de Procesos Pasaje");

(async () => {
  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const result = await parser.getText();
  fs.writeFileSync(
    path.join(__dirname, "pasaje-procesos.txt"),
    result.text,
    "utf8",
  );
  console.log("pages", result.total, "chars", result.text.length);
  console.log(result.text.slice(0, 3000));
})().catch((error) => {
  console.error("ERR", error.message);
  process.exit(1);
});
